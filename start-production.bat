@echo off
cd /d "%~dp0"
if not exist ".output\server\index.mjs" (
  echo Production build missing. Run npm run build first.
  pause
  exit /b 1
)
set HOST=0.0.0.0
set PORT=3000
set NODE_ENV=production
node .output/server/index.mjs
pause
