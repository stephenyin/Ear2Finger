"""Online demo: mark users via existing user_configs (no schema changes)."""

from __future__ import annotations

import os

from sqlalchemy import func
from sqlalchemy.orm import Session

from ear2finger.database import User

# Stored in user_configs so we do not add columns to users.
DEMO_USER_CONFIG_KEY = "ear2finger_demo"


def _demo_playlist_name(user_id: int) -> str:
    """Per-user name: some DBs enforce UNIQUE on playlists.name globally, not per user_id."""
    return f"All lessons (demo) #{user_id}"


def demo_try_enabled() -> bool:
    """When false, POST /api/auth/try is disabled. Default on for demo-oriented deploys."""
    v = os.getenv("EAR2FINGER_DEMO_ENABLED", "1").strip().lower()
    return v not in ("0", "false", "no", "off")


def is_demo_user(db: Session, user: User) -> bool:
    from ear2finger.database import UserConfig

    row = (
        db.query(UserConfig)
        .filter(UserConfig.user_id == user.id, UserConfig.key == DEMO_USER_CONFIG_KEY)
        .first()
    )
    if row is None:
        return False
    val = (row.value or "").strip().lower()
    return val in ("1", "true", "yes")


def mark_user_as_demo(db: Session, user_id: int) -> None:
    from ear2finger.database import UserConfig

    row = (
        db.query(UserConfig)
        .filter(UserConfig.user_id == user_id, UserConfig.key == DEMO_USER_CONFIG_KEY)
        .first()
    )
    if row:
        row.value = "1"
    else:
        db.add(UserConfig(user_id=user_id, key=DEMO_USER_CONFIG_KEY, value="1"))


def get_video_for_user(db: Session, user: User, video_id: int):
    """Video visible in workspace/API: own videos, or any catalog video for demo users."""
    from ear2finger.database import Video

    q = db.query(Video).filter(Video.id == video_id, Video.deleted_at.is_(None))
    if is_demo_user(db, user):
        return q.first()
    return q.filter(Video.user_id == user.id).first()


def seed_demo_playlist_with_all_lessons(db: Session, user_id: int) -> None:
    """Create a playlist and add every non-deleted video so the workspace sidebar is populated."""
    from ear2finger.database import Playlist, PlaylistVideo, Video

    name = _demo_playlist_name(user_id)
    pl = (
        db.query(Playlist)
        .filter(Playlist.user_id == user_id, Playlist.name == name)
        .first()
    )
    if not pl:
        pl = Playlist(name=name, user_id=user_id)
        db.add(pl)
        db.flush()

    video_ids = [r[0] for r in db.query(Video.id).filter(Video.deleted_at.is_(None)).order_by(Video.id).all()]
    existing = {
        pv.video_id
        for pv in db.query(PlaylistVideo).filter(PlaylistVideo.playlist_id == pl.id).all()
    }
    max_order = (
        db.query(func.coalesce(func.max(PlaylistVideo.order), -1))
        .filter(PlaylistVideo.playlist_id == pl.id)
        .scalar()
    )
    o = int(max_order) + 1
    for vid in video_ids:
        if vid in existing:
            continue
        db.add(PlaylistVideo(playlist_id=pl.id, video_id=vid, order=o))
        o += 1
    db.commit()
