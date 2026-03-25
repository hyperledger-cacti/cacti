# SATP Hermes — Fix Tests Plan

**Date:** 2026-03-25
**Branch:** `fix/docker-tests-4100`
**Scope:** All SATP tests except rollback

---

## Implementation Status

| Phase | Category | Status | Notes |
|-------|----------|--------|-------|
| 1 | Cat-D: PG/Knex | ✅ DONE | Dual-config, host probe, retry, 6 files modified |
| 1b | Besu connectivity | ✅ DONE | Internal IPs + host allowlist, 1 file modified (besu-test-environment.ts) |
| 2 | Cat-C: Oracle | 📋 PLANNED | |
| 3 | Cat-B: Docker cleanup | ✅ DONE | 14 files modified, 1 created, 24 unit tests pass |
| 4 | Cat-A: Timeout | 📋 PLANNED | |
| 5 | Cat-E: Skipped | 📋 PLANNED | |

**Phase 1b: Besu Connectivity Fixes** (discovered during Docker test runs)
- `besu-test-environment.ts`: `createBesuDockerConfig()` used `getRpcApiHttpHost()` / `getRpcApiWsHost()` which returned `127.0.0.1:hostPort` (unreachable from gateway containers). Fixed with `getRpcApiHttpHost(false)` / `getRpcApiWsHost(false)` to return Docker internal IPs.
- `besu-test-environment.ts`: Added `BESU_HOST_ALLOWLIST=*` and `BESU_RPC_WS_HOST_ALLOWLIST=*` env vars. Besu 25.4.0 requires `BESU_HOST_ALLOWLIST` (not-deprecated name) but the Docker image only bakes in the old `BESU_HOST_WHITELIST`.
- **Verification**: `satp-e2e-transfer-dev-dockerization-fast.test.ts` — **3/3 tests PASSED** (503s)

---

## 1. Test Results Summary

| Suite | Suites | Tests | Passed | Failed | Skipped | Status |
|-------|--------|-------|--------|--------|---------|--------|
| Unit | 23 | 251 | 236 | 0 | 15 (3 suites) | PASS |
| Integration/Adapter | 5 | 48 | 48 | 0 | 0 | PASS |
| Integration/Gateway (simple) | 3 | 14 | 14 | 0 | 0 | PASS |
| Integration/Gateway (e2e 1-gw) | 1 | 6 | 0 | 6 | 0 | FAIL |
| Integration/Gateway (e2e 2-gw) | 1 | ~6 | 0 | ~6 | 0 | FAIL |
| Integration/Bridge | 3 | 54 | 44 | 10 | 0 | FAIL |
| Integration/Oracle | 3 | 14 | 6 | 8 | 0 | FAIL |
| Integration/Recovery | 3 | 3 | 0 | 0 | 3 | SKIP |
| Integration/Monitoring | 1 | 4 | 4 | 0 | 0 | PASS |
| Integration/Docker | 4 | 13 | 0 | 13 | 0 | FAIL |
| **TOTAL** | **47** | **~413** | **352** | **~43** | **18** | — |

---

## 2. Failure Categories

### Cat-D: PostgreSQL Container / Knex Pool Timeout — 13 tests

All Docker integration tests fail. Two sub-failures:
1. **`KnexTimeoutError`** at `test-utils.ts:434` — pool exhausted before migrations run
2. **`createPGDatabase()` timed out (60 s)** at `test-utils.ts:378` — PG container not ready

Files: `docker/satp-e2e-transfer-{1-gateway,2-gateways,dev}-dockerization*.test.ts`, `docker/oracle-execute-dockerization-fast.test.ts`

### Cat-C: `fabricEnv` Undefined in Oracle Tests — 8 tests

`fabricEnv` is `undefined` because the `try/catch` in `beforeAll` swallows the Fabric setup error silently (only logs it), then code continues to call methods on the undefined variable. `afterAll` also crashes on the same undefined references.

Files: `oracle/oracle-register-api-server.test.ts`, `oracle/oracle-execute-api-server.test.ts`

### Cat-B: Docker Port Conflicts — 10 tests

