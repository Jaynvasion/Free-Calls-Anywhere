@echo off
title THE DARK PLAN - One Click (Install + Run)
echo.
echo === THE DARK PLAN ===
echo 1) Installing dependencies (this is safe to run multiple times)
echo 2) Starting the server
echo 3) Starting Cloudflare Tunnel
echo.

REM Ensure we're in the project directory
cd /d "%~dp0"

REM Install Node dependencies
call npm install
if %errorlevel% neq 0 (
  echo.
  echo !!! npm install failed. Make sure you have internet and Node.js installed.
  echo Press any key to exit.
  pause >nul
  exit /b 1
)

REM Start Node server in new window
start "THE DARK PLAN - Server" cmd /k "npm start"

REM Give the server a moment to boot
timeout /t 2 >nul

REM Start Cloudflare quick tunnel in a new window (no auth needed)
start "THE DARK PLAN - Tunnel" cmd /k "cloudflared tunnel --url http://localhost:3000"

echo.
echo Two windows should be open: "Server" and "Tunnel".
echo Copy the HTTPS link from the "Tunnel" window and send it to your friend.
echo Press any key to close this launcher window.
pause >nul
