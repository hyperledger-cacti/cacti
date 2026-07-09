#!/bin/sh
# Scan staged changes for accidentally-committed secrets.
# Prefers a native gitleaks binary; falls back to the pinned version in
# .pre-commit-config.yaml via the python 'pre-commit' tool. Warns (not
# fails) if neither is installed. Skip with: SKIP_GITLEAKS=1 git commit ...

set -e

if [ "${SKIP_GITLEAKS:-0}" = "1" ]; then
	echo "  SKIPPED (SKIP_GITLEAKS=1)"
	exit 0
fi

if command -v gitleaks >/dev/null 2>&1; then
	gitleaks protect --staged --no-banner --redact || {
		echo "  gitleaks flagged potential secrets. Review above, then unstage or scrub." >&2
		echo "  Bypass (not recommended):  SKIP_GITLEAKS=1 git commit ..." >&2
		exit 1
	}
elif command -v pre-commit >/dev/null 2>&1; then
	pre-commit run --hook-stage commit gitleaks || {
		echo "  gitleaks (via pre-commit) flagged potential secrets." >&2
		echo "  Bypass (not recommended):  SKIP_GITLEAKS=1 git commit ..." >&2
		exit 1
	}
else
	echo "  WARN: no 'gitleaks' or 'pre-commit' on PATH; skipping secret scan." >&2
	echo "  Install one of:" >&2
	echo "    brew install gitleaks                             # macOS" >&2
	echo "    pipx install pre-commit && pre-commit install     # cross-platform" >&2
	echo "  Silence with:  SKIP_GITLEAKS=1 git commit ..." >&2
fi
