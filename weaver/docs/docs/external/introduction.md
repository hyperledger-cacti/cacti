---
id: introduction
title: Weaver Framework
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

Weaver is a framework that enables scalable interconnectivity between disparate distributed ledgers in a manner that preserves core tenets of decentralisation and security.
The framework, consisting of a family of protocols, is designed and built with the following key guiding principles, which are further discussed in [Design Principles](design-principles.md):
- **Inclusiveness**: Avoid approaches that are specific to a particular DLT implementation and design.
- **Independence**: Interoperable networks retain sovereignty on their own processes and access control rules.
- **Minimum Trust**: Reduce trust to only what is essentials (i.e. identity providers in the network).
- **Privacy by Design**: Interaction between parties across networks should be kept private and confidential and revealed only to the interested parties.
- **No Intermediaries**: No third-party intermediary should be relied upon for the purpose of cross-network data verification or settlement.
- **Minimal Shared Infrastructure**: Rely on external infrastucture only for discovery, identification, and tracking/auditing, and not for cross-network transactions.
- **Leverage Consensus**: Use the respective ledgers' native distributed consensus mechanisms as the trust basis for cross-network transactions.
- **Non-Intrusion**: Require no changes to the DLT platforms and consensus mechanisms on which the networks are built, nor any dilution of the networks' security models.
- **Transparency**: Facilitate tracking and auditing of cross-network transactions.

The protocol is designed around the following key elements:
1. *State Proofs*: these allow a network to independently verify that any state it consumes from another network is valid according to the rules and policies of that network, or adheres to validity policies it imposes on state from that network.
2. *Asset Locks and Claims*: these allow a network to freeze an asset for a given time period on behalf of a user or allow a user to claim a frozen asset from its previous owner, either within a network or from a different network.
3. *Relays*: these are decentralised peer-to-peer services that enable communication of messages between networks.

Weaver has a specification outlined through a set of [RFCs](specifications.md) and a reference implementation of that specification, which is discussed in this documentation.
