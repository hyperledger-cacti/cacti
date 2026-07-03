#!/bin/sh
# sort-package-json rewrites package.json files in place. Run it, then fail
# if the working tree gained any package.json diffs -- this keeps package.json
# ordering stable without silently mutating the tree on push.
# Skip with: SKIP_SORT_PKG_JSON=1 git push ...

set -e

if [ "${SKIP_SORT_PKG_JSON:-0}" = "1" ]; then
	echo "  SKIPPED (SKIP_SORT_PKG_JSON=1)"
	exit 0
fi

yarn tools:sort-package-json

if ! git diff --quiet -- '**/package.json' 'package.json'; then
	echo "  ERROR: package.json files are not sorted. The tool rewrote them:" >&2
	git diff --name-only -- '**/package.json' 'package.json' | sed 's/^/    /' >&2
	echo "  Stage the changes, amend, and push again:" >&2
	echo "    git add -u && git commit --amend --no-edit --signoff && git push" >&2
	echo "  Bypass (not recommended):  SKIP_SORT_PKG_JSON=1 git push ..." >&2
	exit 1
fi
