<!-- --8<-- [start:content] -->
# SATP Hermes Gateway Configuration

SATP Hermes can be created programmatically with `SATPGatewayConfig` or started through the package CLI with a JSON configuration file.

## Tracked examples

The repository contains [Gateway 1](https://github.com/hyperledger-cacti/cacti/blob/main/packages/cactus-plugin-satp-hermes/src/examples/config/satp-gateway1-config.json) and [Gateway 2](https://github.com/hyperledger-cacti/cacti/blob/main/packages/cactus-plugin-satp-hermes/src/examples/config/satp-gateway2-config.json) examples. Additional oracle test cases are available in [`src/examples/config/`](https://github.com/hyperledger-cacti/cacti/tree/main/packages/cactus-plugin-satp-hermes/src/examples/config). The example credentials are for local development and must not be reused in deployed environments.

## Programmatic configuration

`SATPGatewayConfig` supports the following top-level fields:

| Field | Required | Default or behavior |
| --- | --- | --- |
| `pluginRegistry` | Yes | No default for direct construction. |
| `gid` | No | A local gateway identity is generated. |
| `counterPartyGateways` | No | Empty array. |
| `keyPair` | No | A secp256k1 key pair is generated. |
| `environment` | No | `"development"`. |
| `validationOptions` | No | Empty object. |
| `privacyPolicies`, `mergePolicies` | No | Empty arrays. |
| `ccConfig` | No | Empty bridge and oracle configuration. |
| `localRepository` | No | Per-instance SQLite configuration. |
| `remoteRepository` | No | Disabled. |
| `auditRepository` | No | In-memory SQLite configuration. |
| `oracleLogRepository` | No | Per-instance SQLite configuration. |
| `enableCrashRecovery` | No | `false`. |
| `monitorService` | No | An enabled monitor service is created. |
| `claimFormat` | No | The default claim format. |
| `ontologyPath`, `extensions`, `adapterConfig`, `supportedLedgers` | No | Feature-specific configuration. |
| `logLevel` | No | `"INFO"`. |

See [`SATPGatewayConfig`](https://github.com/hyperledger-cacti/cacti/blob/main/packages/cactus-plugin-satp-hermes/src/main/typescript/plugin-satp-hermes-gateway.ts) for field types and validation details.

## CLI configuration

The CLI requires `/opt/cacti/satp-hermes/config/config.json` by default and optionally loads `/opt/cacti/satp-hermes/config/adapter-config.yml`. Programmatic callers can override `workDir`, `configPath`, and `adapterConfigPath` through `launchGateway()`.

The CLI validates the identity, counterparties, key pair, environment, policies, repositories, cross-chain configuration, extensions, and optional adapter configuration before constructing the gateway. For adapter fields and execution-point semantics, see the [API Type 3 adapter specification][package-doc-api3-adapter-spec-md].
<!-- --8<-- [end:content] -->

[package-doc-api3-adapter-spec-md]: ./api3-adapter-spec.md
