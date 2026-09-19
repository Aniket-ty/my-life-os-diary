from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

class ReceiptItem(BaseModel):
    name: str
    quantity: Optional[float] = 1.0
    amount: float

class ReceiptExtractionRequest(BaseModel):
    image: Optional[str] = None  # Base64 encoded string
    mimeType: Optional[str] = "image/jpeg"

class ReceiptExtractionResponse(BaseModel):
    merchant: Optional[str] = None
    date: Optional[str] = None
    currency: str = "INR"
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    tip: Optional[float] = None
    total: float
    items: List[ReceiptItem] = Field(default_factory=list)
    confidence: float = 0.95
    rawText: Optional[str] = None
    status: str = "success"
    provider: str = "local"
