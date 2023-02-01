<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# DLT-Aware Request-Response Processing

DLT-specific _drivers_ can be used by a network's relay to determine how to satisfy a request or a query coming from a foreign network, and orchestrate the collection of information to send in a response. Though drivers can be designed to be plugins within a relay, our present implementation decouples them into separate services.
- Implementation of a Fabric driver lies [here](./fabric-driver).
- Implementation of a Corda driver lies [here](./corda-driver).
Both these drivers collect data and associated proofs (in the form of digital signatures from distinct network peers) in the cross-network data-sharing protocol.
