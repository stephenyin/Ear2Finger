#!/usr/bin/env bash
# Start Ear2Finger on all interfaces (0.0.0.0), default port 80, detached.
# Serves the built SPA and /api from a single uvicorn process.
#
# Usage:
#   ./start-public-daemon.sh              # build frontend, then start (needs root for :80)
#   PORT=8080 ./start-public-daemon.sh    # non-privileged port
#   SKIP_BUILD=1 ./start-public-daemon.sh   # skip npm run build
#
# Logs:  <repo>/ear2finger-server.log
# PID:   <repo>/ear2finger-server.pid
#
# Stop:  kill "$(cat ear2finger-server.pid)"
#
# Port 80 on macOS/Linux usually requires: sudo ./start-public-daemon.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-80}"
LOG_FILE="${LOG_FILE:-$ROOT/ear2finger-server.log}"
PID_FILE="${PID_FILE:-$ROOT/ear2finger-server.pid}"

if [[ -f "$PID_FILE" ]]; then
  old_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if [[ -n "${old_pid:-}" ]] && kill -0 "$old_pid" 2>/dev/null; then
    echo "Already running (PID $old_pid). Stop with: kill $old_pid" >&2
    exit 1
  fi
  rm -f "$PID_FILE"
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found; install Node.js to build the frontend." >&2
  exit 1
fi

if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  echo "Building frontend…"
  (cd "$ROOT/frontend" && npm install && npm run build)
else
  echo "SKIP_BUILD=1 — using existing frontend/dist (if any)."
fi

if [[ ! -f "$ROOT/frontend/dist/index.html" ]]; then
  echo "Missing frontend/dist/index.html. Run without SKIP_BUILD=1 or run: (cd frontend && npm run build)" >&2
  exit 1
fi

# Prefer project venv, else python3 on PATH
if [[ -x "$ROOT/backend/venv/bin/python" ]]; then
  PY="$ROOT/backend/venv/bin/python"
elif [[ -x "$ROOT/.venv/bin/python" ]]; then
  PY="$ROOT/.venv/bin/python"
else
  PY="python3"
fi

if ! "$PY" -c "import uvicorn" 2>/dev/null; then
  echo "uvicorn not found for $PY. Install backend deps, e.g.: (cd backend && pip install -r requirements.txt)" >&2
  exit 1
fi

if [[ "$PORT" -eq 80 ]] || [[ "$PORT" -eq 443 ]]; then
  if [[ "$(id -u)" -ne 0 ]] && ! /usr/sbin/authbind true 2>/dev/null; then
    echo "Note: binding to port $PORT often requires root (e.g. sudo $0) or authbind/setcap." >&2
  fi
fi

cd "$ROOT"
export PYTHONPATH="$ROOT/src${PYTHONPATH:+:$PYTHONPATH}"

# Detach from terminal: nohup + redirect stdio; disown where supported
nohup env PYTHONUNBUFFERED=1 \
  "$PY" -m uvicorn ear2finger.app:app --host "$HOST" --port "$PORT" \
  >>"$LOG_FILE" 2>&1 &
SERVER_PID=$!

disown "$SERVER_PID" 2>/dev/null || true

echo "$SERVER_PID" >"$PID_FILE"
sleep 0.3
if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "Server exited immediately. See $LOG_FILE" >&2
  rm -f "$PID_FILE"
  exit 1
fi

echo "Ear2Finger started detached."
echo "  PID:     $SERVER_PID"
echo "  Listen:  http://${HOST}:${PORT}/  (use this machine’s LAN IP from other devices)"
echo "  Log:     $LOG_FILE"
echo "  Stop:    kill $SERVER_PID"
