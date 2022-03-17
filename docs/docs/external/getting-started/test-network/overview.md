---
id: overview
title: Component Overview
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

Weaver offers a basic test network launching capability, both to demonstrate interoperation modes and to serve as a testbed for development and prototyping. Different modes (or scenarios) require different sets of components, but collectively you will need to run the following:

- [Fabric testnet](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/tests/network-setups/fabric/dev) - A pair of basic Fabric networks for testing interop flows
- [Corda testnet](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/tests/network-setups/corda) - A pair of basic Corda networks for testing interop flows
- [Besu testnet](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/tests/network-setups/besu) - A pair of basic Besu networks for testing interop flows
- [Relay](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/core/relay) - The server module and protocol for cross-DLT interoperability. An instance of this is needed for every Fabric and Corda network
- [Fabric driver](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/core/drivers/fabric-driver) - Driver used by the Fabric networks relay to communicate with the Fabric testnet
- [Corda driver](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/core/drivers/corda-driver) - Driver used by the Corda networks relay to communicate with the Corda testnet
- [Fabric Interop chaincode](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/core/network/fabric-interop-cc) - The Fabric interoperability contracts handle the dual process of servicing requests for views from external networks, and verifying requested views for integrity
- [Corda interop app](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/core/network/corda-interop-app) CorDapp used to handle interop duties between the relay and the application
- [Besu interop contract](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/core/network/besu/contracts/interop) Solidity smart contract(s) used to handle interop duties for a Besu network
- [Fabric client](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/samples/fabric/fabric-cli) - Fabric client used to trigger interop flows initiated from the Fabric side and to manage Fabric state
- [Corda client app](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/samples/corda/corda-simple-application) - CorDapp and client used to trigger interop flows initiated from the Corda side and to manage Corda state
- [Besu sample application](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/samples/besu/simpleasset) - A sample application for asset exchange across two besu networks using HTLC
- [Besu client app](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/master/samples/besu/besu-cli) - Besu client used to interact with the contracts deployed on the Besu testnet

You can launch these components in one of several different ways:
* **Setup with Locally Built Weaver Components**:
    - [Deployed on Host Machine](./setup-local.md): Build the above components purely from your local clone of the Weaver code repository. If you wish to experiment with source code modifications, this is the right option to choose.
    - [Deployed in Docker containers](./setup-local-docker.md): This is similar to the above option, except with relays and drivers launched in Docker containers rather than in the host.
* **Setup with Imported Weaver Components**:
    - [Deployed on Host Machine](./setup-packages.md): Import pre-built Weaver components from Github Packages instead of building them locally. If you wish to see how Weaver works using pre-tested components and without, choose this option.
    - [Deployed in Docker containers](./setup-packages-docker.md): This is similar to the above option, except with relays and drivers launched in Docker containers rather than in the host.

After setting up and launching the components, you must initialize the network by following steps in [Ledger Initialization](ledger-initialization.md). 
Then you can test the following interoperation modes:
- [Data Sharing](../interop/data-sharing.md) among Fabric and Corda networks
- [Asset Exchange](../interop/asset-exchange.md) between Fabric networks
