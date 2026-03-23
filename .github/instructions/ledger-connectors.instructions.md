---
description: "Use when developing or modifying ledger connector plugins. Covers IPluginLedgerConnector contract, transaction patterns, WatchBlocks, connector test tooling, and Docker images."
applyTo: "packages/cactus-plugin-ledger-connector-*/**"
---
# Ledger Connector Conventions

## IPluginLedgerConnector Interface

All connectors implement `IPluginLedgerConnector<DeployIn, DeployOut, TransactIn, TransactOut>`
from `cactus-core-api`. Required methods:

- `deployContract(options?: DeployIn): Promise<DeployOut>`
- `transact(options?: TransactIn): Promise<TransactOut>`
- `getConsensusAlgorithmFamily(): Promise<ConsensusAlgorithmFamily>`
- `hasTransactionFinality(): Promise<boolean>`

Connectors also implement `ICactusPlugin` and `IPluginWebService`. Besu
additionally implements `IPluginGrpcService` for gRPC streaming.

## Supported Connectors

Aries, Besu, CDL, Corda, Ethereum, Fabric, Iroha2, Polkadot, Sawtooth,
Xdai. Each has ledger-specific APIs — Ethereum and Besu share the most
overlap; Fabric uses `ConnectionProfile` and identity wallets.

## Common File Structure

- `plugin-ledger-connector-<name>.ts` — main plugin class
- `plugin-factory-ledger-connector.ts` — `PluginFactory` subclass
- `web-services/` — one file per REST endpoint (e.g.,
  `deploy-contract-v1-endpoint.ts`, `run-transaction-v1-endpoint.ts`)
- `generated/openapi/typescript-axios/` — generated Axios client (never edit)

Each endpoint implements `IWebServiceEndpoint` and resolves its path from
the OpenAPI spec. Expose endpoints via `getOrCreateWebServices()` and
`registerWebServices(app, wsApi)`.

## Transaction Signing Patterns

Connectors support multiple credential types:

1. **CactiKeychainRef** — look up private key via keychain plugin:
   `pluginRegistry.findOneByKeychainId(id)` → `kc.get(entryKey)`.
2. **PrivateKeyHex** — direct signing with `@ethereumjs/tx` (EVM connectors).
3. **GethKeychainPassword** — Geth-native account unlock (Ethereum/Besu).

Never log private keys. Always use `IPluginKeychain` for secret storage.
Keychain plugins are accessed through `PluginRegistry.findOneByKeychainId()`.

## WatchBlocks Pattern

Real-time block monitoring via Socket.io + RxJS. Server-side uses
`WatchBlocksV1Endpoint` with subscription-based (WebSocket) and HTTP-polling
implementations, auto-selected by provider capability. Client-side
`watchBlocksV1()` returns `Observable<WatchBlocksV1Progress>` bridged from
Socket.io events (`WatchBlocksV1.Next`, `.Error`, `.Complete`,
`.Unsubscribe`). Fabric tracks active monitors in a
`Set<WatchBlocksV1Endpoint>`.

## OpenAPI Endpoints

Each connector defines its REST API in `src/main/json/openapi.json` and
generates an Axios client. Typical endpoints: `deploy-contract`,
`run-transaction`, `invoke-contract`, `watch-blocks`,
`get-prometheus-exporter-metrics`. EVM connectors add
`invoke-raw-web3eth-method` and `invoke-raw-web3eth-contract`.

## Test Tooling

Use test ledgers from `cactus-test-tooling` (always a `devDependency`):
`BesuTestLedger`, `FabricTestLedgerV1`, `CordaTestLedger`,
`Iroha2TestLedger`, `StellarTestLedger`, `SubstrateTestLedger`,
`SawtoothTestLedger`, `OpenEthereumTestLedger`.

Lifecycle: **start → use → stop → destroy → prune**. Always call
`pruneDockerContainersIfGithubAction()` in `afterAll`. Pin image versions
(e.g., `containerImageVersion: "v2.2.0-rc.2"`) to avoid flakes.

```typescript
const ledger = new BesuTestLedger({ containerImageVersion: "v2.2.0-rc.2" });
await ledger.start();
// ...
await ledger.stop();
await ledger.destroy();
```

## Factory Pattern

```typescript
export class PluginFactoryLedgerConnector extends PluginFactory<
  PluginLedgerConnectorEthereum,
  IPluginLedgerConnectorEthereumOptions,
  IPluginFactoryOptions
> {
  async create(opts: IPluginLedgerConnectorEthereumOptions) {
    return new PluginLedgerConnectorEthereum(opts);
  }
}
```

Options interfaces extend `ICactusPluginOptions` and include `PluginRegistry`,
RPC endpoints, and ledger-specific config. Expose a `createPluginFactory()`
helper alongside the factory class.
