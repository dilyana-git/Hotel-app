@echo off
if not exist "node_modules" (
  echo Installing dependencies, please wait...
  call npm install
)
if not exist "dist\index.html" (
  echo Building Hotel Manager for the first time, please wait...
  call npm run build
)
echo.
echo Starting Hotel Manager...
echo Open http://localhost:3001 in your browser.
echo.
start http://localhost:3001
node server.js
