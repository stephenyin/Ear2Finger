from sqlalchemy import create_engine, Column, Integer, String, Float, Text, ForeignKey, DateTime, Boolean, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ear2finger.db")

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, nullable=False, unique=True, index=True)
    email = Column(String, nullable=True, index=True)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
     # True if this user can manage other users
    is_superuser = Column(Boolean, nullable=False, default=False, server_default="0")

    # Relationships
    playlists = relationship("Playlist", back_populates="user", cascade="all, delete-orphan")
    videos = relationship("Video", back_populates="user", cascade="all, delete-orphan")
    configs = relationship("UserConfig", back_populates="user", cascade="all, delete-orphan")
    learning_progress = relationship("LearningProgress", back_populates="user", cascade="all, delete-orphan")
    lesson_sessions = relationship("LessonSession", back_populates="user", cascade="all, delete-orphan")


class Playlist(Base):
    __tablename__ = "playlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # nullable for migration
    name = Column(String, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Unique per user: (user_id, name)
    user = relationship("User", back_populates="playlists")
    videos = relationship("PlaylistVideo", back_populates="playlist", cascade="all, delete-orphan")


class Video(Base):
    __tablename__ = "videos"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # nullable for migration
    youtube_url = Column(String, nullable=False, index=True)
    title = Column(String, nullable=True)
    duration = Column(Float, nullable=True)
    audio_file_path = Column(String, nullable=True)  # Path to downloaded MP3 file
    created_at = Column(DateTime, default=datetime.utcnow)
    deleted_at = Column(DateTime, nullable=True)  # Soft-delete: learning data preserved for analysis

    # Unique per user: (user_id, youtube_url)
    user = relationship("User", back_populates="videos")
    sentences = relationship("Sentence", back_populates="video", cascade="all, delete-orphan")
    playlist_videos = relationship("PlaylistVideo", back_populates="video", cascade="all, delete-orphan")


class UserConfig(Base):
    __tablename__ = "user_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    key = Column(String, nullable=False, index=True)
    value = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Unique per user: (user_id, key)
    user = relationship("User", back_populates="configs")


class LearningProgress(Base):
    __tablename__ = "learning_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False, index=True)
    sentence_id = Column(Integer, ForeignKey("sentences.id"), nullable=True, index=True)
    data = Column(Text, nullable=True)  # JSON: score, completed, attempts, etc.
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="learning_progress")


class PlaylistVideo(Base):
    __tablename__ = "playlist_videos"

    id = Column(Integer, primary_key=True, index=True)
    playlist_id = Column(Integer, ForeignKey("playlists.id"), nullable=False)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    playlist = relationship("Playlist", back_populates="videos")
    video = relationship("Video", back_populates="playlist_videos")


class Sentence(Base):
    __tablename__ = "sentences"

    id = Column(Integer, primary_key=True, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False)
    sentence_text = Column(Text, nullable=False)
    start_time = Column(Float, nullable=False)  # Start time in seconds
    end_time = Column(Float, nullable=False)    # End time in seconds
    sentence_index = Column(Integer, nullable=False)  # Order in the video

    # Relationships
    video = relationship("Video", back_populates="sentences")


class LessonSession(Base):
    """One practice session for a lesson (video). History entry with scores."""
    __tablename__ = "lesson_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    video_id = Column(Integer, ForeignKey("videos.id"), nullable=False, index=True)
    started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)  # null = incomplete (Resume)
    sentences_practiced = Column(Integer, nullable=False, default=0)
    correct_chars = Column(Integer, nullable=False, default=0)
    hint_count = Column(Integer, nullable=False, default=0)
    incorrect_chars = Column(Integer, nullable=False, default=0)

    user = relationship("User", back_populates="lesson_sessions")
    video = relationship("Video", backref="lesson_sessions")


def init_db():
    """Initialize the database by creating all tables"""
    Base.metadata.create_all(bind=engine)
    # Run migrations to add any missing columns
    migrate_db()


