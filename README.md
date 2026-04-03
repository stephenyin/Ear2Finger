# Ear2Finger

A locally deployable web application that allows users to improve their English listening and dictation skills, **with an AI coach that analyzes your practice history and recommends what to study next**.

## Tech Stack

### Backend
- **Python 3.8+**
- **FastAPI** - Modern, fast web framework for building APIs
- **Uvicorn** - ASGI server
- **yt-dlp** - YouTube video and subtitle extraction
- **SQLAlchemy** - Database ORM
- **SQLite** - Database for storing videos and sentences
- **NLTK** - Natural language processing for sentence segmentation
- **Qdrant** - Vector database for storing sentence and learning-history embeddings (AI coach)
- **sentence-transformers** - Local embedding models for sentence and history vectors
- **Gemini** (via LangChain) - LLM provider powering the AI coach feedback

### Frontend
- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Vite** - Fast build tool and dev server
- **Axios** - HTTP client

## Project Structure

```
Ear2Finger/
├── pyproject.toml               # Python package metadata (PyPI) + dependencies
├── src/ear2finger/              # Installable application package
│   ├── app.py                   # FastAPI app (serves /api + bundled UI from web/dist when present)
│   ├── database.py, auth.py, …  # Core modules and routers/, services/
│   └── web/dist/                # Production frontend build (copy from frontend/dist before releases)
├── backend/
│   ├── main.py                  # Thin shim: uvicorn main:app (adds ../src to PYTHONPATH)
│   └── requirements.txt         # Points to pyproject.toml; use pip install -e ..
├── frontend/                    # React frontend
│   ├── src/
│   │   ├── App.tsx              # Main React component with tab navigation
│   │   ├── components/          # React components
│   │   │   ├── Workspace.tsx       # Dictation workspace with per-word input + AI coach panel
│   │   │   ├── Dashboard.tsx       # Practice dashboard with AI coach summary and tips
│   │   │   ├── LessonHistory.tsx   # Per-lesson session history with “Ask coach” integration
│   │   │   └── YouTubeProcessor.tsx# YouTube video processing UI
│   │   ├── main.tsx             # React entry point
│   │   └── index.css            # Global styles with Tailwind
│   ├── package.json             # Node.js dependencies
│   ├── vite.config.ts           # Vite configuration
│   ├── tsconfig.json            # TypeScript configuration
│   └── tailwind.config.js       # Tailwind CSS configuration
│
└── README.md                    # This file
```

## Prerequisites

