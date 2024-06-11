<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Secure Asset Transfer Protocol

- RFC: 
- Authors: Zakwan Jaroucheh, Venkatraman Ramakrishna, Sandeep Nishad, Rafael Belchior
- Status: Proposed
- Since: 04-Sep-2023

## Summary

Secure asset transfer protocol in Weaver allows transferring an asset from one network to another. It is implemented by the gateways in the respective
networks. The two gateways implement the protocol in a direct interaction (unmediated). A successful transfer results in the asset being extinguished
(burned) or marked on the origin network, and for the asset to be regenerated (minted) at the destination network.


## Protocol Overview

The secure asset transfer protocol provides a coordination between the two gateways through the various message flows in the protocol that is communicated over a secure channel. The protocol implements a commitment mechanism between the two gateways to ensure that the relevant properties atomicity, consistency, isolation, and durability are achieved in the transfer.

The mechanism to extinguish (burn) or regenerate (mint) an asset from/into a network by its gateway is dependent on the specific network and is outside the scope of the current architecture.

In a nutshell, the protocol can be described intuitively as follows:
- **Stage 0**: The two applications utilized by the originator and beneficiary is assumed to interact as part of the asset transfer. In this stage,
the applications App1 and App2 may establish some shared transfer context information (e.g. Context-ID) at the application level that will be made available to their respective gateways G1 and G2. 
- **Stage 1**: In this stage gateways G1 and G2 must exchange information (claims) regarding the asset to be transferred, the identity information of the
Originator and Beneficiary and other information regarding relevant actors (e.g. gateway owner/operator).
- **Stage 2**: Gateway G1 must provide gateway G2 with a signed assertion that the asset in NW1 has been immobilized and under the control on G1. 
- **Stage 3**: Gateways G1 and G2 commit to the unidirectional asset transfer using a 3PC (3-phase commit) subprotocol.

## Generic Asset Transfer Flow

The asset transfer flow is illustrated in more detail in the following figure, and in the description further below. It shows the protocol followed by Alice and Bob, using transaction within the ledgers and cross-network data sharing queries across the ledgers:

<img src="[../../resources/images/asset-transfer-states.png](https://github.com/CxSci/IETF-SATP/blob/main/Figures/gateway-message-flow-asset-transfer-v19PNG.png)" width=80%>

## Prerequisites: Smart Contract Developer Responsibilities

The triggers for each step in the SATP flow must come from the distributed applications pledging and acquiring the asset in question. Because the transfer involves ledger updates, the smart contract portion of the application (e.g., chaincode in Hyperledger Fabric, CorDapp contract in Corda) that processes ledger data through consensus must implement and expose (through its transaction API) several functions. See the [Fabric](./fabric.md) and [Corda](./corda.md) specifications for detailed guidelines when developing applications on those platforms. (*Note*: the function names specified in these pages are suggestive; the developer may pick any suitable names.)

The application smart contract or distributed application offering these functions must already have mechanisms to:
- Uniquely identify assets and fetch their specifications
- Unambiguously identify the owner(s) of an asset
- Perform lock (or freeze) an asset; i.e., prevent any operations (state or ownership changes) on an asset 
- Determine whether an asset is currently in the locked state
- Create an asset and specify the network as the owner
- Assign an asset to an owner by transferring the ownership of the asset from the network to the new owner
- Extinguish an asset by deleting it from the corresponding network
  
How the smart contract implements these functions is beyond the purview of Weaver. 

## DLT-Specific Designs

Implementation of the protocol is DLT-specific. See the following for details on currently supported DLTs:
- [Hyperledger Fabric](./fabric.md)
- [R3 Corda](./corda.md)