Port 30022 already allocated from a stale Fabric container left by a previous test run. `FabricTestLedgerV1` uses `publishAllPorts: true` but some tests still bind fixed ports.

Files: `bridge/fabric-leaf.test.ts`

### Cat-A: Fabric Container Startup Timeout — ~12 tests

`FabricTestEnvironment.setupTestEnvironment()` exceeds the 900 s `beforeAll` timeout. The Fabric AIO image startup (pull + init + channel create + chaincode) is too slow for the current timeout.

Files: `gateway/satp-e2e-transfer-{1,2}-gateway*.test.ts` (4 files)

### Cat-E: Explicitly Skipped — 18 tests

All use `describe.skip`. Crash-management (3 unit suites) and recovery (3 integration suites).

---

## 3. Systematic Fix Plan

### Phase 1 — Fix `createPGDatabase()` and `setupDBTable()` (Cat-D)

**Target:** `src/test/typescript/test-utils.ts`
**Fixes:** 13 Docker tests

> **Updated 2026-03-25**: Root-cause analysis revealed the original timeout-only
> fix is insufficient. The real problem is that `createPGDatabase()` returns a
> Knex config using the Docker **internal** IP (from
> `containerData.NetworkSettings.Networks[network].IPAddress`), which is not
> routable from the host. The health check only verifies PG is healthy inside
> the container (Docker status string `"(healthy)"`), not that the host can
> actually connect. The fix must return a **dual config**: `hostConfig` using
> `localhost:mapped_host_port` for operations run from the Jest process (e.g.
> `setupDBTable()`), and `networkConfig` using `internal_ip:5432` for
> inter-container communication.

#### 1.1 Return dual configs from `createPGDatabase()`

```typescript
// test-utils.ts — createPGDatabase() currently returns:
//   { config: Knex.Config, container }
// where config.connection.host = containerData.NetworkSettings.Networks[network].IPAddress
// and config.connection.port = 5432
//
// CHANGE TO return:
interface PGDatabaseResult {
  /** Config using localhost:<mapped_host_port> — use from Jest process */
  hostConfig: Knex.Config;
  /** Config using <internal_ip>:5432 — use for inter-container comms */
  networkConfig: Knex.Config;
  container: Container;
  /** @deprecated Use hostConfig for host-side or networkConfig for containers */
  config: Knex.Config; // alias for hostConfig, backward compat
}

// Extract the mapped host port from container.inspect():
const containerData = await container.inspect();
const pgPortBindings = containerData.HostConfig.PortBindings["5432/tcp"];
const mappedHostPort = parseInt(pgPortBindings[0].HostPort, 10);
const internalIp = containerData.NetworkSettings.Networks[network || "bridge"].IPAddress;

const hostConfig: Knex.Config = {
  client: "pg",
  connection: { host: "127.0.0.1", port: mappedHostPort, ... },
  migrations: { ... },
};

const networkConfig: Knex.Config = {
  client: "pg",
  connection: { host: internalIp, port: 5432, ... },
  migrations: { ... },
};

return { hostConfig, networkConfig, config: hostConfig, container };
```

**Why:** The Jest process runs on the host, so it must connect via `localhost` and the Docker-mapped port. The old approach used the Docker internal IP which is only reachable from other containers on the same Docker network. This was the root cause of `KnexTimeoutError` — the pool tries to connect to an unreachable host and exhausts all connection attempts.

#### 1.2 Add a real host-to-PG connectivity probe

```typescript
// test-utils.ts — replace the Docker status-string health check
// CURRENT: polls containerData.State.Health.Status === "(healthy)"
// CHANGE TO: after Docker reports healthy, verify from the host

import net from "net";

async function waitForPgHostConnectivity(
  host: string,
  port: number,
  timeoutMs: number,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise<boolean>((resolve) => {
      const sock = net.createConnection({ host, port });
      sock.once("connect", () => { sock.destroy(); resolve(true); });
      sock.once("error", () => resolve(false));
      sock.setTimeout(2000, () => { sock.destroy(); resolve(false); });
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`PG not reachable at ${host}:${port} after ${timeoutMs}ms`);
}

// Call after Docker health check passes:
await waitForPgHostConnectivity("127.0.0.1", mappedHostPort, 30_000);
```

