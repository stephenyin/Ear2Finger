# Ear2Finger

A locally deployable web application for **English listening and dictation practice**: import YouTube videos with subtitles, practice sentence-by-sentence with per-word input and hints, track progress on a dashboard, and organize lessons in playlists. This **lite** branch ships **without** AI coach features, vector search, or external LLM API keys—the same **SQLite** schema remains compatible with the full app if you share a database.

## Tech Stack

### Backend
- **Python 3.10+**
- **FastAPI** — HTTP API
- **Uvicorn** — ASGI server
- **yt-dlp** — YouTube metadata and subtitle extraction
- **SQLAlchemy** — ORM
- **SQLite** — Videos, sentences, users, playlists, progress (default `DATABASE_URL`)

### Frontend
- **React 18** + **TypeScript**
- **Tailwind CSS**
- **Vite** — dev server (proxies `/api` → `http://localhost:9528`)
- **Axios** — API client

## Project Structure

```
Ear2Finger/
├── pyproject.toml               # Python package metadata (PyPI) + dependencies
├── src/ear2finger/              # Installable application package
│   ├── app.py                   # FastAPI app: /api + bundled UI from web/dist when present
│   ├── database.py, auth.py, config.py
│   ├── routers/, services/      # API routes and YouTube processing
│   └── web/dist/                # Production UI (sync from frontend/dist before releases)
├── backend/
│   ├── main.py                  # Shim: uvicorn main:app prepends ../src to PYTHONPATH
│   └── requirements.txt         # Use pip install -e .. from repo root
├── frontend/                    # React SPA (dev on port 3000)
├── docs/                        # Static documentation site (index.html)
├── run-dev.sh                   # Backend (9528) + frontend (3000)
├── start-public-daemon.sh       # Optional detached server (default port 80)
└── README.md
```

## Prerequisites

- **Python 3.10+** and pip  
- **Node.js 18+** and npm (or yarn/pnpm)  
- **FFmpeg** — MP3 extraction from YouTube  
  - macOS: `brew install ffmpeg`  
  - Ubuntu/Debian: `sudo apt-get install ffmpeg`  
  - Windows: [ffmpeg.org](https://ffmpeg.org/download.html)

## Setup

### Backend (recommended: editable install from repo root)

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -e ..
uvicorn ear2finger.app:app --reload --host 0.0.0.0 --port 9528
```

Or from `backend/` without installing the package:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 9528
```

API: `http://localhost:9528` — docs at `/docs` and `/redoc`.

Optional environment variables (e.g. `.env` in your working directory): `DATABASE_URL`, `SECRET_KEY` (see your deployment notes).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App UI: `http://localhost:3000` (API requests go to the backend on **9528** via Vite proxy).

## PyPI package

Distribution name: **`ear2finger`** (`pyproject.toml`). Build and publish when ready.

```bash
pip install ear2finger
ear2finger --host 0.0.0.0 --port 9528
# http://127.0.0.1:9528 — bundled UI + /api
```

**Editable clone:**

```bash
pip install -e .
uvicorn ear2finger.app:app --reload --host 0.0.0.0 --port 9528
```

**Before building a release wheel** (refresh bundled UI):

```bash
rm -rf src/ear2finger/web/dist && cp -R frontend/dist src/ear2finger/web/dist
pip install build && python -m build
```

**Upload to PyPI:** `pip install twine && twine upload dist/*`

Installing from **TestPyPI** only resolves a tiny subset of dependencies; use `--extra-index-url https://pypi.org/simple/` so packages like `yt-dlp` resolve correctly.

## Running the application

1. Backend on **9528** (see above).  
2. Frontend: `cd frontend && npm run dev` → open `http://localhost:3000`.  
3. Or use `./run-dev.sh` to start both.

## Features

- **YouTube import** — Subtitles (manual or auto) via yt-dlp; optional MP3 audio (FFmpeg).  
- **Sentence segmentation** — Timestamped sentences stored in SQLite.  
- **Workspace** — Per-word dictation, hints, keyboard shortcuts, playlists.  
- **Dashboard** — Aggregated practice stats and daily charts.  
- **Users** — Registration/login; superuser user management in Settings.  
- **Lesson history** — Per-video session list with resume.

## API overview

- **Health:** `GET /api/health`  
- **Auth:** register, login, `/api/auth/me`  
- **YouTube:** process URL, list videos/sentences, audio download, delete  
- **Playlists:** CRUD and video membership  
- **Progress:** `GET/POST /api/user/progress`, `GET /api/user/stats`  
- **Users (admin):** `GET/POST/PUT/DELETE /api/users`  
- **User config:** `GET/PUT /api/user/config` (stores settings in DB; lite UI does not expose AI keys)  
- **Lesson sessions:** list/save sessions per video  

Interactive docs: `http://localhost:9528/docs`.

## Development

- Python package lives under **`src/ear2finger/`** — add routers there and register them in **`app.py`**.  
- Frontend: **`frontend/src/components/`**.  
- After changing the UI for a **wheel release**, rebuild and copy **`frontend/dist`** → **`src/ear2finger/web/dist`**.

## Production

```bash
uvicorn ear2finger.app:app --host 0.0.0.0 --port 9528
```

Or install the wheel and run `ear2finger`. Use a reverse proxy (nginx, Caddy), process manager, or **`start-public-daemon.sh`** (defaults to port **80**, often requires `sudo`).

Serve **`frontend/dist`** separately if you do not bundle it; otherwise the installed package serves **`web/dist`** from the same origin as `/api`.

## License

See [LICENSE](LICENSE).

## Contributing

Pull requests are welcome.
