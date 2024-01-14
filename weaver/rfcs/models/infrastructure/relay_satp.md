<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Relay Messages

- RFC: 
- Authors: Zakwan Jaroucheh, Venkatraman Ramakrishna, Sandeep Nishad, Rafael Belchior
- Status: Proposed
- Since: 04-Sep-2023

## Summary

This document specifies the GRPC services whenever the gateway is involved.

## SATP Service

```protobuf
service SATP {
  // Stage 1 endpoints

  // The sender gateway sends a TransferProposalClaims request to initiate an asset transfer. 
  // Depending on the proposal, multiple rounds of communication between the two gateways may happen.
  rpc TransferProposalClaims(TransferProposalClaimsRequest) returns (common.ack.Ack) {};
  
  // The sender gateway sends a TransferProposalClaims request to signal to the receiver gateway 
  // that the it is ready to start the transfer of the digital asset
  rpc TransferProposalReceipt(TransferProposalReceiptRequest) returns (common.ack.Ack) {};

  // The sender gateway sends a TransferCommence request to signal to the receiver gateway 
  // that the it is ready to start the transfer of the digital asset
  rpc TransferCommence(TransferCommenceRequest) returns (common.ack.Ack) {};

  // The receiver gateway sends a AckCommence request to the sender gateway to indicate agreement
  // to proceed with the asset transfer
  rpc AckCommence(AckCommenceRequest) returns (common.ack.Ack) {};

  // Stage 2 endpoints

  rpc SendAssetStatus(SendAssetStatusRequest) returns (common.ack.Ack) {};

  // The sender gateway sends a LockAssertion request to convey a signed claim to the receiver gateway 
  // declaring that the asset in question has been locked or escrowed by the sender gateway in
  // the origin network (e.g. to prevent double spending)
  rpc LockAssertion(LockAssertionRequest) returns (common.ack.Ack) {};

  // The receiver gateway sends a LockAssertionReceipt request to the sender gateway to indicate acceptance
  // of the claim(s) delivered by the sender gateway in the previous message
  rpc LockAssertionReceipt(LockAssertionReceiptRequest) returns (common.ack.Ack) {};

  rpc CommitPrepare(CommitPrepareRequest) returns (common.ack.Ack) {};

  rpc CommitReady(CommitReadyRequest) returns (common.ack.Ack) {};

  rpc CommitFinalAssertion(CommitFinalAssertionRequest) returns (common.ack.Ack) {};

  rpc AckFinalReceipt(AckFinalReceiptRequest) returns (common.ack.Ack) {};

  rpc TransferCompleted(TransferCompletedRequest) returns (common.ack.Ack) {};
}

```

## Driver Service

```protobuf
service DriverCommunication {
  // As part of SATP, the source reply (sender gateway) sends a PerformLock request to its driver
  // to lock a specific asset
  rpc PerformLock(PerformLockRequest) returns (common.ack.Ack) {}

  // As part of SATP, the destination reply (receiver gateway) sends a CreateAsset request to its driver
  // to create a specific asset
  rpc CreateAsset(CreateAssetRequest) returns (common.ack.Ack) {}

  // As part of SATP, the source reply (sender gateway) sends a Extinguish request to its driver
  // to extinguish a specific asset
  rpc Extinguish(ExtinguishRequest) returns (common.ack.Ack) {}

  // As part of SATP, the destination reply (receiver gateway) sends a AssignAsset request to its driver
  // to assign a specific asset
  rpc AssignAsset(AssignAssetRequest) returns (common.ack.Ack) {}
}
```

## Database

A gateway should maintain a database to store remote queries and state of the local queries at different stages of the [asset transfer](../../protocols/satp/asset-transfer/generic.md) protocol. Before running the gateway, you need to ensure SQLite (the default database for logs) is installed by following the [database initiaization documentation](../../../../../weaver/core/relay/docs/README.md).


