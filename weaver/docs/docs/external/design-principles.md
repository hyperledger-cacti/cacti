---
id: design-principles
title: Design Principles
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

We list principles and considerations that guide the design of a framework for interoperability between decentralized networks, along with associated reasoning. Our present solution, though a work-in-progress, attempts to adhere to these principles.


### How to determine need for interoperation, and its mode and mechanics?
- Assess dependence decision (i,e., between networks) to determine goals and required assurances:
  * The decision to depend on a network is a complex one, as a network is itself an affiliation of independent parties.
  * There are different approaches with varying levels of complexity and assurance.
  * Examine structural assurances provided by networks and their participants, and do a cost-benefit analysis to determine a suitable approach.
- The mechanics of interoperation can be derived from assumptions made in the above assessment.
- __Our assumptions and aproach__:
  * Individual network participants are untrustworthy.
  * The network is trustworthy in the collective.
  * The internal consensus mechanism of a network protects it from Byzantine failures.
  * Interoperability needs will not force structural changes or forks in a network nor constrain that network's internal evolution.


### Principles and Ideals for Interoperability Solution Design

Here are our guiding principles that accord with our assumptions and approach, in no particular order.

#### Favor Technical Assurances over Social Assurances
- Technical assurances are provided by protocols and security mechanisms, including distributed consensus.
- Social assurances include governance (collectively, through a consortium, or via a hierarchy), legal rules and regulations, reputations and history of past behavior.
- The reason to favor the former is that it can provide provable guarantees that are independent of the trustworthiness of individual participants, whereas the latter can be brittle and rely on participants' compliance.

#### Be Inclusive and Accommodate Heterogeneity
- Avoid approaches for protocol design that are specific to a particular DLT implementation or network structure.
- Specify the communication protocol in a network-neutral language.
- Design protocol units that can abstract out common features for information and assurances from diverse DLTs.

#### Allow Networks to Retain Independence and Collective Sovereignty
- A network is treated as an independent self-governing system with the freedom of choice to interoperate with another on a need basis.
- Network members retain collective sovereignty over their internal processes as well as access control rules governing remote interoperation.
- Networks have full and collective control, via their native consensus and smart contract mechanisms, over exposure of data, assets, and transactions to other networks.
  * A network acts as a unit for framing and enforcing rules controlling access to information held on its ledger(s) by a remote network.
- Similarly, networks have full and collective control, via their native consensus and smart contract mechanisms, over acceptance of data or assets and verifications of transactions occurring in, other networks.

#### Minimize Network Coupling
- Networks/consortia must retain independence for governance and configuration
  * Therefore, interoperation must require loose coupling rather than a merging or overlapping of two networks
- Loose coupling between dependent networks allows changes to counterparty networks' implementations with minimal or no impact to cross-network dependencies.
- Domain decoupling:
  * Define standards for contract interfaces
  * Define standards for representing data types and assets types (e.g. https://www.gs1.org/traceability)
  * Define standards for identity portability
- Communication decoupling:
  * Define standards for network interface/API
  * Define standards for protocol behavior
  * Define standards for messaging formats

#### Do not Compromise on Privacy and Confidentiality
- By design, a permissioned network should retain its privacy, and interoperation mechanisms should not leak information outside the bounds of what access control rules allow.
- Cross-network communications should be kept private and confidential and revealed only to interested parties, applying the principle of least privilege.

#### Minimize Trust Footprint and Avoid Centralization
- Design for decentralization across networks as within networks:
  * Avoid introducing centralized services that are easy to compromise
  * Assume that failure scenarios that apply to networks also hold for any service coordinating interoperability.
- Reduce trust to only what is essential (i.e. identity providers in the network).
- No trusted third-party intermediary or infrastructure (e.g., Polka Dot, Cosmos) should be relied upon for the purpose of cross network data verification or settlement.
- Reduce trust and centralization to only essential functions that cannot be completely decentralized:
  * Communicate messages across networks using some networking infrastructure:
    - This communication infrastructure is not trusted to maintain confidentiality or integrity of messages, and it may mount denial of service attacks.
  * Identity provision and verification:
    - This is necessary for permissioned networks that have private memberships governed by a _committee_ that may be centralized or distributed.

#### Favor dependence on proofs over trust
- _This is also implied by the "No Trusted Intermediaries" principle_.
- Information transferred across networks must carry verifiable proofs.
- The receiving network must be able to specify a _verification policy_ for proofs that it can independently and collectively (i.e., through consensus) verify.

#### Minimize Impact and Adaptation
- Enabling interoperation must not require changes to existing network protocols.
- Enabling interoperation must not impact existing network operation in any way nor require any blockchain forks.
- Adaptation in existing smart contracts and applications must be avoided unless absolutely necessary, and follow modular principles.

#### Maximize Operational Efficiency
- Minimize payloads in cross-network protocol units.
- Strive for event-driven asynchronous messaging architectures (_this is also implied by the "Minimal Coupling" principle_).

	
### Design Guidelines for Network Architects and Developers
- Architects and application developers (both in the smart contract and services layers) must design with interoperability in mind:
  * This has the advantage of minimizing or eliminating any code adaptations required for interoperability during a network's life cycle.
- Apply standards when defining assets, data and logic within network apps to maximize external consumption:
  * Networks with well-defined standards-based interfaces simplifies interoperability:
    - Interfaces include: contracts, data/assets, identity, APIs, protocol, messaging.
- Enables network implementation to evolve while eliminating or minimising external impact:
  * Implement in a modular way: many patterns and principles exist in the field of web services.
  * Decouple interoperability-related application modules as much as possible (_this guideline applies to blockchain-related modules within enterprise apps too_).
    - This will make maintenance easier and also allow administrators to minimize the amount of code that needs to be deployed in higher-security enterprise zones.
