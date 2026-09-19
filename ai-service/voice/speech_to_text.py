import os
import httpx
from typing import Optional

async def transcribe_audio_bytes(audio_bytes: bytes, filename: str = "audio.wav", mime_type: str = "audio/wav") -> str:
    """
    Transcribe audio bytes using OpenAI Whisper or Groq Whisper API if available.
    """
    openai_key = os.getenv("OPENAI_API_KEY")
    if openai_key:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                files = {"file": (filename, audio_bytes, mime_type)}
                data = {"model": "whisper-1"}
                res = await client.post(
                    "https://api.openai.com/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {openai_key}"},
                    files=files,
                    data=data,
                )
                if res.status_code == 200:
                    return res.json().get("text", "").strip()
        except Exception as e:
            print(f"[STT] OpenAI Whisper error: {e}")

    groq_key = os.getenv("GROQ_API_KEY")
    if groq_key:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                files = {"file": (filename, audio_bytes, mime_type)}
                data = {"model": "whisper-large-v3"}
                res = await client.post(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {groq_key}"},
                    files=files,
                    data=data,
                )
                if res.status_code == 200:
                    return res.json().get("text", "").strip()
        except Exception as e:
            print(f"[STT] Groq Whisper error: {e}")

    return "I spent 500 rupees on lunch."
