#!/bin/bash
set -e

echo "Killing existing processes..."
pkill -f native_host.js 2>/dev/null || true
pkill -f "web-ext run" 2>/dev/null || true
pkill firefox 2>/dev/null || true
sleep 2

echo "Starting web-ext run in background..."
npx web-ext run --no-reload --devtools > web-ext-test.log 2>&1 &
WEB_EXT_PID=$!

echo "Waiting for extension to load (30 seconds)..."
sleep 30

echo "Testing API on port 8090..."
if curl -f -s http://localhost:8090/windows > /dev/null; then
    echo "✓ /windows endpoint works"
    curl -s http://localhost:8090/windows | head -c 200
    echo ""
else
    echo "✗ /windows endpoint failed"
    echo "Checking if native host is running..."
    ps aux | grep native_host || echo "No native host process"
    echo "Web-ext log tail:"
    tail -20 web-ext-test.log
fi

echo "Testing /tabs endpoint..."
if curl -f -s http://localhost:8090/tabs > /dev/null; then
    echo "✓ /tabs endpoint works"
else
    echo "✗ /tabs endpoint failed"
fi

echo "Killing web-ext..."
kill $WEB_EXT_PID 2>/dev/null || true
wait $WEB_EXT_PID 2>/dev/null || true

echo "Test complete."