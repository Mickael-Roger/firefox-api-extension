#!/bin/bash
set -e

echo "Starting web-ext run with devtools..."
npx web-ext run --devtools --no-reload --start-url about:debugging &
WEB_EXT_PID=$!

echo "Waiting for extension to load and native host to start..."
sleep 15

echo "Testing /windows endpoint..."
curl -v http://localhost:8080/windows 2>&1 | head -20

echo "Testing /tabs endpoint..."
curl -v http://localhost:8080/tabs 2>&1 | head -20

echo "Killing web-ext process..."
kill $WEB_EXT_PID
wait $WEB_EXT_PID 2>/dev/null
echo "Done."