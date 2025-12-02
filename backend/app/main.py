from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="PC Doctor Agent Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str

from app.core.agent import process_user_message, AgentResponse

@app.get("/")
def read_root():
    return {"status": "online", "service": "PC Doctor Agent"}

@app.post("/chat", response_model=AgentResponse)
def chat_endpoint(request: ChatRequest):
    response = process_user_message(request.message)
    return response

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
