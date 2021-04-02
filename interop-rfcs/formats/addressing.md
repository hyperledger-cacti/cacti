<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Addressing

* Authors: Allison Irvin, Antony Targett, Christian Vecchiola, Dileban Karunamoorthy, Ermyas Abebe, Nick Waywood, Venkatraman Ramakrishna
* Status: Proposed
* Since: 13-Aug-2020


## Summary

* Addresses are unique references to [views](../models/views.md) on distributed ledgers.
* Addresses are composed of three segments: an endpoint segment, followed by a segment that identifies a ledger, followed by a segment that identifies a view.
* Addresses are shared out-of-band by networks with external counterparties as an expression of interest in collaborating.

## Addresses

An address is a globally unique identifier of a view on a distributed ledger. Addresses are composed of three segments. The first segment provides location information, the second segment identifies a unique ledger, while the third segment identifies a view on that ledger. View identifiers are declartive in nature, that is, they represent the *what* and not the *how*. 

### Syntax of an Address

```
address  = location-segment , "/", ledger-segment "/" , view-segment ;
```

## Location of Decentralized Networks

Decentralized networks by nature don't have a single location. The network represents groups of nodes that collaborate on maintaining one or more shared ledgers. Addresses are a means to identify views projected by ledgers to the external world. The maintainers of the ledgers may expose one or more endpoints for accessing views.

Addresses make no assumptions on how views are projected. Views might be projected directly by the distributed ledger nodes or by any infrastructure acting on behalf of the nodes, such as a relayers.

The location segment of an address can represent a set of endpoints, encoded directly in the location-segment of the address or by an identifier that can be resolved to a such a set.

```
location-segment = endpoint [ , ";" , *endpoint ]

endpoint := host [ ":" port ]

host ::= name / ip-address

port ::= *DIGIT
```

### Examples

```
location-segment = relay.example.com:7542
```

```
location-segment = relay1.example.com:7542;relay2.example.com:7542;relay3.example.com:7542
```

## Ledgers

The ledger segment uniquely indentifies a distributed ledger and is represented as a SecurityDomain. A distributed ledger is a collection of facts managed by a group of entities with a shared goal. A network can contain one or more independent distributed ledgers.

```
ledger-segment = *(%x61-7A / DIGIT / separator)
```

### Examples

```
ledger-segment = asia-pacific-trade-ledger
```

## Views

The view segment of an address uniquely identities a view and is represented by a sequence of characters. See [view encoding](/models/views.md#view-operators-and-encoding) for details on how view identifiers are constructed.

```
view-segment = *(%x61-7A / DIGIT / separator)
```

### Examples

```
view-segment = trade-channel:trade-chaincode:getbilloflading:10012
```

## Related Art

* [Decentralized Identifiers (DIDs) v1.0](https://w3c.github.io/did-core/)
* [Multiformats/Multiaddr](https://multiformats.io/multiaddr/)
* [ILP Addresses - v2.0.0](https://interledger.org/rfcs/0015-ilp-addresses/)
* [ZooKeeper: Because Coordinating Distributed Systems is a Zoo](https://zookeeper.apache.org/doc/r3.6.1/zookeeperProgrammers.html)
* [Bootstrap-Servers in Kafka Clusters](https://kafka.apache.org/documentation/#bootstrap.servers/)
