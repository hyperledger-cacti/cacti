<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Asset Transfer Protocol

- RFC: 02-008
- Authors: Venkatraman Ramakrishna, Sandeep Nishad, Krishnasuri Narayanam, Dhinakaran Vinayagamurthy
- Status: Proposed
- Since: 01-Jun-2021

## Summary

A protocol to transfer an asset from one shared ledger to another by atomically burning it in the source ledger and recreating it in the destination ledger.

## Protocol Overview

The asset transfer protocol specified in this document realizes the model described in the [atomic cross-ledger transactions spec](../../models/ledger/atomic-cross-ledger-transactions.md).

This protocol uses as its building blocks:
- Smart contracts (for network-local operations)
- Cross-network [data sharing protocol](../data-sharing/generic.md)

The ledgers, participants, and sequence of states they go through to either effect an asset transfer or revert to the original state (upon failure of any kind) are illustrated in the figure below. (_Note_: Alice and Bob may represent the same real-world entity. Asset _S_ in both ledgers are assumed to be equivalent in a global sense, though their internal representations may vary from Ledger A to Ledger B, especially if the two ledgers are built on different DLT platforms.

<img src="../../resources/images/asset-transfer-states.png" width=80%>

## Generic Asset Transfer Flow

_TBD: add the stick diagram with the steps in chronological order, and walk through the design rationale and trust/fault tolerance properties fulfilled_ 

## Prerequisites

_TBD: list and discuss the API functions to be implemented in the asset management contract for it to be transfer-ready_

## Interoperation Module Support

_TBD: list and discuss the library functions that support transfers, excluding structure formats (which will be specified in the formats folder)_

## Safety and Liveness

_TBD_
