---
name: ci-triage
description: "Triage Cacti CI failures on a PR or main branch, fetch failing job logs via gh CLI, categorize root causes, and produce a structured markdown report at docs/ci-reports/. Use when the user asks why CI is failing, asks for a CI failure report, references a failing PR or run, mentions GitHub Actions failures, or asks to analyze/diagnose pipeline issues in the Hyperledger Cacti monorepo."
---

# Cacti CI Triage Skill

End-to-end workflow for diagnosing failing GitHub Actions runs on the
`hyperledger-cacti/cacti` monorepo and producing a fixable report.

## Quick Start

```bash
# Triage a PR end-to-end and write a report
.github/skills/ci-triage/scripts/triage-pr.sh 4152

# Triage main branch HEAD (aggregates all workflows on that commit)
.github/skills/ci-triage/scripts/triage-main.sh

# Triage one specific workflow run (handy for workflow_dispatch URLs)
.github/skills/ci-triage/scripts/triage-run.sh 26411751837
```

Each script writes a report to `docs/ci-reports/` that the agent then
refines using the categorization rules below.

## Workflow

### 1. Enumerate failing checks

For a PR:

```bash
gh pr checks <PR> --repo hyperledger-cacti/cacti --json name,state,link \
  --jq '.[] | select(.state=="FAILURE" or .state=="CANCELLED")'
```

For a commit/main:

```bash
gh api "repos/hyperledger-cacti/cacti/commits/<sha>/check-runs?per_page=100" \
  --jq '.check_runs[] | select(.conclusion=="failure" or .conclusion=="cancelled")
        | {name, html_url, id:.id}'
```

### 2. Fetch failing job logs

Prefer the API (works while runs are in progress and is more reliable than
`gh run view --log-failed`):

```bash
gh api repos/hyperledger-cacti/cacti/actions/jobs/<job_id>/logs \
  | grep -iE "FAIL |error|exit code|timeout|no tests found|undefined:|cannot find" \
  | grep -vE "YN0|deprecat|warning|notice|test-reporter|##\[group" \
  | tail -40
```

### 3. Categorize each failure

Match each failure to a root-cause bucket (see [REFERENCE.md](REFERENCE.md)
for the full pattern catalog and historical examples). Common buckets:

| Bucket | Signal | Action |
|---|---|---|
| **PR-caused regression** | New error in code/config the PR touched | Block merge, fix in PR |
| **Self-inflicted by ignore pattern** | `No tests found, exiting with code 1` | Add `--passWithNoTests` or remove the job |
| **Jest config regex** | `SyntaxError: Invalid regular expression: Nothing to repeat` | Fix `jest.config.js` (glob != regex) |
| **Polkadot/ESM** | `dynamic import callback was invoked without --experimental-vm-modules` | Add Jest ESM flag |
| **Go toolchain** | `undefined: min` in `protobuf` package | Bump `actions/setup-go` to `1.23` |
| **Long-running integration timeout** | `Exceeded timeout of 3600000 ms for a hook` | Pre-existing flake; document, don't block PR |
| **Removed package job** | Job exists for archived package | Remove from `*-workflow.yaml` |
| **GHA infra flake** | `Cache service responded with 400`, `Create Artifact Container failed`, `Bad credentials` | Re-run; pin perms/token if recurring |
| **Permissions / OIDC** | `Bad credentials` on `dorny/paths-filter` | Add `permissions:` block + explicit token |
| **Empty `github.base_ref`** | `fatal: Not a valid object name origin/` exit 128 on dispatch/schedule | Guard with `if [[ -z "$BASE_REF" ]]` fallback |

### 4. Write the report

Use [templates/report-template.md](templates/report-template.md). Required
sections:

- Run metadata (PR/sha, run id, date)
- Summary table (job → bucket → caused-by-PR)
- Per-failure details with log excerpts (5-10 lines)
- Recommended fixes ordered by priority
- Pre-existing vs PR-caused split

### 5. Verify report before sharing

- [ ] Every failing job has a category and recommendation
- [ ] Log excerpts include the actual error line, not just `##[error]`
- [ ] Pre-existing flakes are clearly separated from PR regressions
- [ ] File saved at `docs/ci-reports/pr-<N>-ci-failures.md`

## Cacti-specific Gotchas

- `Cacti CI` workflow removed `push` trigger (commit `ce833fd95`). On `main`
  it only runs via `schedule` (Mon/Thu 08:00 UTC) or `workflow_dispatch`.
  Trigger manually: `gh workflow run "Cacti CI" --ref main`.
- `gh run view --log-failed` often returns empty for long runs. Use
  `gh api .../actions/jobs/<id>/logs` instead.
- `testPathIgnorePatterns` in `jest.config.js` are RegExp, not globs.
- `workspace:` protocol resolves locally even when the version is unpublished
  on npm — don't confuse `YN0002` workspace warnings with real failures.
- Per-job `JEST_TEST_PATTERN` + a matching `testPathIgnorePatterns` entry
  results in "No tests found, exiting with code 1". Remove the job, not the
  ignore.

## Files

- [scripts/triage-pr.sh](scripts/triage-pr.sh) — full PR triage pipeline
- [scripts/triage-main.sh](scripts/triage-main.sh) — main branch triage
- [scripts/triage-run.sh](scripts/triage-run.sh) — single workflow run triage (good for `workflow_dispatch` URLs)
- [scripts/fetch-job-log.sh](scripts/fetch-job-log.sh) — single-job log fetch + filter (high-signal grep with SARIF/JSON noise stripped)
- [REFERENCE.md](REFERENCE.md) — full pattern catalog
- [templates/report-template.md](templates/report-template.md) — report skeleton
