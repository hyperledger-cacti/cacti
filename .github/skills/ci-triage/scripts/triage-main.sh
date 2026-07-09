#!/usr/bin/env bash
# Triage failing checks on the default branch (main) HEAD.
# Usage: triage-main.sh [sha]
set -euo pipefail

REPO="${CACTI_REPO:-hyperledger-cacti/cacti}"
SHA="${1:-}"
if [[ -z "$SHA" ]]; then
  SHA=$(gh api "repos/${REPO}/commits/main" --jq .sha)
fi
SHORT_SHA="${SHA:0:8}"
OUT_DIR="docs/ci-reports"
OUT="${OUT_DIR}/main-${SHORT_SHA}-ci-failures.md"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$OUT_DIR"

MSG=$(gh api "repos/${REPO}/commits/${SHA}" --jq '.commit.message' | head -1)

echo ">>> Fetching check runs for ${SHA}…" >&2
FAILED=$(gh api "repos/${REPO}/commits/${SHA}/check-runs?per_page=100" \
  --jq '.check_runs[]
        | select(.conclusion=="failure" or .conclusion=="cancelled" or .conclusion=="timed_out")
        | select((.name|startswith("Dependabot"))|not)
        | "\(.conclusion)\t\(.name)\t\(.html_url)\t\(.id)"')

{
  echo "# CI Failure Report — main @ \`${SHORT_SHA}\`"
  echo
  echo "- **Commit**: \`${SHA}\` — ${MSG}"
  echo "- **Date**: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "## Failing checks"
  echo
  echo "| State | Check | Link |"
  echo "|-------|-------|------|"
  if [[ -z "$FAILED" ]]; then
    echo "| — | none | — |"
  else
    while IFS=$'\t' read -r state name link id; do
      echo "| ${state} | \`${name}\` | [log](${link}) |"
    done <<< "$FAILED"
  fi
  echo
  echo "## Per-job log excerpts"
  echo
  if [[ -n "$FAILED" ]]; then
    while IFS=$'\t' read -r state name link id; do
      echo "### \`${name}\` (${state})"
      echo
      echo "- Job id: ${id}"
      echo "- Link: <${link}>"
      echo
      echo '```'
      "${SCRIPT_DIR}/fetch-job-log.sh" "$id" 2>/dev/null || echo "(log fetch failed)"
      echo '```'
      echo
    done <<< "$FAILED"
  fi
  echo "## Categorization (fill in)"
  echo
  echo "See [.github/skills/ci-triage/REFERENCE.md](../../.github/skills/ci-triage/REFERENCE.md) for buckets."
  echo
  echo "## Note"
  echo
  echo "\`Cacti CI\` workflow has no push trigger. To validate the package test suite on this commit, run:"
  echo
  echo '```bash'
  echo "gh workflow run \"Cacti CI\" --ref main --repo ${REPO}"
  echo '```'
} > "$OUT"

echo ">>> Report written: ${OUT}" >&2
