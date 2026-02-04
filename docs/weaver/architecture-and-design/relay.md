---
id: relay
title: Relay
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

![](../../../images-weaver-docs/architecture-assets/relay_architecture.png)

As mentioned in the overview, relays facilitate communication of protocols between networks. To do this, they are composed of three main pieces:

-   `Relay service` - A gRPC server that listens for and handles incoming requests from other relays. For example, a remote network requesting state.
-   `App service` - A gRPC server that listens for and handles requests from applications that are requesting an asset from a remote network.
-   `Driver` - The driver is responsible for all communication between the relay and its network. The driver is described in more detail in [drivers](./drivers.md).

The diagram below shows an example communication between two networks, A and B, where network A is requesting state from network B.

![](../../../images-weaver-docs/architecture-assets/relay_flow.png)

1. An application sends a request to their networks relay over gRPC
2. The local relay inspects the query within the request and uses the relevant information to forward the request to the correct remote relay
3. The remote relay's driver interprets the query and invokes the smart contract for the query
4. Once network B has returned a response to its relay, the relay forwards the response back to relay A
5. The application gets the response from the relay, this can either be via a push or pull mechanism
6. The application invokes a domain specific smart contract to process the response from network B
