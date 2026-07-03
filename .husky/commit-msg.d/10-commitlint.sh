#!/bin/sh
# Validate the commit message against Conventional Commits + length rules
# defined in commitlint.config.js.
# Skip with: SKIP_COMMITLINT=1 git commit ...

set -e

if [ "${SKIP_COMMITLINT:-0}" = "1" ]; then
	echo "  SKIPPED (SKIP_COMMITLINT=1)"
	exit 0
fi

yarn commitlint --edit "$1"
