#!/bin/sh
# Lint GitHub Actions workflows (github-actionlint). Mirrors CI actionlint.
# Skip with: SKIP_ACTIONLINT=1 git push ...

set -e

if [ "${SKIP_ACTIONLINT:-0}" = "1" ]; then
	echo "  SKIPPED (SKIP_ACTIONLINT=1)"
	exit 0
fi

yarn lint:actions
