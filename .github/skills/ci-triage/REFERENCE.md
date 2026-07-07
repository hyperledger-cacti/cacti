# CI Failure Pattern Catalog

Reference for [SKILL.md](SKILL.md). Each pattern lists the signal, the
historical occurrence, the verified cause, and the fix.

## 1. Jest config regex (glob mistake)

- **Signal**: `SyntaxError: Invalid regular expression: /.../**/: Nothing to repeat`
- **Where**: Cascades across every Jest-using job (~45 in PR #4152).
- **Cause**: `testPathIgnorePatterns` entries are RegExp. `**` is invalid.
- **Fix**: Use plain path prefix or a real regex
  (e.g. `./examples/foo/src/test/`).

## 2. "No tests found, exiting with code 1"

- **Signal**: Job exits 1 with `No tests found` after a `JEST_TEST_PATTERN`.
- **Cause**: An ignore pattern covers every path the job's pattern matches.
- **Fix (preferred)**: Remove the job from the workflow file.
- **Fix (fallback)**: Add `--passWithNoTests` to the jest-runner action.

## 3. Polkadot / Jest ESM

- **Signal**: `TypeError: A dynamic import callback was invoked without --experimental-vm-modules`
- **Where**: `cpl-connector-polkadot`, occasionally other ESM-heavy packages.
- **Fix**: Pass `NODE_OPTIONS=--experimental-vm-modules` (or the equivalent
  `node --experimental-vm-modules`) to Jest in the package's test script or
  the jest-runner action.

## 4. Go toolchain too old

- **Signal**: `undefined: min` in `google.golang.org/protobuf@v1.36.11/.../decode.go:529`
- **Where**: All `cp-copm/*` jobs in `.github/workflows/workflow-copm.yaml`.
- **Cause**: `protobuf` ≥ 1.36 uses built-in `min` (Go 1.21+, declared as
  1.23 in its `go.mod`).
- **Fix**: Pin `actions/setup-go` with `go-version: "1.23"`.

## 5. Long-running integration test timeouts

- **Signal**: `Exceeded timeout of 3600000 ms for a hook` or
  `... 1000000 ms for a hook`.
- **Where (historical)**: `cpl-connector-besu`, `cpl-connector-fabric`,
  `cp-bungee-hermes`, `ce-cbdc-bridging`.
- **Cause**: Slow Docker startup on shared runners; not a code bug.
- **Action**: Mark as pre-existing flake in the report. Do NOT block PR
  unless the timing regression is attributable to the PR diff.

## 6. Removed-package CI jobs

- **Signal**: Job for a package that has been archived/deleted.
- **Cause**: Workflow YAML not updated alongside the package removal.
- **Fix**: Delete the job block and any references in `needs:` chains.
- **Example**: `cpk-vault`, `cp-consortium-manual`, `ctp-consortium-manual`
  removed in PR #4152.

## 7. GitHub Actions infra flakes

- **Signals**:
  - `##[error]Cache service responded with 400`
  - `Create Artifact Container failed: The artifact name ... is not valid`
  - `Bad credentials` from `dorny/paths-filter` when no token is provided
- **Action**: Re-run job. If `Bad credentials` recurs, add explicit
  `permissions:` and `token:` to the workflow/step.

## 8. Workspace dep version not on npm

- **Signal**: `YN0002: ... doesn't provide ...@npm:X.Y.Z`
- **Cause**: Package depends on a sibling workspace package version that
  doesn't exist on the npm registry yet.
- **Action**: Benign inside the monorepo (`workspace:` protocol resolves
  locally). Don't treat as a CI failure. If it appears in a published
  artifact, fix the dependency version.

## 9. SATP Hermes Fabric ledger startup

- **Signal**: Job exits 1 during `FabricTestLedgerV1` startup logs,
  often with `cancel` endpoint references.
- **Action**: Capture full Docker startup log block; classify as
  infra-flake unless the failure is reproducible locally.

## 10. Permissions / OIDC

- **Signal**: `Bad credentials` on third-party actions reading PR metadata.
- **Fix**: Add to the job (or workflow):
  ```yaml
  permissions:
    contents: read
    pull-requests: read
  ```
  and pass `token: ${{ secrets.GITHUB_TOKEN }}` explicitly to the step.

## 11. Empty `github.base_ref` on non-PR events

- **Signal**: `fatal: Not a valid object name origin/` followed by
  `Process completed with exit code 128`. The slash has nothing after it.
- **Where (historical)**: `ghcr-workflow.yaml` `ghcr-besu-all-in-one`,
  `ghcr-corda-all-in-one-flowdb`, `ghcr-fabric2-all-in-one`,
  `ghcr-daml-all-in-one` on `workflow_dispatch` / `schedule` from `main`
  (run 26411751837).
- **Cause**: `github.base_ref` is only populated for `pull_request` events.
  Steps like `git fetch origin ${{ github.base_ref }}` or
  `git merge-base HEAD origin/${{ github.base_ref }}` expand to
  `origin/` on dispatch/schedule and git aborts.
- **Fix**: Guard the diff step or fall back to the default branch:
  ```bash
  BASE_REF="${{ github.base_ref }}"
  if [[ -z "$BASE_REF" ]]; then
    # workflow_dispatch / schedule: build everything
    echo "files=tools/docker/ .github/workflows/" >> "$GITHUB_OUTPUT"
  else
    git fetch origin "$BASE_REF"
    BASE=$(git merge-base HEAD "origin/$BASE_REF")
    FILES=$(git diff --name-only "$BASE" HEAD | tr '\n' ' ')
    echo "files=$FILES" >> "$GITHUB_OUTPUT"
  fi
  ```

## 12. Foundry / GitHub API anonymous rate-limit (HTTP 403)

- **Signal**: In a step `Install Foundry` (action
  `foundry-rs/foundry-toolchain@v1`):
  ```
  foundryup: fetching latest release tag from foundry-rs/foundry...
  curl: (22) The requested URL returned error: 403
  foundryup: failed to fetch release tags from GitHub API
  Error: Command failed: bash "/home/runner/.foundry/bin/foundryup"
  ```
- **Where (historical)**: `yarn_codegen` job in `code-quality-checks.yaml`
  (run 26411751837). Same vulnerability exists in every workflow that
  uses `foundry-rs/foundry-toolchain@v1` with `version: stable` (or any
  floating tag) — `foundryup` calls the unauthenticated GitHub releases
  API and shared GitHub-hosted runner IPs routinely exceed the 60/hour
  anonymous quota.
- **Cause**: `version: stable` (also `latest`, bare `nightly`) makes
  `foundryup` call
  `api.github.com/repos/foundry-rs/foundry/releases/latest` via
  `curl -fsSL` with **no `Authorization` header**. `foundryup` does not
  read `GITHUB_TOKEN`, and `foundry-toolchain@v1` has no `token` input,
  so there is no supported way to authenticate that call. The shared
  runner IP hits the 60/hour anonymous quota and gets HTTP 403.
- **Do NOT**: add `env: GITHUB_TOKEN: …` to the step — it is silently
  ignored (verified against the foundryup source `fetch()` function).
- **Fix (only working option) — pin a concrete version tag** so
  `resolve_version_and_tag` falls into the literal-tag branch and
  skips the API call:
  ```yaml
  - name: Install Foundry
    uses: foundry-rs/foundry-toolchain@v1
    with:
      version: v1.4.1   # or any released tag / nightly-<sha>
  ```
  Tags handled with no API call: `vX.Y.Z`, `X.Y.Z`, `nightly-<sha>`.
  Tags that DO call the API: `latest`, `stable`, bare `nightly`.

## Triage Heuristics

1. **PR-caused vs pre-existing**: Cross-check with the same job on `main`
   at the PR's base sha. If it failed there too, it's pre-existing.
2. **Cascading failure**: One config bug (jest regex, missing dep) can
   make ~all jobs fail. Look for a single shared signal before triaging
   per-job.
3. **Cancelled jobs**: Usually downstream of an upstream `needs:` failure.
   Report them grouped under the real failure.
4. **Order of fixes**: PR-caused regressions first → cascading config bugs
   → infra fixes (workflow YAML, permissions) → pre-existing flakes last
   (often deferred to follow-up issues).

## Useful gh CLI snippets

```bash
# All failing checks for a PR
gh pr checks <PR> --repo hyperledger-cacti/cacti

# Latest workflow run on a branch
gh run list --repo hyperledger-cacti/cacti --branch <branch> \
  --workflow "Cacti CI" --limit 1 --json databaseId,conclusion,headSha

# Full job log (works during in-progress runs)
gh api repos/hyperledger-cacti/cacti/actions/jobs/<job_id>/logs

# Trigger Cacti CI manually on main
gh workflow run "Cacti CI" --ref main --repo hyperledger-cacti/cacti

# Re-run only failed jobs of a run
gh run rerun <run_id> --failed --repo hyperledger-cacti/cacti
```
