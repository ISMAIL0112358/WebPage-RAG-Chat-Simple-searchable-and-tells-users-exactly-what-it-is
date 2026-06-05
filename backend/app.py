import os
import sqlite3
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional

# LangChain message wrappers
from langchain_core.messages import AIMessage, HumanMessage

# Modular helper imports
from backend.db import init_db, save_user, save_chat_history, get_chat_history, get_user_urls
from backend.auth import verify_google_token
from backend.rag import get_vectorstore_from_url, get_context_retriever_chain, get_conversational_rag_chain

# Load environment configs
load_dotenv()

# Initialize FastAPI App
app = FastAPI(title="WebPage RAG Chat API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Run SQLite Database setup
init_db()

# Memory cache for active URL vector indexes
vector_stores_cache = {}

# Pydantic schemas
class AuthRequest(BaseModel):
    token: str

class HistoryRequest(BaseModel):
    url: str
    token: str

class IndexRequest(BaseModel):
    url: str
    token: str

class ChatRequest(BaseModel):
    message: str
    url: str
    token: str

class ClearHistoryRequest(BaseModel):
    url: str
    token: str

# Endpoints
@app.get("/api/config")
async def get_config():
    """Exposes the Google Client ID configured in the .env file."""
    return {
        "google_client_id": os.environ.get("GOOGLE_CLIENT_ID", "")
    }

@app.post("/api/auth")
async def auth_user(request: AuthRequest):
    """Authenticates users via Google ID token and returns their saved URLs."""
    user_info = verify_google_token(request.token)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid auth token")
        
    save_user(user_info)
    urls = get_user_urls(user_info["id"])
    return {"user": user_info, "urls": urls}

@app.post("/api/history")
async def fetch_history(request: HistoryRequest):
    """Fetches saved chat history for a specific user and URL."""
    user_info = verify_google_token(request.token)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid auth token")
        
    history = get_chat_history(user_info["id"], request.url)
    return {"history": history}

@app.post("/api/index")
async def index_url(request: IndexRequest):
    """Indexes a webpage URL and links it to the user's session database."""
    user_info = verify_google_token(request.token)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid auth token")
        
    url = request.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL cannot be empty")
        
    try:
        # Load Chroma vector store context if missing from in-memory cache
        if url not in vector_stores_cache:
            vector_stores_cache[url] = get_vectorstore_from_url(url)
            
        # Register conversation entry in database
        conn = sqlite3.connect("rag_chat.db")
        cursor = conn.cursor()
        cursor.execute("""
        INSERT OR IGNORE INTO conversations (user_id, url, history, updated_at)
        VALUES (?, ?, '[]', CURRENT_TIMESTAMP)
        """, (user_info["id"], url))
        conn.commit()
        conn.close()
        
        urls = get_user_urls(user_info["id"])
        return {"status": "success", "urls": urls}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to index website: {str(e)}")

@app.post("/api/chat")
async def chat_endpoint(request: ChatRequest):
    """Queries the LangChain RAG pipeline and saves the exchange in database history."""
    user_info = verify_google_token(request.token)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid auth token")
        
    url = request.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required for context")
        
    try:
        # Ensure Chroma vector index is loaded in memory cache
        if url not in vector_stores_cache:
            vector_stores_cache[url] = get_vectorstore_from_url(url)
            
        raw_history = get_chat_history(user_info["id"], url)
        
        # Parse log strings to LangChain Message formats
        chat_history = []
        for msg in raw_history:
            if msg["role"] == "user":
                chat_history.append(HumanMessage(content=msg["content"]))
            else:
                chat_history.append(AIMessage(content=msg["content"]))
                
        # Setup retrieval chains
        retriever_chain = get_context_retriever_chain(vector_stores_cache[url])
        conversation_rag_chain = get_conversational_rag_chain(retriever_chain)
        
        # Query chain
        response = conversation_rag_chain.invoke({
            "chat_history": chat_history,
            "input": request.message
        })
        answer = response["answer"]
        
        # Save updated logs in SQLite database
        updated_history = list(raw_history)
        updated_history.append({"role": "user", "content": request.message})
        updated_history.append({"role": "assistant", "content": answer})
        
        save_chat_history(user_info["id"], url, updated_history)
        
        return {"status": "success", "answer": answer, "history": updated_history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing message: {str(e)}")

@app.post("/api/clear")
async def clear_endpoint(request: ClearHistoryRequest):
    """Deletes conversation history associated with a specific user and URL."""
    user_info = verify_google_token(request.token)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid auth token")
        
    url = request.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required to clear history")
        
    try:
        save_chat_history(user_info["id"], url, [])
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing conversation history: {str(e)}")

# Mount frontend files folder to serve static frontend React client
os.makedirs("frontend", exist_ok=True)
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# Serve index.html React page on root
@app.get("/")
async def read_index():
    return FileResponse("frontend/index.html")
