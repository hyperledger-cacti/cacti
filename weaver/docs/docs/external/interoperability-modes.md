---
id: interoperability-modes
title: Interoperability Modes
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

## Modes of Interoperability

We identify distinct modes or patterns of interoperation based on the nature and purpose of the artifact that two networks (or parties within) have a common interest in and the purpose they wish to achieve.

First, we will classify artifacts present on shared ledgers broadly into the following two types:
- __Assets__: This is a ledger item that is associated with a single entity (or limited set of entities), representing the real-world ownership of that item by an entity. Bitcoins in the Bitcoin network and Ether on the Ethereum network are well-known examples, but assets repreenting a wide range of tangible goods can reside on blockchian ledgers, like property titles, bank drafts, precious stones, and financial instruments like bonds and securities.
- __Data Records__: This is any information held on a ledger that describes the state of the world, context, or properties of an entity or object. It is not "owned" by, or associated with, specific entities, but is rather common knowledge within a blockchain network.

The salient distinction between assets and data from an interoperability perspective is that the former may be present only in one network at any given instant in order to maintain its integrity whereas the latter can have copies in multiple networks without losing its value.

Three common modes in which independent networks will seek to interoperate are as follows. (We can also refer to them as three distinct purposes.)

### Asset Transfer
This refers to the movement of an asset from its source ledger to a consuming ledger. Since assets has _singleton_ ownership and can't be _double spent_, the transfer of an asset should result in its burning or locking in the source ledger and its creation on the target ledger.

A typical asset transfer use case is illustrated in the figure below, where Party X initially holds Asset in Network A, and through interoperation transfers Asset to Party Y in Network B. The loss of Asset to X in A must occur simultaneously with the gain of Asset for Y in B;. i.e, these transactions must be _atomic_. ("Holding an asset" refers to a record on a network's shared ledger representing the ownership of that asset by a given entity.)

![alt text](/use-cases/asset-transfer.png)

### Asset Exchange
This refers to the change of ownership of an asset in a source network and a corresponding change of ownership in another network. No asset leaves the network it resides in. The well-known terminology for asset exchange is 'Atomic Cross-Chain Swap'.

_For example_: two parties with both Bitcoin and Ethereum accounts may trade Bitcoin forEthereum based on an exchange rate agreed upon off-chain. We generalize this to permissioned networks, where it may be harder to provide guarantees of finality, and therby, atomicity.

The figure below illustrates a typical asset exchange. Initially, Party X holds Asset M in Network A and Party Y holds Asset N in Network B. Through interoperation, an exchange occurs whereby Y holds M in A and X holds N in B. The changes in these two networks occur atomically. (_Note_: in such a use case, both X and Y must be members of both networks.) See [DvP in Financial Markets](user-stories/financial-markets.md) for an example scenario illustrating asset exchanges.

![alt text](/use-cases/asset-exchange.png)

Both the asset transfer and exchange patterns can be extrapolated to scenarios involving more than 2 parties, 2 assets, and 2 networks. The only fixed criterion is that the actions on all networks happen atomically. For the same reason, the infrastructure and protocols to support both asset transfers and exchanges overlap significantly.

### Data Sharing
This refers to the transfer of data from its source ledger to a consuming ledger. (In many scenarios, data records in one network ledger may need to be shared with another network ledger in order to drive forward a process on the latter.) The data transferred can be the result of invoking a contract or a database query. There are no technical limits to the number of times a given piece of data can be copied to other ledgers.

The below figure illustrates this pattern, where initially, Data Record is maintained only on Network A's ledger, and through interoperation, a copy resides on Network B's ledger. (_Note_: the data record may be transformed within Network B during the sharing process before a transaction is committed to its ledger.) See [Global Trade](user-stories/global-trade.md) for an example scenario illustrating data sharing.

![alt text](/use-cases/data-transfer.png)

### Identity
This refers to the process by which identity can be expressed and comprehended beyond the boundaries of a single network. The ability to reason about identities as real-world entities along with credentials proving their membership in various networks is key to creating a trust basis that enables the three interoperability  modes listed above. From that perspective, this kind of cross-network identity management lies on a higher plane than data and asset movements. For more details on our thinking, see the Interop RFC pages.
