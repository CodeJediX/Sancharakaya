@echo off
cd /d "%~dp0"
if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo.
  echo Created .env from .env.example.
  echo Open .env in VS Code, add your GEMINI_API_KEY, save it, then run this file again.
  echo.
  pause
  exit /b 1
)
start "" "http://localhost:8787"
node server\index.js
pause
