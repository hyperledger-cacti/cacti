---
description: "Use when working on the SATP Hermes plugin (cactus-plugin-satp-hermes). Covers gateway architecture, protocol stages, adapter layer, database migrations, cross-chain mechanisms, configuration, testing, and deployment."
applyTo: "packages/cactus-plugin-satp-hermes/**"
---
# SATP Hermes Plugin

Implementation of the IETF Secure Asset Transfer Protocol (SATP) based on
the SATP v2 core spec (draft-ietf-satp-core-02) and the Hermes research
paper on fault-tolerant cross-chain middleware. Provides atomic cross-chain
asset transfers between heterogeneous blockchain networks (Fabric,
Besu/Ethereum).

## Package Layout

```
src/main/typescript/
  plugin-satp-hermes-gateway.ts    — Main gateway plugin (ICactusPlugin)
  plugin-satp-hermes-gateway-cli.ts — CLI entry point for Docker/production
  public-api.ts                     — Barrel exports (heavily documented)
  factory/                          — PluginFactorySATPGateway
  core/
    types.ts                        — GatewayIdentity, LocalLog, RemoteLog, ShutdownHook
    constants.ts                    — Default ports (server 3010, client 3011, OAPI 4010)
    satp-session.ts                 — Session lifecycle and state
    satp-protocol-map.ts            — Type-safe stage/step definitions and total ordering
    satp-utils.ts / session-utils.ts
    stage-handlers/                 — stage0-handler ... stage3-handler + handler-utils
    stage-services/                 — satp-service, data-verifier, service-utils
    crash-management/               — crash-handler, client-service, server-service
    errors/                         — satp-errors, satp-handler-errors, satp-service-errors
    satp-logger.ts / satp-logger-provider.ts
  api1/                             — BLO REST dispatcher (Application-to-Gateway)
  adapters/                         — API Type 3: webhook-based adapter layer
    adapter-config.ts               — YAML config types, stage key utils
    adapter-manager.ts              — Loads and validates adapter configs
    adapter-hook-service.ts         — Executes outbound/inbound webhooks
    adapter-webhook-contracts.ts    — Pre/During/Post webhook type contracts
    adapter-runtime-types.ts        — Invocation context and result types
  services/
    gateway/gateway-orchestrator.ts — Counterparty mgmt, channel lifecycle
    gateway/satp-manager.ts         — Protocol state machine and session coordination
    gateway/crash-manager.ts        — Crash recovery orchestration
    monitoring/monitor.ts           — OpenTelemetry metrics/traces/logs
    network-identification/         — Gateway discovery, chain ID resolution
    token-price-check/              — Price oracle integration
    validation/                     — Config schema validation, load-gateway-config
  cross-chain-mechanisms/
    satp-cc-manager.ts              — Cross-chain manager (bridge + oracle)
    bridge/                         — Bridge manager, leaf impls (fungible/NFT)
      bridge-manager.ts
      bridge-leaf-fungible.ts / bridge-leaf-non-fungible.ts
      satp-bridge-execution-layer.ts / -implementation.ts
    oracle/                         — Oracle manager, scheduler, dispatcher
  database/
    gateway-persistence.ts          — Unified local+remote persistence facade
    repository/                     — ILocalLogRepository, IRemoteLogRepository + Knex
    migrations/                     — Knex migration files (must have up and down)
    knex-migration-source.ts
  generated/
    gateway-client/typescript-axios/ — Auto-generated from OpenAPI (DO NOT EDIT)
    proto/                           — Auto-generated from protobuf (DO NOT EDIT)
  types/                            — Supplementary type definitions
  extensions/                       — Protocol extensions
  utils/                            — gateway-utils (sign, verifySignature, getHash)

src/main/solidity/                  — Solidity bridge contracts (Foundry-built)
  contracts/                        — Source contracts
  generated/                        — Compiled artifacts (DO NOT EDIT)

src/examples/config/                — Gateway configuration examples (JSON + YAML)
src/examples/adapter-demo/          — Docker adapter testing guide + Makefile
```

## SATP Protocol — Four Stages

The protocol runs between a **source gateway** (client) and a
**destination gateway** (server):

| Stage | Name | What Happens |
|-------|------|-------------|
| **0** | Transfer Initiation | Session negotiation, capability exchange |
| **1** | Transfer Agreement | Asset details, transfer proposal, commence |
| **2** | Lock Evidence | Asset lock on source ledger, cryptographic proof |
| **3** | Commitment | Extinguish on source, regenerate on destination, finalize |
| **CR** | Crash Recovery | Session log replay, consistency checks, rollback |

Stage handlers live in `core/stage-handlers/stage{0-3}-handler.ts`.
The protocol map in `core/satp-protocol-map.ts` defines the total
execution order with typed step tags per stage.

