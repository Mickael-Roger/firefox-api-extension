#!/bin/bash
set -e

HOST_NAME="firefox_api_extension"
MANIFEST_SOURCE="native/firefox_api_host.json"
TARGET_DIR="$HOME/.mozilla/native-messaging-hosts"
TARGET_FILE="$TARGET_DIR/$HOST_NAME.json"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NATIVE_HOST_PATH="$SCRIPT_DIR/native/native_host.js"

echo "Installing native messaging host for Firefox"

if [ ! -f "$MANIFEST_SOURCE" ]; then
    echo "Error: Manifest source $MANIFEST_SOURCE not found"
    exit 1
fi

if [ ! -f "$NATIVE_HOST_PATH" ]; then
    echo "Error: Native host script not found at $NATIVE_HOST_PATH"
    exit 1
fi

mkdir -p "$TARGET_DIR"

# Create manifest with correct path
cat "$MANIFEST_SOURCE" | sed "s|/home/mickael/Documents/Dev/firefox-api-extension/native/native_host.js|$NATIVE_HOST_PATH|g" > "$TARGET_FILE"

# Ensure native host is executable
chmod +x "$NATIVE_HOST_PATH"

echo "Installed manifest to $TARGET_FILE"
echo "Native host path: $NATIVE_HOST_PATH"

echo "Installation complete. You may need to restart Firefox."