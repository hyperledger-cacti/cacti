#!/bin/sh
# Ensure the workspace still 'configures' end-to-end (yarn install +
# build:dev:backend). Heavy; opt in only when you actually want the full
# guarantee. Skip with: SKIP_CONFIGURE=1 git push ...

set -e

if [ "${SKIP_CONFIGURE:-0}" = "1" ]; then
	echo "  SKIPPED (SKIP_CONFIGURE=1)"
	exit 0
fi

echo "  tip: set SKIP_CONFIGURE=1 to skip this heavy step"
yarn configure
