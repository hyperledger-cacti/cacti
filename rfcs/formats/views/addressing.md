<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Addressing

- RFC: 03-001
- Authors: Allison Irvin, Antony Targett, Christian Vecchiola, Dileban Karunamoorthy, Ermyas Abebe, Nick Waywood, Venkatraman Ramakrishna
- Status: Proposed
- Since: 13-Aug-2020


## Summary

* Addresses are unique references to [views](../models/views.md) on distributed ledgers.
* Addresses are composed of three segments: an endpoint segment, followed by a segment that identifies a ledger, followed by a segment that identifies a view.
* Addresses are shared out-of-band by networks with external counterparties as an expression of interest in collaborating.

## Addresses

An address is a globally unique identifier of a view on a distributed ledger. Addresses are composed of three segments. The first segment provides location information, the second segment identifies a unique ledger, while the third segment identifies a view on that ledger. View identifiers are declarative in nature, that is, they represent the *what* and not the *how*.

### Syntax of an Address

```
address  = location-segment "/" ledger-segment "/" view-segment ; distributed-ledger-system/ledger/data-projection
```

## Location of Decentralized Networks

Decentralized networks by nature don't have a single location. The network represents groups of nodes that collaborate on maintaining one or more shared ledgers. Addresses are a means to identify views projected by ledgers to the external world without making any assumptions about how those views are projected. The maintainers of the ledgers may expose one or more endpoints for accessing views, which can be the distributed ledger nodes themselves or infrastructure acting on behalf of nodes, such as relays. Further, these endpoints can act as gateways to multiple distributed ledger networks.

The location segment of an address therefore represents a set of endpoints and a unique identifier of the network maintaining the ledger from which a projected view is desired, which can be thought of as two sub-segments. The network identifier segment is optional, as it can be omitted when the specified endpoints are known to serve a single network. The set of endpoints can be encoded directly in the location-segment of the address or by an identifier that can be resolved to a such a set.

```
location-segment = gateway ["/" network-id]

gateway = endpoint *(";" endpoint) / name

endpoint = host [":" port]

host = hostname / IP-address

port = 1*DIGIT

network-id = name

hostname = name 1*("." name)

name = (ALPHA / "_") *(ALPHA / DIGIT / "_" / "-")

IP-address = 1*3DIGIT "." 1*3DIGIT "." 1*3DIGIT "." 1*3DIGIT
```

### Examples

```
location-segment = relay.example.com:7542/example-network
location-segment = relay1.example.com:7542;relay2.example.com:7542;relay3.example.com:7542/example-network
location-segment = relay1.example.com:7542;relay2.example.com:7542
```

## Ledgers

The ledger-segment uniquely indentifies a ledger maintained by a distributed ledger network. A ledger is a collection of facts managed by a group of entities with a shared goal, often using a set of smart contracts. A network can contain one or more independent distributed ledgers. Ultimately, each ledger is maintained by a subgroup of nodes. In some DLTs, a well-known identifier can be used to name a ledger. In others, the set of nodes, which represent well-known stakeholders in the network, must be explicitly listed or an identifier representing, say a decentralized application spanning those nodes, must be specified. Identifiers for nodes maintaining a ledger can be separated using semicolons (`;`).

The ledger-segment can be left blank if the network has only one ledger, which is the default in open networks like Bitcoin or the Ethereum Mainnet, or in private Ethereum-based systems like Quorum and Hyperledger Besu.

The general specification of a ledger-segment is an alphanumeric string.

```
ledger-segment = *1((ALPHA / "_") 1*(ALPHA / DIGIT / "_" / "-" / ";" / ":"))
```

### Examples

```
ledger-segment = trade-channel
ledger-segment = paymentsDapp
ledger-segment = paymentsDappNode1:9005;paymentsDappNode2:9005
```

## Views

The view-segment of an address uniquely identifies a view within a ledger. At this level, features particular to the DLT on which the network is built are necessary to identify and encode a view operator (or `getter`). But we can still draw out common abstractions from different DLTs. All such technologies offer a procedural interface to access and manipulate data, typically (but not always) in the form of a _smart contract_. The exposed interface offers multiple functions to generate views based on the provided input. Hence, we can specify the view-segment as being composed of a contract, a function, and a list of input arguments. In the most general case, a default contract may be assumed, and arguments may be unnecessary, and so these can be omitted. The function, which can either be a procedural identifier, or a direct reference to a data item or collection of data items, or a programming instruction, must be specified.

```
view-segment = [contract-id] ":" function-spec *(":" input-argument)

contract-id = (ALPHA / "_") 1*(ALPHA / DIGIT / "_")

function-spec = name

input-argument = name

name = *HEXDIGIT ; hex-encoded ASCII string
```

Because the function-spec and input-argument are allowed to contain special characters, the specification of the view-segment requires them to be hex-encoded.

For a given DLT, we can be more specific about the definition of the view-segment, using knowledge of the ledger structure and smart contract interface. See the following links for details on how viewi-segment identifiers are constructed for the three DLTs that Weaver presently supports:
* [Fabric View Address Encoding](./fabric.md)
* [Corda View Address Encoding](./corda.md)
* [Ethereum View Address Encoding](./ethereum.md)
The general specification of a view-segment is a non-blank alphanumeric string with optional separators (the list below in the below specification is suggestive and not exchaustive).

### Examples

```
view-segment = trade-chaincode:getBillOfLading:bill-10012
view-segment = :com.tradeNetwork.tradeDapp.flows.GetDocumentByTypeAndId:C:5
```

## Related Art

* [Decentralized Identifiers (DIDs) v1.0](https://w3c.github.io/did-core/)
* [Multiformats/Multiaddr](https://multiformats.io/multiaddr/)
* [ILP Addresses - v2.0.0](https://interledger.org/rfcs/0015-ilp-addresses/)
* [ZooKeeper: Because Coordinating Distributed Systems is a Zoo](https://zookeeper.apache.org/doc/r3.6.1/zookeeperProgrammers.html)
* [Bootstrap-Servers in Kafka Clusters](https://kafka.apache.org/documentation/#bootstrap.servers/)
