#!/bin/bash
set -e

API_URL="http://127.0.0.1:4000/api/v1/plugins/@hyperledger/cactus-plugin-keychain-memory/set-keychain-entry-v1"

PAYLOAD='{
  "key": "hello",
  "value": "world",
  "keychainId": "starter-keychain"
}'

echo "[Cacti Starter] Testing keychain set-keychain-entry endpoint..."
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "[Cacti Starter] Response:"
echo "$RESPONSE"
