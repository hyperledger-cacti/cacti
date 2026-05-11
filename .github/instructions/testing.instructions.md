---
description: "Use when writing, debugging, or modifying test files. Covers Jest configuration, test file placement, self-containment rules, and flake prevention."
applyTo: "**/src/test/typescript/**/*.test.ts"
---
# Testing Conventions

- **Runner**: Jest with ts-jest preset, `testEnvironment: "node"`.
- **Location**: `src/test/typescript/unit/` and `src/test/typescript/integration/`.
- **Naming**: `*.test.ts` suffix required.
- **Timeout**: default 60 minutes (global). Override per-test if needed.

## Core Principles

1. **Self-contained**: each test can run independently.
2. **Injectable config**: ports, paths, and hosts must be configurable via
   constructor/options — never hardcode. Use port `0` for auto-assignment.
3. **Not exported**: test types never appear in `public-api.ts`.
4. **Single focus**: one test = one feature/bug verification.
5. **No circular deps**: integration tests needing `cactus-cmd-api-server`
   go in a separate `cacti-test-*` package.
6. **Test tooling**: prefer `cactus-test-tooling` as a `devDependency` for new
   work. Treat existing runtime usage in legacy packages as technical debt,
   not an automatic cleanup target.

## Repository Reality

- Not every package defines `jest.config-unit.ts` or `jest.config-integration.ts`.
  Older packages such as the Ethereum connector often rely on the root Jest
  config plus direct file/path execution.
- SATP Hermes is an exception-heavy package with dedicated scripts such as
  `test:unit`, `test:integration:gateway`, `test:integration:oracle`, and
  Docker-backed integration variants.
- Some tests under `manual/` are intentionally excluded from normal CI runs.

## Per-Package Config

Packages may define separate Jest configs:
- `jest.config-unit.ts` → matches `**/src/test/typescript/unit/**/*.test.ts`
- `jest.config-integration.ts` → matches `**/src/test/typescript/integration/**/*.test.ts`

Both extend root patterns and include `jest-extended/all` + console log setup.

## Running Tests

```bash
# Prefer package-local scripts when present
yarn workspace @hyperledger/<pkg> run test:unit

# Root Jest against a specific file or subtree
yarn jest -- packages/<pkg>/src/test/typescript/unit/foo.test.ts

# Package-local config when it exists
yarn jest --config packages/<pkg>/jest.config-integration.ts

# SATP Hermes examples
yarn workspace @hyperledger/cactus-plugin-satp-hermes run test:integration:gateway
yarn workspace @hyperledger/cactus-plugin-satp-hermes run test:integration:oracle
```

Choose the narrowest reproducer first, then broaden to the package-level suite.

## Test Utilities & Shared Infrastructure

### Logger Setup

Use `LoggerProvider.getOrCreate()` from `@hyperledger/cactus-common` for
consistent, cached logger instances. Never use raw `console.log` in tests.

```typescript
import { LoggerProvider, LogLevelDesc } from "@hyperledger/cactus-common";

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "my-test-label",
});

log.info("Test environment setup complete");
```

For unit tests that need a logger without side effects, use a stub:

```typescript
export function createLoggerStub(): Logger {
  return {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    trace: jest.fn(),
  } as unknown as Logger;
}
```

### Port Allocation

Use `Servers.listen()` with port `0` for dynamic allocation. This prevents
port conflicts when tests run in parallel.

```typescript
import { Servers, IListenOptions } from "@hyperledger/cactus-common";
import http from "http";
import { AddressInfo } from "net";

const server = http.createServer(expressApp);
const listenOptions: IListenOptions = {
  hostname: "127.0.0.1",
  port: 0, // OS picks available port
  server,
};
const addressInfo = (await Servers.listen(listenOptions)) as AddressInfo;
const apiHost = `http://${addressInfo.address}:${addressInfo.port}`;
```

Shut down servers in `afterAll`:

```typescript
afterAll(async () => {
  await Servers.shutdown(server);
});
```

### Docker Container Lifecycle

Integration tests that use Docker containers must follow the
start → use → stop → destroy → prune pattern.

**Starting test ledgers** (from `@hyperledger/cactus-test-tooling`):

```typescript
import { BesuTestLedger } from "@hyperledger/cactus-test-tooling";

const ledger = new BesuTestLedger({
  emitContainerLogs: true,
  envVars: ["BESU_NETWORK=dev"],
  containerImageVersion: "v2.2.0-rc.2",
});
await ledger.start();
```

**Tearing down ledgers** — always stop and destroy in `afterAll`:

```typescript
afterAll(async () => {
  if (ledger) {
    await ledger.stop();
    await ledger.destroy();
  }
});
```

### Docker Cleanup in CI

Always call `pruneDockerContainersIfGithubAction()` in `afterAll` to free
disk space in GitHub Actions. Pair it with `Containers.logDiagnostics()`
as an error handler so CI failures leave useful logs.

```typescript
import {
  pruneDockerContainersIfGithubAction,
  Containers,
} from "@hyperledger/cactus-test-tooling";

