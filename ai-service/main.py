import os
import base64
from typing import Optional
from fastapi import FastAPI, HTTPException, Header, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from schemas.commands import VoiceCommandRequest, VoiceCommandResponse, TranscribeResponse
from schemas.receipt import ReceiptExtractionRequest, ReceiptExtractionResponse
from ocr.receipt_parser import get_ocr_provider
from voice.command_parser import parse_voice_command
from voice.speech_to_text import transcribe_audio_bytes

app = FastAPI(
    title="My Life OS - AI Assistant & OCR Service",
    version="1.0.0",
    description="Dedicated microservice for OCR bill scanning, Whisper speech-to-text, and voice intent interpretation."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

INTERNAL_KEY = os.getenv("AI_SERVICE_API_KEY", "")

def verify_internal_key(x_ai_service_key: str = Header(None)):
    if INTERNAL_KEY and x_ai_service_key != INTERNAL_KEY:
        raise HTTPException(status_code=401, detail="Unauthorized: invalid internal service key")
    return True

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "my-life-os-ai",
        "ocr_provider": os.getenv("OCR_PROVIDER", "local"),
        "version": "1.0.0"
    }

@app.post("/ocr/receipt", response_model=ReceiptExtractionResponse)
async def extract_receipt_endpoint(
    payload: Optional[ReceiptExtractionRequest] = None,
    file: Optional[UploadFile] = File(None),
    auth: bool = Depends(verify_internal_key)
):
    provider = get_ocr_provider()
    image_bytes = None
    mime_type = "image/jpeg"

    if file:
        image_bytes = await file.read()
        mime_type = file.content_type or "image/jpeg"
    elif payload and payload.image:
        clean_b64 = payload.image
        if clean_b64.startswith("data:"):
            clean_b64 = clean_b64.split("base64,")[1]
        image_bytes = base64.b64decode(clean_b64)
        mime_type = payload.mimeType or "image/jpeg"
    else:
        raise HTTPException(status_code=400, detail="Either file upload or base64 image is required")

    try:
        data = await provider.extract_receipt(image_bytes, mime_type)
        return ReceiptExtractionResponse(**data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OCR extraction failed: {str(e)}")

@app.post("/voice/command", response_model=VoiceCommandResponse)
def parse_command_endpoint(
    req: VoiceCommandRequest,
    auth: bool = Depends(verify_internal_key)
):
    try:
        parsed = parse_voice_command(req.text, req.context)
        return VoiceCommandResponse(**parsed)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Command parsing failed: {str(e)}")

@app.post("/voice/transcribe", response_model=TranscribeResponse)
async def transcribe_endpoint(
    file: UploadFile = File(...),
    auth: bool = Depends(verify_internal_key)
):
    try:
        audio_bytes = await file.read()
        text = await transcribe_audio_bytes(audio_bytes, file.filename, file.content_type)
        return TranscribeResponse(text=text, confidence=0.95)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", os.getenv("AI_SERVICE_PORT", 8000)))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
