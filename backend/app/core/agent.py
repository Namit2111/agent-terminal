from pydantic import BaseModel
from typing import Optional, Literal

class CommandProposal(BaseModel):
    command: str
    severity: Literal["low", "high"]
    reason: str

class AgentResponse(BaseModel):
    message: str
    proposal: Optional[CommandProposal] = None

def process_user_message(message: str) -> AgentResponse:
    # TODO: Integrate actual LLM here.
    # For now, simple keyword matching to demonstrate architecture.
    
    msg = message.lower()
    
    if "ip" in msg or "network" in msg or "wifi" in msg:
        return AgentResponse(
            message="I can check your network configuration.",
            proposal=CommandProposal(
                command="ipconfig /all",
                severity="low",
                reason="Checking network details to diagnose connectivity."
            )
        )
    
    if "ping" in msg:
        return AgentResponse(
            message="I'll check your internet connection.",
            proposal=CommandProposal(
                command="ping google.com",
                severity="low",
                reason="Verifying internet reachability."
            )
        )
        
    if "process" in msg or "running" in msg:
        return AgentResponse(
            message="Here are the top running processes.",
            proposal=CommandProposal(
                command="powershell -Command \"Get-Process | Sort-Object CPU -Descending | Select-Object -First 10\"",
                severity="low",
                reason="Listing resource-heavy processes."
            )
        )
        
    if "install" in msg:
        target = msg.split("install")[-1].strip()
        return AgentResponse(
            message=f"I can try to install {target}, but I need your approval.",
            proposal=CommandProposal(
                command=f"winget install {target}",
                severity="high",
                reason="Installing software modifies your system."
            )
        )
        
    if "system" in msg or "specs" in msg:
        return AgentResponse(
            message="Gathering system information.",
            proposal=CommandProposal(
                command="systeminfo",
                severity="low",
                reason="Retrieving system specifications."
            )
        )

    return AgentResponse(message="I'm here to help with PC issues. Ask me to check network, processes, or run diagnostics.")