afterAll(async () => {
  // ... stop ledgers, close DB connections ...

  await pruneDockerContainersIfGithubAction({ logLevel })
    .then(() => log.info("Pruning OK"))
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning failed");
    });
});
```

Some tests also prune in `beforeEach` / `afterEach` for extra isolation.

### Test Timeout Constants

Use `CI_TEST_TIMEOUT` (900 000 ms / 15 min) from test-utils for
integration tests that spin up Docker containers or multi-stage transfers.
Apply it to `jest.setTimeout` and lifecycle hooks:

```typescript
import { CI_TEST_TIMEOUT } from "../../test-utils";

describe("integration suite", () => {
  jest.setTimeout(CI_TEST_TIMEOUT);

  beforeAll(async () => { /* ... */ }, CI_TEST_TIMEOUT);
  afterAll(async () => { /* ... */ }, CI_TEST_TIMEOUT);
});
```

### Database Setup for Tests

Tests using databases follow a pattern: create container → run migrations
→ test → destroy connections → remove container.

**In-memory SQLite** (fast, for unit-like integration tests):

```typescript
import knex, { Knex } from "knex";
import { createMigrationSource } from "<pkg>/database/knex-migration-source";

const migrationSource = await createMigrationSource();
const db = knex({
  client: "sqlite3",
  connection: ":memory:",
  migrations: { migrationSource },
  useNullAsDefault: true,
});
await db.migrate.latest();
```

**PostgreSQL in Docker** (SATP Hermes pattern — `createPGDatabase()` in
`test-utils.ts`):

```typescript
import { createPGDatabase, setupDBTable } from "../../test-utils";

const { config: pgConfig, container } = await createPGDatabase({
  network: "my-test-network",
  postgresDB: "test_db",
});
await setupDBTable(pgConfig);
```

Always destroy Knex connections in teardown to avoid pool exhaustion:

```typescript
afterAll(async () => {
  if (knexClient) await knexClient.destroy();
});
```

### Test Environment Classes (SATP Hermes)

SATP Hermes provides reusable environment classes under
`src/test/typescript/environments/` that encapsulate ledger startup,
contract deployment, and configuration:

- `BesuTestEnvironment` — Besu ledger with ERC-20/ERC-721 contracts
- `EthereumTestEnvironment` — Ethereum ledger setup
- `FabricTestEnvironment` — Hyperledger Fabric setup

Each class exposes:
- `setupTestEnvironment()` / `init()` — start ledger, deploy contracts
- `tearDown()` — stop and destroy containers
- `defaultAsset` / `nonFungibleDefaultAsset` — pre-configured asset objects
- Connector instances, keychain plugins, and network config

Usage:

```typescript
import {
  BesuTestEnvironment,
  EthereumTestEnvironment,
  getTransactRequest,
} from "../../test-utils";

let besuEnv: BesuTestEnvironment;

beforeAll(async () => {
  besuEnv = await BesuTestEnvironment.setupTestEnvironment(
    { logLevel },
    [{ assetType: SupportedContractTypes.FUNGIBLE, contractName: "SATPContract" }],
  );
  await besuEnv.deployAndSetupContracts(ClaimFormat.BUNGEE);
}, CI_TEST_TIMEOUT);

afterAll(async () => {
  if (besuEnv) await besuEnv.tearDown();
});
```

Build transaction requests with the shared helper:

```typescript
const request = getTransactRequest(
  "context-123", besuEnv, ethereumEnv, "100", "100",
);
```

### Test API Clients

Use `createClient()` from `test-utils.ts` to get typed Axios clients
pointing at a running gateway:

```typescript
import { createClient } from "../../test-utils";

const txApi = createClient("TransactionApi", address, port, log);
const adminApi = createClient("AdminApi", address, port, log);
```

### Adapter / Webhook Testing (SATP Hermes)

For adapter integration tests, the package provides:

- **`adapter-test-server.ts`** — Express-based local webhook server with
  endpoints for approval, rejection, delayed responses, and error simulation.
  Uses port 0 for dynamic allocation.
- **`adapter-test-utils.ts`** — Pre-built constants (`TEST_SESSION_ID`,
  `TEST_CONTEXT_ID`), mock fetch implementations (`createFetchResponse()`),
  and adapter harness factories (`createAdapterHarness()`).

```typescript
import { startTestServer, stopTestServer } from "./adapter-test-server";
import { TEST_LOG_LEVEL, TEST_SESSION_ID } from "./adapter-test-utils";

let serverInfo: TestServerInfo;

beforeAll(async () => { serverInfo = await startTestServer(); });
afterAll(async () => { await stopTestServer(serverInfo); });
```

### Docker Compose in Tests

For tests that need Docker Compose services, use the helpers from
`test-utils.ts`:

```typescript
import {
  startDockerComposeService,
  stopDockerComposeService,
} from "../../test-utils";

startDockerComposeService("/path/to/docker-compose.yml", "service-name");
// ... run tests ...
stopDockerComposeService("/path/to/docker-compose.yml", "service-name");
```
