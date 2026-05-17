@echo off
title MailSender - Fix & Deploy
color 0A
echo.
echo  =============================================
echo    MailSender - Fix Database + Full Deploy
echo  =============================================
echo.
cd /d "c:\Users\zaman\Videos\PlusVibeClone"

echo  [1/2] Installing paramiko (needed for SSH)...
pip install paramiko --quiet 2>nul
if errorlevel 1 (
    pip3 install paramiko --quiet 2>nul
)
echo      Done.
echo.

echo  [2/2] Running full server fix + deploy...
echo         (This will take 3-5 minutes)
echo.
python fix_server.py
if errorlevel 1 (
    echo.
    echo  Trying with python3...
    python3 fix_server.py
)

echo.
echo  =============================================
pause
