<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Asset Transfer Protocol

- RFC: 02-008
- Authors: Venkatraman Ramakrishna, Krishnasuri Narayanam, Sandeep Nishad, Dhinakaran Vinayagamurthy
- Status: Proposed
- Since: 21-Oct-2022

## Summary

Asset transfer protocol in Weaver allows transferring an asset from one shared ledger to another by burning it in the source ledger and creating it in the destination ledger in an atomic manner.
- Creating of the asset in the destination ledger should happen within an agreed-upon period. Otherwise, the asset is created in the source ledger after the time period elapses.

## Protocol Overview

The asset transfer protocol specified in this document realizes the model described in the [atomic cross-ledger transactions spec](../../models/ledger/atomic-cross-ledger-transactions.md).

This protocol uses as its building blocks:
- Smart contracts (for network-local operations)
- Cross-network [data sharing protocol](../data-sharing/generic.md)

The ledgers, participants, and sequence of states they go through to either effect an asset transfer or revert to the original state (upon failure of any kind) are illustrated in the figure below. (_Note_: Alice and Bob may represent the same real-world entity. Asset _M_ in both ledgers are assumed to be equivalent in a global sense, though their internal representations may vary from ledger _A_ to Ledger _B_, especially if the two ledgers are built on different DLT platforms.

<img src="../../resources/images/asset-transfer-states.png" width=80%>

1. Alice creates an agreement on ledger *A*, that she burns her asset *M* in ledger *A* for Bob to mint the same asset in ledger *B* within period *t*.
2. Bob fetches the agreement status in ledger *A* using a cross-ledger interop-query, before period *T*.
    - If ledger *A* reports the existence of no such agreement by Alice on asset *M*, the protocol terminates.
3. Bob mints asset *M* in ledger *B* by providing the fetched agreement details from ledger *A*.
    - If the current time exceeds *T*, minting of asset *M* fails.
    - Upon successful minting of asset *M*, Bob becomes its owner.
4. Alice fetches the mint status of asset *M* in ledger *B* using a cross-ledger interop-query.
    - If ledger *B* reports a successful mint of asset *M* by Bob then the protocol terminates.
    - If ledger *B* doesn’t report a successful mint of asset *M* by Bob but the current time has not exceeded *T*, then Alice retries this step after some time.
    - If ledger *B* doesn’t report a successful mint of asset *M* by Bob and the current time has exceeded *T*, then Alice proceeds to the next step.
5. Alice mints asset *M* in ledger *A* by providing the last queried mint status from ledger *B* as the proof.
    - If the asset was already claimed in ledger _B_ then minting again the same asset in ledger _A_ is not carried out.

## Generic Asset Transfer Flow

The following figure describes the asset transfer flow between two parties on two different ledgers.

<img src="../../resources/images/asset-transfer-flow.png" width=80%>

Note that Alice could fetch the claim status of asset *M* in ledger *B* once after time period *T* elapses, and proceed with claim in ledger *A* by minting asset *M* if it's not already claimed in ledger *B*. Alternatively, Alice could fetch the claim status of asset *M* in ledger B multiple times before time period T elapses until either the asset is claimed in ledger *B* or the time period elapses.

## Prerequisites

_TBD: list and discuss the API functions to be implemented in the asset management contract for it to be transfer-ready_

## Interoperation Module Support

_TBD: list and discuss the library functions that support transfers, excluding structure formats (which will be specified in the formats folder)_

## Safety and Liveness

At no point in time is asset *M* available in both the ledgers *A* and *B*. This is ensured by allowing minting of asset by Alice in ledger *A* only if the asset was not already minted by Bob in ledger *B*. Also note that Alice could mint the asset *M* in ledger *A* anytime after the period *t*.
