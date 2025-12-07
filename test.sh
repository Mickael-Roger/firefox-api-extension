#!/bin/bash
set -e

echo "Starting web-ext run in background..."
npx web-ext run --verbose --no-reload --keep-profile-changes &
WEB_EXT_PID=$!

echo "Waiting for extension to load..."
sleep 10

echo "Testing REST API..."
curl -f http://localhost:8080/windows || echo "curl failed"
curl -f http://localhost:8080/tabs || echo "curl failed"

echo "Killing web-ext process..."
kill $WEB_EXT_PID
wait $WEB_EXT_PID 2>/dev/null
echo "Test complete."