#!/bin/bash

# Script to run both backend and frontend in development mode
# Requires two terminal windows or use a process manager

echo "Starting Ear2Finger development servers..."
echo ""
echo "Backend will run on: http://localhost:9528"
echo "Frontend will run on: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Start backend (installs the `ear2finger` package from repo root in editable mode)
echo "Starting backend..."
REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_ROOT/backend"
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
if ! pip install -e ".."; then
  echo "ERROR: pip install -e .. failed (fix pyproject.toml / network, then retry)." >&2
  exit 1
fi
python -m uvicorn ear2finger.app:app --reload --host 0.0.0.0 --port 9528 &
BACKEND_PID=$!
cd "$REPO_ROOT"

# Wait a moment for backend to start
sleep 2

# Start frontend
echo "Starting frontend..."
cd "$REPO_ROOT/frontend"
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi
npm run dev &
FRONTEND_PID=$!
cd "$REPO_ROOT"

echo ""
echo "Both servers are running!"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""

# Wait for both processes
wait