## Three API Types

1. **API Type 1 — Application-to-Gateway** (REST, `api1/dispatcher.ts`):
   - `POST /api/v1/transfer` — Initiate asset transfer
   - `GET /api/v1/status` — Gateway status
   - `GET /api/v1/sessions` — Active SATP sessions
   - `POST /api/v1/oracle/task` — Oracle operations
   - OpenAPI spec: `src/main/yml/bol/oapi-api1.yml`

2. **API Type 2 — Gateway-to-Gateway** (gRPC/ConnectRPC):
   - Client and Server endpoints for each protocol message
   - Protobuf definitions under `src/main/proto/`
   - Generated types in `generated/proto/`

3. **API Type 3 — Adapter Layer** (webhooks, `adapters/`):
   - Hook custom logic into any protocol step via YAML config
   - **Outbound webhooks**: fire-and-forget notifications
   - **Inbound webhooks**: blocking approval gates
   - Each adapter binds to `(stage, step, point)` where point is before or after
   - Config examples: `src/test/yaml/fixtures/adapter-configuration-*.yml`
   - See `docs/api3-adapter-spec.md` for full reference

## Adapter Layer Patterns

Adapters are defined in YAML and loaded by `AdapterManager`:

```yaml
adapters:
  - id: "compliance-gate"
    active: true
    priority: 1
    executionPoints:
      - stage: 1
        step: lockAssertionRequest
        point: "before"
    inboundWebhook:
      urlSuffix: "/approval/compliance"
      timeoutMs: 300000
```

Outbound webhook payload includes `eventType`, `stage`, `stepTag`,
`sessionId`, `contextId`, `gatewayId`, `timestamp`, and `payload`.

## Gateway Configuration

Configuration can be programmatic (TypeScript) or file-based (JSON):

```typescript
const gateway = new SATPGateway({
  instanceId: "gateway-001",
  keyPair: keyPairConfig,         // Secp256k1
  localRepository: localRepo,     // Knex-backed
  remoteRepository: remoteRepo,   // IPFS-backed for audit trail
});
await gateway.onPluginInit();
```

Key config sections:
- `gid` — Gateway identity (id, name, version, address, ports)
- `counterPartyGateways` — Known peer gateways
- `ccConfig.bridgeConfig` — Bridge leaf configs per ledger
- `ccConfig.oracleConfig` — Oracle configs per ledger
- `keyPair` — Gateway signing keys (Secp256k1)
- `enableCrashRecovery` — Toggle crash recovery
- `ontologyPath` — Path to asset ontology definitions

Default ports: server `3010`, client `3011`, OAPI `4010`.

### Reusing Deployed Wrapper Contracts

If bridge wrapper contracts already exist on-chain, provide
`wrapperContractName` (and `wrapperContractAddress` for EVM) in the leaf
config. The bridge manager skips redeployment when these are present.

## Database Layer

- **Knex.js** with SQLite (dev/test) or PostgreSQL (production)
- Migrations in `src/main/typescript/database/migrations/`
- Every migration must implement both `up()` and `down()`
- Local repo: session-scoped protocol logs
- Remote repo: distributed crash recovery logs (IPFS integration)
- Migration source: `database/knex-migration-source.ts`

### Database Scripts

```bash
yarn workspace @hyperledger/cactus-plugin-satp-hermes run db:start
yarn workspace @hyperledger/cactus-plugin-satp-hermes run db:init
yarn workspace @hyperledger/cactus-plugin-satp-hermes run db:rollback
yarn workspace @hyperledger/cactus-plugin-satp-hermes run db:setup
yarn workspace @hyperledger/cactus-plugin-satp-hermes run db:destroy
```

## Cross-Chain Mechanisms

### Bridge Manager
Coordinates asset lock/unlock/extinguish/regenerate on source and
destination ledgers. Uses leaf implementations per ledger type:
- `bridge-leaf-fungible.ts` — ERC-20 / fungible assets
- `bridge-leaf-non-fungible.ts` — ERC-721 / NFTs
- Solidity wrapper contracts built with Foundry (`forge:build:all`)

### Oracle Manager
Monitors on-chain events and dispatches notifications:
- `oracle-manager.ts` — Lifecycle management
- `oracle-scheduler-manager.ts` — Polling schedules
- `oracle-notification-dispatcher.ts` — Event routing

## Code Generation

This package has its own codegen pipeline — do NOT use root `yarn codegen`:

```bash
# Full codegen (runs all three in parallel)
yarn workspace @hyperledger/cactus-plugin-satp-hermes run codegen

# Individual generators:
yarn workspace @hyperledger/cactus-plugin-satp-hermes run codegen:openapi
yarn workspace @hyperledger/cactus-plugin-satp-hermes run codegen:proto
yarn workspace @hyperledger/cactus-plugin-satp-hermes run codegen:abi
```

