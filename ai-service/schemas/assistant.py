from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ChatMessage(BaseModel):
    role: str
    content: str

class AssistantChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    userContext: Optional[str] = ""

class AssistantChatResponse(BaseModel):
    text: str
    action: Optional[Dict[str, Any]] = None
    source: str = "inline-engine"
