<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Relays

- RFC: 01-009
- Authors: Allison Irvin, Antony Targett, Christian Vecchiola, Dileban Karunamoorthy, Ermyas Abebe, Nick Waywood, Venkatraman Ramakrishna
- Status: Proposal
- Since: 13-Aug-2020


## Summary

- A relay is a fulcrum of inter-network (or inter-ledger) communication.
- Supports a DLT-neutral, asynchronous, event-based, message-passing protocol across boundaries of networks built on arbitrary DLT stacks.
- Acts as a gateway for a network, serving as both an ingress and an egress point for cross-network messages.
- Trustless for end-to-end integrity and confidentiality.
- Multiple relays can serve a network, or relays can be hosted by dedicated services outside network boundaries.

## Relays for Cross-Ledger Communication

Relays are the fulcra (or mediums) of communication across networks maintaining distributed ledgers. They perform the following functions:
- Pass messages conveying queries, instructions, and information from one network to another.
- Mediate end-to-end protocols corresponding to [basic interoperability modes](../ledger/cross-ledger-operations.md) supported by Weaver.
- Discover foreign networks' relays.
- Route messages to foregn networks' relays if direct inter-relay communication is not possible.

A relay runs both a server and a client, to serve and to initiate requests respectively. Both server and client should be built on a common transport protocol, and the protocol chosen in Weaver for this purpose is [gRPC](https://grpc.io/), because it is ubiquitous, standardizes, and actively supported in all popular programming languages.

Cross-network protocols mediated through relays are DLT-neutral, i.e., independent of any specific DLT's characteristics. The basic protocol involves asynchronous, event-based, message-passing, and is stateless. Optionally, for added robustness and end-to-end reliability guarantees, the protocol can be made stateful through support for fault-tolerant communications and message queueing. Additionally, support for message prioritization and load balancing can be added to meet desired performance SLAs.

Relays can serve as both ingress and egress points for networks. They offer application clients the ability to send requests to remote networks using a well-defined API and message structure as is illustrated in the figure below.

<img src="../../resources/images/relay-model-dlt-destination.png" width=100%>

The same relays can send messages to, and receive messages from, other relays, as is illustrated in the figure below. This figure also shows how a request received from a remote relay is served within the network using [drivers](#drivers-for-dlt-specific-operations) and [interoperation modules](./interoperation-modules.md).

<img src="../../resources/images/relay-model-dlt-source.png" width=100%>

A relay recognizes and communicates the following messages:
- Ledger view requests consisting of view addresses and associated metadata
- Ledger views
- Ledger (or smart contract) transaction invocations
- Ledger events

Relays are trustless for end-to-end protocol integrity and confidentiality. This enables a variety of [deployment configurations](#deployment-models-and-considerations) without adversely impacting a network's security or increasing a network's trust footprint. Such trustlessness is achieved using [network-centric interoperation modules](./interoperation-modules.md) and specifications can be found in the [protocols section](../../protocols/).

## Drivers for DLT-Specific Operations


## Relay Functional API

_TBD: List API function specs exposed to application clients, relays, and drivers respectively. Message formats will be described in 'formats/communication'_

## Driver Functional API

_TBD: List API function specs exposed to relays. Message formats will be described in 'formats/communication'_

## Deployment Models and Considerations
