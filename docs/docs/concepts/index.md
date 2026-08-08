# Key Concepts

Cacti's interoperability framework is built on several core concepts
that define how cross-network transactions are structured, verified,
and executed.

!!! note "Work in Progress"
    This section is being expanded. Many of these concepts are already
    documented in detail within the
    [Weaver documentation](../weaver/introduction.md) and will be
    consolidated here in a future update.

| Concept | Description | Current Documentation |
|---------|-------------|----------------------|
| **Data Sharing** | Querying and verifying ledger state across networks without asset movement. | [Data Sharing](../weaver/interoperability-modes.md#data-sharing) |
| **Asset Exchange** | Atomic swaps of assets between two parties on different ledgers using hash time-locked contracts. | [Asset Exchange](../weaver/getting-started/interop/asset-exchange/overview.md) |
| **Asset Transfer** | Moving an asset from one network to another with provable burn-and-mint or lock-and-claim semantics. | [Asset Transfer](../weaver/getting-started/interop/asset-transfer.md) |
| **Identity Management** | Establishing trust and verifying membership across independently governed networks. | [Decentralized Identity](../weaver/architecture-and-design/decentralized-identity.md) |
| **Relay Architecture** | A protocol-neutral message routing layer that connects heterogeneous networks without shared middleware. | [Relay](../weaver/architecture-and-design/relay.md) |
