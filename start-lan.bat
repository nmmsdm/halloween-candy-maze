@echo off
cd /d "%~dp0"
if not exist "node_modules" (
  echo Dependencies not installed. Run npm install first.
  pause
  exit /b 1
)
echo Starting Halloween Candy Maze on port 3000...
echo Keep this window open while people are playing.
call npm run dev
pause
