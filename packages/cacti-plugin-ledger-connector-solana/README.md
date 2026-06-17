# @hyperledger/cacti-plugin-ledger-connector-solana

Allows Cacti nodes to connect to a Solana ledger (localnet, devnet, testnet, or mainnet-beta).

## Features

| Endpoint | Description |
|---|---|
| `POST /send-transaction` | Send a serialised Solana transaction (legacy or versioned) |
| `POST /get-balance` | Get SOL balance in lamports for a public key |
| `POST /get-account-info` | Fetch on-chain account data |
| `POST /transfer-sol` | Transfer SOL between two accounts |
| `POST /request-airdrop` | Request a SOL airdrop (localnet / devnet / testnet only) |
| `POST /deploy-program` | Deploy a compiled Solana program (`.so` binary) |
| `POST /get-transaction` | Fetch a confirmed transaction by signature |
| `POST /invoke-instruction` | ABI-encode a program instruction, sign it server-side, and submit it |
| `POST /build-instruction` | ABI-encode a program instruction into an **unsigned** transaction (no keys) |
| `POST /decode-account` | ABI-decode on-chain account data |
| `POST /decode-events` | ABI-decode program events from transaction logs |
| `POST /invoke-rpc` | Generic JSON-RPC passthrough — call any Solana node RPC method |
| `POST /get-fee-for-transaction` | Estimate the fee (lamports) for a built transaction |
| `GET /get-prometheus-exporter-metrics` | Prometheus metrics for this connector |
| socket.io `WatchBlocksV1` | Stream new slots (push, via the node's `slotSubscribe` / `onSlotChange`). Used by the `Verifier` monitor. |
| socket.io `WatchLogsV1` | Stream a program's transaction logs (push, via `logsSubscribe` / `onLogs`); feed into `decode-events`. |

All endpoints live under:
```
/api/v1/plugins/@hyperledger/cacti-plugin-ledger-connector-solana/
```

The `SolanaApiClient` mirrors every REST endpoint (`invokeRpcV1`,
`getFeeForTransactionV1`, `decodeEventsV1`, …) and implements `ISocketApiClient`
(`sendSyncRequest` / `sendAsyncRequest` + `watchBlocksV1`), so the connector can
be driven directly *or* through the generic `Verifier` (validator type
`SOLANA_2X`, including `startMonitor` for slot streaming).

## ABI-aware instruction encoding

The `invoke-instruction`, `build-instruction`, and `decode-account` endpoints
let the connector encode instructions and decode accounts for a program ABI,
instead of you hand-building serialized transactions. The ABI is selected per
request via an `abi.kind` discriminator and is pluggable (`ISolanaAbi`).
**Anchor** is the implemented ABI (`SolanaAbiKind.Anchor`), with the program's
IDL sent inline in the request.

```ts
// Build (no keys) -> sign locally -> submit with NONE  (private key never sent)
const { data: built } = await client.buildInstructionV1({
  abi: { kind: SolanaAbiKind.Anchor, idl: registryIdl },
  feePayer: admin.publicKey.toBase58(),
  invocation: {
    instruction: "initializeRegistry",            // camelCase IDL method
    args: [hookProgramId.toBase58()],
    accounts: { admin: "...", registry: "...", adminRole: "...", systemProgram: "111...11111" },
  },
});
const tx = Transaction.from(Buffer.from(built.serializedTransaction, "base64"));
tx.sign(admin);
await client.sendTransactionV1({
  serializedTransaction: tx.serialize().toString("base64"),
  signingCredential: { type: SolanaSigningCredentialType.None },
});

// Or build + sign + submit in one call (server-side signing):
await client.invokeInstructionV1({
  abi: { kind: SolanaAbiKind.Anchor, idl: registryIdl },
  invocation: { /* ... */ },
  signingCredential: { type: SolanaSigningCredentialType.PrivateKeyBase58, privateKeyBase58 },
});

// Read + decode:
const { data } = await client.decodeAccountV1({
  abi: { kind: SolanaAbiKind.Anchor, idl: registryIdl },
  accountName: "registry",
  publicKey: registryPda.toBase58(),
});
```

The raw `send-transaction` path remains for any pre-built, locally-signed
transaction (the generic, ABI-agnostic escape hatch).

## Signing Credentials

| Type | When to use |
|---|---|
| `PRIVATE_KEY_BASE58` | Pass the raw base-58 encoded 64-byte secret key |
| `CACTI_KEYCHAIN_REF` | Look up the private key from a registered `PluginKeychainMemory` (or any IPluginKeychain) |
| `NONE` | The transaction is already fully signed; just submit it |

## Quick Start

### 1. Install

This package lives inside the Cacti monorepo.  From the repo root:

```bash
yarn install
yarn build:dev:backend   # compiles all packages including this one
```

### 2. Start a Local Solana Node

Install the Solana CLI tool suite:
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

Start a local validator:
```bash
solana-test-validator --reset
```

The validator RPC endpoint is `http://127.0.0.1:8899`.

### 3. Wire up the connector

```typescript
import { v4 as uuidv4 } from "uuid";
import express from "express";
import http from "http";
import { PluginRegistry } from "@hyperledger/cactus-core";
import {
  PluginLedgerConnectorSolana,
  SolanaSigningCredentialType,
  SolanaApiClient,
} from "@hyperledger/cacti-plugin-ledger-connector-solana";

// Create the connector
const connector = new PluginLedgerConnectorSolana({
  instanceId: uuidv4(),
  rpcApiHttpHost: "http://127.0.0.1:8899",
  pluginRegistry: new PluginRegistry({ plugins: [] }),
  logLevel: "info",
});

// Mount on Express
const app = express();
app.use(express.json());
const server = http.createServer(app);
await connector.registerWebServices(app);
server.listen(3000);

// Use the HTTP client
const client = new SolanaApiClient({ basePath: "http://localhost:3000" });

// Fund a wallet (localnet only)
const { publicKey, privateKeyBase58 } =
  PluginLedgerConnectorSolana.generateKeypairBase58();

await client.requestAirdropV1({
  publicKey,
  lamports: 2_000_000_000, // 2 SOL
});

const { data } = await client.getBalanceV1({ publicKey });
console.log(`Balance: ${data.lamports} lamports`);
```

### 4. Transfer SOL

```typescript
import bs58 from "bs58";

// Generate a new keypair for the recipient
const recipient = PluginLedgerConnectorSolana.generateKeypairBase58();

const { data } = await client.transferSolV1({
  signingCredential: {
    type: SolanaSigningCredentialType.PrivateKeyBase58,
    privateKeyBase58,          // sender's key loaded earlier
  },
  recipientPublicKey: recipient.publicKey,
  lamports: 500_000_000,       // 0.5 SOL
});

console.log(`Transfer tx: ${data.signature}`);
```

### 5. Send a Raw Transaction

```typescript
import {
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import bs58 from "bs58";

const conn = new Connection("http://127.0.0.1:8899", "confirmed");
const { blockhash } = await conn.getLatestBlockhash();
const kp = Keypair.fromSecretKey(bs58.decode(privateKeyBase58));

const tx = new Transaction({ recentBlockhash: blockhash, feePayer: kp.publicKey })
  .add(SystemProgram.transfer({
    fromPubkey: kp.publicKey,
    toPubkey: new (await import("@solana/web3.js")).PublicKey(recipient.publicKey),
    lamports: 100_000,
  }));

const serialized = tx.serialize({ requireAllSignatures: false }).toString("base64");

const { data } = await client.sendTransactionV1({
  serializedTransaction: serialized,
  signingCredential: {
    type: SolanaSigningCredentialType.PrivateKeyBase58,
    privateKeyBase58,
  },
});
console.log(`Sent: ${data.signature}`);
```

### 6. Using the Cacti Keychain

```typescript
import { PluginKeychainMemory } from "@hyperledger/cactus-plugin-keychain-memory";
import { v4 as uuidv4 } from "uuid";

const keychainId = uuidv4();
const keychainEntryKey = "my-solana-key";

const keychain = new PluginKeychainMemory({
  instanceId: uuidv4(),
  keychainId,
  backend: new Map([[keychainEntryKey, privateKeyBase58]]),
});

const connectorWithKeychain = new PluginLedgerConnectorSolana({
  instanceId: uuidv4(),
  rpcApiHttpHost: "http://127.0.0.1:8899",
  pluginRegistry: new PluginRegistry({ plugins: [keychain] }),
});

// Transfer using the keychainRef credential (private key never leaves the keychain)
await connectorWithKeychain.transferSol({
  signingCredential: {
    type: SolanaSigningCredentialType.CactiKeychainRef,
    keychainId,
    keychainEntryKey,
  },
  recipientPublicKey: recipient.publicKey,
  lamports: 100_000,
});
```

## Deploying a Program

Deploy a compiled program (`.so`) through the upgradeable BPF loader — the same
mechanism `solana program deploy` uses. The binary is uploaded to the ledger in
chunks and a program account is created for it; the returned program is invokable
as soon as the call resolves.

Deployment signs many transactions server-side, so it requires a
`PRIVATE_KEY_BASE58` or `CACTI_KEYCHAIN_REF` credential — `NONE` is rejected. The
payer funds the program's rent (an on-chain program costs SOL proportional to its
size) and becomes its upgrade authority.

