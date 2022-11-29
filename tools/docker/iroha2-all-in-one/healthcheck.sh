#!/usr/bin/env sh

# Fail on first wrong command
set -e

# First peer access point
API_URL="http://0.0.0.0:8080"
TELEMETRY_URL="http://0.0.0.0:8180"

echo "Iroha2 Ledger Healtcheck..."

# Check health
healthStatus=$(wget -O- "${API_URL}/health" 2>/dev/null)
if echo $healthStatus | grep -F '"Healthy"'; then
  echo "Status healthy"
else
  echo "Wrong health status check: ${healthStatus}"
  exit 1
fi

# Get blocks
blocks=$(wget -O- "${TELEMETRY_URL}/status" 2>/dev/null | jq -r '.blocks')
if [ $blocks -lt 1 ]; then
  echo "No genesis block yet..."
  exit 1
fi

echo "Healtcheck OK."
