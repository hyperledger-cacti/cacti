#!/bin/sh
# Reject commits that stage files under build/output/vendor directories.
# These paths are listed in .gitignore / .prettierignore and should never
# be committed. Skip with: SKIP_FORBIDDEN_PATHS=1 git commit ...

set -e

if [ "${SKIP_FORBIDDEN_PATHS:-0}" = "1" ]; then
	echo "  SKIPPED (SKIP_FORBIDDEN_PATHS=1)"
	exit 0
fi

FORBIDDEN=$(git diff --cached --name-only --diff-filter=ACMR \
	| grep -E '(^|/)(dist|generated|\.nyc_output|node_modules)/' || true)

if [ -n "$FORBIDDEN" ]; then
	echo "  ERROR: staged files inside forbidden build/output dirs:" >&2
	printf '    %s\n' $FORBIDDEN >&2
	echo "  Unstage with:  git restore --staged <file>" >&2
	echo "  Bypass (not recommended):  SKIP_FORBIDDEN_PATHS=1 git commit ..." >&2
	exit 1
fi
