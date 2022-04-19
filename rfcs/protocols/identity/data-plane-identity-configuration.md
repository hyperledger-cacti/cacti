<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Data Plane Identity Configuration

- RFC: 02-012-appendix-b
- Authors: Venkatraman Ramakrishna, Krishnasuri Narayanam, Bishakh Chandra Ghosh, Ermyas Abebe
- Status: Proposed
- Since: 24-Sep-2021

## Overview

For interoperation in the data plane, the identities in terms of data plane certificates/credentials of the foreign network units have to be configured. Along with that, the relay endopint information has to be configured.

The Network DID of a foreign network contains `relayEndpoints` and `DataplaneCredentials` verification method which are used to configure the realys and the data plane certidicates required for interoperation respectively.

## Protocol

Considering two networks `NETWORK 1` and `NETWORK 2`, we specify a protocol where the IIN Agent of a participant unit, say `Org2` in `NETWORK 1`  is configuring the identity and relay for `NETWORK 2`.

* IIN Agent of a network unit that intends to update the foreign network identity information in the data plane initiates a flow to collect signatures over the identity (Security Domain info) of the network units of `NETWORK 2`. These are obtained from `relayEndpoints` and `DataplaneCredentials` verification method of the Network DID, after the Network DID is validated (see [protocol](./network-identity-validation.md)).
* IIN Agent of a network unit starts a flow to collect signatures over the identity (Security Domain info) and relay endpoint of `NETWORK 2`.

The steps of this application level flow for updating data plane identity information are as follows:
1. `IIN Agent Org2` constructs a _signature collection procedure_ request message consisting of the following: `{<Network-ID>, [<Network-Relay-Endpoint>],[<Network-Unit-DID> -> <Network-Unit-Security-Domain>]},<Signature>` (here, `<Signature>` is generated over the preceding structure.
2. `IIN Agent Org2` triggers a _signature collection procedure_ by sending the request to every other IIN Agent in `NETWORK 1`. For example, on if `Org1` is another unit of `NETWORK 1`, it is sent to `IIN Agent Org1`. The requestees return signatures over the structure generated above to `IIN Agent Org2`.
  * This can be orchestrated completely by the triggering agent, which sends requests and receives responses from every other IIN Agent.
  * Alternatively, this could be a flow, where the trigger agent is simply the first node to generate a signature after which the request is handed off to another node. Eventually, when enough signatures are collected, a ledger update can be triggered (see Step 6 further below)
3. (_Optional_) Requestee's IIN Agent (`IIN Agent Org1`) confirms the presence and validity of the Network DID of `NETWORK 2` on the IIN ledger and fetches the network DID document. This replicates what `IIN Agent Org2` did in Network Identity Validation [protocol](./network-identity-validation.md). This step is optional since the identity validation might already be done by the requestee and hence the validation information might be cached and used for providing the attestation.
4. The requestee (`IIN Agent Org1`) validates the Security Domain info for `NETWORK 2` units, as well as the relay endpoints.
5. When the requester unit - `IIN Agent Org2` obtains signatures from all IIN Agents in `NETWORK 1`, it updates the Security Domain info on the network ledger by submitting a transaction to the Interoperation module (a chaincode in the Fabric implementation, a Cordapp in the Corda implementation). The transaction payload consists of: `{<Network-ID>, [<Network-Relay-Endpoint>],[<Network-Unit-DID> -> <Network-Unit-Security-Domain>]},[<Signature-Org1>,<Signature-Org2>]}`. The signatures are validated by multiple peers and committed to the ledger after passing through a consensus protocol.
