from fastapi import APIRouter, HTTPException, Depends
from typing import List

# LangChain message wrappers
from langchain_core.messages import AIMessage, HumanMessage

# Import configuration
from backend.config import settings

# Import schemas
from backend.schemas import (
    HistoryRequest,
    IndexRequest,
    ChatRequest,
    ClearHistoryRequest,
)

# Modular helper imports
from backend.db import (
    save_user,
    save_chat_history,
    get_chat_history,
    get_user_urls,
    register_conversation,
)
from backend.auth import get_current_user
from backend.rag import (
    get_vectorstore_from_url,
    get_context_retriever_chain,
    get_conversational_rag_chain,
)


router = APIRouter(prefix="/api")

# Memory cache for active URL vector indexes
vector_stores_cache = {}

@router.get("/config")
async def get_config():
    """Exposes the Google Client ID configured in the .env file."""
    return {
        "google_client_id": settings.GOOGLE_CLIENT_ID
    }

@router.post("/auth")
async def auth_user(user_info: dict = Depends(get_current_user)):
    """Authenticates users via Google ID token and returns their saved URLs."""
    save_user(user_info)
    urls = get_user_urls(user_info["id"])
    return {"user": user_info, "urls": urls}

@router.post("/history")
async def fetch_history(request: HistoryRequest, user_info: dict = Depends(get_current_user)):
    """Fetches saved chat history for a specific user and URL."""
    history = get_chat_history(user_info["id"], request.url)
    return {"history": history}

@router.post("/index")
async def index_url(request: IndexRequest, user_info: dict = Depends(get_current_user)):
    """Indexes a webpage URL and links it to the user's session database."""
    url = request.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL cannot be empty")
        
    try:
        # Load Chroma vector store context if missing from in-memory cache
        if url not in vector_stores_cache:
            vector_stores_cache[url] = get_vectorstore_from_url(url)
            
        # Register conversation entry in database
        register_conversation(user_info["id"], url)
        
        urls = get_user_urls(user_info["id"])
        return {"status": "success", "urls": urls}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to index website: {str(e)}")

@router.post("/chat")
async def chat_endpoint(request: ChatRequest, user_info: dict = Depends(get_current_user)):
    """Queries the LangChain RAG pipeline and saves the exchange in database history."""
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

@router.post("/clear")
async def clear_endpoint(request: ClearHistoryRequest, user_info: dict = Depends(get_current_user)):
    """Deletes conversation history associated with a specific user and URL."""
    url = request.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL is required to clear history")
        
    try:
        save_chat_history(user_info["id"], url, [])
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing conversation history: {str(e)}")
