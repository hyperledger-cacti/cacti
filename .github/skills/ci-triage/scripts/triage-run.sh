#!/usr/bin/env bash
# Triage one specific GitHub Actions workflow run (by run id).
# Useful for workflow_dispatch runs or any single run URL.
# Usage: triage-run.sh <run_id>
set -euo pipefail

RUN_ID="${1:?run id required}"
REPO="${CACTI_REPO:-hyperledger-cacti/cacti}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="docs/ci-reports"
mkdir -p "$OUT_DIR"

META=$(gh api "repos/${REPO}/actions/runs/${RUN_ID}" \
  --jq '{name,head_sha,head_branch,event,status,conclusion,html_url,display_title}')
SHA=$(echo "$META" | jq -r .head_sha)
SHORT_SHA="${SHA:0:8}"
NAME=$(echo "$META" | jq -r .name)
BRANCH=$(echo "$META" | jq -r .head_branch)
EVENT=$(echo "$META" | jq -r .event)
STATUS=$(echo "$META" | jq -r .status)
CONCLUSION=$(echo "$META" | jq -r .conclusion)
URL=$(echo "$META" | jq -r .html_url)
TITLE=$(echo "$META" | jq -r .display_title)

OUT="${OUT_DIR}/run-${RUN_ID}-ci-failures.md"

# Pull all jobs (paginated); compute breakdown.
JOBS_JSON=$(gh api "repos/${REPO}/actions/runs/${RUN_ID}/jobs?per_page=100" --paginate)
TOTAL=$(echo "$JOBS_JSON" | jq '[.jobs[]] | length')
PASS=$(echo "$JOBS_JSON" | jq '[.jobs[] | select(.conclusion=="success")] | length')
FAIL=$(echo "$JOBS_JSON" | jq '[.jobs[] | select(.conclusion=="failure" or .conclusion=="timed_out")] | length')
CANCELLED=$(echo "$JOBS_JSON" | jq '[.jobs[] | select(.conclusion=="cancelled")] | length')
SKIPPED=$(echo "$JOBS_JSON" | jq '[.jobs[] | select(.conclusion=="skipped" or .conclusion=="neutral")] | length')
RUNNING=$(echo "$JOBS_JSON" | jq '[.jobs[] | select(.status=="in_progress" or .status=="queued")] | length')

FAILED=$(echo "$JOBS_JSON" | jq -r '.jobs[]
  | select(.conclusion=="failure" or .conclusion=="cancelled" or .conclusion=="timed_out")
  | "\(.conclusion)\t\(.name)\t\(.html_url)\t\(.id)"')

{
  echo "# CI Failure Report — Run \`${RUN_ID}\`"
  echo
  echo "- **Workflow**: ${NAME}"
  echo "- **Title**: ${TITLE}"
  echo "- **Branch**: \`${BRANCH}\` (event: \`${EVENT}\`)"
  echo "- **Commit**: \`${SHA}\`"
  echo "- **Status**: ${STATUS} / ${CONCLUSION}"
  echo "- **URL**: <${URL}>"
  echo "- **Triaged at**: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo
  echo "## Job summary"
  echo
  echo "| Total | Passed | Failed | Cancelled | Skipped | Running |"
  echo "|------:|-------:|-------:|----------:|--------:|--------:|"
  echo "| ${TOTAL} | ${PASS} | ${FAIL} | ${CANCELLED} | ${SKIPPED} | ${RUNNING} |"
  echo

  if [[ "$STATUS" != "completed" ]]; then
    echo "> ⚠️ Run is still **${STATUS}**. Failures listed below reflect only jobs that have finished."
    echo
  fi

  echo "## Failing jobs"
  echo
  if [[ -z "$FAILED" ]]; then
    echo "_None so far._"
    echo
  else
    echo "| State | Job | Link |"
    echo "|-------|-----|------|"
    while IFS=$'\t' read -r state name link id; do
      echo "| ${state} | \`${name}\` | [log](${link}) |"
    done <<< "$FAILED"
    echo
    echo "## Per-job log excerpts"
    echo
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
  echo "## Recommended fixes"
  echo
  echo "1. ..."
} > "$OUT"

echo ">>> Report written: ${OUT}" >&2
