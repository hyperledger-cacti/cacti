#!/usr/bin/env bash
# Fetch and filter a single GitHub Actions job log.
# Usage: fetch-job-log.sh <job_id> [extra_grep_pattern]
set -euo pipefail

JOB_ID="${1:?job id required}"
EXTRA="${2:-}"
REPO="${CACTI_REPO:-hyperledger-cacti/cacti}"

# High-signal patterns: actual failures, not SARIF/JSON noise.
PATTERN='##\[error\]|FAIL [a-zA-Z/]|Exceeded timeout|No tests found|undefined: [a-zA-Z_]+|Cannot find module|Bad credentials|exit code [1-9]|fatal: |panic: |Error: |TypeError: |SyntaxError: '
if [[ -n "$EXTRA" ]]; then
  PATTERN="$PATTERN|$EXTRA"
fi

# Noise to drop: SARIF JSON quoting, deprecation/setup chatter, log scaffolding.
NOISE='"level":|"problem.severity":|YN000[0-9]|deprecat|##\[group|##\[endgroup|##\[notice|set-output|save-state|test-reporter|Successfully set up|Switched to a new branch'

gh api "repos/${REPO}/actions/jobs/${JOB_ID}/logs" 2>/dev/null \
  | grep -iE "$PATTERN" \
  | grep -vE "$NOISE" \
  | tail -30
