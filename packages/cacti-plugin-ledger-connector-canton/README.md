# Hyperledger Cacti Canton Connector

This package connects Hyperledger Cacti to a Canton JSON Ledger API by using
the official `@canton-network/wallet-sdk`.

The initial connector supports:

- submitting Daml create, exercise, and create-and-exercise commands for a
  Canton-hosted party;
- listing parties available to the authenticated Ledger API user;
- querying the active contract set with party, template, and interface
  filters.

The API surface is documented in the
[OpenAPI specification][package-doc-src-main-json-openapi-json]. A generated
TypeScript Axios client is available at
[src/main/typescript/generated/openapi/typescript-axios/][package-doc-src-main-typescript-generated-openapi-typescript-axios].

## Requirements

Node.js 20 or later. The connector loads the Wallet SDK through its ES module
entry point with a native `import()`. When running the tests with Jest, set
`NODE_OPTIONS=--experimental-vm-modules`, as the repository's test scripts do.

## Configuration

The connector requires a Canton JSON Ledger API URL, Ledger API
authentication, and an explicit party policy. The authentication settings are
a service credential and must come from secure application configuration.

- `ledgerClientUrl` must use `https:` because the credential is sent to it.
  URLs with embedded credentials or other protocols are rejected. For local
  development only, such as Canton LocalNet, `allowInsecureLoopbackHttp: true`
  allows `http:` to `localhost`, `127.0.0.0/8`, or `[::1]`. Remote plaintext
  HTTP is always rejected.
- `auth` is one of `static` (a fixed token), `self_signed` (development
  only), or `client_credentials` (OAuth). For `client_credentials`,
  `configUrl` follows the same HTTPS rule because the client secret is sent to
  the token endpoint it describes.
- Exactly one of `allowedPartyIds` and `allowAllParties: true` is required. See
  [Security boundary](#security-boundary).

The connector keeps its own copy of the validated URL and credentials, so
changing the options object after construction has no effect.

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
  allowedPartyIds: [partyId],
  operationTimeoutMs: 60_000,
});

const { parties } = await connector.listParties();
console.log("Allowed parties visible to this ledger user:", parties);

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

const { contracts, activeAtOffset, limitReached } =
  await connector.getActiveContracts({
    parties: [partyId],
    templateIds: ["#package:Module:Template"],
  });
```

Commands may reference templates by package name
(`#package-name:Module:Template`). Active contracts are returned with the
ledger's resolved template ID, which uses the package ID
(`<package-id>:Module:Template`). Daml values use the JSON Ledger API
encoding, in which `null` represents an empty `Optional`.

`listParties()` reports the allowed parties that are visible or otherwise
accessible to the authenticated ledger user. Depending on that user's Canton
rights, the result can include read-only parties. A party used by
`transact()` must have `CanActAs` authorization.

## Active-contract queries

Each query makes one Ledger API request at a single ledger offset. The
response contains:

- `contracts`: the matching active contracts. For an interface query, each
  contract includes its `interfaceViews`. The created-event blob is not
  returned.
- `activeAtOffset`: the offset of the snapshot, either the requested `offset`
  or the ledger end at the time of the query. Continue from it with the
  ledger's update stream.
- `limitReached`: `true` when the ledger returned `limit` entries, so more
  contracts may match.

`limit` defaults to 100. The Canton JSON Ledger API answers a list query with
HTTP 413 when more results match than its `http-list-max-elements-limit`
(Canton default 200), and it ignores a larger `limit`. The connector therefore
rejects a `limit` above `maxActiveContractLimit`, which defaults to 200 and
can be raised to 1000. Set it to at most the participant's configured limit.
If the participant still rejects a query, the connector answers HTTP 413 with
`cantonErrorCode: "JSON_API_MAXIMUM_LIST_ELEMENTS_NUMBER_REACHED"`.

## Errors

Connector validation errors are returned as HTTP 400, 403, or 413. Rejections
from the Canton ledger are translated by their gRPC status, and the response
includes Canton's error code as `cantonErrorCode`, for example:

| Canton result                                        | HTTP |
| ---------------------------------------------------- | ---- |
| invalid argument, offset out of range                | 400  |
| permission denied                                    | 403  |
| resource not found                                   | 404  |
| already exists (`DUPLICATE_COMMAND`), state conflict | 409  |
| aborted, unavailable, resource exhausted             | 503  |
| deadline exceeded                                    | 504  |
| unauthenticated, other failures                      | 502  |

Ledger error causes and context can contain party, contract, or credential
data and are never returned or logged. Other upstream failures are reported as
HTTP 502 `Canton ledger operation failed.` The OpenAPI request validator
reports schema violations as an array of errors.

## Security boundary

The Ledger API credential is a service credential shared by every request
handled by this connector instance. The application hosting the connector
must authenticate callers with JWTs and populate their Cacti authorization
scopes; without that, the protected operations answer HTTP 401 or 403. The
REST operations require these distinct scopes:

- `write:canton-transactions` for submitting commands;
- `read:canton-contracts` for active-contract queries;
- `read:canton-parties` for party discovery.

The OpenAPI specification endpoint requires no scope, as in other Cacti
plugins.

The party policy is a second boundary on top of those scopes and the rights
of the Canton service credential. With `allowedPartyIds`, transactions and
contract queries for any other party, including every `readAs` party, are
rejected with HTTP 403 before the command payload is inspected, and party list
results are filtered. An empty array denies every party. `allowAllParties:
true` lets every caller with the relevant scope act or read as any party the
service user has rights for, so use it only when all callers are equally
trusted.

All callers share one Canton user, so command deduplication is shared too: a
`commandId` already used for the same party by any caller is rejected with
HTTP 409. Namespace command IDs per client when several clients share a
connector.

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
1 MiB and 64 nesting levels. Oversized payloads are rejected without
traversing or serializing all of them. The API server's own body-size limit
still applies to parsing the request.

The connector gives the Wallet SDK's ledger client and token provider a
logger that forwards only the severity of each entry to Cacti's logger, so SDK
log messages and their context are never written out.

## Retries and idempotency

`commandId` is required. A transaction timeout (HTTP 504) means that the
final ledger outcome is unknown, because the upstream submission cannot be
cancelled and may still commit. To retry safely, resubmit with the same
`commandId`: Canton's command deduplication then rejects the retry with HTTP
409 (`DUPLICATE_COMMAND`) if the original submission committed within the
participant's deduplication period, instead of committing it twice. Do not
generate a new `commandId` for a retry, and do not retry after the
deduplication period has elapsed without first checking the ledger, for
example with `getActiveContracts()`.

The first version intentionally uses participant-hosted signing through the
Wallet SDK. External signing, DAR deployment, and ledger-event streaming are
planned as separate increments of issue #4700.

## Contributing

We welcome contributions to Hyperledger Cacti in many forms, and there's
always plenty to do. Please review [CONTRIBUTING.md][package-doc-contributing-md]
to get started.

## License

This distribution is published under the Apache License Version 2.0 found in
the [LICENSE][package-doc-license] file.

[package-doc-src-main-json-openapi-json]: ./src/main/json/openapi.json
[package-doc-src-main-typescript-generated-openapi-typescript-axios]: ./src/main/typescript/generated/openapi/typescript-axios/
[package-doc-contributing-md]: ../../CONTRIBUTING.md
[package-doc-license]: ../../LICENSE
