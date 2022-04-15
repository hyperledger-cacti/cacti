<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# IIN Steward Agent in an Interoperation Identity Network

- RFC: 01-014
- Authors: Venkatraman Ramakrishna
- Status: Retired
- Since: 20-Oct-2020


# Summary

This document specifies the functions performed and data managed by an IIN Steward Agent.


# Functions Performed by an IIN Steward Agent

An IIN Steward Agent acts on behalf of an IIN Steward, and is built according to the canonical specification of an Indy Steward. The registration of the steward's verinym (DID) along with key-generation seed values (generated using a random number generator) in the Indy ledger occurs at genesis (or bootstrap) time.

## Bootstrap/Initialize an IIN Steward Agent
This is built as a [Hyperleder Aries](https://www.hyperledger.org/use/aries) service, which consists of a <_controller_, _agent_> pair, with the agent built using [Aries Cloud Agent - Python](https://github.com/hyperledger/aries-cloudagent-python) as it supports persistent storage. This service has the capability to communicate with other agents using the peer-to-peer Aries protocol. It is recommended that this service be launched in a Docker container. Post-launch, the following actions must be carried out:
1. Initialize a wallet to store DIDs, keys, and any other crypto material
2. Create a DID record in the wallet and recreate the signing key using the seed value (which it must have obtained a priori using an out-of-band mechanism)
3. Initialize local persistent storage or database for configuration files and runtime data
4. Register credential schema and definition for `memberlist` on the IIN ledger
5. Register credential schema and definition for `membership` on the IIN ledger
6. Initialize an empty data structure in persistent storage to store member lists for networks. This is meant to be a key-value map, the key being a network ID, and the value being an array of network units' DIDs.
7. Initialize an empty data structure in persistent storage to store network units' membership properties (currently only the network ID, as stated in the [IIN spec](./iin.md)). This is meant to be a key-value map, the key being the network unit's DID and the value being an instance of the `membership` schema.
At this point, the IIN Steward Agent has ownership of the DID that was bootstrapped into the IIN ledger. By virtue of possessing the signing key, it is now ready to create new trust anchors if necessary, and issue verinyms and credentials to network units within participating networks.

## Interact with Network Units' IIN Agents
The IIN Steward Agent can perform the following functions for an IIN Agent:
* Register a verinym (DID) on the IIN ledger for an IIN Agent as a unit of a given network, identified by a network ID. (_This occurs through a multi-step protocol initiated by the IIN Steward, ending with a DID record for an IIN Agent stored in the IIN ledger, and a corresponding signing key stored in the IIN Agent's personal wallet_)
* Supply the list of member DIDs of a network (identified by a network ID) upon request: this is a verifiable presentation
* Supply a membership credential (with membership properties) upon request: issued as a verifiable credential, which can be presented by the IIN Agent to other IIN Agents
