---
description: "Use when working on the SATP Hermes plugin (cactus-plugin-satp-hermes). Covers gateway architecture, database migrations, Cucumber BDD, and cross-chain protocol flows."
applyTo: "packages/cactus-plugin-satp-hermes/**"
---
# SATP Hermes Plugin

This is the Secure Asset Transfer Protocol implementation based on the IETF
SATP draft and the HERMES fault-tolerant middleware paper.

## Package Layout

- `src/main/typescript/core/` — Core protocol logic
- `src/main/typescript/adapters/` — Ledger-specific adapters
- `src/main/typescript/database/` — Knex database layer and migrations
- `src/main/typescript/services/` — Service layer
- `src/main/typescript/types/` — Type definitions
- `src/main/typescript/cross-chain-mechanisms/` — Cross-chain logic
- `src/main/typescript/extensions/` — Protocol extensions
- `src/main/typescript/api1/` — REST API definitions
- `src/main/typescript/factory/` — Plugin factory
- `src/main/typescript/generated/gateway-client/` — generated gateway client
- `src/main/typescript/generated/proto/` — generated protobuf types
- `src/main/solidity/` — generated and source Solidity contracts

## Testing

Multiple Jest configurations exist:
- `jest.config-unit.ts` — Unit tests
- `jest.config-integration.ts` — General integration tests
- `jest.config-integration-docker.ts` — Docker-based integration tests
- `jest.config-integration-bridge.ts` — Bridge-specific tests
- `jest.config-integration-oracle.ts` — Oracle-specific tests
- `jest.config-integration-gateway.ts` — Gateway-specific tests

Cucumber BDD tests are under `src/test/cucumber/`.

Prefer the package-local scripts in `package.json` over ad hoc root commands:
- `test:unit`
- `test:integration`
- `test:integration:gateway`
- `test:integration:oracle`
- `test:integration:bridge`
- `test:integration:docker`

## Database Migrations

Uses Knex.js for database migrations under `src/main/typescript/database/migrations/`.
Migrations must be reversible (implement both `up` and `down`).
Local and remote repositories have separate knexfiles and separate rollback
commands. Prefer `db:init`, `db:rollback`, `db:setup`, and related package
scripts instead of hand-written migration commands.

## OpenAPI / Proto / Solidity Workflow

- SATP Hermes bundles YAML from `src/main/yml/bol/oapi-api1.yml` before codegen.
- Gateway client generation writes to
	`src/main/typescript/generated/gateway-client/typescript-axios/`.
- Protobuf generation runs through `buf build` and `buf generate`.
- Solidity artifacts are generated with Foundry under `src/main/solidity/generated`
	and `src/test/solidity/generated`.

## Operational Scripts

- Database lifecycle: `db:start`, `db:stop`, `db:setup`, `db:destroy`
- Docker packaging: `docker:build:*`, `docker:run:*`
- Docs pipeline: `docs:generate`, `docs:validate`, `docs:diagrams`

## Key Interfaces

- Gateway plugin: `plugin-satp-hermes-gateway.ts`
- CLI entry: `plugin-satp-hermes-gateway-cli.ts`
- Public API: `public-api.ts`
- Factory: `factory/plugin-factory-gateway-orchestrator.ts`

## Review Notes

- This package is more specialized and more heavily documented than older
	connectors. Preserve its richer inline documentation when editing public APIs.
- `cactus-test-tooling` appears in this package's runtime dependencies today.
	Treat the repository rule as the preferred standard for new work, but do not
	blindly “fix” this package unless the task is specifically about dependency
	hygiene.
