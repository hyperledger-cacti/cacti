<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Interoperability RFCs

These RFCs capture abstractions, models, protocols and data formats for facilitating cross-ledger communication and transactions.

If you are new to Weaver (or to blockchain interoperability), we recommend starting with the [protocol overview document](../OVERVIEW.md).

If you wish to see Weaver in action, test it, or apply it to your own application, you can switch to the [Getting Started Tutorial](https://labs.hyperledger.org/weaver-dlt-interoperability/docs/external/getting-started/guide).

Instead, if you wish to find out more details about the Weaver design and wish to contribute to the code base, you can explore these RFCs, beginning with the  [models](./models). Protocol engineers will find in [RFC: 01-007](./models/relays.md) a useful overview of the relay model, and may then progress on to reading one of the existing protocols' design and implementation; e.g., the data transfer protocol in [RFC: 02-002](./protocols/data-transfer/readme.md). If you are interested in adding support for a new ledger technology, see the [existing driver implementations](../core/drivers) and [existing interoperability module implementations](../core/network). Where relevant we use [ABNF](https://tools.ietf.org/html/rfc5234) for formal syntax definitions.

Precise definitions of terms you may encounter in these RFCs can be found in the [terminology page](terminology.md).

<img src="resources/images/protocol-suite.png" width=75%>

## Index of RFCs

The RFC numbering convention is: `<type>:<id>`. The list of types (`<type>`) is as follows:
| `<type>` | Document Type/Category      |
|----------|-----------------------------|
|    01    | Concepts and Models         |
|    02    | Protocols and Mechanisms    |
|    03    | Data Structures and Formats |

| RFC #  | Title                           | Category | Status                                                        |
|--------|---------------------------------|----------|---------------------------------------------------------------|
| 01-001 | Verifiable Observation of State | Model    | [Draft](./models/observation-of-state.md)                     |
| 01-002 | Cryptographic Proofs            | Model    | [Draft](./models/cryptographic-proofs.md)                     |
| 01-003 | Views                           | Model    | [Proposed](./models/views.md)                                 |
| 01-004 | Events                          | Model    | [Draft](./models/events.md)                                   |
| 01-005 | Fair Exchange                   | Model    | [Draft](./models/fair-exchange.md)                            |
| 01-006 | Identity                        | Model    | [Draft](./models/identity/decentralized-network-identity-discovery-management.md) |
| 01-007 | Relays                          | Model    | [Draft](./models/relays.md)                                   |
| 01-008 | Security                        | Model    | [Draft](./models/security.md)                                 |
| 02-001 | Event Bus                       | Protocol | [Draft](./protocols/event-bus.md)                             |
| 02-002 | Data Transfer                   | Protocol | [Draft](./protocols/data-transfer/readme.md)                  |
| 02-003 | Asset Exchange - HTLC           | Protocol | [Draft](./protocols/asset-exchange-htlc.md)                   |
| 02-004 | Asset Transfer                  | Protocol | -                                                             |
| 02-005 | Discovery                       | Protocol | -                                                             |
| 02-006 | Protocol Negotiation            | Protocol | -                                                             |
| 03-001 | Address                         | Format   | [Proposed](./formats/addressing.md)                           |
|        | View - Definition               | Format   | [Draft](./formats/view-definition.md)                         |
|        | View - Fabric                   | Format   | [Draft](./formats/views-fabric.md)                            |
|        | View - Corda                    | Format   | [Draft](./formats/views-corda.md)                             |
|        | View - Ethereum                 | Format   | [Draft](./formats/views-ethereum.md)                          |
|        | Attachments                     | Format   | -                                                             |
|        | Policy - Access Control         | Format   | [Proposed](./formats/policy-access-control.md)                |
|        | Policy - Proof Verification     | Format   | [Proposed](./formats/policy-proof-verification.md)            |
|        | Policy - Verification DSL       | Format   | [Draft](./formats/policy-dsl.md)                              |
|        | Memberships                     | Format   | [Proposed](./formats/memberships.md)                          |


## RFC Process

NOTE: The following is only a tentative process pending further discussion.

-   Draft
-   Proposed
-   Active
-   Superseded
-   Retired
-   Abandoned
