# PC Doctor Agent

An Electron + FastAPI application where an LLM agent helps diagnose PC issues by running terminal commands with user supervision.

## Setup

### 1. Backend (Python)
Navigate to the `backend` folder and install dependencies:
```bash
cd backend
pip install -r requirements.txt
```

Start the backend server:
```bash
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend (Electron + React)
Navigate to the `frontend` folder and install dependencies (if you haven't already):
```bash
cd frontend
npm install
npm install lucide-react tailwindcss-animate
```

Start the Electron app:
```bash
npm run dev
```

## Features
- **Tech-Ops Theme**: Dark mode, futuristic UI.
- **Command Guardrails**: 
  - Low severity commands (e.g., `ipconfig`) run automatically.
  - High severity commands (e.g., `install`) require explicit approval.
- **Secure Execution**: Commands run via Electron's Node.js process, not the Python backend.
