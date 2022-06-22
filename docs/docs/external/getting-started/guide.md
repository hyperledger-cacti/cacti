---
id: guide
title: Using Weaver
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

The easiest way to understand how Weaver works is to run it at a small scale:
- First, [launch a set of basic test networks](./test-network/overview.md) built on Fabric and Corda. These networks offer the most basic capabilities of their DLT platforms and run toy applications (contracts and Layer-2) that can easily be tracked and debugged. You can launch these networks in one of several different ways: building Weaver components and dependencies locally or importing pre-built ones from Github packages, running core components in the host or in Docker containers. The choice depends on whether you just want to get these networks up and running or if you wish to customize the setup by modifying source code and configurations.
- Once the test networks are launched, you can test two distinct kinds of interoperation modes:
  * [Data sharing](./interop/data-sharing.md): all combinations of Fabric and Corda networks supported
  * [Asset exchange](./interop/asset-exchange.md): all combinations of Fabric and Corda networks supported
  * [Asset transfer](./interop/asset-transfer.md): all combinations of Fabric and Corda networks supported
- (To bring down the test networks, go back to the "Setup" pages and follow instructions in the respective "Teardown" sections.)
- After you run these tests and get a flavor of how the system and protocols work, you will be ready to move on to "real" networks, enhancing them with interoperation capabilities by incorporating Weaver into them. Check out the guidelines and templates for [Fabric](./enabling-weaver-network/fabric.md), [Corda](./enabling-weaver-network/corda.md), and [Besu](./enabling-weaver-network/besu.md) networks.

If you wish to go further and understand Weaver specifics, dig into the code, or contribute to the open-source project, check out the [project repository](https://github.com/hyperledger-labs/weaver-dlt-interoperability). For specific information about individual Weaver components, see:
- [Relay](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/core/relay/README.md) module
- [Fabric](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/core/drivers/fabric-driver/readme.md) and [Corda](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/core/drivers/corda-driver/README.md) drivers
- [Fabric Interoperation Chaincode](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/core/network/fabric-interop-cc/README.md) and [Interoperation CorDapp](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/core/network/corda-interop-app/README.md)
- Common [protobufs](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/main/common/protos): compiled in [JavaScript](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/common/protos-js/README.md), [Golang](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/common/protos-go/README.md), and [Java](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/common/protos-java-kt/README.md)
- Fabric Interoperation SDKs in [Node.js](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/sdks/fabric/interoperation-node-sdk/README.md) and [Golang](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/sdks/fabric/go-sdk/readme.md)
- Sample [Fabric](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/main/samples/fabric) and [Corda](https://github.com/hyperledger-labs/weaver-dlt-interoperability/tree/main/samples/corda) applications for experimentation and testing
- [Fabric](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/tests/network-setups/fabric/dev/README.md), [Corda](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/tests/network-setups/corda/README.md), and [Besu](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/tests/network-setups/besu/README.md) test network setups

The Weaver [RFCs](https://github.com/hyperledger-labs/weaver-dlt-interoperability/blob/main/rfcs/README.md) contain detailed specifications of the models, data structures, protocols, and message formats.
