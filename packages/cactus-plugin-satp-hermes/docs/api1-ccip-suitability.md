# API1 and CCIP-specific fields

Audit for issue #4784: can the API1 (BLO) surface carry CCIP-specific data
(message ID, lane, finality preference)? This page records what the code does
today. It does not propose a field contract, and it does not choose how CCIP
would be integrated. Those choices belong to #4780, #4782, #4783 and #4786.

Source read: `main` at commit `a172a0c6` (2026-11-17), package
`cactus-plugin-satp-hermes`. Re-check against current `main` before relying on
it.

## Summary

- API1 has no CCIP field. `TransactRequest` and `Asset` declare no message ID,
  lane or finality preference, and neither does the client session data.
- The OpenAPI schema does not set `additionalProperties`, so it does not
  itself forbid undeclared request properties. Whether the validator middleware
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
  hold such data instead, but their semantic contract and binding are not
  defined. Which approach to take is a design decision.

## What was checked

| Area                   | Finding                                                               | How                                |
| ---------------------- | --------------------------------------------------------------------- | ---------------------------------- |
| Request schema         | No CCIP field in `TransactRequest` or `Asset`                         | Code read                          |
| Handler copy           | Fixed field list goes into the client session data                    | Code read, direct handler tests    |
| `payload`              | Not referenced by the transact handler or session utils               | Code read, direct handler test     |
| Session data and proto | No message ID, lane or finality field                                 | Code read                          |
| Response               | `TransactResponse` has no field for a message ID or attestation state | Code read                          |
| Lock type              | Constant in the handler                                               | Code read, direct handler test     |
| HTTP validation layer  | Schema does not itself forbid extras; middleware not exercised        | Code read only, not run in this PR |

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
- The gateway-to-gateway envelope is a JWS over the protobuf binary.

If a proto message gains a field, the message hash input could differ between
gateways on different schema versions. This is a named risk. No failure in the
real flow was demonstrated and no safety is claimed.

## Decisions for maintainers

1. Which API1 workflows must support CCIP (initiate, status, verify evidence,
   resume), and does any call accept an existing message ID or only return one?
2. Is finality a request field, connector policy, or derived from lock type?
3. Is the lane derived from network configuration or supplied per request?
4. Is CCIP modeled as a ledger type or as a transport?
5. Who owns the message ID and lane contract: #4786, #4782 or this spike?
6. Does "fix" in #4784 mean implement, or only open follow-up tickets?

## Not covered

CCIP behavior itself, a live lane, the HTTP validator at run time, other
storage of request data, and non-EVM destinations.
