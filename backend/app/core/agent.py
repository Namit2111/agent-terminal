from pydantic import BaseModel
from typing import Optional, Literal, List, Dict
from app.core.llm import (
    analyze_problem,
    analyze_command_result,
    build_conversation_history,
    AgentIterationResponse as LLMResponse,
    CommandProposal
)

# Request/Response models for API
class AgentResponse(BaseModel):
    """Response from agent to frontend"""
    message: str
    proposal: Optional[CommandProposal] = None
    session_id: Optional[str] = None
    loop_status: Literal["continue", "blocked", "done"] = "done"
    iteration_count: int = 0
    blocker_reason: Optional[str] = None

# Session management
class ConversationSession:
    """Tracks conversation state for a user session"""
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.messages: List[Dict] = []  # List of {role, text} dicts
        self.iteration_count = 0
        self.max_iterations = 10
        self.status: Literal["active", "blocked", "done"] = "active"
        
    def add_message(self, role: str, text: str):
        """Add a message to conversation history"""
        self.messages.append({"role": role, "text": text})
        
    def increment_iteration(self):
        """Increment iteration counter"""
        self.iteration_count += 1
        
    def should_continue(self) -> bool:
        """Check if loop should continue"""
        if self.iteration_count >= self.max_iterations:
            return False
        if self.status in ["blocked", "done"]:
            return False
        return True

# In-memory session storage (would use Redis/DB in production)
_sessions: Dict[str, ConversationSession] = {}

def get_or_create_session(session_id: Optional[str] = None) -> ConversationSession:
    """Get existing session or create new one"""
    if session_id and session_id in _sessions:
        return _sessions[session_id]
    
    # Create new session
    import uuid
    new_session_id = session_id or str(uuid.uuid4())
    session = ConversationSession(new_session_id)
    _sessions[new_session_id] = session
    return session

def process_user_message(message: str, session_id: Optional[str] = None) -> AgentResponse:
    """
    Process initial user message and start agent loop.
    
    Args:
        message: User's problem description
        session_id: Optional session ID for conversation tracking
        
    Returns:
        AgentResponse with proposed command and session info
    """
    # Get or create session
    session = get_or_create_session(session_id)
    
    # RESET iteration count for new user query
    session.iteration_count = 0
    session.status = "active"
    
    # Check iteration limit
    if not session.should_continue():
        return AgentResponse(
            message="Maximum iterations reached. Please start a new conversation.",
            session_id=session.session_id,
            loop_status="blocked",
            iteration_count=session.iteration_count,
            blocker_reason="Maximum iterations (10) reached"
        )
    
    # Add user message to history
    session.add_message("user", message)
    
    # Get conversation history
    history = build_conversation_history(session.messages[:-1])  # Exclude the message we just added
    
    # Call LLM to analyze problem
    llm_response = analyze_problem(message, history)
    
    # Add agent response to history
    session.add_message("agent", llm_response.message)
    session.increment_iteration()
    session.status = llm_response.loop_status
    
    # Convert to API response
    return AgentResponse(
        message=llm_response.message,
        proposal=llm_response.proposal,
        session_id=session.session_id,
        loop_status=llm_response.loop_status,
        iteration_count=session.iteration_count,
        blocker_reason=llm_response.blocker_reason
    )

def process_iteration(
    session_id: str,
    command: str,
    output: str,
    error: Optional[str] = None
) -> AgentResponse:
    """
    Process command execution results and determine next iteration.
    
    Args:
        session_id: Session identifier
        command: Command that was executed
        output: Command output
        error: Optional error message if command failed
        
    Returns:
        AgentResponse with next action
    """
    # Get session
    if session_id not in _sessions:
        return AgentResponse(
            message="Session not found. Please start a new conversation.",
            loop_status="blocked",
            blocker_reason="Invalid session ID"
        )
    
    session = _sessions[session_id]
    
    # Check if we should continue
    if not session.should_continue():
        reason = "Maximum iterations reached" if session.iteration_count >= session.max_iterations else "Session ended"
        return AgentResponse(
            message="Cannot continue iteration.",
            session_id=session.session_id,
            loop_status="blocked",
            iteration_count=session.iteration_count,
            blocker_reason=reason
        )
    
    # Add command execution to history
    if error:
        exec_summary = f"Executed: {command}\nError: {error}\nOutput: {output}"
    else:
        exec_summary = f"Executed: {command}\nOutput: {output}"
    session.add_message("user", exec_summary)
    
    # Get conversation history
    history = build_conversation_history(session.messages[:-1])
    
    # Call LLM to analyze results and decide next step
    llm_response = analyze_command_result(command, output, history, error)
    
    # Add agent response to history
    session.add_message("agent", llm_response.message)
    session.increment_iteration()
    session.status = llm_response.loop_status
    
    # Convert to API response
    return AgentResponse(
        message=llm_response.message,
        proposal=llm_response.proposal,
        session_id=session.session_id,
        loop_status=llm_response.loop_status,
        iteration_count=session.iteration_count,
        blocker_reason=llm_response.blocker_reason
    )

def clear_session(session_id: str):
    """Clear a session from memory"""
    if session_id in _sessions:
        del _sessions[session_id]
