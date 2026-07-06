#!/bin/sh
# Lint only files changed in local (unpushed) commits. Mirrors CI 'yarn lint'.
# Skip with: SKIP_LINT=1 git push ...

set -e

if [ "${SKIP_LINT:-0}" = "1" ]; then
	echo "  SKIPPED (SKIP_LINT=1)"
	exit 0
fi

# Only lint files currently staged in the index
CHANGED=$(git diff --cached --name-only --diff-filter=d \
	| grep -E '\.(ts|js)$|/openapi\.json$' || true)

if [ -z "$CHANGED" ]; then
	echo "  No lintable files changed, skipping lint."
	exit 0
fi

COUNT=$(printf '%s\n' "$CHANGED" | grep -c '.')
echo "  Linting $COUNT changed file(s)..."

printf '%s\n' "$CHANGED" | xargs yarn lint:files
printf '%s\n' "$CHANGED" | xargs yarn format:files

# CSpell — only src files matching original "*/*/src/**/*.{js,ts}" scope
SPELL=$(printf '%s\n' "$CHANGED" | grep -E '^[^/]+/[^/]+/src/.*\.(ts|js)$' || true)
if [ -n "$SPELL" ]; then
	printf '%s\n' "$SPELL" | xargs yarn cspell lint --no-progress
fi