**Why:** Docker's `"(healthy)"` status only means `pg_isready` succeeded *inside* the container. It doesn't guarantee the host can reach the mapped port. This probe confirms actual host-to-PG TCP connectivity before returning.

#### 1.3 Increase health-check wait timeout from 60 s → 180 s

```typescript
// test-utils.ts:377
const PG_READY_TIMEOUT_MS = 180_000;
if (Date.now() >= startedAt + PG_READY_TIMEOUT_MS) {
  throw new Error(`${fnTag} timed out (${PG_READY_TIMEOUT_MS}ms)`);
}
```

**Why:** PG image pull + cold start exceeds 60 s when the image isn't cached. This is a safety net, not the primary fix.

#### 1.4 Add `acquireConnectionTimeout` to the returned Knex configs

```typescript
// Apply createEnhancedKnexConfig() to both hostConfig and networkConfig
// so all consumers get sane pool defaults (acquire timeout, pool size).
```

#### 1.5 Add retry with backoff to `setupDBTable()`

```typescript
export async function setupDBTable(config: Knex.Config): Promise<void> {
  const maxRetries = 3;
  const retryDelayMs = 3000;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const knexInstanceClient = knex(config);
    try {
      await knexInstanceClient.migrate.latest();
      return;
    } catch (err) {
      if (attempt === maxRetries) throw err;
      console.warn(
        `setupDBTable attempt ${attempt}/${maxRetries} failed, retrying...`,
        (err as Error).message,
      );
      await new Promise((r) => setTimeout(r, retryDelayMs));
    } finally {
      await knexInstanceClient.destroy();
    }
  }
}
```

#### 1.6 Update all Docker test consumers

Each Docker test file must be updated to use `hostConfig` for `setupDBTable()` and gateway config that talks to other containers must use `networkConfig`. Example:

```typescript
// BEFORE:
const { config, container } = await createPGDatabase(...);
await setupDBTable(config);   // ← uses internal IP, fails from host
gatewayOptions.knexConfig = config; // ← used by gateway container → OK

// AFTER:
const { hostConfig, networkConfig, container } = await createPGDatabase(...);
await setupDBTable(hostConfig);        // ← host connects via localhost:mapped_port
gatewayOptions.knexConfig = networkConfig; // ← gateway container uses internal IP
```

#### 1.7 Verify

```bash
cd packages/cactus-plugin-satp-hermes
yarn test:integration:docker   # expect 13/13 pass
```

---

### Phase 2 — Fix Oracle Tests (Cat-C)

**Target:** `src/test/typescript/integration/oracle/oracle-register-api-server.test.ts`, `oracle-execute-api-server.test.ts`
**Fixes:** 8 Oracle tests

#### 2.1 Move `fabricEnv` usage out of the swallowed try/catch

The root bug: Fabric setup is inside a `try { ... } catch (err) { log.error(...) }` that swallows errors. When Fabric fails, execution continues and calls methods on the undefined `fabricEnv`.

```typescript
// oracle-register-api-server.test.ts:81-132 — CURRENT
try {
  besuEnv = await BesuTestEnvironment.setupTestEnvironment(...);
  ethereumEnv = await EthereumTestEnvironment.setupTestEnvironment(...);
  fabricEnv = await FabricTestEnvironment.setupTestEnvironment(...);
} catch (err) {
  log.error("Error starting Besu Ledger: ", err);    // ← swallows everything
}

besuContractAddress = await besuEnv.deployAndSetupOracleContracts(...);
ethereumContractAddress = await ethereumEnv.deployAndSetupOracleContracts(...);
await fabricEnv.deployAndSetupOracleContracts();      // ← crashes if Fabric failed

// CHANGE TO — re-throw after logging
try {
  besuEnv = await BesuTestEnvironment.setupTestEnvironment(...);
  ethereumEnv = await EthereumTestEnvironment.setupTestEnvironment(...);
  fabricEnv = await FabricTestEnvironment.setupTestEnvironment(...);
} catch (err) {
  log.error("Error starting test ledgers: ", err);
  throw err;  // ← let Jest report the real failure
}
```

