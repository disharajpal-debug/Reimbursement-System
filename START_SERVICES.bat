@echo off
REM Employee Dashboard - Quick Start for Windows
REM This batch script starts both backend and frontend servers

echo.
echo ==================================
echo Employee Dashboard - Quick Start
echo ==================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed. Please install Node.js first.
    exit /b 1
)

echo [Step 1] Starting Backend Server (Port 5000)...
cd /d "%~dp0reimbursement-portal-server"
start "Backend - Reimbursement System" cmd /k "node server.js"
timeout /t 3 /nobreak

echo.
echo [Step 2] Starting Frontend (Port 3000)...
cd /d "%~dp0reimbursement-portal-client"
start "Frontend - Reimbursement System" cmd /k "npm start"

echo.
echo ==================================
echo Services Starting...
echo ==================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Note: Two terminal windows will open. Keep both running.
echo Close windows to stop services.
echo.
pause
