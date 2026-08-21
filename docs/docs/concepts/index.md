# Key Concepts

Cacti's interoperability framework is built on several core concepts
that define how cross-network transactions are structured, verified,
and executed.

| Concept | Description | Documentation |
|---------|-------------|----------------------|
| **Asset Exchange** | Atomic swaps of assets between two parties on different ledgers using hash time-locked contracts. | [Asset Exchange](./asset-exchange.md) |
| **Asset Transfer** | Moving an asset from one network to another with provable burn-and-mint or lock-and-claim semantics. | [Asset Transfer](./asset-transfer.md) |
| **Data Sharing** | Querying and verifying ledger state across networks without asset movement. | [Data Sharing](./data-sharing.md) |
| **Connector (or Driver)** | Plugin that abstract interaction for specific network. | [Connector](./connector.md) |
| **Relay Architecture** | A protocol-neutral message routing layer that connects heterogeneous networks without shared middleware. | [Relay](./relay.md) |
| **Identity Management** | Establishing trust and verifying membership across independently governed networks. | [Identity](./identity.md) |
