"""
Legacy entrypoint: from `backend/` run `uvicorn main:app --reload`.

Prefer: `pip install -e ..` from the repo root, then `uvicorn ear2finger.app:app`.
"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
_SRC = _ROOT / "src"
if _SRC.is_dir() and str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from ear2finger.app import app  # noqa: E402

__all__ = ["app"]
