#!/usr/bin/env sh

# Fail on first wrong command
set -e

echo "Indy Ledger Healtcheck..."

# Check health
txCount=$(read_ledger --type pool --count)
if [ "$txCount" -gt "0" ]; then
  echo "Healtcheck OK."
else
  echo "Wrong response from ledger tx count: ${txCount}"
  exit 1
fi
