import os
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    print("⚠️  WARNING: GEMINI_API_KEY not found in environment variables!")
    print("📝 Create a .env file in the backend directory with your API key")
    print("🔗 Get your key from: https://aistudio.google.com/app/apikey")