def migrate_db():
    """Migrate database schema to add new columns and constraints"""
    from sqlalchemy import text

    try:
        inspector = inspect(engine)
        table_names = inspector.get_table_names()

        # Check if videos table exists and if audio_file_path column is missing
        if 'videos' in table_names:
            columns = inspector.get_columns('videos')
            column_names = [col['name'] if isinstance(col, dict) else col.name for col in columns]

            if 'audio_file_path' not in column_names:
                # Add the missing column
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE videos ADD COLUMN audio_file_path VARCHAR"))
                print("Database migrated: Added audio_file_path column to videos table")

        # --- User and user_id migrations ---
        if 'users' in table_names:
            # Ensure is_superuser column exists
            user_columns = inspector.get_columns('users')
            user_column_names = [col['name'] if isinstance(col, dict) else col.name for col in user_columns]
            if 'is_superuser' not in user_column_names:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE users ADD COLUMN is_superuser BOOLEAN NOT NULL DEFAULT 0"))
                print("Database migrated: Added is_superuser to users")

        if 'playlists' in table_names:
            columns = inspector.get_columns('playlists')
            column_names = [col['name'] if isinstance(col, dict) else col.name for col in columns]
            if 'user_id' not in column_names:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE playlists ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                print("Database migrated: Added user_id to playlists")

        if 'videos' in table_names:
            columns = inspector.get_columns('videos')
            column_names = [col['name'] if isinstance(col, dict) else col.name for col in columns]
            if 'user_id' not in column_names:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE videos ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                print("Database migrated: Added user_id to videos")
            if 'deleted_at' not in column_names:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE videos ADD COLUMN deleted_at DATETIME"))
                print("Database migrated: Added deleted_at to videos (soft-delete)")

        # Ensure we have a default user and assign existing rows to it (run after tables exist)
        if 'users' in inspector.get_table_names():
            with engine.begin() as conn:
                r = conn.execute(text("SELECT id FROM users WHERE username = 'default'")).fetchone()
                default_id = r[0] if r else None
            if default_id is None:
                try:
                    from passlib.context import CryptContext
                    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
                    default_hashed = pwd_context.hash("default")
                except Exception as e:
                    print(f"Database migration: passlib not available ({e}). Run: pip install 'passlib[bcrypt]'. Skipping default user.")
                    default_hashed = None
                if default_hashed is not None:
                    with engine.begin() as conn:
                        conn.execute(
                            text("INSERT INTO users (username, hashed_password, created_at, is_superuser) VALUES ('default', :h, datetime('now'), 1)"),
                            {"h": default_hashed}
                        )
                        r = conn.execute(text("SELECT id FROM users WHERE username = 'default'")).fetchone()
                        default_id = r[0]
                    print("Database migrated: Created default user")
            if default_id is not None:
                if 'playlists' in table_names:
                    with engine.begin() as conn:
                        conn.execute(text("UPDATE playlists SET user_id = :uid WHERE user_id IS NULL"), {"uid": default_id})
                if 'videos' in table_names:
                    with engine.begin() as conn:
                        conn.execute(text("UPDATE videos SET user_id = :uid WHERE user_id IS NULL"), {"uid": default_id})

            # Ensure at least the first user is marked superuser
            with engine.begin() as conn:
                r = conn.execute(text("SELECT id, is_superuser FROM users ORDER BY id ASC LIMIT 1")).fetchone()
                if r is not None:
                    first_id, is_super = r
                    # SQLite may store booleans as 0/1; treat any truthy as already superuser
                    if not bool(is_super):
                        conn.execute(text("UPDATE users SET is_superuser = 1 WHERE id = :id"), {"id": first_id})
                        print("Database migrated: Marked first user as superuser")
    except Exception as e:
        # If migration fails, log the error but don't crash
        print(f"Warning: Database migration check failed: {str(e)}")
        # Try a simpler approach - just attempt to add the audio_file_path column
        try:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE videos ADD COLUMN audio_file_path VARCHAR"))
                print("Database migrated: Added audio_file_path column to videos table")
        except Exception as e2:
            # Column might already exist or table doesn't exist yet
            if "duplicate column" not in str(e2).lower() and "no such table" not in str(e2).lower():
                print(f"Warning: Could not add audio_file_path column: {str(e2)}")


def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
