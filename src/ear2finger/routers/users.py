from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from ear2finger.database import get_db, User
from ear2finger.auth import get_password_hash, get_current_superuser


router = APIRouter()


class UserAdminBase(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    is_superuser: Optional[bool] = None

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Username must be at least 2 characters")
        if not v.isalnum() and "_" not in v and "-" not in v:
            raise ValueError("Username must be alphanumeric, dash or underscore")
        return v


class UserAdminCreate(UserAdminBase):
    username: str
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserAdminUpdate(UserAdminBase):
    password: Optional[str] = None


class UserAdminResponse(BaseModel):
    id: int
    username: str
    email: Optional[str]
    is_superuser: bool
    created_at: Optional[str]

    class Config:
        from_attributes = True


@router.get("/users", response_model=List[UserAdminResponse])
async def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    """List all users (superuser only)."""
    users = db.query(User).order_by(User.id.asc()).all()
    return [
        UserAdminResponse(
            id=u.id,
            username=u.username,
            email=u.email,
            is_superuser=bool(getattr(u, "is_superuser", False)),
            created_at=u.created_at.isoformat() if u.created_at else None,
        )
        for u in users
    ]


@router.post("/users", response_model=UserAdminResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserAdminCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    """Create a new user (superuser only)."""
    existing = db.query(User).filter(User.username == body.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    user = User(
        username=body.username,
        email=body.email,
        hashed_password=get_password_hash(body.password),
        is_superuser=bool(body.is_superuser),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return UserAdminResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        is_superuser=bool(user.is_superuser),
        created_at=user.created_at.isoformat() if user.created_at else None,
    )


@router.put("/users/{user_id}", response_model=UserAdminResponse)
async def update_user(
    user_id: int,
    body: UserAdminUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
):
    """Update a user (superuser only)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if body.username is not None and body.username != user.username:
        existing = db.query(User).filter(User.username == body.username).first()
        if existing and existing.id != user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered",
            )
        user.username = body.username

    if body.email is not None:
        user.email = body.email

    if body.password:
        user.hashed_password = get_password_hash(body.password)

    if body.is_superuser is not None:
        user.is_superuser = body.is_superuser

    db.commit()
    db.refresh(user)
    return UserAdminResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        is_superuser=bool(user.is_superuser),
        created_at=user.created_at.isoformat() if user.created_at else None,
    )


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_superuser: User = Depends(get_current_superuser),
):
    """Delete a user (superuser only, can delete itself too)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db.delete(user)
    db.commit()

    # If superuser deleted itself, caller will receive 401 on next request and can log out.
    return

