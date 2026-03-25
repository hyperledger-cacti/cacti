# Fabric AIO Integration Tests — Known Limitation

**Created:** 2026-03-25
**Branch:** `fix/docker-tests-4100`
**Status:** Skipped — awaiting fix
**Tracks:** [hyperledger-cacti/cacti#3978](https://github.com/hyperledger-cacti/cacti/issues/3978)

---

## Problem

All integration tests that depend on the **Fabric All-in-One (AIO)** Docker
image (`ghcr.io/hyperledger-cacti/cactus-fabric2-all-in-one:v2.1.0`) suffer
from two related issues:

1. **Channel-join timeout:** The `peer channel join` command enters an infinite
   retry loop (`res=1` on every attempt) and never succeeds within the 900 s
   `beforeAll` timeout.
2. **ENDORSEMENT_POLICY_FAILURE (issue #3978):** Even when Fabric starts
   successfully, transactions fail intermittently with
   `ENDORSEMENT_POLICY_FAILURE` due to peer/container performance under load.
   This is especially frequent in tests running many containers in parallel.

### Observed Behavior

```
peer channel join -b ./channel-artifacts/mychannel.block
Error: error getting endorser client for channel: ...
res=1
===================== peer0.org1 failed to join the channel ... =====================
```

This repeats indefinitely until Jest kills the test for exceeding the timeout.

### Environment

- **Docker image:** `ghcr.io/hyperledger-cacti/cactus-fabric2-all-in-one:v2.1.0`
- **Platform:** WSL2 with Docker Desktop (also observed on some CI runners)
- **Class:** `FabricTestLedgerV1` from `@hyperledger/cactus-test-tooling`
- **SATP wrapper:** `FabricTestEnvironment` from `test-utils.ts`

### Root Cause (suspected)

The Fabric AIO image uses hardcoded port bindings in `FabricTestLedgerV1.start()`
(8 fixed host ports: 30022, 7050, 7051, 7054, 8051, 8054, 9051, 10051). When
combined with WSL2 networking or containerized CI, these fixed ports may
conflict or the peer-to-peer networking inside the container may fail to
initialize. A deeper investigation into the Fabric AIO image and
`FabricTestLedgerV1` is needed.

---

## Skipped Test Files

All `describe` blocks in the files below have been changed to `describe.skip`
with a comment pointing to this document.

### Gateway E2E Tests (4 files)

These files have a **shared `beforeAll`** that starts Besu, Fabric, and
Ethereum ledgers. When Fabric times out, ALL tests in the file fail —
including Besu-to-Ethereum tests that don't directly use Fabric.

| File | Describes | Fabric-specific |
|------|-----------|----------------|
| `integration/gateway/satp-e2e-transfer-1-gateway.test.ts` | 5 | 2 of 5 |
| `integration/gateway/satp-e2e-transfer-2-gateways.test.ts` | 5 | 2 of 5 |
| `integration/gateway/satp-e2e-transfer-1-gateway-with-api-server.test.ts` | 4 | 2 of 4 |
| `integration/gateway/satp-e2e-transfer-2-gateway-with-api-server.test.ts` | 4 | 2 of 4 |

**Recovery opportunity:** Factor out the `beforeAll` so that Besu-to-Ethereum
tests don't depend on Fabric startup. This would recover ~9 test suites.

### Docker Integration Tests (2 files)

| File | Describes | Fabric-specific |
|------|-----------|----------------|
| `integration/docker/satp-e2e-transfer-1-gateway-dockerization.test.ts` | 3 | 2 of 3 |
| `integration/docker/satp-e2e-transfer-2-gateways-dockerization.test.ts` | 3 | 2 of 3 |

### Oracle API Server Tests (2 files)

| File | Describes | Fabric-specific |
|------|-----------|-----------------|
| `integration/oracle/oracle-register-api-server.test.ts` | 1 | 1 of 1 |
| `integration/oracle/oracle-execute-api-server.test.ts` | 1 | 1 of 1 |

### Rollback Tests (already skipped before this change)

| File | Status |
|------|--------|
| `integration/rollback/rollback-stage-0.test.ts` | Already `describe.skip` |
| `integration/rollback/rollback-stage-2.test.ts` | Already `describe.skip` |
| `integration/rollback/rollback-stage-3.test.ts` | Already `describe.skip` |

`rollback-stage-1.test.ts` does **not** use `FabricTestEnvironment` and is not
skipped.

---

## How to Fix

1. **Investigate Fabric AIO image:** Determine why `peer channel join` fails
   in WSL2 / containerized environments. May need an updated image or
   configuration changes.

2. **Remove hardcoded port bindings** in `FabricTestLedgerV1.start()`
   (`packages/cactus-test-tooling`). Use ephemeral ports via
   `PublishAllPorts: true` without explicit `PortBindings`. This is outside
   the SATP Hermes scope.

3. **Factor out `beforeAll`** in gateway E2E tests so Besu-to-Ethereum tests
   can run independently of Fabric.

4. **Add CI image pre-pull step** to remove image download time from test
   timeout budget.

5. **Re-enable tests** by changing `describe.skip` back to `describe` once the
   Fabric AIO issue is resolved.

---

## Verification

After fixing the Fabric AIO issue, re-enable by reverting the `describe.skip`
changes and running:

```bash
cd packages/cactus-plugin-satp-hermes
yarn test:integration:gateway
yarn test:integration:docker
yarn test:integration:oracle
```