OpenAPI source: `src/main/yml/bol/oapi-api1.yml` (not `openapi.json`).

## Testing

### Test Configurations (6 Jest configs)

| Config | Scope | Script |
|--------|-------|--------|
| `jest.config-unit.ts` | Unit tests | `test:unit` |
| `jest.config-integration.ts` | General integration | `test:integration` |
| `jest.config-integration-gateway.ts` | Gateway protocol tests | `test:integration:gateway` |
| `jest.config-integration-oracle.ts` | Oracle tests | `test:integration:oracle` |
| `jest.config-integration-bridge.ts` | Bridge tests | `test:integration:bridge` |
| `jest.config-integration-docker.ts` | Docker-based tests | `test:integration:docker` |

Additional scoped scripts: `test:integration:adapter`,
`test:integration:recovery`, `test:integration:rollback`.

### Running Tests

```bash
# Always prefer package-local scripts
yarn workspace @hyperledger/cactus-plugin-satp-hermes run test:unit
yarn workspace @hyperledger/cactus-plugin-satp-hermes run test:integration:gateway
```

### Test Environments (`src/test/typescript/environments/`)

Reusable setup classes that encapsulate ledger startup, contract deployment,
and configuration:
- `BesuTestEnvironment` — Besu with ERC-20/ERC-721 contracts
- `EthereumTestEnvironment` — Ethereum ledger
- `FabricTestEnvironment` — Hyperledger Fabric

### Adapter Testing (`src/test/typescript/integration/adapter/`)

- `adapter-test-server.ts` — Express webhook server (approval/rejection/delay)
- `adapter-test-utils.ts` — Constants, mock fetch, adapter harness factories
- YAML fixtures: `src/test/yaml/fixtures/adapter-configuration-*.yml`

### Cucumber BDD

Feature files and step definitions under `src/test/cucumber/`.

## Docker Deployment

```bash
# Build image
yarn workspace @hyperledger/cactus-plugin-satp-hermes run docker:build:latest

# Or use the adapter demo Makefile
make -f src/examples/adapter-demo/docker-adapter-test.mk run
```

Image tags: `latest`, `<version>`, `<date>-dev-<sha>`, `<date>-stg-<sha>`.

## Documentation Pipeline

```bash
yarn workspace @hyperledger/cactus-plugin-satp-hermes run docs:generate
yarn workspace @hyperledger/cactus-plugin-satp-hermes run docs:serve
yarn workspace @hyperledger/cactus-plugin-satp-hermes run docs:validate
```

Architecture diagrams (Mermaid sources in `docs/diagrams/`, outputs in
`assets/diagrams/`): 11 diagrams covering system overview, module-level
architecture, API layers, and protocol flows.

## Key Interfaces and Exports

From `public-api.ts` (the stable public contract):

| Export | Source | Purpose |
|--------|--------|---------|
| `SATPGateway`, `SATPGatewayConfig` | `plugin-satp-hermes-gateway.ts` | Main gateway class |
| `PluginFactorySATPGateway` | `factory/` | Factory for gateway creation |
| `GatewayIdentity` | `core/types.ts` | Gateway ID, version, address |
| `ClaimFormat` | `generated/proto/` | Proof format enum |
| `GatewayOrchestrator`, `SATPManager` | `services/gateway/` | Core services |
| `OracleManager` | `cross-chain-mechanisms/oracle/` | Event monitoring |
| `BLODispatcher` | `api1/dispatcher.ts` | REST API layer |
| `SATP_PROTOCOL_MAP` | `core/satp-protocol-map.ts` | Protocol execution order |
| `ILocalLogRepository` | `database/repository/` | Persistence interfaces |
| `MonitorService` | `services/monitoring/` | OpenTelemetry integration |
| Adapter types | `adapters/` | Webhook config and runtime types |
| `sign`, `verifySignature`, `getHash` | `utils/gateway-utils.ts` | Crypto utilities |

## Crash Recovery

Assumes gateways crash only after receiving a message and logging it.
Recovery uses session log replay with consistency checks:

1. Gateways exchange `RecoverV1Message` / `RecoverUpdateV1Message`
2. Validate logs, hashes, timestamps, signatures
3. Resume from last consistent state or execute `RollbackV1Message`

## Review Notes

- Preserve the rich inline documentation style when editing public APIs.
- `cactus-test-tooling` in runtime deps is known tech debt — do not "fix"
  unless the task is specifically about dependency hygiene.
- The `public-api.ts` has extensive JSDoc — match that density for new exports.
- Solidity contracts use Foundry, not Hardhat. Use `forge` commands.
- Linting includes OpenAPI vacuum (`lint:oapi`) and protobuf buf lint
  (`lint:protobuf`) in addition to ESLint/Prettier.