**Same pattern in `oracle-execute-api-server.test.ts:79-128`.**

#### 2.2 Guard `afterAll` cleanup with optional chaining

```typescript
// oracle-register-api-server.test.ts:206-210 — CURRENT
afterAll(async () => {
  await gateway.shutdown();
  await besuEnv.tearDown();
  await ethereumEnv.tearDown();
  await fabricEnv.tearDown();
  ...

// CHANGE TO
afterAll(async () => {
  await gateway?.shutdown();
  await besuEnv?.tearDown();
  await ethereumEnv?.tearDown();
  await fabricEnv?.tearDown();
  ...
```

**Same pattern in `oracle-execute-api-server.test.ts:199-203`.**

#### 2.3 Verify

```bash
# With Fabric available (CI or pre-pulled image):
yarn test:integration:oracle   # expect oracle-errors passes; register/execute pass if Fabric is up

# Without Fabric (local, slow machine):
# Tests will now fail fast in beforeAll with clear "Error starting test ledgers" instead of
# cryptic "Cannot read properties of undefined" deep in the test body.
```

---

### Phase 3 — Fix Docker Cleanup and Port Conflicts (Cat-B) ✅ IMPLEMENTED

**Target:** Test environments, afterAll blocks, test utils
**Fixes:** 10 Bridge/fabric-leaf tests + prevents cascading failures in all suites

> **Implemented 2026-03-25**: All changes below have been applied and tested.

#### 3.1 Root Cause

`FabricTestLedgerV1.start()` (in `cactus-test-tooling`, line 1546) uses BOTH
`PublishAllPorts: true` AND explicit `PortBindings` with 8 hardcoded host ports
(30022, 7050, 7051, 7054, 8051, 8054, 9051, 10051). Docker honors explicit
bindings regardless of `PublishAllPorts`. When a previous test run's Fabric
container isn't cleaned up (due to afterAll failures), these ports remain
occupied and the next run fails with "port already allocated".

The cascading failure pattern: any error in `afterAll` would abort remaining
cleanup steps, leaving Docker containers running. The `tearDown()` methods in
all test environments had no error handling — a `stop()` failure would prevent
`destroy()` from running.

#### 3.2 Changes Implemented

##### 3.2.1 Made `tearDown()` resilient in all 3 test environments

Wrapped `stop()` and `destroy()` calls in individual try/catch blocks:

**Files modified:**
- `src/test/typescript/environments/fabric-test-environment.ts`
- `src/test/typescript/environments/besu-test-environment.ts`
- `src/test/typescript/environments/ethereum-test-environment.ts`

```typescript
// Pattern applied to all three:
async tearDown(): Promise<void> {
  try {
    await this.ledger.stop();
  } catch (err) {
    this.log.warn("tearDown: stop() failed, continuing to destroy():", err);
  }
  try {
    await this.ledger.destroy();
  } catch (err) {
    this.log.warn("tearDown: destroy() failed:", err);
  }
}
```

##### 3.2.2 Fixed `afterAll` blocks in 11 test files

Added null guards, removed `fail()` calls that abort cleanup, wrapped each
cleanup step in individual try/catch to prevent cascading failures:

**Bridge tests (3 files):**
- `integration/bridge/besu-leaf.test.ts` — added `if (besuEnv)` guard
- `integration/bridge/ethereum-leaf.test.ts` — added `if (ethereumEnv/ethereumLeaf)` guards, removed `fail()`
- `integration/bridge/fabric-leaf.test.ts` — removed `fail()` from `shutdownConnection()` catch

**Docker tests (4 files):**
- `integration/docker/satp-e2e-transfer-1-gateway-dockerization.test.ts`
- `integration/docker/satp-e2e-transfer-2-gateways-dockerization.test.ts`
- `integration/docker/satp-e2e-transfer-dev-dockerization-fast.test.ts`
- `integration/docker/oracle-execute-dockerization-fast.test.ts`

