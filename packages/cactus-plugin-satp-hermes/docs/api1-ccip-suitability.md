# API1 and CCIP-specific fields

Audit for issue #4784: can the API1 (BLO) surface carry CCIP-specific data
(message ID, lane, finality preference)? This page records what the code does
today. It does not propose a field contract, and it does not choose how CCIP
would be integrated. Those choices belong to #4780, #4782, #4783 and #4786.

Source read: `main` at commit `a172a0c6` (2026-11-17), package
`cactus-plugin-satp-hermes`. Re-check against current `main` before relying on
it. Links below are pinned to that commit, the parent of this branch.

## Conclusion

API1 has no dedicated CCIP message ID, lane or finality preference field today.
Generic string carriers exist (listed below) but nothing defines what they
would hold for CCIP. In the dispatch tables that were read, no obstacle to
adding fields was found. That is not a claim that adding them is compatible in
general: the encoding and message hash path is the open risk, and it is not
shown to break. The gaps below are documented and ticketed, and not fixed in this PR. This PR
makes no product change.

## Acceptance criteria and evidence

| #4784 item                                                       | Status                                                                                                              | Where                                                       |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Audit API1 endpoints for message ID, lane, finality              | Done for schemas and code read: all 19 spec operations, 15 registered, 4 spec-only. No dedicated field found.       | [All API1 operations](#all-api1-operations)                 |
| Document gaps                                                    | Done: two gaps are documented below.                                                                                | [Follow-up work](#follow-up-work)                           |
| Fix or ticket follow-ups                                         | Ticketed, not fixed. The two gaps are tracked in #4830 and #4831; this PR makes no fix.                             | [Follow-up work](#follow-up-work)                           |
| Problem context: "without breaking table-driven message parsing" | Not a separate acceptance item. Dispatch tables were read and no obstacle was found; hash compatibility not proved. | [Message routing and parsing](#message-routing-and-parsing) |

## Summary

- API1 has no CCIP field. A name search of the bundled API1 spec and the
  `SessionData` and common proto files finds no message ID, lane or finality
  preference field, and no mention of CCIP. None of the 19 operations in the
  spec declares one.
- The `TransactRequest` schema, including its asset schemas, does not set
  `additionalProperties`, so it does not itself forbid undeclared request
  properties (the keyword is set elsewhere in the spec, on some other schemas). Whether the validator middleware
  accepts them at run time was not tested here. When the transact handler is
  called with such properties, it copies only an explicit list of fields, so
  they do not reach the client session data.
- `payload` on `TransactRequest` is not read by the transact path.
- Lock type and expiry are constants in the handler (time lock, 5 minutes).
  Nothing maps a finality preference to a lock type.
- Adding dedicated CCIP fields would need deliberate propagation and review:
  the OpenAPI schema and bundled spec, the generated client, the handler,
  session data and proto messages, plus a schema-version review. Existing
  generic carriers (for example assertion claim receipt and proof strings) might
  hold such data instead, but nothing defines what they would contain for CCIP.
  The claim signature already covers the claim type, step, session, receipt
  and proof (see the integrity section). Which approach to take is a design decision.

## What was checked

| Area                   | Finding                                                               | How                                |
| ---------------------- | --------------------------------------------------------------------- | ---------------------------------- |
| Request schema         | No CCIP field in `TransactRequest` or `Asset`                         | Code read                          |
| Handler copy           | Fixed field list goes into the client session data                    | Code read, direct handler tests    |
| `payload`              | Not referenced by the transact handler or session utils               | Code read, direct handler test     |
| Session data and proto | No field named for a message ID, lane or finality preference          | Name search of both proto files    |
| Response               | `TransactResponse` has no field for a message ID or attestation state | Code read                          |
| Lock type              | Constant in the handler                                               | Code read, direct handler test     |
| HTTP validation layer  | `TransactRequest` does not forbid extras; middleware not exercised    | Code read only, not run in this PR |

The 3 tests in `transact-ccip-fields.test.ts` call the handler directly, so they
bypass HTTP validation. They show that extra properties do not reach the client
session data and do not change the lock type. They say nothing about the
HTTP validator, other storage (database logs, proofs, adapter payloads), or
any CCIP behavior.

## Integrity and mixed versions (named risk, not shown to break)

Three separate mechanisms were read:

- Message hashes use a stable JSON string of the in-memory protobuf message
  (`getHash` over `safeStableStringify`).
- Claim signatures cover the canonical claim fields: receipt, proof, claim
  type, step and session.
- For stage 1 to 3 messages, the gateway-to-gateway envelope is a JWS over the
  protobuf binary. Stage 0 and crash recovery still use per-message signature
  fields and are not wrapped by the JWS interceptors
  ([`jws-interceptors.ts` header](https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/typescript/core/cryptography/jws-interceptors.ts#L1-L31)).

Whether a new proto field, populated or not, changes the message hash input was
not checked. If it does, the hash input could differ between gateways on
different schema versions. This is a named risk. No failure in the
real flow was demonstrated and no safety is claimed.

## All API1 operations

The bundled spec ([oapi-api1-bundled.json][spec]) defines 19 operations under
`/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes/`. The dispatcher
registers 15 of them as endpoints ([`getOrCreateWebServices`][dispatcher],
list at L478-L492). `cancel`, `pause`, `continue` and `routes` are in the spec
but have no endpoint file or registration in `src/main/typescript/api1`, and
the dispatcher carries a TODO for Cancel and Routes ([L1097][todo]). They were
checked in the spec only.

None of the 19 declares a CCIP field. All rows are schema and code reads. Only
the transact handler was run (the 3 tests above). The last column lists
free-form objects and open-ended strings found in each schema. It says nothing
about whether they could carry CCIP data. For rows with no entry, every field
is a typed identifier, flag, number or fixed-shape object.

| Operation (path suffix)                                                                                                          | Fields                                                                                                                                    | CCIP field declared | Free-form or open-ended fields found                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Transact` POST `/transact` ([endpoint][ep-transact])                                                                            | request: `contextID`, `payload`, `sourceAsset`, `receiverAsset`; response: `sessionID`, `statusResponse`                                  | No                  | `payload` (string, not read by the transact path); asset `id`, `referenceId`, `uniqueDescriptor`, copied into session data (see below)                                                                             |
| `GetStatus` GET `/status` ([endpoint][ep-status])                                                                                | query `SessionID`; response: `status`, `substatus`, `stage`, `step`, `startTime`, `originNetwork`, `destinationNetwork`                   | No                  | None found                                                                                                                                                                                                         |
| `GetSessionIds` GET `/get-sessions-ids` ([endpoint][ep-ids])                                                                     | response: session ID list                                                                                                                 | No                  | None found                                                                                                                                                                                                         |
| `GetHealthCheck` GET `/healthcheck` ([endpoint][ep-health])                                                                      | response: `status`                                                                                                                        | No                  | None found                                                                                                                                                                                                         |
| `GetSupportedLedgers` GET `/supported-ledgers` ([endpoint][ep-ledgers])                                                          | response: `supportedLedgers` array                                                                                                        | No                  | None found                                                                                                                                                                                                         |
| `GetIntegrations` GET `/integrations` ([endpoint][ep-integrations])                                                              | response: integrations with `id`, `name`, `type`, `environment`                                                                           | No                  | None found                                                                                                                                                                                                         |
| `GetApproveAddress` GET `/approve-address` ([endpoint][ep-approve])                                                              | request: `networkId`, `tokenType`; response: `approveAddress`                                                                             | No                  | None found                                                                                                                                                                                                         |
| `AddCounterparty` POST `/add-counterparty-gateway` ([endpoint][ep-counterparty])                                                 | `counterparty`: gateway identity (`id`, `pubKey`, `name`, `version`, `connectedDLTs`, `proofID`, ports, `address`)                        | No                  | None found                                                                                                                                                                                                         |
| `PerformAudit` GET `/audit` ([endpoint][ep-audit])                                                                               | request: start and end timestamps; response: audit entries (`auditEntryId`, `session`, `timestamp`, `proofs`)                             | No                  | `session` is a log record with `type`, `key`, `operation` and a `data` string described as serialized session state (contents not inspected); `proofs` carry `claim` and `signedClaim` strings                     |
| `GetSessionProofs` GET `/proofs` ([endpoint][ep-proofs])                                                                         | response: `SessionProof` (`sessionId`, `step`, `claim`, `signedClaim`)                                                                    | No                  | `claim` and `signedClaim` strings. The signature covers claim type, step, session, receipt and proof; what the strings hold for CCIP is undefined                                                                  |
| `ExecuteOracleTask`, `RegisterOracleTask`, `UnregisterOracleTask`, `GetOracleTaskStatus` (`/oracle/...`, [endpoints][ep-oracle]) | task networks, contracts, `taskType`, `taskMode`, `pollingInterval`, `listeningOptions` (`eventSignature` and others), operations, status | No                  | `OracleResponse` `output` string and `transactionReceipt` and `proof` objects; `OracleOperation` `output` object; contract `contractAbi` and `params` arrays. Oracle tasks are contract tasks; not traced for CCIP |
| `DecideInboundWebhook` POST `/webhook/inbound/decide` ([endpoint][ep-decide])                                                    | request: `adapterId`, `sessionId`, `contextId`, `continue`, `reason`, `data`; response: `accepted`, `sessionId`, `message`, `timestamp`   | No                  | `data` (`additionalProperties: true`), passed to the hook service with the decision ([adapter-manager L551][am551]); `reason` string                                                                               |
| `Cancel` POST (spec only)                                                                                                        | request: `sessionID`; response: `statusResponse`, `cancelSuccessful`                                                                      | No                  | None found                                                                                                                                                                                                         |
| `Pause`, `Continue` POST (spec only)                                                                                             | request: `sessionId`, `contextId`; response: `statusResponse`                                                                             | No                  | None found                                                                                                                                                                                                         |
| `GetRoutes` GET (spec only)                                                                                                      | response: routes (amounts, tokens, `steps`, `insurance`, `tags`)                                                                          | No                  | `Token.extensions` (`bridgeInfo` map of token address per bridge, `verified`); `steps` and `tags` arrays, not traced                                                                                               |

The outbound adapter webhook payload is not one of the 19 operations. It is a
schema the gateway posts to adapters (`OutboundWebhookPayload`: `eventType`,
`schemaVersion`, `executionPoints`, `adapterId`, `sessionId`, `contextId`,
`gatewayId`, `payload`, `timestamp`, `message`). Its `payload` is a free-form
object. It has no CCIP field. The adapter's reply, `OutboundWebhookResponse`
(`data`, `message`, `received`, `status`), also has a free-form `data` field;
its use was not traced.

Free-form webhook fields (`payload`, `data`) are exchanged with external
adapters. They are not stored in the session record, so they could pass a value
through but do not make the API1 session carry it.

Other reads:

- `NetworkId.ledgerType` is a closed enum in the spec (`BESU_1X`, `BESU_2X`,
  `BURROW_0X`, `CORDA_4X`, `ETHEREUM`, `FABRIC_2`, `SAWTOOTH_1X`) with no CCIP
  or chain selector value.
- The status handler maps only `Besu2X`, `Fabric2` and `Ethereum` to a
  protocol ([`getNetworkDetails`][netdetails]). Other values return protocol
  `unknown`. This was read, not run.
- The transact handler copies the asset strings `referenceId` and
  `uniqueDescriptor` (and `owner`, `contractName` and others) into the stored
  sender and receiver asset ([`populateClientSessionData`][populate],
  [`Asset`][asset]). These are existing string fields that persist in session
  data. Whether they could carry a message ID is a design question this audit
  does not answer.
- Session data also holds generic strings: assertion claims carry `receipt`,
  `proof` and `signature` ([message.proto][claims]), and `SessionData` has hash
  and signature fields ([session.proto][sessiondata]). Their meaning for CCIP
  is not defined, so this audit does not say whether they could carry a
  message ID.
- `TransactRequest.payload` is a string (the spec example is a JSON text).

Lock type and expiry are set at [L46-L48][lock] of the transact handler.

[spec]: https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/json/oapi-api1-bundled.json
[dispatcher]: https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/typescript/api1/dispatcher.ts#L386
[todo]: https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/typescript/api1/dispatcher.ts#L1097
[ep-transact]: https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/typescript/api1/transaction/transact-endpoint.ts
[ep-status]: https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/typescript/api1/admin/status-endpoint.ts
[ep-ids]: https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/typescript/api1/admin/get-all-session-ids-endpoints.ts
[ep-health]: https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/typescript/api1/admin/healthcheck-endpoint.ts
[ep-ledgers]: https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/typescript/api1/admin/supported-ledgers-endpoint.ts
[ep-integrations]: https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/typescript/api1/transaction/integrations-endpoint.ts
[ep-approve]: https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/typescript/api1/transaction/get-approve-address-endpoint.ts
[ep-counterparty]: https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/typescript/api1/admin/add-counterparty-gateway-endpoint.ts
[ep-audit]: https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/typescript/api1/admin/audit-endpoint.ts
[ep-proofs]: https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/typescript/api1/admin/get-session-proofs-endpoint.ts
[ep-oracle]: https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/typescript/api1/oracle/oracle-register-task-endpoint.ts
[ep-decide]: https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/typescript/api1/webhook/decide-endpoint.ts
[am551]: https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/typescript/adapters/adapter-manager.ts#L551
[netdetails]: https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/typescript/api1/admin/get-status-handler-service.ts#L134
[populate]: https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/typescript/core/session-utils.ts#L249
[asset]: https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/proto/cacti/satp/v13/common/message.proto#L197
[claims]: https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/proto/cacti/satp/v13/common/message.proto#L157
[sessiondata]: https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/proto/cacti/satp/v13/session/session.proto#L12
[lock]: https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/typescript/api1/transaction/transact-handler-service.ts#L46-L48

## Message routing and parsing

The issue asks whether CCIP fields can be carried without breaking
table-driven message parsing. This was read in the code, not run, and not
traced exhaustively.

API1 requests and gateway-to-gateway SATP messages are separate paths:

- API1 request handling. The transact handler copies a fixed list of request
  fields into session data. An undeclared API1 property never reaches any
  message-type table.
- Dispatch tables for SATP messages are keyed by message type or step tag, not
  by the fields a message contains: the `MessageType` switches in
  [`session-utils.ts`](https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/typescript/core/session-utils.ts#L521), the map from
  received-timestamp field names to `MessageType` in
  [`protocol-message-service.ts`](https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/typescript/core/stage-services/protocol-message-service.ts#L248),
  and the stage and step map in
  [`satp-protocol-map.ts`](https://github.com/hyperledger-cacti/cacti/blob/a172a0c6286f5c7d4feb271edacce86c2b02c887/packages/cactus-plugin-satp-hermes/src/main/typescript/core/satp-protocol-map.ts#L194). Adding a field
  to an existing message is not a key in any of them. A new message type would
  need new entries.
- Decoding. Messages are decoded by generated protobuf code, and no
  hand-written decode was found in the package source outside generated files.
  The protobuf-es v2.2.2 manual
  (<https://raw.githubusercontent.com/bufbuild/protobuf-es/v2.2.2/MANUAL.md>,
  L1109-L1118) documents retaining unknown fields by default. That is the
  library's documentation, not the installed code, and the options that
  ConnectRPC passes to it were not checked, so how this gateway treats unknown
  fields is not established.
- Signature. For stage 1 to 3 messages the JWS covers the protobuf binary. A
  new field populated with a non-default value changes those signed bytes; an
  unset field does not. Whether a round trip
  between gateways on different schema versions works depends on the codec's
  handling of unknown fields, which was not shown here.
- Hash. The message hash is a separate mechanism: SHA-256 over a stable JSON
  string of the in-memory message object. Whether a new field, populated or not, changes
  that input was not checked.

No obstacle was found in the dispatch tables that were read. The encoding and
hash path is the open risk and is not shown to break.

## Follow-up work

#4780, #4782, #4783 and #4786 cover only what their text names: message ID
tracking in the leaf and connector, the claim chain using a message ID and
attestation state, and webhook wiring. They do not decide how API1 or the
session data carry this information. Two gaps remain, each with its own issue.

| Gap                                                                                                                                                                                                                                                                                                                                                          | Disposition                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| How API1 and session data carry a CCIP message ID and attestation state, and how a CCIP network and lane are represented. Covers the workflow (initiate, status, evidence, resume), whether a call accepts or only returns a message ID, whether the lane comes from network configuration or the request, and whether CCIP is a ledger type or a transport. | Tracked in #4830. Ownership relative to #4786 and #4782 is for maintainers. |
| How a finality preference maps to a lock type.                                                                                                                                                                                                                                                                                                               | Tracked in #4831.                                                           |
| HTTP validator behavior for undeclared properties; mixed-version hashing risk.                                                                                                                                                                                                                                                                               | Not ticketed. Stated as limits in this document.                            |

## Not covered

CCIP behavior itself, a live lane, the HTTP validator at run time, the run-time
behavior of handlers other than transact, other storage of request data, and
non-EVM destinations.
