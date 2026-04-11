from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from ear2finger.database import get_db, Playlist, Video, PlaylistVideo, Sentence, User
from ear2finger.auth import get_current_user
from ear2finger.demo_access import get_video_for_user, is_demo_user

router = APIRouter()


class PlaylistCreate(BaseModel):
    name: str


class PlaylistUpdate(BaseModel):
    name: str


class PlaylistResponse(BaseModel):
    id: int
    name: str
    created_at: str
    video_count: int

    class Config:
        from_attributes = True


class PlaylistVideoResponse(BaseModel):
    id: int
    video_id: int
    title: Optional[str]
    duration: Optional[float]
    sentence_count: int
    audio_file_path: Optional[str]
    youtube_url: Optional[str]
    order: int

    class Config:
        from_attributes = True


@router.post("/playlists", response_model=PlaylistResponse)
async def create_playlist(
    playlist: PlaylistCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new playlist.

    If a playlist with the same name already exists for this user, return that instead of
    creating a duplicate. This makes playlist creation idempotent by name.
    """
    # Check for existing playlist with the same name for this user
    existing = db.query(Playlist).filter(
        Playlist.user_id == current_user.id,
        Playlist.name == playlist.name,
    ).first()
    if existing:
        video_count = db.query(PlaylistVideo).filter(
            PlaylistVideo.playlist_id == existing.id
        ).count()
        return {
            'id': existing.id,
            'name': existing.name,
            'created_at': existing.created_at.isoformat() if existing.created_at else None,
            'video_count': video_count
        }

    new_playlist = Playlist(name=playlist.name, user_id=current_user.id)
    db.add(new_playlist)
    db.commit()
    db.refresh(new_playlist)

    return {
        'id': new_playlist.id,
        'name': new_playlist.name,
        'created_at': new_playlist.created_at.isoformat() if new_playlist.created_at else None,
        'video_count': 0
    }


@router.get("/playlists", response_model=List[PlaylistResponse])
async def get_playlists(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all playlists for the current user"""
    playlists = db.query(Playlist).filter(Playlist.user_id == current_user.id).all()
    result = []
    for playlist in playlists:
        video_count = db.query(PlaylistVideo).filter(PlaylistVideo.playlist_id == playlist.id).count()
        result.append({
            'id': playlist.id,
            'name': playlist.name,
            'created_at': playlist.created_at.isoformat() if playlist.created_at else None,
            'video_count': video_count
        })
    return result


@router.patch("/playlists/{playlist_id}", response_model=PlaylistResponse)
async def update_playlist(
    playlist_id: int,
    body: PlaylistUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Rename a playlist."""
    playlist = db.query(Playlist).filter(
        Playlist.id == playlist_id,
        Playlist.user_id == current_user.id,
    ).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    playlist.name = body.name
    db.commit()
    db.refresh(playlist)
    video_count = db.query(PlaylistVideo).filter(PlaylistVideo.playlist_id == playlist.id).count()
    return {
        "id": playlist.id,
        "name": playlist.name,
        "created_at": playlist.created_at.isoformat() if playlist.created_at else None,
        "video_count": video_count,
    }


@router.get("/playlists/{playlist_id}", response_model=PlaylistResponse)
async def get_playlist(
    playlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a specific playlist"""
    playlist = db.query(Playlist).filter(
        Playlist.id == playlist_id,
        Playlist.user_id == current_user.id,
    ).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    video_count = db.query(PlaylistVideo).filter(PlaylistVideo.playlist_id == playlist.id).count()
    return {
        'id': playlist.id,
        'name': playlist.name,
        'created_at': playlist.created_at.isoformat() if playlist.created_at else None,
        'video_count': video_count
    }


@router.get("/playlists/{playlist_id}/videos", response_model=List[PlaylistVideoResponse])
async def get_playlist_videos(
    playlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get videos in a playlist"""
    playlist = db.query(Playlist).filter(
        Playlist.id == playlist_id,
        Playlist.user_id == current_user.id,
    ).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    playlist_videos = db.query(PlaylistVideo).filter(
        PlaylistVideo.playlist_id == playlist_id
    ).order_by(PlaylistVideo.order).all()

    from ear2finger.database import Sentence
    result = []
    for pv in playlist_videos:
        video = db.query(Video).filter(
            Video.id == pv.video_id,
            Video.deleted_at.is_(None),
        ).first()
        if video:
            sentence_count = db.query(Sentence).filter(Sentence.video_id == video.id).count()
            result.append({
                'id': pv.id,
                'video_id': video.id,
                'title': video.title,
                'duration': video.duration,
                'sentence_count': sentence_count,
                'audio_file_path': video.audio_file_path,
                'youtube_url': video.youtube_url,
                'order': pv.order
            })

    return result


@router.post("/playlists/{playlist_id}/videos/{video_id}")
async def add_video_to_playlist(
    playlist_id: int,
    video_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a video to a playlist"""
    playlist = db.query(Playlist).filter(
        Playlist.id == playlist_id,
        Playlist.user_id == current_user.id,
    ).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    video = get_video_for_user(db, current_user, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    # Check if video is already in playlist
    existing = db.query(PlaylistVideo).filter(
        PlaylistVideo.playlist_id == playlist_id,
        PlaylistVideo.video_id == video_id
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Video already in playlist")

    # Insert at top: new video gets order 0, shift existing items down
    for pv in db.query(PlaylistVideo).filter(PlaylistVideo.playlist_id == playlist_id).all():
        pv.order += 1
    playlist_video = PlaylistVideo(
        playlist_id=playlist_id,
        video_id=video_id,
        order=0,
    )
    db.add(playlist_video)
    db.commit()

    return {"message": "Video added to playlist successfully"}


@router.delete("/playlists/{playlist_id}/videos/{video_id}")
async def remove_video_from_playlist(
    playlist_id: int,
    video_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a video from a playlist"""
    if is_demo_user(db, current_user):
        raise HTTPException(
            status_code=403,
            detail="Demo accounts cannot remove lessons from a playlist.",
        )
    playlist = db.query(Playlist).filter(
        Playlist.id == playlist_id,
        Playlist.user_id == current_user.id,
    ).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")
    playlist_video = db.query(PlaylistVideo).filter(
        PlaylistVideo.playlist_id == playlist_id,
        PlaylistVideo.video_id == video_id
    ).first()

    if not playlist_video:
        raise HTTPException(status_code=404, detail="Video not found in playlist")

    db.delete(playlist_video)
    db.commit()

    return {"message": "Video removed from playlist successfully"}


@router.delete("/playlists/{playlist_id}")
async def delete_playlist(
    playlist_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a playlist"""
    playlist = db.query(Playlist).filter(
        Playlist.id == playlist_id,
        Playlist.user_id == current_user.id,
    ).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    db.delete(playlist)
    db.commit()

    return {"message": "Playlist deleted successfully"}
