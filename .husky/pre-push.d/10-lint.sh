#!/bin/sh
# Full project lint (prettier + eslint + cspell). Mirrors CI 'yarn lint'.
# Skip with: SKIP_LINT=1 git push ...

set -e

if [ "${SKIP_LINT:-0}" = "1" ]; then
	echo "  SKIPPED (SKIP_LINT=1)"
	exit 0
fi

yarn lint
