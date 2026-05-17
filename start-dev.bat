@echo off
title MailSender - Local Dev
color 0B
echo.
echo  =====================================================
echo    MailSender - Local Development Setup
echo    Backend: http://localhost:5000
echo    Frontend: http://localhost:5173
echo  =====================================================
echo.

set ROOT=c:\Users\zaman\Videos\PlusVibeClone

REM ── Create data folder for SQLite DB ──────────────────────
if not exist "%ROOT%\data" (
    mkdir "%ROOT%\data"
    echo  [OK] Created data folder for database
)

REM ── Check Node.js ─────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js not found!
    echo  Please install from: https://nodejs.org
    echo  Download the LTS version and install it.
    pause
    exit /b 1
)
for /f %%i in ('node --version') do echo  [OK] Node.js %%i found

REM ── Install backend dependencies ───────────────────────────
echo.
echo  [1/4] Installing backend packages...
cd /d "%ROOT%\backend"
if not exist "node_modules" (
    call npm install
    echo  [OK] Backend packages installed
) else (
    echo  [OK] Backend packages already installed
)

REM ── Install frontend dependencies ──────────────────────────
echo.
echo  [2/4] Installing frontend packages...
cd /d "%ROOT%\frontend"
if not exist "node_modules" (
    call npm install
    echo  [OK] Frontend packages installed
) else (
    echo  [OK] Frontend packages already installed
)

REM ── Start Backend ─────────────────────────────────────────
echo.
echo  [3/4] Starting Backend (port 5000)...
start "MailSender Backend :5000" cmd /k "cd /d %ROOT%\backend && echo Starting backend... && npm run dev"

REM ── Wait for backend to start ─────────────────────────────
echo  Waiting for backend to start (5 seconds)...
timeout /t 5 /nobreak >nul

REM ── Start Frontend ────────────────────────────────────────
echo.
echo  [4/4] Starting Frontend (port 5173)...
start "MailSender Frontend :5173" cmd /k "cd /d %ROOT%\frontend && echo Starting frontend... && npm run dev"

REM ── Wait then open browser ────────────────────────────────
echo.
echo  Waiting for frontend to build (8 seconds)...
timeout /t 8 /nobreak >nul

echo.
echo  =====================================================
echo   Opening http://localhost:5173 in browser...
echo.
echo   LOGIN CREDENTIALS:
echo   Email:    admin@mailsender.com
echo   Password: Admin@1234
echo  =====================================================
echo.
start "" "http://localhost:5173"

echo  Both servers are now running in separate windows.
echo  Close those windows to stop the servers.
echo.
pause