```typescript
import * as fs from "fs";

const { data } = await client.deployProgramV1({
  programBinaryBase64: fs.readFileSync("program.so").toString("base64"),
  // Optional: the program's keypair, base-58 encoded. Fixes the deployed program
  // id — required for Anchor programs so it matches their `declare_id!`. Omit it
  // to deploy under a fresh, random program id.
  programKeypairBase58,
  payerSigningCredential: {
    type: SolanaSigningCredentialType.PrivateKeyBase58,
    privateKeyBase58,
  },
});

console.log(`Deployed program id: ${data.programId}`);
```

Program binaries are large once base64-encoded. When mounting the connector on
your own Express app, raise the JSON body limit above the 100 kB default so the
deploy request isn't rejected with HTTP 413:

```typescript
app.use(express.json({ limit: "10mb" }));
```

Deploying in-process against a `PluginLedgerConnectorSolana` instance directly
(rather than over HTTP) has no such limit.

## Generic JSON-RPC

`invoke-rpc` forwards any method to the configured Solana node and returns its
raw `result` — an escape hatch for reads the typed endpoints don't cover (e.g.
`getProgramAccounts`, `getSignaturesForAddress`).

```typescript
const { data: version } = await client.invokeRpcV1({ method: "getVersion" });

const { data: balance } = await client.invokeRpcV1({
  method: "getBalance",
  params: [publicKey, { commitment: "confirmed" }],
});
```

