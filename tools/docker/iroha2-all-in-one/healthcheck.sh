#!/usr/bin/env sh

# Fail on first wrong command
set -e

# First peer access point
API_URL="http://0.0.0.0:8080"
TELEMETRY_URL="http://0.0.0.0:8180"

# Check health
wget -O- "${API_URL}/health" | grep -Fi 'Healthy'
echo "Status: Healthy"

# Get blocks
blocks=$(wget -O- "${TELEMETRY_URL}/status" | jq -r '.blocks')
if [ blocks -lt 1]; then
  echo "No genesis block yet..."
  exit 1
fi

echo "Healtcheck OK."