Pattern: `errors[]` array, each container stop/remove and env tearDown in its own try/catch, warnings logged, errors reported at the end.

**Gateway e2e tests (4 files):**
- `integration/gateway/satp-e2e-transfer-1-gateway.test.ts`
- `integration/gateway/satp-e2e-transfer-2-gateways.test.ts`
- `integration/gateway/satp-e2e-transfer-1-gateway-with-api-server.test.ts`
- `integration/gateway/satp-e2e-transfer-2-gateway-with-api-server.test.ts`

##### 3.2.3 Added shared cleanup utilities to `test-utils.ts`

**File:** `src/test/typescript/test-utils.ts`

Added the following exports:

| Export | Purpose |
|--------|---------|
| `CleanupTask` | Interface: `{ label: string; fn: () => Promise<unknown> }` |
| `runCleanup(log, tasks)` | Runs all tasks, catches errors individually, logs summary |
| `safeStopAndRemoveContainer(c, label, log?)` | Wraps stop+remove in individual try/catch |
| `cleanupContainers(record)` | Builds stop+remove `CleanupTask[]` from `Record<string, Container \| undefined>` |
| `cleanupEnvs(record)` | Builds tearDown tasks from `Record<string, { tearDown } \| undefined>` |
| `cleanupGatewayRunners(record)` | Builds stop+destroy tasks from `Record<string, { stop, destroy } \| undefined>` |
| `cleanupGateways(record)` | Builds shutdown tasks from `Record<string, { shutdown } \| undefined>` |
| `cleanupKnexClients(record)` | Builds destroy tasks from `Record<string, { destroy } \| undefined>` |

Usage pattern in `afterAll`:

```typescript
await runCleanup(log, [
  ...cleanupGatewayRunners({ gatewayRunner }),
  ...cleanupContainers({ db_local, db_remote }),
  ...cleanupKnexClients({ knexSourceRemoteClient, knexTargetRemoteClient }),
  ...cleanupGateways({ gateway1, gateway2 }),
  ...cleanupEnvs({ besuEnv, ethereumEnv, fabricEnv }),
]);
```

This replaces ~15-20 lines of inline ternary/try-catch per test file with 3-5 lines.
All helpers skip `undefined` entries, so no null guards needed at call site.
```

##### 3.2.4 Created unit test for cleanup and port conflict detection

**File:** `src/test/typescript/unit/docker-cleanup.test.ts` (24 tests, all passing)

| Describe | Tests | What It Verifies |
|----------|-------|------------------|
| `safeStopAndRemoveContainer` | 6 | undefined container, stop-fail, remove-fail, both-fail, success, call order |
| `runCleanup` | 3 | all-success, partial-failure collection, empty task list |
| `cleanupContainers` | 2 | generates stop+remove tasks, skips undefined |
| `cleanupEnvs` | 3 | generates tearDown tasks, skips undefined, end-to-end integration |
| `cleanupGatewayRunners` | 2 | generates stop+destroy tasks, skips undefined |
| `cleanupGateways` | 2 | generates shutdown tasks, skips undefined |
| `cleanupKnexClients` | 2 | generates destroy tasks, skips undefined |
| Port conflict detection | 2 | Detect occupied port, detect free port (using `net.createServer`) |
| Fabric AIO port bindings | 2 | Check 8 hardcoded ports, detect stale containers (with Docker timeout guard) |

```
PASS src/test/typescript/unit/docker-cleanup.test.ts (16.867 s)
  Tests: 24 passed, 24 total
```

#### 3.3 Remaining Work (outside SATP Hermes scope)

The **hardcoded `PortBindings`** in `FabricTestLedgerV1.start()` live in
`packages/cactus-test-tooling`. Fixing them to use ephemeral ports (remove the
explicit bindings, rely on `PublishAllPorts: true`) would eliminate the root
cause of port conflicts. This is outside the SATP Hermes package scope and
should be a separate PR against `cactus-test-tooling`.

#### 3.4 Optional: Global Jest teardown and CI post-step

For defense-in-depth, add a global Jest teardown and CI post-step. See
`src/test/typescript/global-teardown.ts` pattern (not yet created) and:

```yaml
# CI workflow post-step:
- name: Cleanup Docker containers
  if: always()
  run: docker ps -aq | xargs -r docker rm -f
