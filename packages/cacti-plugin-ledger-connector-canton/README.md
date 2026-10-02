# Hyperledger Cacti Canton Connector

This package connects Hyperledger Cacti to a Canton JSON Ledger API by using
the official `@canton-network/wallet-sdk`.

The initial connector supports:

- submitting Daml create, exercise, and create-and-exercise commands for a
  Canton-hosted party;
- listing parties available to the authenticated Ledger API user;
- querying the active contract set with party, template, and interface
  filters.

## Configuration

The connector requires a Canton JSON Ledger API URL and Wallet SDK token
provider configuration. The authentication token is used only to initialize
the Wallet SDK and must be supplied through secure application configuration.

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
  ledgerClientUrl: "http://127.0.0.1:7575",
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

await connector.transact({
  partyId,
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
request but cannot cancel an upstream operation already in progress. Command
batches are limited to 100 commands, identifier/filter lists to 100 entries,
identifiers to 1024 characters, and serialized command payloads to 1 MiB and
64 nesting levels.

A transaction timeout means that its final ledger outcome is unknown because
the upstream submission cannot be cancelled. Supply a stable `commandId`,
check the ledger result, and reuse that same ID instead of blindly submitting
the command again.

The first version intentionally uses participant-hosted signing through the
Wallet SDK. External signing, DAR deployment, and ledger-event streaming are
planned as separate increments of issue #4700.
