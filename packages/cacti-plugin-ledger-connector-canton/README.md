# Hyperledger Cacti Canton Connector

This package connects Hyperledger Cacti to a Canton JSON Ledger API by using
the official `@canton-network/wallet-sdk`.

The initial connector supports:

- submitting Daml create, exercise, and create-and-exercise commands for a
  Canton-hosted party;
- listing parties available to the authenticated Ledger API user;
- querying the active contract set with party, template, and interface
  filters.

## Requirements

Node.js 20 or later. The connector loads the Wallet SDK through its ESM entry
point; when running the tests with Jest, set
`NODE_OPTIONS=--experimental-vm-modules`.

## Configuration

The connector requires a Canton JSON Ledger API URL and Wallet SDK token
provider configuration. The authentication token is used only to initialize
the Wallet SDK and must be supplied through secure application configuration.

`ledgerClientUrl` must use `https:` because the Wallet SDK sends the service
credential to it. URLs with embedded credentials or other protocols are
rejected. For local development only, such as Canton LocalNet, set
`allowInsecureLoopbackHttp: true` to allow `http:` to `localhost`,
`127.0.0.0/8`, or `[::1]`; remote plaintext HTTP is always rejected.

```typescript
import { PluginRegistry } from "@hyperledger-cacti/cactus-core";
import { PluginLedgerConnectorCanton } from "@hyperledger-cacti/cacti-plugin-ledger-connector-canton";

// Select a party for which the configured ledger user has CanActAs.
const partyId = process.env.CANTON_ACT_AS_PARTY_ID;
if (!partyId) {
  throw new Error("CANTON_ACT_AS_PARTY_ID is required");
}

const connector = new PluginLedgerConnectorCanton({
  instanceId: "canton-connector",
  pluginRegistry: new PluginRegistry(),
  ledgerClientUrl: "https://canton-participant.example.com",
  auth: {
    method: "static",
    token: process.env.CANTON_LEDGER_API_TOKEN ?? "",
  },
  // Optional defense-in-depth boundary for this connector instance.
  allowedPartyIds: [partyId],
  operationTimeoutMs: 60_000,
});

const { parties } = await connector.listParties();
console.log("Parties visible to this ledger user:", parties);

// Derive the command ID from your own business identifier and persist it
// before submitting, so that a retry reuses the same value.
await connector.transact({
  partyId,
  commandId: "asset-order-42-create",
  commands: [
    {
      CreateCommand: {
        templateId: "#package:Module:Template",
        createArguments: { owner: partyId },
      },
    },
  ],
});

const { contracts } = await connector.getActiveContracts({
  parties: [partyId],
  templateIds: ["#package:Module:Template"],
});
```

Commands may reference templates by package name (`#package-name:Module:Template`).
Active contracts are returned with the ledger's resolved template ID, which
uses the package ID (`<package-id>:Module:Template`).

`listParties()` reports parties visible or otherwise accessible to the
authenticated ledger user. Depending on that user's Canton rights, the result
can include read-only parties. A party used by `transact()` must have
`CanActAs` authorization.

## Security boundary

The Wallet SDK token is a service credential shared by every request handled
by this connector instance. The application hosting the connector must
authenticate callers and populate their Cacti authorization scopes. The REST
operations require these distinct scopes:

- `write:canton-transactions` for submitting commands;
- `read:canton-contracts` for active-contract queries;
- `read:canton-parties` for party discovery;
- `read:canton-spec` for the OpenAPI specification.

`allowedPartyIds` is an optional second boundary on top of those REST scopes
and the rights attached to the Canton service credential. When configured,
transactions and contract queries for any other party are rejected, and party
list results are filtered. An empty array denies access to all parties.

Each Wallet SDK operation has a configurable timeout, which defaults to 60
seconds and can be set up to 300 seconds. The Wallet SDK 1.5.1 methods used by
this connector do not accept an abort signal, so the timeout bounds the Cacti
request but cannot cancel an upstream operation already in progress. Such
abandoned operations keep counting against `maxInFlightOperations` (default
64, maximum 1024) until they actually settle; requests beyond that limit fail
with HTTP 503 instead of accumulating unbounded sockets and payloads.
`shutdown()` is terminal: it rejects new ledger work with HTTP 503 and waits up
to `operationTimeoutMs` for pending operations to settle.

Command batches are limited to 100 commands, identifier/filter lists to 100
entries, identifiers to 1024 characters, and serialized command payloads to
1 MiB and 64 nesting levels. Active-contract queries make one Ledger API
request and return at most `limit` contracts (default 100, maximum 1000).

## Retries and idempotency

`commandId` is required. A transaction timeout (HTTP 504) means that the
final ledger outcome is unknown, because the upstream submission cannot be
cancelled and may still commit. To retry safely, resubmit with the same
`commandId`: Canton's command deduplication then rejects the retry if the
original submission committed within the participant's deduplication period,
instead of committing it twice. Do not generate a new `commandId` for a retry,
and do not retry after the deduplication period has elapsed without first
checking the ledger, for example with `getActiveContracts()`.

The first version intentionally uses participant-hosted signing through the
Wallet SDK. External signing, DAR deployment, and ledger-event streaming are
planned as separate increments of issue #4700.
