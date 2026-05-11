---
description: "Use when creating or modifying GitHub Actions workflows. Covers the CI call chain, reusable workflows, jest-runner action, test reporting, permissions model, and artifact conventions."
applyTo: ".github/workflows/**/*.yaml"
---
# GitHub Actions Workflow Conventions

## CI Architecture

Entry point is `ci.yaml`, triggered on PRs to `main`/`dev`, `workflow_dispatch`,
and a cron schedule. It fans out through reusable `workflow_call` workflows:

```
ci.yaml
├── checks-and-build.yaml        (lint, build, affected-package detection)
│   └── actionlint.yaml
├── code-quality-checks.yaml
├── packages-workflow.yaml        (fan-out by category)
│   ├── core-packages-workflow.yaml
│   ├── connector-packages-workflow.yaml
│   ├── keychain-packages-workflow.yaml
│   ├── other-packages-workflow.yaml
│   └── satp-hermes-workflow.yaml
├── examples-workflow.yaml
└── ghcr-workflow.yaml
```

Inputs propagated down the chain: `node_version`, `run_code_coverage`,
`run_trivy_scan`, `affected-packages`.

## Affected Package Detection

`checks-and-build.yaml` runs `tools/compute-affected-packages.cjs` against the
PR base ref and outputs a JSON array. Downstream jobs gate on it:

```yaml
if: contains(fromJson(inputs.affected-packages), 'packages/cactus-plugin-satp-hermes')
```

This skips unaffected packages. Always wire your new workflow into this pattern.

## Composite Actions (`.github/actions/`)

| Action | Purpose |
|--------|---------|
| `configure-repo` | Setup Node.js, Yarn install, `yarn configure` |
| `jest-runner` | Run Jest with optional coverage, JUnit XML, dorny/test-reporter |
| `docker-pull` | Pre-pull and cache Docker images for integration tests |
| `tape-runner` | Run Tape tests (legacy) |

## Test Reporting

`jest-runner` produces JUnit XML via `jest-junit` at `reports/<report_name>.xml`.
`dorny/test-reporter@v1` posts results to the PR Checks tab.

- Requires `checks: write` permission flowing from the top-level caller.
- Fork PRs are excluded (`github.event.pull_request.head.repo.fork != true`)
  because fork tokens lack write access.

## Permissions Model

Reusable workflows cannot escalate beyond what the caller grants. `ci.yaml`
must provide `actions: read`, `checks: write`, `contents: read` so downstream
workflows and composite actions can create check runs.

Propagation: `ci.yaml` → `packages-workflow` → `satp-hermes-workflow` → `jest-runner`.

## Action Pinning

Pin all third-party actions to full SHA. Comment the version tag for readability:

```yaml
uses: actions/checkout@692973e3d937129bcbf40652eb9f2f61becf3332 #v4.1.7
uses: actions/setup-node@6044e13b5dc448c55e2357c09f80417699197238 #v6.2.0
```

Never use floating tags like `@v4` or `@latest`.

## Artifact Conventions

- Upload with `actions/upload-artifact` (pinned SHA), use `if: always()` so
  reports survive failures.
- Coverage: `coverage-reports-<package-short>-<test-type>`
  (e.g., `coverage-reports-satp-hermes-unit`).
- JUnit: `reports/<report-name>.xml`.
- Foundry: `satp-foundry-report-<job>`.

## Concurrency

Every workflow must set `concurrency:` with a group key scoped to the workflow
and PR number, plus `cancel-in-progress: true`:

```yaml
concurrency:
  group: <workflow-slug>-${{ github.workflow }}-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

## SATP Hermes Specifics

`satp-hermes-workflow.yaml` defines 8 parallel test jobs: unit, bridge, oracle,
gateway, docker, on-chain (Foundry), recovery, rollback. It also supports
`workflow_dispatch` for manual runs. Each integration job pre-pulls ledger
images with the `docker-pull` action and runs `./tools/ci-env-clean-up.sh`
before tests.

## Best Practices

- Use `continue-on-error: true` on test jobs to avoid blocking the pipeline.
- Use `if: always()` on artifact upload steps to preserve reports on failure.
- Pre-pull Docker images with `docker-pull` action to speed up integration tests.
- Run `./tools/ci-env-clean-up.sh` before Docker-based integration tests.
- Runner: `ubuntu-22.04` for all jobs.
- Node version is centrally defined in `ci.yaml` as `v20.20.0` and threaded
  through inputs — never hardcode it in downstream workflows.
