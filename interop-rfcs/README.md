<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Interoperability RFCs

The RFCs capture abstractions, models, protocols and data formats for facilitating cross-ledger communication. For newcomers we recommend starting with the protocol [overview]() document followed by the RFCs on _models_. Protocol engineers will find [RFC: 01-006](/models/relays.md) on the relay model a useful read and may progress on to reading one of the existing protocol design and implementations. If you are interested in adding support for a new ledger technology, see implementing a [new driver]() and implementing [interoperability modules]() for your ledger technology. Where relevant we use [ABNF](https://tools.ietf.org/html/rfc5234) for formal syntax definitions.

Through out the RFCs if you come across terminology that might be not well defined in the context it is used in, refer to [terminology](terminology.md) for precise definitions of these terms.

<img src="resources/images/protocol-suite.png" width=75%>

## Index of RFCs

| RFC #  | Title                           | Category | Status                                                       |
|--------|---------------------------------|----------|--------------------------------------------------------------|
| 01-001 | Verifiable Observation of State | Model    | [Draft](/models/observation-of-state.md)                     |
| 01-002 | Cryptographic Proofs            | Model    | [Draft](/models/cryptographic-proofs.md)                     |
| 01-003 | Views                           | Model    | [Proposed](/models/views.md)                                 |
| 02-004 | Events                          | Model    | [Draft](/models/events.md)                                   |
| 01-005 | Fair Exchange                   | Model    | [Draft](/models/fair-exchange.md)                            |
| 01-006 | Identity                        | Model    | [Draft](/models/identity/distributed-identity-management.md) |
| 01-007 | Relays                          | Model    | [Draft](/models/relays.md)                                   |
|        | Security                        | Model    | [Draft](/models/security.md)                                 |
| 02-001 | Event Bus                       | Protocol | [Draft](/protocols/event-bus.md)                             |
| 02-002 | Data Transfer                   | Protocol | [Draft](/protocols/data-transfer/readme.md)                  |
| 02-003 | Asset Exchange - HTLC           | Protocol | [Draft](/protocols/asset-exchange-htlc.md)                   |
|        | Asset Transfer                  | Protocol | -                                                            |
|        | Discovery                       | Protocol | -                                                            |
|        | Protocol Negotiation            | Protocol | -                                                            |
| 03-001 | Address                         | Format   | [Proposed](/formats/addressing.md)                           |
|        | View - Definition               | Format   | [Draft](/formats/view-definition.md)                         |
|        | View - Fabric                   | Format   | [Draft](/formats/views-fabric.md)                            |
|        | View - Corda                    | Format   | [Draft](/formats/views-corda.md)                             |
|        | View - Ethereum                 | Format   | [Draft](/formats/views-ethereum.md)                          |
|        | Attachments                     | Format   | -                                                            |
|        | Policy - Access Control         | Format   | [Proposed](/formats/policy-access-control.md)                |
|        | Policy - Proof Verification     | Format   | [Proposed](/formats/policy-proof-verification.md)            |
|        | Policy - Verification DSL       | Format   | [Draft](/formats/policy-dsl.md)                              |
|        | Memberships                     | Format   | [Proposed](/formats/memberships.md)                          |


## RFC Process

NOTE: The following is only a tentative process pending further discussion.

-   Draft
-   Proposed
-   Active
-   Superseded
-   Retired
-   Abandoned
