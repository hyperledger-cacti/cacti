---
id: guide
title: Using Weaver
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

The easiest way to understand how Weaver works is to run it at a small scale:

- First, [launch a set of basic test networks](./test-network/overview.md) built on Fabric, Corda and Besu. These networks offer the most basic capabilities of their DLT platforms and run toy applications (contracts and Layer-2) that can easily be tracked and debugged. You can launch these networks in one of several different ways: building Weaver components and dependencies locally or importing pre-built ones from Github packages, running core components in the host or in Docker containers. The choice depends on whether you just want to get these networks up and running or if you wish to customize the setup by modifying source code and configurations.
- Once the test networks are launched, you can test two distinct kinds of interoperation modes:
    * [Data sharing](./interop/data-sharing.md): all combinations of Fabric and Corda networks supported
    * [Asset exchange](./interop/asset-exchange/overview.md): all pairs of network types from {Fabric, Corda, Besu} are supported
    * [Asset transfer](./interop/asset-transfer.md): all combinations of Fabric and Corda networks supported
- (To bring down the test networks, go back to the "Setup" pages and follow instructions in the respective "Teardown" sections.)
- After you run these tests and get a flavor of how the system and protocols work, you will be ready to move on to "real" networks, enhancing them with interoperation capabilities by incorporating Weaver into them. Check out the guidelines and templates for [Fabric](./enabling-weaver-network/fabric.md), [Corda](./enabling-weaver-network/corda.md), and [Besu](./enabling-weaver-network/besu.md) networks.

If you wish to go further and understand Weaver specifics, dig into the code, or contribute to the open-source project, check out the [project repository](https://github.com/hyperledger-cacti/cacti/weaver). For specific information about individual Weaver components, see:

- [Relay](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/core/relay/README.md) module
- [Fabric](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/core/drivers/fabric-driver/readme.md) and [Corda](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/core/drivers/corda-driver/README.md) drivers
- [Fabric Interoperation Chaincode](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/core/network/fabric-interop-cc/README.md), [Interoperation CorDapp](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/core/network/corda-interop-app/README.md), and [Besu Interoperation Contract](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/core/network/besu/README.md)
- Common [protobufs](https://github.com/hyperledger-cacti/cacti/tree/main/weaver/common/protos): compiled in [JavaScript](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/common/protos-js/README.md), [Golang](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/common/protos-go/README.md), [Java](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/common/protos-java-kt/README.md), [Rust](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/common/protos-rs/README.md) and [Solidity](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/common/protos-sol/README.md)
- Fabric Interoperation SDKs in [Node.js](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/sdks/fabric/interoperation-node-sdk/README.md) and [Golang](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/sdks/fabric/go-sdk/readme.md)
- Corda Interoperation SDK in [Kotlin/Java](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/sdks/corda/README.md) 
- Besu Interoperation SDK in [Node.js](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/sdks/besu/node/README.md)
- Sample [Fabric](https://github.com/hyperledger-cacti/cacti/tree/main/weaver/samples/fabric) and [Corda](https://github.com/hyperledger-cacti/cacti/tree/main/weaver/samples/corda) applications for experimentation and testing
- [Fabric](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/tests/network-setups/fabric/dev/README.md), [Corda](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/tests/network-setups/corda/README.md), and [Besu](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/tests/network-setups/besu/README.md) test network setups

The Weaver [RFCs](https://github.com/hyperledger-cacti/cacti/blob/main/weaver/rfcs/README.md) contain detailed specifications of the models, data structures, protocols, and message formats.
