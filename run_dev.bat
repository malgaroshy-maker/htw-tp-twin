@echo off
ECHO Starting Tray Packer Digital Twin Development Environment...

REM --- Check for Backend Dependencies ---
IF NOT EXIST ".venv\Scripts\activate.bat" (
    ECHO.
    ECHO ERROR: Python virtual environment not found.
    ECHO Please run 'python -m venv .venv' and 'pip install -e .' first.
    ECHO.
    pause
    GOTO :eof
)

REM --- Check for Frontend Dependencies ---
IF NOT EXIST "app\dashboard\node_modules" (
    ECHO.
    ECHO ERROR: Frontend dependencies not found.
    ECHO Please run 'npm install' in the 'app/dashboard' folder first.
    ECHO.
    pause
    GOTO :eof
)

REM --- Clean up existing processes ---
echo Cleaning up previous instances...
FOR /F "tokens=5" %%p IN ('netstat -aon ^| findstr :8000') DO @taskkill /F /PID %%p >NUL 2>&1
FOR /F "tokens=5" %%p IN ('netstat -aon ^| findstr :5173') DO @taskkill /F /PID %%p >NUL 2>&1

REM --- Start Backend ---
ECHO [1/2] Starting Backend API Server in a new window...
start "Backend - FastAPI" cmd /k "echo Activating backend environment... && call .venv\Scripts\activate.bat && echo Starting FastAPI server... && python -m uvicorn app.api.server:app --reload"

REM --- Start Frontend ---
ECHO [2/2] Starting Frontend Dashboard in a new window...
start "Frontend - Vite" cmd /k "echo Navigating to dashboard... && cd app\dashboard && echo Starting Vite dev server... && npm run dev"

ECHO.
ECHO Development servers are starting in new terminal windows.
ECHO    Backend API will be at http://localhost:8000
ECHO    Frontend will be at http://localhost:5173
ECHO.
