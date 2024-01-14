<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Asset Transfer Protocol Units in Fabric Networks

- RFC: 
- Authors: Zakwan Jaroucheh, Venkatraman Ramakrishna, Sandeep Nishad, Rafael Belchior
- Status: Proposed
- Since: 04-Sep-2023

## Summary

- This document specifies the Hyperledger Fabric implementation of modules, and application adaptation guidelines, for the secure asset transfer protocol.
- Within Weaver, the protocol units to operate on the asset being transferred will be implemented in the Fabric Asset Transfer Chaincode for a Fabric-based network.
- The protocol unit functions are implemented in a library package that can be imported in any chaincode. 
- Within Weaver, the SDK will provide user agents (clients) the capability to trigger transfer operations on particular chaincodes maintaining particular digital assets.

## Fabric Asset Transfer Chaincode

The following functions should be implemented in a separate package within the Fabric Asset Transfer Chaincode (*Note*: we use Golang syntax here because this chaincode is implemented within Weaver in Golang):

- `func (s *SmartContract) LockAsset(ctx contractapi.TransactionContextInterface, assetExchangeAgreementSerializedProto64 string, lockInfoSerializedProto64 string) (string, error)`: locks an asset
- `func (s *SmartContract) AssignAsset(ctx contractapi.TransactionContextInterface, assetAgreementSerializedProto64 string, claimInfoSerializedProto64 string) (bool, error)`: changes the ownser of an asset
- `func (s *SmartContract) DeleteAsset(ctx contractapi.TransactionContextInterface, assetType, id string) error` deletes an asset

