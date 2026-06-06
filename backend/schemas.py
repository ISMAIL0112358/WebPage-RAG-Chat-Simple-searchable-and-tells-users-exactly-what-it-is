from pydantic import BaseModel

class HistoryRequest(BaseModel):
    url: str

class IndexRequest(BaseModel):
    url: str

class ChatRequest(BaseModel):
    message: str
    url: str

class ClearHistoryRequest(BaseModel):
    url: str

