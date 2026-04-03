from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from routers import (
    health,
    dictation,
    youtube,
    playlists,
    auth,
    user_config,
    learning_progress,
    users,
    lesson_sessions,
)
from database import init_db

app = FastAPI(
    title="Ear2Finger API",
    description="API for English listening and dictation practice",
    version="1.0.0"
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],  # React dev servers
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(dictation.router, prefix="/api", tags=["dictation"])
app.include_router(youtube.router, prefix="/api", tags=["youtube"])
app.include_router(playlists.router, prefix="/api", tags=["playlists"])
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(user_config.router, prefix="/api", tags=["user"])
app.include_router(learning_progress.router, prefix="/api", tags=["user"])
app.include_router(users.router, prefix="/api", tags=["users"])
app.include_router(lesson_sessions.router, prefix="/api", tags=["lesson-sessions"])

# Production SPA: built Vite app (sibling ../frontend/dist). Same origin as /api — no CORS issues.
_FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
_ASSETS_DIR = _FRONTEND_DIST / "assets"


def _spa_enabled() -> bool:
    return _FRONTEND_DIST.is_dir() and (_FRONTEND_DIST / "index.html").is_file()


if _spa_enabled():
    if _ASSETS_DIR.is_dir():
        app.mount("/assets", StaticFiles(directory=str(_ASSETS_DIR)), name="assets")

    @app.get("/")
    async def root_spa():
        return FileResponse(_FRONTEND_DIST / "index.html")

    @app.get("/{full_path:path}")
    async def spa_or_static(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = _FRONTEND_DIST / full_path
        try:
            candidate.resolve().relative_to(_FRONTEND_DIST.resolve())
        except ValueError:
            raise HTTPException(status_code=404, detail="Not found") from None
        if candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(_FRONTEND_DIST / "index.html")
else:

    @app.get("/")
    async def root():
        return {"message": "Welcome to Ear2Finger API"}
