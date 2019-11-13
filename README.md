# Hyperledger Blockchain Integration Framework <!-- omit in toc -->

[![Build status]](https://travis-ci.org/hyperledger-labs/blockchain-integration-framework)

[Build status]: https://travis-ci.org/hyperledger-labs/blockchain-integration-framework.svg?branch=master

- [Lab Name](#lab-name)
- [Short Description](#short-description)
- [Scope of Lab](#scope-of-lab)
  - [Blockchain Interoperability Space](#blockchain-interoperability-space)
  - [Design Principles](#design-principles)
  - [How It Works](#how-it-works)
  - [Future Work](#future-work)
- [Initial Committers](#initial-committers)
- [Sponsor](#sponsor)
- [Original README](#original-readme)
  - [Transfer validator](#transfer-validator)
    - [Who should be a validator?](#who-should-be-a-validator)
    - [How many validators should be deployed?](#how-many-validators-should-be-deployed)
    - [Role & Services](#role--services)
    - [Motivations](#motivations)
  - [Export & Import](#export--import)
    - [Export](#export)
    - [Import](#import)
  - [Simple Asset Transfer](#simple-asset-transfer)
  - [Plugins](#plugins)
    - [On-chain Logic](#on-chain-logic)
    - [Connector](#connector)
  - [Future Work](#future-work-1)
    - [Interoperability Use Cases](#interoperability-use-cases)
    - [Identity System](#identity-system)
    - [Confidential Federation](#confidential-federation)
    - [More plugins](#more-plugins)
  - [Contributors (unsigned commits could not be included in the lab repo)](#contributors-unsigned-commits-could-not-be-included-in-the-lab-repo)

## Lab Name

Blockchain Integration Framework

## Short Description

A new approach to the blockchain interoperability problem

## Scope of Lab

Define a communication model to enable permissioned blockchain ecosystems to exchange any on-chain data or custom assets (fungible/non fungible) independent of the platform (e.g. Hyperledger Fabric, Quorum, etc.) without a middleman. This lab project will implement an interoperability validator network, which is an overlay network of hand-picked actors that will validate and sign data before sharing.

### Blockchain Interoperability Space

If you look at the Blockchain Interoperability space, several different approaches have been proposed. Among the existing contributions, we identified two main ways to solve the interoperability problem. The “connector approach” focuses on building transfer protocols for non-trusted blockchain gateways (e.g. Interledger). The “blockchain of blockchains approach” proposes a central blockchain “hub” to connect multiple blockchain “zones” together (e.g. Cosmos).

This lab project proposes an alternative to these models, and it is designed specifically for permissioned blockchain networks

### Design Principles

1. Direct transfer between requestors (from different ledgers)
2. Pluggable model and components
3. Flexible requirements and data protocols
4. Leverage pre-existing roles

### How It Works

Blockchain Integration Framework introduces an “interoperability validator” overlay network for each of the interoperable blockchains. Interoperability validators are known or broadly discoverable by the ecosystem and are typically participants already taking part in the governance or consensus. Interoperability validators will collectively handle export requests from local nodes by verifying against their version of the ledger (steps 1 to 3). Each request is answered by a (configurable) minimum quorum of validator signatures necessary or rejected as fast as possible (steps 4 and 5). The network can continue working even if some of the validators are down, or not participating, but assuming the minimum quorum can be guaranteed. Messages certified by a distributed ledger’s transfer validators can be delivered by any secure off-chain communication system (step 6). A proof coming from a foreign distributed ledger can be verified against the public keys of the transfer validators of that foreign distributed ledger either locally by the recipient or using an on-chain logic –- typically smart-contracts (step 7 and 8)

![High-Level Workflow](./docs/images/blockchain-integration-framework-high-level-workflow.png "Interoperability between two different DLTs")

### Future Work

- Integrate Hyperledger Indy to manage the interoperability validator identities across the different blockchains
- Implement more complex interoperability use cases. (e.g. atomic swap or asset synchronization)
- Test scalability and performance
- Integrate more platforms (e.g. Hyperledger Sawtooth, Digital Asset, etc.)
- Implement confidential communication within the overlay network. The validator network should match the confidentiality setup of the local ledger
- Replace current signature scheme by BLS to optimize the proof size (Hyperledger Ursa is a lead)

## Initial Committers

- [tkuhrt](https://github.com/tkuhrt)
- [jonathan-m-hamilton](https://github.com/jonathan-m-hamilton)
- [petermetz](https://github.com/petermetz)
- [hugo-borne](https://github.com/hugo-borne)

## Sponsor

[Hart Montgomery](mailto:hmontgomery@us.fujitsu.com) ([hartm](https://github.com/hartm)) - TSC member

To generate the full documentation in html format (in root folder): ``npm i && npm run docs``

Therefore, links in markdown documentation will be broken / not working.

## Original README

> A connector-less approach to the non-fungible asset interoperability problem in permissionned distributed ledgers

Federation for Interop provides for data transfer across different permissioned
distributed ledgers without connectors or middleman.
Federation for Interop aims to be as plugable as possible
to existing distributed ledger infrastructure and networks.
The implementation and design of the project enables interoperability
by extending pre-existing roles and services within the existing
consensus mechanism and governance roles to limit the creation
of new entities dedicated to interoperability.

Federation for Interop does not describe a standard
for interoperability but rather implement an architecture of roles,
services and mechanisms that serves this purpose.
Rather than relying on strict protocols,
Federation for Interop specifies minimum requirements to ensure
the cross-distributed ledger data transfer where participants can define
rules and protocols on the data they are sharing on a case-to-case basis.

This document will provide a quick overview of:

- [Transfer validator role](#transfer-validator)
- [Export & Import mechanism](#export-import)
- [Simple asset transfer example](#simple-asset-transfer)
- [Blockchain plugins](#plugins)
- [Future work](#future-work)

If you prefer to get started right away: [simple asset transfer setup](../tutorials/simple-asset-transfer.md)

### Transfer validator

Federation for Interop introduces the ‘transfer validator’ role.
A transfer validator is a distributed ledger participant who may take
specific actions in the transfer mechanisms and provide certain services
to the other participants of the distributed ledger.
The identity of the transfer validators plays an important role in
the cohesion of the broader ecosystem -Multiple distributed ledgers
willing to interact with each other, since they represent
their local distributed ledger from an external point of view.

#### Who should be a validator?

Validators are participants chosen by
the local distributed ledger governance system,
their number will vary from one distributed ledger to the other based on needs.
Potential transfer validators are easy to
identify in private and/or permissioned ledgers:
they will match existing identifiable participants in the distributed network
such as participants taking part in the consensus mechanism or in the governance.
Any well-known participant, within and outside the local distributed ledger,
is a good potential candidate.

#### How many validators should be deployed?

Typically, there is a substantial number of
transfer validators within each distributed ledger.
The ideal setup is to have enough transfer validators to avoid intentional,
arbitrary or induced denial of service. Depending on the ecosystem,
this number may vary from a few nodes to the entire network.

#### Role & Services

Each transfer validator exposes one or multiple public keys that
are attached to its identity in the distributed ledger,
as well as a service of certification. Any participant of the network,
validators included can ask a validator to certify a
piece of information coming from the local distributed ledger
according to specific known lower-level protocol. On a case-to-case basis,
validator will ever grant the certification in
the form of digital signature or reject the request.
The reason for rejection from a validator can be
multiple and internal to this validator alone
(e.g. a specific piece of information should not be disclosed
outside of the distributed ledger for confidentiality reasons).

#### Motivations

The transfer validators are, so to speak, the representatives of
the distributed ledger in the broader ecosystem and should make sure that
only proper information is certified to be exported
to foreign entities or distributed ledgers. While adding a new role and services
to the existing distributed ledger network, the idea is
to stay as close as possible to the existing trust model
of each distributed ledger ecosystem. Each of the components of
the transfer validator is plugeable to already running networks
and should not disrupt the inner working of distributed ledgers.

### Export & Import

#### Export

Each transfer validator exposes one or more public key to be identifiable
in its local network and beyond. The core functionality of
the transfer validators is to provide a certification service
to all other participants of the local network.
The transfer validator may certify that a piece of information exists
in the local distributed ledger at a certain point in time.
The certificate consists, at minima, of the piece of information
to certify as stored in the distributed ledger as well as
a digital signature of this piece of information matching one of
the transfer validator’s public keys. A participant may collect
as many certifications as needed for a specific piece of information.
A minimal quorum of certifications is typically defined by the local ledger to
distinguish valid proofs from invalid one. The number of certification needed
for a certain proof can differ depending on the proof type.

The export mechanism relies mainly on
the ability of the validator to certify information.
The data structure and protocol used to verify the state of the local ledger
can be implemented based on the local rules of the ledger.
For example, proving that a certain asset is 'owned' by a specific
Blockchain participant may be implemented differently
depending on the technology and existing custom logic on the ledger.
See [how to extend the verification logic](../tutorials/data-check.md) for more information.

We plan to implement high-level data protocol to cover the main interoperability
use cases (proof of ownership, asset transfer...).
See [the future work section](#future-work) for more information.

#### Import

Messages certified by a distributed ledger’s transfer validators can be
delivered to one or multiple recipients by any secure off-chain communication system.
For instance, a certified message could be sent by email
to a foreign distributed ledger’s participant.

Entities receiving messages coming from a foreign distributed ledger of
the broader ecosystem can gather and record the transfer validator’s public key
of the emitting distributed ledger. The identity management problem is not
yet covered by the solution, see [the future work section](#future-work) for more information.
At this point, we assume that transfer validator’s public keys are
known and accessible in the broader ecosystem.

A proof coming from a foreign distributed ledger can be verified against
the public keys the transfer validators of that foreign distributed ledger.
The number of certification needed to consider the proof as valid
within the local ledger can be defined locally or more broadly
and can depend on the type of proof, the provenance of the proof or the requestor.
Typically these elements will be decided by the governance system of the receiving ledger.

The verification can be made by any entity that knows
the identities of the certificating validators.
If the receiving entity is a distributed ledger, the requestor may want to
trigger action on the ledger based on the verification of a valid foreign proof.
To impact the state of the local ledger and verify the proof
in a distributed manner, a separate on-chain logic on the receiving
distributed ledger can enable the sharing and distributed verifications
of any certified messages coming from registered foreign distributed ledgers.
See [the JPM Quorum plugin](#quorum-plugin) and
[Hyperledger Fabric plugin](#fabric-plugin) for more information.

### Simple Asset Transfer

See [simple asset transfer setup](../tutorials/simple-asset-transfer.md) for more information.

### Plugins

The Fabric plugin is two-fold and includes both logic to connect
to the Blockchain and smart contract extensions.

#### On-chain Logic

Plugin contains two on-chain logic pieces to enable imports in distributed ledgers:

- Foreign Validator identity and public key management
- Foreign proof verification against stored identities

See [Fabric on-chain documentation](../../examples/simple-asset-transfer/fabric/contracts/README.md)
and [Quorum on-chain documentation](../../examples/simple-asset-transfer/quorum/contracts/README.md)
for more information. Note: contracts are located under the example folder for now.

#### Connector

The connector class is an helper component defining how to communicate with the local Blockchain.
The connectors point to two different part of the on-chain logic:

- Import logic: foreign validator identity and proof verification (see above)
- Base logic: custom logic of the local ledger (see [the example](../tutorials/simple-asset-transfer.md)).
    Plugin connectors are using the provided Fabric SDK and a custom Quorum API,
    they can be modified and extended to perfectly fit the use case
    and integration layers of the local ledger,
    see [how to extend connectors](../tutorials/connector.md) for more information.

### Future Work

#### Interoperability Use Cases

As it stands we  can prove that something happened on a foreign distributed ledger.
For more complex interoperability use cases (e.g. asset transfer, atomic swap, asset synchronization, …),
we want data protocols defining the steps and verifications needed from the validators.

#### Identity System

Validator identity verification is at the backbone of the solution.
We want ecosystems to be able to discover foreign validators and
store their identity in a reliable way.
Potential lead: Distributed ledger for identity (Indy, Sovrin, …)

#### Confidential Federation

Communication between validators is based on broadcasting.
We want the validator network to understand and
match the confidentiality setup of the local ledger.

#### More plugins

We want to implement plugins and on-chain logic for more platforms (e.g. Digital Asset, Corda …).

### Contributors (unsigned commits could not be included in the lab repo)

    89 hugo borne-pons
    25 denis glotov
    38 mykhailo lonin
    15 vladimir agekin
    12 naima hamouma
    5 valerijs kurme
    3 mihails gulajevs
    2 dimitrijs rulovs
    2 unknown
    1 peter somogyvari
