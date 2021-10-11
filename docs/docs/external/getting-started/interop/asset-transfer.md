---
id: asset-transfer
title: Asset Transfer
---

<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->

This document lists sample ways in which you can exercise the asset-transfer interoperation protocol on the test network [launched earlier](../test-network/overview).

Once the networks, relays, and drivers have been launched, and the ledgers bootstrapped, you can trigger the following interoperation flows corresponding to distinct asset-sharing combinations _other combinations of DLTs will be supported soon_):
1. **Fabric with Fabric**: One Fabric network transfers either a bond or some tokens owned by Alice to Bob in the other network

Assuming that the `simpleassettransfer` chaincode has been deployed in both networks, run the following steps after navigating to the `samples/fabric/fabric-cli` folder in your clone of the Weaver repository (the Go CLI doesn't support this interoperability mode at present):