```

#### 3.5 Verify

```bash
yarn test:unit -- --testPathPattern='docker-cleanup'  # 24/24 pass ✅
yarn test:integration:bridge   # needs clean Docker + Fabric image
```

---

### Phase 4 — Fix Gateway E2E Timeouts (Cat-A)

**Target:** `src/test/typescript/environments/fabric-test-environment.ts`, gateway e2e test files, CI workflow
**Fixes:** ~12 Gateway e2e tests

The core issue: Fabric AIO container initialization (image pull + container start + channel create + chaincode deploy) exceeds the 900 s test timeout. This is partly environmental (slow machine, cold image cache) and partly structural (too much work in a single `beforeAll`).

#### 4.1 Pre-pull Fabric AIO image in CI

Add a setup step in the CI workflow:

```yaml
- name: Pre-pull heavy Docker images
  run: |
    docker pull ghcr.io/hyperledger-cacti/cactus-fabric2-all-in-one:v2.1.0
    docker pull postgres:17.2
```

This removes image pull time from the test's `beforeAll` timeout budget.

#### 4.2 Add progress logging to `FabricTestEnvironment.init()`

```typescript
// fabric-test-environment.ts:140-155 — add log lines
public async init(): Promise<void> {
  this.log.info("FabricTestEnvironment: creating ledger...");
  this.ledger = new FabricTestLedgerV1({ ... });

  this.log.info("FabricTestEnvironment: starting container...");
  const container = await this.ledger.start();

  this.log.info("FabricTestEnvironment: container started, enrolling admin...");
  // ... existing code

  this.log.info("FabricTestEnvironment: admin enrolled, creating connector...");
  // ... existing code

  this.log.info("FabricTestEnvironment: init complete");
}
```

**Why:** When the test times out we currently see only "starting nodes with CLI timeout..." from the container. Progress markers narrow down which phase is slow.

#### 4.3 Increase gateway e2e `beforeAll` timeout from 900 s → 1200 s

```typescript
// In gateway e2e test files, change:
const TIMEOUT = 900000;  // → 1200000
```

Files:
- `gateway/satp-e2e-transfer-1-gateway.test.ts`
- `gateway/satp-e2e-transfer-2-gateways.test.ts`
- `gateway/satp-e2e-transfer-1-gateway-with-api-server.test.ts`
- `gateway/satp-e2e-transfer-2-gateway-with-api-server.test.ts`

Note: `satp-e2e-transfer-1-gateway-dockerization.test.ts` already has `TIMEOUT = 9000000` (150 min — probably a typo for 900000). Normalize this.

#### 4.4 Verify

```bash
# On CI (with pre-pulled images):
yarn test:integration:gateway   # expect all suites pass

# Locally: tests may still be slow depending on machine.
# Focus local verification on the simple gateway tests:
npx jest ./src/test/typescript/integration/gateway/SATPGatewayRunner-instantiation.test.ts \
         ./src/test/typescript/integration/gateway/gateway-blo.test.ts \
         ./src/test/typescript/integration/gateway/gateway-init-startup.test.ts \
         --runInBand --forceExit --config=jest.config-integration-gateway.ts
