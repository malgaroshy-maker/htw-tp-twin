#!/bin/bash
echo "Starting Tray Packer Digital Twin Development Environment..."

# --- Backend ---
echo "[1/2] Starting Backend API Server..."
if [ ! -f ".venv/bin/activate" ]; then
    echo "ERROR: Virtual environment not found. Please run 'python -m venv .venv' and 'pip install -e .' first."
    exit 1
fi
source .venv/bin/activate
python -m uvicorn app.api.server:app --reload > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend server started in background (PID: $BACKEND_PID). Log: backend.log"

# --- Frontend ---
echo "[2/2] Starting Frontend Dashboard..."
if [ ! -d "app/dashboard/node_modules" ]; then
    echo "ERROR: Frontend dependencies not found. Please run 'npm install' in the 'app/dashboard' folder first."
    kill $BACKEND_PID
    exit 1
fi
(cd app/dashboard && npm run dev > ../../frontend.log 2>&1 &)
FRONTEND_PID=$!
echo "Frontend server started in background (PID: $FRONTEND_PID). Log: frontend.log"

echo ""
echo "✅ Development servers are running."
echo "   Backend API: http://localhost:8000"
echo "   Frontend:    http://localhost:5173"
echo ""
echo "View logs with:"
echo "  tail -f backend.log"
echo "  tail -f frontend.log"
echo ""
echo "To stop servers, run:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo ""
