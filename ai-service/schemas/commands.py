from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class VoiceCommandRequest(BaseModel):
    text: str
    context: Optional[Dict[str, Any]] = None

class CommandEntities(BaseModel):
    amount: Optional[float] = None
    currency: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    period: Optional[str] = None
    groupName: Optional[str] = None
    memberName: Optional[str] = None
    paidBy: Optional[str] = None
    splitType: Optional[str] = None
    members: Optional[List[str]] = None
    fromCurrency: Optional[str] = None
    toCurrency: Optional[str] = None
    route: Optional[str] = None
    groupId: Optional[str] = None

class VoiceCommandResponse(BaseModel):
    intent: str
    confidence: float = Field(ge=0.0, le=1.0)
    entities: CommandEntities = Field(default_factory=CommandEntities)
    clarification: Optional[str] = None
    missingField: Optional[str] = None
    provider: str = "python-fastapi"

class TranscribeResponse(BaseModel):
    text: str
    confidence: Optional[float] = 1.0