- **Python 3.8+** and pip
- **Node.js 18+** and npm (or yarn/pnpm)
- **FFmpeg** (required for MP3 audio conversion from YouTube videos)
  - Install on macOS: `brew install ffmpeg`
  - Install on Ubuntu/Debian: `sudo apt-get install ffmpeg`
  - Install on Windows: Download from [FFmpeg website](https://ffmpeg.org/download.html)

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - On macOS/Linux:
     ```bash
     source venv/bin/activate
     ```
   - On Windows:
     ```bash
     venv\Scripts\activate
     ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. (Recommended) Copy environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` to configure:
   - Database, Qdrant URL/API key, and embedding model
   - Gemini API key and `GEMINI_MODEL` (required for the AI coach)

6. Run the development server:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be available at `http://localhost:8000`
   - API documentation: `http://localhost:8000/docs` (Swagger UI)
   - Alternative docs: `http://localhost:8000/redoc`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```
   (or use `yarn install` or `pnpm install`)

3. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:3000`

## PyPI package

The Python distribution name is **`ear2finger`** (see `pyproject.toml`). Build wheels locally as below, then publish to PyPI with Twine when you are ready.

**Install and run** (bundled UI + API on one port):

```bash
pip install ear2finger
ear2finger --host 0.0.0.0 --port 8000
# Open http://127.0.0.1:8000
```

**Develop from a git clone** (editable install):

```bash
pip install -e .
uvicorn ear2finger.app:app --reload --host 0.0.0.0 --port 8000
```

**Refresh the bundled UI before building a release wheel** (after `npm run build` in `frontend/`):

```bash
rm -rf src/ear2finger/web/dist && cp -R frontend/dist src/ear2finger/web/dist
```

**Build sdist + wheel** (from repo root, in a virtualenv):

```bash
pip install build
python -m build
```

**Upload** (Twine + PyPI credentials):

```bash
pip install twine
twine upload dist/*
```

## Running the Application

1. **Start the backend** (from `backend/` with venv, after `pip install -e ..`):
   ```bash
   uvicorn ear2finger.app:app --reload
   ```
   Or, without installing the package: `cd backend && uvicorn main:app --reload` (shim loads `src/`).

2. **Start the frontend** (from `frontend/` directory, in a new terminal):
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Features

### Core Learning Flow
- **YouTube import**: Paste a YouTube URL and turn it into a structured dictation lesson.
- **Extract subtitles**: Automatically extract subtitles from YouTube videos using yt-dlp.
- **Download MP3 audio**: Download audio-only MP3 files from YouTube videos (requires FFmpeg).
- **Sentence segmentation**: Intelligently segment subtitles into individual sentences using NLTK.
- **Timestamp storage**: Store each sentence with precise start and end timestamps.
- **Database storage**: Store processed videos, sentences, audio paths, and learning events in SQLite.
- **Dictation workspace**: Practice sentence-by-sentence with per-word inputs, hints, and keyboard shortcuts.
- **Lesson playlists**: Organize imported videos into playlists and track progress per lesson.

### **AI Coach / AI Agent (highlight)**

The AI coach is a **personalized language-learning agent** that reads your practice history and:

- **Summarizes your progress**: Explains what you are doing well and where you are struggling, based on:
  - Per-word spelling difficulty
  - Hint usage
  - Error rates over time
- **Generates tailored advice**: Produces 3–5 concrete, numbered suggestions for what to practice next.
- **Recommends sentences to review**: Uses Qdrant to find sentences containing your weakest words and surfaces them as practice recommendations.
- **Respects your data**: Uses your own practice stats and sentence history only; embeddings and vectors are stored in your own Qdrant instance.

Where you see the AI coach in the UI:

- **Dashboard**:
  - `Dashboard.tsx` shows an **AI Language Coach** card with lightweight tips and recommended YouTube channels.
  - You can open a **full-screen AI coach modal** to read detailed feedback and see recommended lessons.
- **Workspace**:
  - `Workspace.tsx` can automatically open an **AI coach side panel** when you finish a lesson.
  - The panel shows a session recap and lets you request **practice recommendations** for the current video.
- **Lesson history**:
  - `LessonHistory.tsx` adds an **“Ask coach”** button per past session so you can get feedback on specific practice days.

AI coach plumbing:

- Backend endpoints:
  - `/api/user/progress` + `/api/user/stats` aggregate fine-grained word- and sentence-level stats.
  - `/api/ai/coach/feedback` generates natural-language feedback via Gemini.
  - `/api/ai/coach/recommend-practice` queries Qdrant for similar sentences based on your weakest words.
- Vector store:
  - `qdrant_client.py` ingests:
    - Per-sentence learning events (`LearningProgress`) as **user learning events**.
    - All lesson sentences as **sentence embeddings** for semantic search.
  - Qdrant can run locally (default `http://localhost:6333`) or via Qdrant Cloud.
- LLM + embeddings:
  - `ai_client_factory.py` builds:
    - A Gemini chat model (configurable via `GEMINI_MODEL` and API key in `.env`).
    - A local `sentence-transformers` embedding model for Qdrant.

To **enable the AI coach**, you need:

- A running **Qdrant** instance (local or cloud) reachable from the backend.
- A valid **Gemini API key** and model name configured in `backend/.env`.
- A logged-in user practicing at least a few sentences so that stats and vectors exist.

### How It Works
1. User submits a YouTube video URL through the web interface.
2. Backend uses yt-dlp to extract video metadata and subtitles (supports both manual and auto-generated subtitles).
3. Subtitles are parsed from WebVTT format and segmented into sentences.
4. Each sentence is stored with its timestamp information in the database.
5. Users can browse processed videos and view all sentences with timestamps.
6. While practicing, per-word correctness, hints, and error characters are sent to `/api/user/progress`, aggregated by `/api/user/stats`, and ingested into Qdrant.
7. The AI coach uses these stats and vectors to generate feedback and practice recommendations.

## API Endpoints

### Health
- `GET /api/health` - Health check endpoint

### Dictation (Legacy)
- `GET /api/dictations` - Get all dictation exercises
- `GET /api/dictations/{id}` - Get a specific dictation exercise
- `POST /api/dictations` - Create a new dictation exercise

### YouTube Processing
- `POST /api/youtube/process` - Process a YouTube video (extract subtitles, download MP3 audio, and segment)
- `GET /api/youtube/videos` - Get all processed videos
- `GET /api/youtube/videos/{video_id}` - Get a specific video
- `GET /api/youtube/videos/{video_id}/sentences` - Get all sentences for a video
- `GET /api/youtube/videos/{video_id}/audio` - Download the MP3 audio file for a video
- `DELETE /api/youtube/videos/{video_id}` - Delete a video, its sentences, and audio file

### Learning Progress & Stats
- `GET /api/user/progress` - Get raw learning progress events for the current user
- `POST /api/user/progress` - Upsert a learning progress event for a sentence/video
- `GET /api/user/stats` - Get aggregated user stats (totals, distributions, and top tricky words)

### AI Coach / AI Agent
- `POST /api/ai/coach/feedback` - Generate personalized, LLM-based feedback from aggregated user stats
- `POST /api/ai/coach/recommend-practice` - Recommend sentences/videos to review based on weak words and Qdrant search

See the interactive API documentation at `http://localhost:8000/docs` for more details.

## Development

### Backend Development

- The backend uses FastAPI with automatic API documentation.
- Code is organized in routers for different features.
- Add new endpoints by creating routers in `backend/routers/`.
- AI coach behavior is primarily in:
  - `routers/learning_progress.py` (stats aggregation)
  - `routers/ai_coach.py` (AI coach endpoints)
  - `services/qdrant_client.py` (vector store)
  - `services/ai_client_factory.py` (LLM + embeddings).

### Frontend Development

- The frontend uses Vite for fast hot module replacement.
- TypeScript provides type safety.
- Tailwind CSS is configured and ready to use.
- Components are in `frontend/src/`, with AI coach UI in:
  - `components/Dashboard.tsx`
  - `components/Workspace.tsx`
  - `components/LessonHistory.tsx`.

## Building for Production

### Backend

The backend can be run with uvicorn in production mode:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

For production, consider using a process manager like systemd, supervisor, or Docker.

### Frontend

Build the frontend for production:
```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/` and can be served by any static file server or integrated with the backend.

## License

See LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
