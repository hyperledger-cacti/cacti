#!/bin/sh
# Wrapper for github-actionlin that mirrors the CI
# Currently, it performs an exclusion of Weaver workflow
# files. CI (.github/workflows/actionlint.yaml) uses:
#
#     find .github/workflows/ -name "*.yml" -o -name "*.yaml" ! -name "*weaver*"
#
# ...because the weaver test workflows carry hundreds of legacy shellcheck /
# actionlint issues that have not been fixed. Keep the local hook in lockstep
# with CI so 'yarn lint:actions' and pre-push don't flag things CI ignores.
#
# To also lint the Weaver files, pass --include-weaver:
#
#     yarn lint:actions --include-weaver
#
set -eu

INCLUDE_WEAVER=0
EXTRA_ARGS=""
for arg in "$@"; do
	case "$arg" in
		--include-weaver)
			INCLUDE_WEAVER=1 ;;
		*)
			EXTRA_ARGS="$EXTRA_ARGS $arg" ;;
	esac
done

if [ "$INCLUDE_WEAVER" = "1" ]; then
	FILES=$(find .github/workflows -maxdepth 1 \
		\( -name "*.yaml" -o -name "*.yml" \))
else
	FILES=$(find .github/workflows -maxdepth 1 \
		\( -name "*.yaml" -o -name "*.yml" \) \
		! -name "*weaver*")
fi

if [ -z "$FILES" ]; then
	echo "lint-actions: no workflow files matched." >&2
	exit 0
fi

# shellcheck disable=SC2086
exec yarn github-actionlint $FILES $EXTRA_ARGS
