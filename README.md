# PC Doctor Agent

An Electron + FastAPI application powered by **Gemini LLM** that autonomously diagnoses PC issues by running terminal commands and iteratively analyzing results until the problem is resolved.

## Features

- **🤖 Gemini-Powered AI**: Uses Google's `gemini-2.5-flash` model for intelligent diagnostics
- **🔄 Autonomous Agent Loop**: Automatically iterates on command results (up to 10 iterations)
- **🛡️ Command Guardrails**: 
  - Low severity commands (e.g., `ipconfig`, `ping`) run automatically
  - High severity commands (e.g., `install`, `delete`) require explicit approval
- **📊 Session Tracking**: Maintains conversation history and context
- **⚡ Real-time Feedback**: Shows iteration count and loop status
- **🎨 Tech-Ops Dark Theme**: Futuristic, professional UI
- **🔒 Secure Execution**: Commands run via Electron's Node.js process, not the Python backend

## Setup

### 1. Backend (Python)

Navigate to the `backend` folder and install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

**Configure Gemini API Key**:
Create a `.env` file in the `backend` directory:
```bash
GEMINI_API_KEY=your_api_key_here
```

Get your API key from: https://aistudio.google.com/app/apikey

Start the backend server:
```bash
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend (Electron + React)

Navigate to the `frontend` folder and install dependencies:
```bash
cd frontend
npm install
```

Start the Electron app:
```bash
npm run dev
```

## How It Works

### Autonomous Loop System

1. **User describes problem**: "my internet is slow"
2. **Agent proposes command**: `ping google.com` (auto-executes if low severity)
3. **Agent analyzes results**: Detects high latency
4. **Agent proposes next command**: `ipconfig /all` (auto-executes)
5. **Agent analyzes network config**: Finds DNS issue
6. **Agent proposes fix**: `ipconfig /flushdns` (auto-executes)
7. **Agent provides diagnosis**: Problem resolved, loop ends

**Loop stops when**:
- ✅ Problem is diagnosed/resolved (`loop_status: "done"`)
- 🚫 High-severity command needs approval (`severity: "high"`)
- ⚠️ Command fails or error occurs (`loop_status: "blocked"`)
- 🔢 Maximum iterations reached (10 iterations)

## API Endpoints

- `POST /chat`: Initial problem description → Returns first command proposal
- `POST /iterate`: Send command execution results → Returns next action

## Tech Stack

- **Backend**: FastAPI, Python, Google GenAI SDK (`google-genai`)
- **Frontend**: Electron, React, TypeScript, TailwindCSS
- **AI Model**: Gemini 2.5 Flash (with structured outputs)

## Architecture

```
User Input → Frontend
           ↓
     POST /chat → Backend → Gemini LLM
           ↓
   Command Proposal (low severity: auto-execute)
           ↓
   Execute Command → Get Results
           ↓
     POST /iterate → Backend → Gemini analyzes results
           ↓
   Next Command Proposal (loop continues)
           ↓
   ... (repeat until done/blocked)
```

## Implementation Details

- **Session Management**: Each conversation has a unique session ID
- **Iteration Tracking**: Hard cap at 10 iterations prevents infinite loops
- **Conversation History**: Full context maintained for intelligent multi-turn diagnosis
- **Error Handling**: Graceful degradation on API failures
- **Structured Outputs**: Uses Pydantic schemas for consistent LLM responses

## Example Queries

- "check my network connection"
- "my internet is slow, find the problem"
- "why is my CPU usage so high?"
- "diagnose my wifi issues"
- "check if a specific service is running"

---

**Powered by Google Gemini 2.5 Flash** 🚀
