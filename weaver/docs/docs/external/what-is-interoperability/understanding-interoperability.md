---
id: understanding-interoperability
title: Understanding Interoperability
--- 

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

Permissioned DLTs have been gaining significant traction in industry since their inception. They have enabled enterprises to harness the innovation of public blockchains, while adhering to the privacy, confidentiality and regulatory constraints that businesses operate under. Permissioned DLTs offer enterprises an infrastructure for managing inter-firm asset, data and business workflow, without the need for a central intermediary that introduces additional sources of risk. Businesses are able to transact directly while reducing counter-party risk and mitigating the need for costly and time-consuming dispute resolution processes, often involving legal and judicial systems. Thus far, the application of this technology has enabled digitisation and disintermediation of many entrenched industry processes, resulting in significant improvements in efficiency, transparency, risk and fraud.

For practical reasons, the adoption of permissioned blockchains has thus far been driven through use-cases. Enterprises have been coalescing into consortia to create specialised networks that address narrowly-scoped use-cases in isolation.
This use-case driven approach to blockchain adoption is creating a proliferation of niche and isolated networks that are quickly becoming data and value silos.
In addition, these use-cases often represent a slice of a complex end-to-end business process. To deliver real value, permissioned networks need to seamlessly integrate with each other and with existing systems in order to holistically transform industries. This requirement for interoperation is coming to the fore as networks transition to production and scale towards broader adoption.

Interoperability in the context of Distributed Ledger Technologies involves enabling the seamless flow of data and value across disparate networks in a manner that preserves their trust and security tenets. This capability can offer a number of benefits such as:

- Removing data and value silos
- Increasing market sizes, liquidity and overall efficiency
- Improving network effects
- Enabling orchestration of complex business functionality across networks
- Enabling scale and groawth of networks
- Encouraging further adoption of the technology


## Unique Technical Challenges
Enabling interoperation between distributed ledgers presents numerous technical challenges compared to traditional systems integration approaches. This primarily stems from the need to preserve the benefits of decentralised trust beyond the boundaries of a single network. Hence, a naive approach to interoperability based on traditional point-to-point API integration is insufficient for preserving the underlying trust decentralised networks provide. There are two unique challenges present in DLT interoperation:

### Single-party vs Multi-party Trust 
In distributed ledger architectures, the authority over state lies in a collective and the protocol they employ to ensure its integrity. When one network or an entity consumes state from another, it would need to establish the veracity of the state according to the shared consensus view of parties in the network. This requirement is different than traditional integration with centralised systems wherein the trust for the validity of data is placed on the single party providing the data. Establishing the veracity of state in a decentralized network is not trivial. In most cases, a consumer of state might not be able to observe the full ledger of the network itself. Hence, a consumer needs to obtain an independently verifiable cryptographic proof on the validity of state according to the consensus rules and policies of the source network.

![single-party vs multi-party trust model](/multi-party-trust-model.png)

### Data vs Asset
Interoperation should not compromise the invariants enforced by individual networks such as protections against double spends on assets.


## The Role of Standards

The term ‘interoperability’ is used rather loosely in many contexts and oftentimes without the same implication. What some call ‘interoperability’, others refer to as ‘integration’, ‘interconnectivity’ or ‘compatibility’.

The primary goal of interoperability is freedom of choice. Interoperability enables users to choose implementations of systems they find suitable for a given problem without constraints on the system’s ability to communicate with other implementations. 

Implicit in the term interoperability is open standards, which distinguishes it from any form of bespoke integration. Open standards can either be de jure standards ratified by a formal standards organization such as ANSI, IETF, or ISO, or de facto standards proposed and adopted by communities, industries and the market. Open standards enable and encourage implementors to build systems that can work together.


