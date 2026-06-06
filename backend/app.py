import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.db import init_db
from backend.routes import router as api_router

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

# Include API Router
app.include_router(api_router)

# Mount frontend files folder to serve static frontend React client
os.makedirs("frontend", exist_ok=True)
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# Serve index.html React page on root
@app.get("/")
async def read_index():
    return FileResponse("frontend/index.html")
