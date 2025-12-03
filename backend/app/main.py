from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="PC Doctor Agent Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import agent functions
from app.core.agent import process_user_message, process_iteration, AgentResponse

# Request models
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class CommandFeedbackRequest(BaseModel):
    session_id: str
    command: str
    output: str
    error: Optional[str] = None

@app.get("/")
def read_root():
    return {"status": "online", "service": "PC Doctor Agent with Gemini LLM"}

@app.post("/chat", response_model=AgentResponse)
def chat_endpoint(request: ChatRequest):
    """
    Initial endpoint for user to describe their problem.
    Returns agent's first response with proposed command.
    """
    response = process_user_message(request.message, request.session_id)
    return response

@app.post("/iterate", response_model=AgentResponse)
def iterate_endpoint(request: CommandFeedbackRequest):
    """
    Endpoint for autonomous agent loop iteration.
    Receives command execution results and returns next action.
    """
    response = process_iteration(
        session_id=request.session_id,
        command=request.command,
        output=request.output,
        error=request.error
    )
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
