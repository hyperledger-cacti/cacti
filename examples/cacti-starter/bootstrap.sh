#!/bin/bash
set -e

echo "[Cacti Starter] Enabling corepack..."
npm run enable-corepack

echo "[Cacti Starter] Installing dependencies..."
yarn install

echo "[Cacti Starter] Running yarn configure..."
yarn configure

echo "[Cacti Starter] Bootstrap complete!"
