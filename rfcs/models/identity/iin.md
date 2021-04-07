<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Interoperation Identity Network

* Authors: Venkatraman Ramakrishna
* Status: Draft
* Since: 15-Oct-2020


# Summary

In abstract terms, an Interoperation Identity Network (henceforth IIN) is a system build on a distributed shared ledger with well-known and trusted authorities embedded as stewards, providing DIDs to networks and their units and certifying (or validating) the owners of those DIDs as members of their respective networks, in effect creating roots of trust for cross-network interoperations. An IIN further maintains credential schemas and verification keys that enables a DID owner to prove its identity and a recipient to validate that identity.

An IIN for our family of interoperability protocols is built on [Hyperledger Indy](https://hyperledger-indy.readthedocs.io/projects/sdk/en/latest/docs/getting-started/indy-walkthrough.html), contains stewards that either represent a permissioned network's consortium figurehead or a reputed authority (typically, a conglomerate, an industrial body, or a governmental agency) trusted by members of the network's consortium. It maintains schemas and verification credentials for both the list of members in a permissioned network and the membership attributes of each network unit (Fabric organizations, Corda doormen or nodes, etc.)

An IIN and one or more of its stewards serves as a trust anchor for one permissioned network to determine the current membership list of another permissioned network (i.e., list of independent network units that serve as identity providers within that network) and to validate the membership credential of each network unit that has been issues a DID by one of the IIN's stewards.


# IIN Architecture

The figure below illustrates the architecture of an IIN.

<img src="../../resources/images/iin.jpg" width=60%>

At the bottom layer lies a shared ledger that is maintained collectively through consensus by a pool of Hyperledger Indy nodes that lies in the layer above.

Above the node pool lie agents acting on behalf of _IIN stewards_. An steward is a core member of an IIN, and is a reputable entity trusted to vouch for DLT network consortiums and their individual units. (By default, a sample Indy network is configured with global Sovrin stewards, but we can use entities like IBM or Maersk or Walmart for this purpose.)

A steward is automatically a _trust anchor_ of an IIN, with privileges to issue DIDs and credentials to other users. Additionally, it has privileges to create more trust anchors. (This is an option that can be exercised for extensibility, when networks wit new governing consortiums are added to the ecosystem. Note that if a new trust anchor is created, it will add another level of indirection between an IIN and a participatinc network.) In the Indy framework, identities creation for trust anchors and other users is initiated through an "invitation" protocol (by a steward and a trust anchor respectively). A trust anchor can also issue verifiable credentials (VCs) to other users (downstream nodes in the hierarchy).

Decentralized identities issued can be _verinyms_ or _pseudonyms_. In the current spec, we will only utilize verinyms, which do not protect the privacy of the identity owner.


# IIN Structure and Bootstrap

This is a Hyperledger Indy network that is collectively managed by a set of _stewards_. For an IIN to facilitate bilateral interoperation between networks N1 and N2, the following constraint must hold: _for every unit in N1 and N2, there exists at least one steward that is trusted, directly or transitively, by that network unit_.

In the limiting, or trivial, case, an IIN can contain just one steward that is trusted by every unit in N1 and N2. For the purpose of our protocol, such a network would be functionally indistinguishable from, though less trustworthy than, a truly distributed IIN that contains multiple stewards representing trusted authorities that have agreed to join that IIN and are bound by a shared ledger.

_Proposal for initial implementation_: Build an IIN that contains four Indy nodes (as per the reference Indy implementation) and two stewards. This implementation will be non-trivial and will have one steward corresponding to each interoperating network (i.e., consortium) in at least some demo scenarios. _Example_: for interoperation between TradeLens and We.Trade, we build an IIN containing two stewards by default: one representing Maersk (to certify TradeLens units) and another representing IBM (to certify We.Trade units).

## Bootstrap procedure:
1. Create network artifacts:
   * Configuration file with network name (`NETWORK_NAME`) set to `IIN`(or something unique, if there is more than one IIN)
   * Keys for each Indy node: ed25519 transport/communication keys, BLS keys for multisig and state proofs
   * Genesis transactions: pool transactions genesis file, domain transactions genesis file with specification for stewards (each with a unique name assigned a priori) 
2. Launch the 4-node Indy pool network by starting each node in a separate Docker container.
3. Start an IIN steward agent for each steward in a separate Docker container. A steward agent is built on a Hyperledger Aries instance.

## Reference:
* Hyperledger Indy Node: Create a Network and Start a 4-Node Indy Pool [link](https://hyperledger-indy.readthedocs.io/projects/node/en/latest/start-nodes.html)
* Implementation of single-node/single-steward Indy pool in Docker containers [link](https://github.com/identity-interop/iin_deployment)


# IIN Ledger Artifacts
A Hyperledger Indy ledger consists of the following records:
* _Identity Records_ that describe _Ledger Entities_: each record is associated with a single unique DID and optionally other info describing the identity owner, such as a _Service Endpoint_.
* _Credential Schemas_: data structure describing a credential
* _Credential Definition_: verification key and associated metadata to authenticate a credential

An IIN contains the following:
* Identity record: `<DID>,<Service-Endpoint>` for each of the following:
  * Every steward
  * (If applicable) every trust anchor created by a steward of this IIN
  * Every network unit certified by a steward or a trust anchor of this IIN
* Credential schemas corresponding to the following:
  * Membership list for a network, with the following attributes: `<Network-ID>`, `[<DID1>,<DID2>,......]`
  * Membership info for a network unit, with the following attributes: `<Network-ID>` (_Currently, this is the only attribute relevant for identify information sharing, but we can add more for other kinds of information sharing_)
* Credential definitions corresponding to the following:
  * Membership list for a network: signing (issuing) key owned by a steward or trust anchor of this IIN
  * Membership information for a network unit: signing (issuing) key owned by a steward or trust anchor of this IIN


# Interfaces
Standard Indy SDK API will be used for communication between identity owners' agents and between agents and Indy pool nodes.
Standard Indy SDK API will be used for creating and maintaining wallets (for DIDs, keys, secrets, and credentials) at the agents.
