#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$SCRIPT_DIR/../.."
CONFIG_PATH="$SCRIPT_DIR/.config.json"

cd "$REPO_ROOT"

echo "[Cacti Starter] Starting API server with custom config..."
API_CONFIG_FILE="$CONFIG_PATH" npm run start:api-server
