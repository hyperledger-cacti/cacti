# CI Failure Report — PR #4725

- **PR**: [feat(satp-hermes): update satp to v13](https://github.com/hyperledger-cacti/cacti/pull/4725)
- **Head sha**: `a684cfc18c5651ba2a1be167dc4fbfdf4f761f4f` (single squashed commit, tree identical to previously-green `deb7b33a3`)
- **Date**: 2026-09-30T11:43:00Z (triage re-run after run completion)
- **Main CI**: [Cacti CI run 36705390558](https://github.com/hyperledger-cacti/cacti/actions/runs/36705390558) — **all 67 jobs SUCCESS, zero failures** (lint, codegen, all satp-hermes suites incl. docker, copm, CodeQL, Weaver all green)

## Failing checks

| State | Workflow | Job | Link |
|-------|----------|-----|------|
| FAILURE | PR Structural Checks | `PR Structural Checks Success` | [log](https://github.com/hyperledger-cacti/cacti/actions/runs/36705388834/job/109854465705) |
| FAILURE | PR Structural Checks | `Validate PR title match with latest commit message` | [log](https://github.com/hyperledger-cacti/cacti/actions/runs/36705388834/job/109854299289) |
| ACTION_REQUIRED | DCO (DCO bot) | commit `a684cfc18` | PR checks view |

All other structural sub-checks pass: `Validate PR title: success`, `Validate PR Type: success`, `Commit Lint: success`.

## Per-job log excerpts

### `Validate PR title match with latest commit message` (FAILURE)

- Workflow: PR Structural Checks
- Job id: 109854299289
- Link: <https://github.com/hyperledger-cacti/cacti/actions/runs/36705388834/job/109854299289>

```
2026-09-30T10:55:54.2361075Z [36;1m  echo "❌ ERROR: PR Title does not match your latest commit message!"[0m
2026-09-30T10:55:54.2695902Z ❌ ERROR: PR Title does not match your latest commit message!
2026-09-30T10:55:54.2707405Z ##[error]Process completed with exit code 1.
```

### `PR Structural Checks Success` (FAILURE)

- Workflow: PR Structural Checks (aggregate gate)
- Job id: 109854465705
- Link: <https://github.com/hyperledger-cacti/cacti/actions/runs/36705388834/job/109854465705>

```
2026-09-30T10:56:19.0200287Z ##[error]Process completed with exit code 1.
```

Pure aggregate: fails because the title-match sub-check above failed. No independent cause.

### `DCO` (ACTION_REQUIRED)

The squashed commit `a684cfc18` intentionally carries no `Signed-off-by` (explicit
instruction for the squash; repo policy reserves sign-offs for the human submitter).
The DCO bot therefore flags the commit.

## Categorization

| Job | Bucket | Caused by PR code? | Notes |
|-----|--------|--------------------|-------|
| `Validate PR title match with latest commit message` | Commit-metadata policy (PR title ≠ commit header) | No — metadata only | Excluded from fix scope by explicit instruction |
| `PR Structural Checks Success` | Aggregate of the above | No | Clears when the title-match check clears |
| `DCO` | Missing Signed-off-by on `a684cfc18` | No — intentional per squash instructions | Human must amend |

**PR-caused regressions: none. Pre-existing flakes: none.** The cp-copm `pledge-getview-corda-fabric` job that flaked on 2026-09-29 (npm registry ETIMEDOUT fetching grpc-tools prebuilts inside a docker build) passed without intervention on both subsequent runs.

## Recommended fixes (priority order)

1. **DCO** — Rafael amends with his own sign-off (agent may not sign per repo policy):
   ```bash
   git commit --amend -s --no-edit
   git push --force-with-lease origin feat/update-satp-v13-2810
   ```
   Note: the amend rewrites the sha; CI re-runs (tree unchanged → expected all-green; docker pin `3.0.1-dev.envelopefix` is sha-independent).
2. **Title-match** — human decision, two options:
   - Rename the PR title to `fix(satp-hermes): implement review feedback`, or
   - Reword the commit header to `feat(satp-hermes): update satp to v13` during the same DCO amend.
   Given the maintainer's single-commit + PR-title-symmetry policy (repo always rebase-merges), aligning commit header and PR title in one amend is the lowest-friction path.
3. No code changes required — nothing to fix in the working tree.

## Verification checklist

- [x] Every failing check has a category and recommendation
- [x] Log excerpts include the actual error line
- [x] Pre-existing flakes separated from PR regressions (none of either)
- [x] Report saved at `docs/ci-reports/pr-4725-ci-failures.md` (uncommitted)
