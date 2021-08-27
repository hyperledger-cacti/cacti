<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Weaver: DLT Interoperability

## Short Description
A framework, with a family of protocols, to enable interoperation for data sharing and asset movements between independent networks built on heterogeneous DLTs in a manner that preserves the core blockchain tenets of decentralization and security.

## Scope of Lab
- We aim to provide a framework that allows two independent networks, typically (though not limited to) permissioned ones, to interoperate on a need basis.
- Interoperation does not rely on trusted mediators. Rules and requirements are framed using the networks' internal governance mechanisms.
- Interoperation relies minimally on shared infrastructure, which may provide identity services but does not play a part in core request-response protocols.
- Interoperation occurs through protocols that derive their trust from the counterparty networks' native consensus mechanisms.
- Core capabilities (or suported use cases) include data-sharing across ledgers with proof of authenticity and provenance, atomic asset transfers between networks, and atomic asset exchanges in multiple networks.
- We already support Hyperledger Fabric and Corda, and plan to extend support soon to Hyperledger Besu. We expect to build our framework in such a way that it can support any other arbitrary DLT with minimal effort.
- The key platform elements are:
  * Protocol units, namely request access control, and generation and verification of authenticity proofs. These leverage the networks' native smart contract frameworks.
  * Generic and extensible patterns for _ledger views_ and _artifact addresses_ for seamless inter-network communication. Our goal is to provide a basis for an eventual standard that is not tied to a particular DLT implementation.
  * Generic (i.e., not DLT-specific) semi-trusted _relay_ modules that mediate communication while acting on behalf of individual networks. They serve discovery and routing purposes akin to the routing and DNS infrastructure of the conventional internet.
  * DLT-specific plugins called _drivers_ augment relay capabilities with query- and response-translation mechanisms.
- Apart from the core platform features listed above, we provide SDK extensions for network application users to adapt existing apps for interoperability.
- We will provide and maintain a basic _testnet_ for rapid prototyping and testing.
For more details and illustrations, see the [project overview](./OVERVIEW.md).

## Repository Structure
- Blockchain practitioners who wish to use and experiment with our code should check the [Documentation](https://hyperledger-labs.github.io/weaver-dlt-interoperability).
  * To dive straight into running a basic setup and testing sample interoperation scenarios, start with [Getting Started](https://labs.hyperledger.org/weaver-dlt-interoperability/docs/external/getting-started/guide).
  * The source code for the documents lies in the [docs folder](./docs).
- Comprehensive specifications of our architecture and protocol suite are written in the style of RFCs and found in the [rfcs folder](./rfcs).
- Core Weaver components are implemented in the [core folder](./core).
- SDK extensions and libraries for DLT network applications to exercise Weaver interoperation capabilities are implemented in the [sdks folder](./sdks).
- Sample applications used for testing and benchmarking interoperation flows are implemented in the [samples folder](./samples).
- Common data structures and features used by different platform components and applications are implemented in the [common folder](./common).
- Testing, experimentation, and evaluation frameworks, are implemented in the [tests](./tests) folder.
  * An extensible _testnet_ is implemented in the [tests/network-setups folder](./tests/network-setups) to spin up basic Fabric and Corda networks and test data sharing (with proof) among them.

## Initial Committers
- https://github.com/VRamakrishna
- https://github.com/ermyas
- https://github.com/nwaywood
- https://github.com/dileban
- https://github.com/airvin
- https://github.com/AntTargett
- https://github.com/sanvenDev
- https://github.com/knarayan
- https://github.com/dhinakaran2705
- https://github.com//Yining-Hu
- https://github.com/Vinayaka-Pandit
- https://github.com/hyp0th3rmi4

## Sponsor
- https://github.com/lehors - TSC Member

# Former Members
- https://github.com/ChanderG
- https://github.com/dushyantbehl
