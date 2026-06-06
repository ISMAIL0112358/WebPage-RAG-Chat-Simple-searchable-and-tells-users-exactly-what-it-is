import os
from dotenv import load_dotenv

# Load environment configurations
load_dotenv()

class Settings:
    GOOGLE_CLIENT_ID: str = os.environ.get("GOOGLE_CLIENT_ID", "")
    DATABASE_FILE: str = os.environ.get("DATABASE_FILE", "rag_chat.db")
    OPENAI_API_KEY: str = os.environ.get("OPENAI_API_KEY", "")

settings = Settings()
