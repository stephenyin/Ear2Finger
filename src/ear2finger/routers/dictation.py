from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter()


class DictationRequest(BaseModel):
    text: str
    difficulty: Optional[str] = "medium"


class DictationResponse(BaseModel):
    id: str
    text: str
    audio_url: Optional[str] = None
    difficulty: str


@router.get("/dictations")
async def get_dictations():
    """Get available dictation exercises"""
    return {
        "dictations": [
            {
                "id": "1",
                "text": "The quick brown fox jumps over the lazy dog.",
                "difficulty": "easy"
            }
        ]
    }


@router.post("/dictations", response_model=DictationResponse)
async def create_dictation(request: DictationRequest):
    """Create a new dictation exercise"""
    return DictationResponse(
        id="1",
        text=request.text,
        difficulty=request.difficulty
    )


@router.get("/dictations/{dictation_id}")
async def get_dictation(dictation_id: str):
    """Get a specific dictation exercise"""
    return {
        "id": dictation_id,
        "text": "Sample dictation text",
        "difficulty": "medium"
    }
