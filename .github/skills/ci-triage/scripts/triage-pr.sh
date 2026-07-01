#!/usr/bin/env bash
# Triage all failing checks for a Cacti PR. Writes a skeleton report
# at docs/ci-reports/pr-<N>-ci-failures.md for the agent to refine.
# Usage: triage-pr.sh <pr_number>
set -euo pipefail

PR="${1:?PR number required}"
REPO="${CACTI_REPO:-hyperledger-cacti/cacti}"
OUT_DIR="docs/ci-reports"
OUT="${OUT_DIR}/pr-${PR}-ci-failures.md"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

mkdir -p "$OUT_DIR"

echo ">>> Fetching PR #${PR} metadata…" >&2
PR_JSON=$(gh pr view "$PR" --repo "$REPO" --json headRefOid,title,url,state,mergedAt)
SHA=$(echo "$PR_JSON" | jq -r .headRefOid)
TITLE=$(echo "$PR_JSON" | jq -r .title)
URL=$(echo "$PR_JSON" | jq -r .url)

echo ">>> Listing failing checks…" >&2
FAILED=$(gh pr checks "$PR" --repo "$REPO" \
  --json name,state,link,workflow 2>/dev/null \
  | jq -r '.[] | select(.state=="FAILURE" or .state=="CANCELLED")
           | "\(.state)\t\(.workflow)\t\(.name)\t\(.link)"')

{
  echo "# CI Failure Report — PR #${PR}"
  echo
  echo "- **PR**: [${TITLE}](${URL})"
  echo "- **Head sha**: \`${SHA}\`"
  echo "- **Date**: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "## Failing checks"
  echo
  echo "| State | Workflow | Job | Link |"
  echo "|-------|----------|-----|------|"
  if [[ -z "$FAILED" ]]; then
    echo "| — | — | none | — |"
  else
    while IFS=$'\t' read -r state workflow name link; do
      echo "| ${state} | ${workflow} | \`${name}\` | [log](${link}) |"
    done <<< "$FAILED"
  fi
  echo
  echo "## Per-job log excerpts"
  echo
  if [[ -n "$FAILED" ]]; then
    while IFS=$'\t' read -r state workflow name link; do
      # Extract numeric job id from link like .../actions/runs/<run>/job/<id>
      JOB_ID=$(echo "$link" | sed -E 's|.*/job/([0-9]+).*|\1|')
      echo "### \`${name}\` (${state})"
      echo
      echo "- Workflow: ${workflow}"
      echo "- Job id: ${JOB_ID}"
      echo "- Link: <${link}>"
      echo
      echo '```'
      "${SCRIPT_DIR}/fetch-job-log.sh" "$JOB_ID" 2>/dev/null || echo "(log fetch failed)"
      echo '```'
      echo
    done <<< "$FAILED"
  fi
  echo "## Categorization (fill in)"
  echo
  echo "See [.github/skills/ci-triage/REFERENCE.md](../../.github/skills/ci-triage/REFERENCE.md) for buckets."
  echo
  echo "## Recommended fixes"
  echo
  echo "1. ..."
} > "$OUT"

echo ">>> Report written: ${OUT}" >&2
