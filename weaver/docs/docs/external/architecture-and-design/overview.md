---
id: overview
title: Overview
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

The below diagram shows a high level architecture diagram of the Weaver framework.

![](/architecture-assets/architecture_overview.png)

## Network

The networks in the system can be made up of various heterogenious technologies, including Hyperledger Fabric and Corda. Each network in the system needs to contain an interoperability (IOP) module that enables them to communicate with the relays.

## Relay

The relays act as a conduit to facilitate communication of protocols between networks (e.g. data transfer, asset exchange etc). The roles of the relays are described in more detail in [relay](./relay.md).

# Design Decisions

The high level design decisions that were made for the system are outlined here.

## Synchronous vs Asynchronous message communication

We decided to go with an asynchronous message architecture. The primary reason for this is because requests can take an arbitary amount of time to respond, it is not practical for a synchronous message to wait that long for a reply. For example, obtaining a 12 block confirmation on the Bitcoin network can take about 2 hours.

## Message vs connection oriented communication

We decided to go with a message oriented architecture. The primary reason for this is because it makes the system more fault tolerant. With a message oriented architecture the requester and responder don't need to be alive at the same time. For example, if the requestor crashes while the responder is processing the request, the communication is not interrupted since the responder will just send a message when it has finished processing the request. The design choice also enables the systen to be made more fault tolerant in the future by implementing message queues between components in the system.