## Estimating Transaction Fees

Estimate what a built transaction will cost before submitting it.

```typescript
const { data } = await client.getFeeForTransactionV1({ serializedTransaction });
console.log(`Fee: ${data.lamports} lamports`); // null if the blockhash has expired
```

## Streaming Blocks, Logs & Events

Two socket.io streams are exposed as RxJS observables — both are push
subscriptions on the node, not polling. Unsubscribing closes the socket.

```typescript
// New slots (also what the Verifier's startMonitor uses):
const slots = client.watchBlocksV1().subscribe((p) => console.log("slot", p.slot));
// ...later
slots.unsubscribe();

// A program's transaction logs, decoded into Anchor events:
const logs = client
  .watchLogsV1({ programId }) // omit programId to receive logs for all programs
  .subscribe(async (p) => {
    const { data } = await client.decodeEventsV1({
      abi: { kind: SolanaAbiKind.Anchor, idl },
      logs: p.logs,
    });
    console.log(data.events);
  });
```

Events can also be decoded from a known transaction signature:

```typescript
const { data } = await client.decodeEventsV1({
  abi: { kind: SolanaAbiKind.Anchor, idl },
  signature,
});
```

## Running Tests

Tests are executed from the monorepo root using the root Jest runner.

### Unit tests (no Solana node required)

```bash
# From the repo root:
yarn jest cacti-plugin-ledger-connector-solana --testPathPattern=unit
```

### Integration tests (requires Docker)

```bash
# From the repo root:
yarn jest cacti-plugin-ledger-connector-solana --testPathPattern=integration
```

The integration test suite covers:
- `getBalance` / `getAccountInfo` via both SDK and REST
- `requestAirdrop`
- `transferSol` with `PRIVATE_KEY_BASE58` and `CACTI_KEYCHAIN_REF` credentials
- `sendTransaction` with pre-signed and partially-signed transactions
- `getTransaction` to fetch confirmed transaction metadata
- All HTTP endpoints (error cases included)
- Prometheus metrics counter increments

## OpenAPI Spec

The OpenAPI 3.0 spec is at [`src/main/json/openapi.json`](src/main/json/openapi.json).

The TypeScript-Axios client under `src/main/typescript/generated/openapi/typescript-axios/`
is generated automatically from the spec. Generator version is pinned in
[`openapitools.json`](openapitools.json) (6.6.0, matching the rest of the monorepo). To
regenerate after changing the spec:

```bash
npm run generate-sdk
```

## Architecture

```
PluginLedgerConnectorSolana
├── ICactusPlugin       – instanceId, packageName, onPluginInit
├── IPluginLedgerConnector – deployContract, transact
└── IPluginWebService   – registerWebServices, getOrCreateWebServices

Web services (one Express endpoint each):
  SendTransactionEndpoint        POST /send-transaction
  GetBalanceEndpoint             POST /get-balance
  GetAccountInfoEndpoint         POST /get-account-info
  TransferSolEndpoint            POST /transfer-sol
  RequestAirdropEndpoint         POST /request-airdrop
  DeployProgramEndpoint          POST /deploy-program
  GetTransactionEndpoint         POST /get-transaction
  GetPrometheusExporterMetrics   GET  /get-prometheus-exporter-metrics
```