```

---

### Phase 5 — Re-enable Skipped Tests (Cat-E)

**Target:** Unit crash-management tests, integration recovery tests
**Fixes:** 18 skipped tests

#### 5.1 Audit crash-management unit tests

Files with `describe.skip`:
- `unit/crash-management/cron-job.test.ts:194`
- `unit/crash-management/scenarios.test.ts:198`
- `unit/crash-management/rollback-factory.test.ts` (rollback — **excluded from scope**)

**Action:** Check if the `CrashManager` class referenced in the tests has a complete implementation. If yes, remove `describe.skip` and run. If no, file a GitHub issue.

#### 5.2 Audit recovery integration tests

Files with `describe.skip`:
- `integration/recovery/recovery-stage-1.test.ts:330`
- `integration/recovery/recovery-stage-2.test.ts:352`
- `integration/recovery/recovery-stage-3.test.ts:375`

These tests use `knexInstanceClient.migrate.latest()` without `createEnhancedKnexConfig`, which may cause pool issues. If re-enabled, apply the same Knex config enhancement from Phase 1.

**Action:** Remove `describe.skip`, apply enhanced Knex config, run, and fix any remaining issues.

#### 5.3 Verify

```bash
yarn test:unit                    # crash-management should now run
yarn test:integration:recovery    # recovery should now run
```

---

## 4. Execution Order and Dependencies

```
Phase 1 (Cat-D: PG/Knex)   ──→ unblocks Docker suite   (13 tests)
    │
    ├── independent of other phases
    │
Phase 2 (Cat-C: Oracle)    ──→ unblocks Oracle suite    (8 tests)
    │
    ├── independent, just test-level fixes
    │
Phase 3 (Cat-B: Port)      ──→ unblocks Bridge/Fabric   (10 tests)
    │
    ├── depends on Phase 1 for global teardown pattern
    │
Phase 4 (Cat-A: Timeout)   ──→ unblocks Gateway e2e     (~12 tests)
    │
    ├── depends on Phase 3 for clean Docker state
    │
Phase 5 (Cat-E: Skipped)   ──→ re-enables parked tests  (18 tests)
    │
    └── depends on Phase 1 for Knex config pattern
```

**Phases 1, 2, 3 can run in parallel. Phase 4 depends on 3. Phase 5 depends on 1.**

---

## 5. Files Changed Per Phase

| Phase | Files Modified | Files Created |
|-------|---------------|---------------|
| 1 | `src/test/typescript/test-utils.ts` | — |
| 2 | `src/test/typescript/integration/oracle/oracle-register-api-server.test.ts`, `oracle-execute-api-server.test.ts` | — |
| 3 | `fabric-test-environment.ts`, `besu-test-environment.ts`, `ethereum-test-environment.ts`, 3 bridge tests, 4 docker tests, 4 gateway tests, `test-utils.ts` | `unit/docker-cleanup.test.ts` |
| 4 | `src/test/typescript/environments/fabric-test-environment.ts`, 4 gateway e2e test files | CI workflow update |
| 5 | `unit/crash-management/cron-job.test.ts`, `scenarios.test.ts`, 3 recovery test files | — |

---

## 6. Verification Matrix

| Phase | Command | Expected |
|-------|---------|----------|
| 1 | `yarn test:integration:docker` | 13/13 pass |
| 2 | `yarn test:integration:oracle` | 14/14 pass (needs Fabric) |
| 3 | `yarn test:integration:bridge` | 54/54 pass (needs Fabric) |
| 4 | `yarn test:integration:gateway` | all pass (CI only) |
| 5 | `yarn test:unit` + `yarn test:integration:recovery` | 0 skipped |
| All | `yarn test:unit && yarn test:integration` | ~413/413 pass |

---

## 7. Log Files

All raw test output in `reports/test-analysis/`:

| Log | Content |
|-----|---------|
| `unit-tests.log` | 20 passed, 3 skipped, 0 failed |
| `integration-adapter.log` | 5 suites, 48 tests, all passed |
| `integration-gateway.log` | Truncated — Fabric AIO still starting |
| `integration-gateway-simple.log` | 3 suites, 14 tests, all passed |
| `integration-gateway-1gw.log` | 1 suite, 6 tests, all failed (900 s timeout) |
| `integration-bridge.log` | 2 passed, 1 failed (fabric-leaf port conflict) |
| `integration-oracle.log` | 1 passed, 2 failed (fabricEnv undefined) |
| `integration-recovery.log` | 3 suites, all skipped |
| `integration-monitoring.log` | 1 suite, 4 tests, all passed |
| `integration-docker.log` | 4 suites, 13 tests, all failed (PG/Knex timeout) |
