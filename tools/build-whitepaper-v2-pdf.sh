#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WHITEPAPER_DIR="$ROOT_DIR/whitepaper/v2"
OUTPUT_DIR="${WHITEPAPER_OUTPUT_DIR:-$ROOT_DIR/docs/docs/cactus/assets/whitepaper}"
OUTPUT_FILE="${WHITEPAPER_OUTPUT_FILE:-hyperledger-cacti-whitepaper-v2.pdf}"

if [[ -n "${WHITEPAPER_BUILD_TARGET:-}" ]]; then
  BUILD_TARGET="$WHITEPAPER_BUILD_TARGET"
elif command -v latexmk >/dev/null 2>&1; then
  BUILD_TARGET="pdf"
else
  BUILD_TARGET="container-pdf"
fi

echo "Building whitepaper v2 PDF with target: ${BUILD_TARGET}"
make -C "$WHITEPAPER_DIR" "$BUILD_TARGET"

mkdir -p "$OUTPUT_DIR"
cp "$WHITEPAPER_DIR/build/main.pdf" "$OUTPUT_DIR/$OUTPUT_FILE"

echo "Whitepaper PDF copied to: $OUTPUT_DIR/$OUTPUT_FILE"
