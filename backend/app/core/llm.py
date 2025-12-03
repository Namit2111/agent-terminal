from google import genai
from google.genai import types
from pydantic import BaseModel
from typing import Optional, Literal, List
from app.core.config import GEMINI_API_KEY

# Pydantic models for structured LLM output
class CommandProposal(BaseModel):
    command: str
    severity: Literal["low", "high"]
    reason: str
    timeout: int = 30  # Timeout in seconds, default 30s

class AgentIterationResponse(BaseModel):
    message: str
    proposal: Optional[CommandProposal] = None
    loop_status: Literal["continue", "blocked", "done"] = "done"
    blocker_reason: Optional[str] = None

# System instruction for the PC diagnostics agent
SYSTEM_INSTRUCTION = """You are an expert PC diagnostics agent with FULL TERMINAL ACCESS to the user's Windows PC.

IMPORTANT - YOUR CAPABILITIES:
✓ You CAN execute ANY Windows PowerShell/CMD command on the user's local computer
✓ You HAVE direct access to their terminal via the frontend application
✓ You ARE running commands locally on their machine, not in a remote environment
✓ You CAN check internet speed, network configs, running processes, system specs, etc.
✓ ALL diagnostic commands you propose WILL BE EXECUTED on their actual PC

Your role:
1. Analyze user problems and command execution results
2. Propose relevant PowerShell/CMD commands to diagnose or fix issues (they WILL execute on their PC)
3. Explain your reasoning clearly and concisely
4. Work autonomously by analyzing command results and proposing follow-up commands
5. Detect when the problem is resolved or when you need user input

Command Severity Guidelines:
- "low": Read-only diagnostic commands (ipconfig, systeminfo, Get-Process, ping, tracert, netstat, Test-Connection, Get-NetAdapter, speedtest-cli if installed, etc.)
- "high": Commands that modify system state (install, delete, stop services, modify registry, remove files, etc.)

Command Timeout Guidelines:
- Default: 30 seconds (for most commands like ipconfig, Get-Process, systeminfo)
- Fast commands: 10-15 seconds (ping, simple queries)
- Slow commands: 60-90 seconds (tracert, speedtest, large file operations)
- Very slow commands: 120 seconds (system scans, network diagnostics)
IMPORTANT: Always specify a timeout. No command should run indefinitely.

Loop Status Guidelines:
- "continue": You have a follow-up command to run based on the latest results. Use this when:
  * You want to run another diagnostic command after analyzing results
  * A command failed and you have an alternative approach to try
  * You need more information to complete the diagnosis
- "blocked": You cannot proceed without user intervention. Use this when:
  * You need a user decision (e.g., which option to choose)
  * A command failed and you have NO alternatives
  * The issue requires manual user action
- "done": Problem is fully diagnosed/resolved. Use this when:
  * You've identified the root cause
  * You've successfully fixed the issue  
  * You've completed the requested diagnostic

IMPORTANT: If a command fails (e.g., tool not found, access denied), try an alternative command with loop_status="continue". 
Only use "blocked" if you truly cannot proceed with ANY alternative approach.

NEVER say "I cannot execute commands" or "I cannot access your system" - YOU CAN AND YOU DO.
Be confident, direct, and action-oriented. Propose commands that will actually run on their PC."""

def get_gemini_client():
    """Initialize and return a Gemini client."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY not found in environment variables")
    return genai.Client(api_key=GEMINI_API_KEY)

def analyze_problem(user_message: str, conversation_history: List[types.Content] = None) -> AgentIterationResponse:
    """
    Analyze a user's problem and propose the first diagnostic command.
    
    Args:
        user_message: The user's problem description
        conversation_history: Optional conversation history for context
        
    Returns:
        AgentIterationResponse with proposed command and status
    """
    client = get_gemini_client()
    
    # Build conversation context
    contents = []
    if conversation_history:
        contents.extend(conversation_history)
    
    # Add user message
    contents.append(types.Content(
        role='user',
        parts=[types.Part.from_text(text=user_message)]
    ))
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash-lite',
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type='application/json',
                response_schema=AgentIterationResponse,
                temperature=0.7,
            )
        )
        
        # Parse the JSON response into our Pydantic model
        import json
        result = AgentIterationResponse.model_validate_json(response.text)
        return result
        
    except Exception as e:
        # Fallback response on error
        return AgentIterationResponse(
            message=f"I encountered an error while analyzing your request: {str(e)}",
            loop_status="blocked",
            blocker_reason=f"API Error: {str(e)}"
        )

def analyze_command_result(
    command: str,
    output: str,
    conversation_history: List[types.Content] = None,
    error: Optional[str] = None
) -> AgentIterationResponse:
    """
    Analyze command execution results and decide next steps.
    
    Args:
        command: The command that was executed
        output: The command output
        conversation_history: Conversation history for context
        error: Optional error message if command failed
        
    Returns:
        AgentIterationResponse with next action
    """
    client = get_gemini_client()
    
    # Build conversation context
    contents = []
    if conversation_history:
        contents.extend(conversation_history)
    
    # Add command result analysis request
    if error:
        analysis_prompt = f"""The command failed with an error:
Command: {command}
Error: {error}
Output: {output}

Analyze this failure and decide:
1. Can you propose a different command to work around this?
2. Do you need user input to proceed?
3. Is this a blocker that prevents further diagnosis?"""
    else:
        analysis_prompt = f"""Command executed successfully:
Command: {command}
Output:
{output}

Analyze these results and decide:
1. Do you need to run additional commands to continue diagnosis?
2. Have you found the root cause or solution?
3. Is the problem resolved?"""
    
    contents.append(types.Content(
        role='user',
        parts=[types.Part.from_text(text=analysis_prompt)]
    ))
    
    try:
        response = client.models.generate_content(
            model='gemini-2.5-flash-lite',
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_INSTRUCTION,
                response_mime_type='application/json',
                response_schema=AgentIterationResponse,
                temperature=0.7,
            )
        )
        
        # Parse the JSON response
        import json
        result = AgentIterationResponse.model_validate_json(response.text)
        return result
        
    except Exception as e:
        return AgentIterationResponse(
            message=f"I encountered an error while analyzing the command results: {str(e)}",
            loop_status="blocked",
            blocker_reason=f"API Error: {str(e)}"
        )

def build_conversation_history(messages: List[dict]) -> List[types.Content]:
    """
    Convert message history to Gemini Content format.
    
    Args:
        messages: List of message dicts with 'role' and 'text' keys
        
    Returns:
        List of types.Content objects
    """
    contents = []
    for msg in messages:
        role = 'user' if msg['role'] == 'user' else 'model'
        contents.append(types.Content(
            role=role,
            parts=[types.Part.from_text(text=msg['text'])]
        ))
    return contents
