import sqlite3
import json

from backend.config import settings

DATABASE_FILE = settings.DATABASE_FILE

def init_db():
    """
    Initializes the local SQLite database.
    Creates tables for user profiles and user-indexed conversations.
    """
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT,
        name TEXT,
        picture TEXT
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        url TEXT,
        history TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, url)
    )
    """)
    conn.commit()
    conn.close()

def save_user(user_info: dict):
    """
    Inserts a new user profile or updates details on conflict.
    """
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO users (id, email, name, picture)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
        email=excluded.email,
        name=excluded.name,
        picture=excluded.picture
    """, (user_info["id"], user_info["email"], user_info["name"], user_info["picture"]))
    conn.commit()
    conn.close()

def save_chat_history(user_id: str, url: str, history: list):
    """
    Saves or updates the list of message logs for a user-indexed URL.
    """
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    history_json = json.dumps(history)
    cursor.execute("""
    INSERT INTO conversations (user_id, url, history, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(user_id, url) DO UPDATE SET
        history=excluded.history,
        updated_at=CURRENT_TIMESTAMP
    """, (user_id, url, history_json))
    conn.commit()
    conn.close()

def get_chat_history(user_id: str, url: str) -> list:
    """
    Retrieves the parsed chat log list for a given user and URL.
    """
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT history FROM conversations WHERE user_id = ? AND url = ?", (user_id, url))
    row = cursor.fetchone()
    conn.close()
    if row:
        return json.loads(row[0])
    return []

def get_user_urls(user_id: str) -> list:
    """
    Retrieves all indexed URLs saved under a user session ordered by date.
    """
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT url, updated_at FROM conversations WHERE user_id = ? ORDER BY updated_at DESC", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return [{"url": r[0], "updated_at": r[1]} for r in rows]

def register_conversation(user_id: str, url: str):
    """
    Registers conversation entry in database if it doesn't already exist.
    """
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute("""
    INSERT OR IGNORE INTO conversations (user_id, url, history, updated_at)
    VALUES (?, ?, '[]', CURRENT_TIMESTAMP)
    """, (user_id, url))
    conn.commit()
    conn.close()

