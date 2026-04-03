# Ear2Finger backend (shim)

Application code lives in **`../src/ear2finger/`** and is packaged via the repo root **`pyproject.toml`**.

## Quick start (development)

From **`backend/`** with a virtualenv:

```bash
pip install -e ..
uvicorn ear2finger.app:app --reload --host 0.0.0.0 --port 9528
```

Alternatively, **`main.py`** prepends **`../src`** to `sys.path`, so this also works without an editable install:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 9528
```

SQLite defaults to **`./ear2finger.db` relative to the process working directory**; set **`DATABASE_URL`** if you need a fixed path.
