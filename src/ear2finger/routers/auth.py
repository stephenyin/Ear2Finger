import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session

from ear2finger.database import get_db, User
from ear2finger.auth import get_password_hash, create_access_token, get_current_user, verify_password
from ear2finger.demo_access import (
    demo_try_enabled,
    is_demo_user,
    mark_user_as_demo,
    seed_demo_playlist_with_all_lessons,
)

router = APIRouter()


class UserRegister(BaseModel):
    username: str
    password: str
    email: str | None = None

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not v or len(v) < 2:
            raise ValueError("Username must be at least 2 characters")
        if not v.isalnum() and "_" not in v and "-" not in v:
            raise ValueError("Username must be alphanumeric, dash or underscore")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserLogin(BaseModel):
    username: str
    password: str


class TokenUser(BaseModel):
    id: int
    username: str
    email: str | None
    is_superuser: bool
    created_at: str | None
    is_demo: bool = False


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: TokenUser


class UserResponse(BaseModel):
    id: int
    username: str
    email: str | None
    is_superuser: bool
    created_at: str | None
    is_demo: bool = False


@router.post("/auth/register", response_model=TokenResponse)
async def register(
    body: UserRegister,
    db: Session = Depends(get_db),
):
    """Register a new user. Returns token and user info."""
    existing = db.query(User).filter(User.username == body.username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )
    # First user becomes superuser
    is_first_user = db.query(User).count() == 0
    user = User(
        username=body.username,
        email=body.email,
        hashed_password=get_password_hash(body.password),
        is_superuser=is_first_user,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=TokenUser(
            id=user.id,
            username=user.username,
            email=user.email,
            is_superuser=bool(getattr(user, "is_superuser", False)),
            created_at=user.created_at.isoformat() if user.created_at else None,
            is_demo=is_demo_user(db, user),
        ),
    )


@router.post("/auth/login", response_model=TokenResponse)
async def login(
    body: UserLogin,
    db: Session = Depends(get_db),
):
    """Login with username and password. Returns JWT and user info."""
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=TokenUser(
            id=user.id,
            username=user.username,
            email=user.email,
            is_superuser=bool(getattr(user, "is_superuser", False)),
            created_at=user.created_at.isoformat() if user.created_at else None,
            is_demo=is_demo_user(db, user),
        ),
    )


@router.post("/auth/try", response_model=TokenResponse)
async def try_demo_account(db: Session = Depends(get_db)):
    """Create a temporary demo user (marked in user_configs), seed playlist with all lessons."""
    if not demo_try_enabled():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demo signup is not enabled")

    password = secrets.token_urlsafe(24)
    created_user: User | None = None
    for _ in range(12):
        username = "demo_" + secrets.token_urlsafe(9).replace("-", "_")
        if db.query(User).filter(User.username == username).first():
            continue
        created_user = User(
            username=username,
            email=None,
            hashed_password=get_password_hash(password),
            is_superuser=False,
        )
        db.add(created_user)
        db.flush()
        mark_user_as_demo(db, created_user.id)
        seed_demo_playlist_with_all_lessons(db, created_user.id)
        db.refresh(created_user)
        break

    if created_user is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create demo account",
        )

    token = create_access_token(data={"sub": str(created_user.id)})
    return TokenResponse(
        access_token=token,
        user=TokenUser(
            id=created_user.id,
            username=created_user.username,
            email=created_user.email,
            is_superuser=False,
            created_at=created_user.created_at.isoformat() if created_user.created_at else None,
            is_demo=True,
        ),
    )


@router.get("/auth/me", response_model=UserResponse)
async def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current authenticated user."""
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        is_superuser=bool(getattr(current_user, "is_superuser", False)),
        created_at=current_user.created_at.isoformat() if current_user.created_at else None,
        is_demo=is_demo_user(db, current_user),
    )
