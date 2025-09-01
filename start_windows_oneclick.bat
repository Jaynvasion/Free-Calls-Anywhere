@echo off
title Free Calls Anywhere - One Click (Install + Run)
cd /d "%~dp0"

echo.
echo == Installing dependencies (safe to rerun) ==
call npm install
if %errorlevel% neq 0 (
  echo.
  echo !!! npm install failed. Make sure Node.js is installed and you have internet.
  echo Try: winget install OpenJS.NodeJS.LTS
  pause
  exit /b 1
)

echo.
where cloudflared >nul 2>&1
if %errorlevel% neq 0 (
  echo Cloudflared not found. Attempting to install via winget...
  winget install --id Cloudflare.cloudflared -e
  if %errorlevel% neq 0 (
    echo Could not install cloudflared automatically.
    echo Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
    pause
    exit /b 1
  )
)

echo.
echo == Starting server ==
start "Free Calls Anywhere - Server" cmd /k "npm start"

timeout /t 2 >nul

echo == Starting Cloudflare Tunnel ==
start "Free Calls Anywhere - Tunnel" cmd /k "cloudflared tunnel --url http://localhost:3000"

echo.
echo Two windows should now be open: "Server" and "Tunnel".
echo Copy the HTTPS link from the Tunnel window and share it (optionally add ?room=YOUR_ID).
echo Press any key to close this launcher.
pause >nul
