"""Lesson session history: list and save sessions per video."""
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from auth import get_current_user
from database import LessonSession, User, Video, get_db

router = APIRouter()


class LessonSessionOut(BaseModel):
    id: int
    video_id: int
    started_at: datetime
    ended_at: Optional[datetime]
    sentences_practiced: int
    correct_chars: int
    hint_count: int
    incorrect_chars: int

    class Config:
        from_attributes = True


class LessonSessionSave(BaseModel):
    video_id: int
    started_at: datetime
    ended_at: Optional[datetime] = None
    sentences_practiced: int = 0
    correct_chars: int = 0
    hint_count: int = 0
    incorrect_chars: int = 0


@router.get("/lessons/{video_id}/sessions", response_model=List[LessonSessionOut])
async def list_lesson_sessions(
    video_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all sessions for a lesson (video), most recent first."""
    video = db.query(Video).filter(
        Video.id == video_id,
        Video.user_id == current_user.id,
        Video.deleted_at.is_(None),
    ).first()
    if not video:
        raise HTTPException(status_code=404, detail="Lesson not found")
    sessions = (
        db.query(LessonSession)
        .filter(
            LessonSession.user_id == current_user.id,
            LessonSession.video_id == video_id,
        )
        .order_by(LessonSession.started_at.desc())
        .all()
    )
    return sessions


@router.post("/user/lesson-sessions", response_model=LessonSessionOut)
async def save_lesson_session(
    body: LessonSessionSave,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or update a lesson session. Only saves if at least one sentence practiced (caller checks)."""
    video = db.query(Video).filter(
        Video.id == body.video_id,
        Video.user_id == current_user.id,
        Video.deleted_at.is_(None),
    ).first()
    if not video:
        raise HTTPException(status_code=404, detail="Lesson not found")

    existing = (
        db.query(LessonSession)
        .filter(
            LessonSession.user_id == current_user.id,
            LessonSession.video_id == body.video_id,
            LessonSession.ended_at.is_(None),
        )
        .first()
    )

    if existing:
        existing.ended_at = body.ended_at
        existing.sentences_practiced = body.sentences_practiced
        existing.correct_chars = body.correct_chars
        existing.hint_count = body.hint_count
        existing.incorrect_chars = body.incorrect_chars
        db.commit()
        db.refresh(existing)
        return existing

    session = LessonSession(
        user_id=current_user.id,
        video_id=body.video_id,
        started_at=body.started_at,
        ended_at=body.ended_at,
        sentences_practiced=body.sentences_practiced,
        correct_chars=body.correct_chars,
        hint_count=body.hint_count,
        incorrect_chars=body.incorrect_chars,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return session


@router.put("/user/lesson-sessions/current", response_model=LessonSessionOut)
async def upsert_current_session(
    body: LessonSessionSave,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start or update the current (incomplete) session for a lesson. Only persists if sentences_practiced >= 1."""
    if body.sentences_practiced < 1:
        raise HTTPException(status_code=400, detail="Save only when at least one sentence has been completed")

    video = db.query(Video).filter(
        Video.id == body.video_id,
        Video.user_id == current_user.id,
        Video.deleted_at.is_(None),
    ).first()
    if not video:
        raise HTTPException(status_code=404, detail="Lesson not found")

    existing = (
        db.query(LessonSession)
        .filter(
            LessonSession.user_id == current_user.id,
            LessonSession.video_id == body.video_id,
            LessonSession.ended_at.is_(None),
        )
        .first()
    )

    if existing:
        existing.sentences_practiced = body.sentences_practiced
        existing.correct_chars = body.correct_chars
        existing.hint_count = body.hint_count
        existing.incorrect_chars = body.incorrect_chars
        if body.ended_at is not None:
            existing.ended_at = body.ended_at
        db.commit()
        db.refresh(existing)
        return existing

    session = LessonSession(
        user_id=current_user.id,
        video_id=body.video_id,
        started_at=body.started_at,
        ended_at=body.ended_at,
        sentences_practiced=body.sentences_practiced,
        correct_chars=body.correct_chars,
        hint_count=body.hint_count,
        incorrect_chars=body.incorrect_chars,
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return session
