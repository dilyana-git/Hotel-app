#!/bin/bash
if [ ! -f "dist/index.html" ]; then
  echo "Building Hotel Manager for the first time, please wait..."
  npm run build
fi
echo ""
echo "Starting Hotel Manager..."
echo "Open http://localhost:3001 in your browser."
echo ""
# Auto-open browser
if [[ "$OSTYPE" == "darwin"* ]]; then
  open http://localhost:3001
else
  xdg-open http://localhost:3001 2>/dev/null &
fi
node server.js
