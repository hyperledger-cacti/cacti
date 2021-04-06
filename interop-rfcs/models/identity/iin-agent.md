<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# IIN Agents in a DLT Network

* Authors: Venkatraman Ramakrishna
* Status: Draft
* Since: 15-Oct-2020


# Summary

This document specifies the structure of a DLT network that seeks to interoperate with another using our specified protocols in the data and identity planes. In particular, it describes the components and artifacts that are necessary for the identity plane protocols that establish trust anchors for data plane protocols.


# Network Architecture with IIN Agents

In our view, a DLT network seeking to interoperate with another using any of our protocols is composed of units that are consituent members of that network and are assumed to have identities independent of the network. Representing each unit in an IIN is an IIN Agent. We also assume that each nework unit is a root identity provider within its network. In Fabric: an MSP root CA server (typically, but not mandatorially, having a 1-1 relationship with an organization). In Corda: network root CA.

This view is illustrated in the figure below, which maps quite naturally to Fabric networks where each organization is a unit, but is general enough to encompass other permissioned DLTs like Corda and Besu too.

<img src="../../resources/images/iin-augmented-network.jpg" width=60%>


# Ledger Artifacts

The following artifacts are relevant to identity plane protocols:
* _Identity trust store_: this is a set of mappings `<IIN>,<Steward-ID> --> [<<Network-ID>,DID>>,<<Network-ID><DID>>,....]|<Pattern>`. It implies that the network trusts a given steward in a given IIN to certify a set of network units. Each network unit can be described directly by the network ID and a DID or the set can be described using a pattern (like a regular expression; e.g., Kleene closure `*`). The IIN definition can additionally contain peer connectivity information (to access the IIN ledger) and the Steward definition can contain its agent's service endpoint. This data will be looked up in the identity sharing protocol, while fetching membership information for a foreign network. It can also be used in proof verification (or view validation) in data plane protocols.
* _Foreign network identities and configurations_: these are [security groups](../security.md), containing identities and certificates corresponding to a foreign network's units. (_Each security group is augmented with a DID attribute denoting the identity owned by the IIN Agent associated with this network unit/security group_)


# IIN Agent Definition and Bootstrap

An IIN Agent represents a network unit that is also a self-certified identity provider for some subset of the network, as stated earlier in the summary. It is simultaneously an IIN (Indy) client and a network (Fabric, Corda, etc.) client. Therefore, there are different ways in which it can be implemented, but its core feature is that it lies within the trust boundary of a root identity provider of a network.

Being an IIN client, the IIN Agent, like an [IIN Steward Agent](../iin-steward-agent.md), or some portion of it, must be built according to the canonical specification of an Indy Agent with the capability to create a wallet, interact with other agents (including stewards), and access an Indy ledger. Another portion of the IIN Agent must be built as a regular network client with the ability to exercise smart contracts for looking up and recording ledger data.

The IIN Agent can be built and deployed in the following configurations:
* As an augmentation of a network root identity provider or CA: in Fabric, this would mean augmenting the Fabric CA Server to perform the functions of an IIN Agent
* As a separate service with a trusted communication channel (e.g., using gRPC) to a network root identity provider or CA
* As two separate services, one resembling an IIN Steward Agent and another a network client (e.g., a Fabric Client SDK-based application). These two services will communicate with each other and with the network root identity provider or CA using a trusted communication channel
(As you can see in the above diagram, there must be exactly one IIN Agent service, however configured, for every network unit)

## Bootstrap/Initialize an IIN Agent
* Start a [Hyperleder Aries](https://www.hyperledger.org/use/aries) service, which consists of a <_controller_, _agent_> pair, with the agent built using [Aries Cloud Agent - Python](https://github.com/hyperledger/aries-cloudagent-python) as it supports persistent storage. This service has the capability to communicate with other agents using the peer-to-peer Aries protocol. It is recommended that this service be launched in a Docker container. Post-launch, the following actions must be carried out:
  1. Initialize a wallet to store DIDs, keys, and any other crypto material
  2. Obtain and load the service endpoints for an IIN and a Steward this network unit is associated with
  3. Register a verinym (DID record) through the standard Indy protocol (described [here](../../protocols/id-config-sharing-protocol/README.md))
  4. Obtain and load the local network's ID
  5. Fetch membership list and endpoint info for other units of the local network from the steward (_Consider: this can be done without IIN involvement too_)
  At this point, the IIN Agent has ownership of its DID that is recorded on its IIN's ledger. Its IIN Steward Agent now recognizes it as a member of its network and is ready to make a presentation of the member list of the network to any requestor.
* Start a network client service (if this is to be a standalone service) or initialize one according to the network's native procedure. Example: in Fabric, do the following:
  1. Initialize a Fabric wallet to store keys, certificates, and MSP configurations
  2. Initialize configuration information with the network's interoperation contract deployment ID: this is needed to record security group info on the ledger
  3. Import a connection profile and connect to a network gateway

## Interact with Network Units' IIN Agents
The IIN Agent interacts with other IIN Agents in the following ways:
* With local network agents: to launch or participate in a flow that collects a multi-signature over a foreign network's unit's security group
* With foreign network agents: to request/offer membership and security group presentations, prove membership within its network, and prove ownership of a security group

Details of these protocols can be found [here](../../protocols/id-config-sharing-protocol/README.md).
