<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Weaver: DLT Interoperability

![Data Transfer Status](https://github.com/hyperledger-labs/weaver-dlt-interoperability/actions/workflows/test_data-transfer.yml/badge.svg?event=push)
![Fabric Asset Exchange Status](https://github.com/hyperledger-labs/weaver-dlt-interoperability/actions/workflows/test_asset-exchange-fabric.yml/badge.svg?event=push)
![Corda Asset Exchange Status](https://github.com/hyperledger-labs/weaver-dlt-interoperability/actions/workflows/test_asset-exchange-corda.yml/badge.svg?event=push)
![Asset Transfer Status](https://github.com/hyperledger-labs/weaver-dlt-interoperability/actions/workflows/test_asset-transfer.yml/badge.svg?event=push)

## Short Description
A framework, with a family of protocols, to enable interoperation for data sharing and asset movements among independent networks built on similar or different distributd ledger technologies (DLTs) in a manner that preserves the core blockchain tenets of decentralization and security.

## Scope of Lab
- We aim to provide a framework that allows two independent networks, typically (though not limited to) permissioned ones, to interoperate on a need basis.
- Interoperation does not rely on trusted mediators. Rules and requirements are framed using the networks' internal governance mechanisms.
- Interoperation relies minimally on shared infrastructure, which may provide identity, discovery, and routing, services but does not play a part in core cross-network transactions (which may involve request-response protocols).
- Interoperation occurs through protocols that derive their trust from the counterparty networks' native consensus mechanisms, because any cross-network transaction method that eschews or bypasses the respective networks' consensus mechanisms will be vulnerable to failure or attack.
- Core capabilities (or suported use cases) include data-sharing across ledgers with proof of authenticity and provenance, atomic asset transfers between networks, and atomic asset exchanges in multiple networks.
- Our framework offers common components that can be reused in networks built on any arbitrary DLT as well as design templates for components that must be built on DLT-specific tech stacks. We will strive to provide acclerators that minimize the effort involved in building DLT-specific components. Presently, we support Hyperledger Fabric and Corda, and to some extent Hyperledger Besu.
- The key platform elements are:
  * Protocol units, namely request access control, generation and verification of ledger state authenticity proofs, hash- and time-locking of assets, and claiming and unlocking of assets. These units leverage the networks' native smart contract frameworks.
  * Generic and extensible patterns for _ledger views_ and _view addresses_ for seamless inter-network communication. Our goal is to provide a basis for an eventual standard that is not tied to a particular DLT implementation.
  * Generic (i.e., not DLT-specific) semi-trusted _relay_ modules that mediate communication while acting on behalf of individual networks. They serve discovery and routing purposes akin to the routing and DNS infrastructure of the conventional internet.
  * DLT-specific plugins called _drivers_ that augment relay capabilities with query- and response-translation mechanisms.
  * Agents, consisting of both generic and DLT-specific features, that sync foreign networks' membership lists and identity provider credentials, using existing decentralized identity (DID) and verifiable credential (VC) ins=frastructure.
- Apart from the core platform features listed above, we provide SDK extensions for network application users to adapt existing apps for interoperability.
- We will provide and maintain a basic _testnet_ for rapid prototyping and testing.
For more details and illustrations, see the [project overview](./OVERVIEW.md).

# Weaver Support Status
The table below shows what interoperation capabilities (or use cases) are presently supported by Weaver, and what DLTs the platform offers out-of-the-box components for.
- Any network built on a supported DLT can utilize Weaver capabilities with additional effort required only in configuration and minor adaptations in applications to exercise those capabilities as required in their workflows.
- For any unsupported DLT, engineering effort will be required to build protocol units, drivers, and identity sync agents, using Weaver's common protobuf structures, design templates, and API specifications. (Because DLTs are heterogeneous with divergent models for data storage, smart contracts, and distributed application development procedures, it is difficult to write reusable code for this purpose.)

<img src="./resources/images/weaver-support-table.png">

Prominent features in our future roadmap are:
- Make the protocols for data transfer, asset transfer, and asset exchanges, more robust and foolproof using techniques validated through research and experimentation.
- Support the use cases of cross-network transaction invocations (i.e., instructions) and event dissemination (publish/subscribe).

## Repository Structure
- Blockchain practitioners who wish to understand what Weaver offers, use Weaver capabilities, or experiment with the code, should check the [Documentation](https://hyperledger-labs.github.io/weaver-dlt-interoperability).
  * To dive straight into running a basic setup and testing sample interoperation scenarios, start with [Getting Started](https://labs.hyperledger.org/weaver-dlt-interoperability/docs/external/getting-started/guide).
  * The source code for the documents lies in the [docs folder](./docs).
- Comprehensive specifications of our architecture and protocol suite are written in the style of RFCs and found in the [rfcs folder](./rfcs).
- Core Weaver components are implemented in the [core folder](./core).
- SDK extensions and libraries for DLT network applications to exercise Weaver interoperation capabilities are implemented in the [sdks folder](./sdks).
- Sample applications used for testing and benchmarking interoperation flows are implemented in the [samples folder](./samples).
- Common data structures and features used by different platform components and applications are implemented in the [common folder](./common).
- Testing, experimentation, and evaluation frameworks, are implemented in the [tests](./tests) folder.
  * An extensible _testnet_ is implemented in the [tests/network-setups folder](./tests/network-setups) to spin up basic Fabric, Corda, and Besu networks, and test various cross-network operations.

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
