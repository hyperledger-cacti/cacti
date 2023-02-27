---
id: weaver-dapps
title: Weaver Dapps
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

As mentioned in the [overview](./overview.md), DLTs that integrate with Weaver must contain an interop (IOP) module to facilitate interoperation between ledgers. The interop module contains all the logic responsible for membership, verification policies and access control policies (refer to the RFCs for more information on these). Below shows the architecture of how these interop modules work with the two currently supported DLTs, Fabric and Corda.

## Fabric

When Fabric is the requesting network, the IOP module is used to verify the proof and then forward the state onto the application chaincode.

![](/architecture-assets/fabric_dapp_flow1.png)

When Fabric is the responding network, the IOP module is in charge of verifying the identity of the requester, making sure the requester has access to the state they are requesting, and then finally retrieving the state from the application chaincode to send back to the requesting network.

![](/architecture-assets/fabric_dapp_flow2.png)

Verification Policy, Access Control and Membership are modular components within the interop chaincode for seperation of concerns of the code.

## Corda

As can be seen from the diagrams below, the architecture for Corda is very similar to that of Fabric. The main difference is that the interop module and the application specific flows are in seperate CorDapps, instead of seperate chaincodes like in Fabric.

![](/architecture-assets/corda_dapp_flow1.png)

![](/architecture-assets/corda_dapp_flow2.png)
