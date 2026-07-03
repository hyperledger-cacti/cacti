#!/bin/sh
# Run prettier + eslint --fix + cspell on staged files only.
# Uses `yarn` (not `npx --no-install`) because .yarnrc.yml sets
# nodeLinker: pnpm and there is no node_modules/.bin/ for npx to find.
# Skip with: SKIP_LINT_STAGED=1 git commit ...

set -e

if [ "${SKIP_LINT_STAGED:-0}" = "1" ]; then
	echo "  SKIPPED (SKIP_LINT_STAGED=1)"
	exit 0
fi

yarn lint-staged
