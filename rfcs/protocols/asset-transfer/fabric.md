<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Asset Transfer Protocol Units in Fabric Networks

- RFC: 02-009
- Authors: Venkatraman Ramakrishna, Sandeep Nishad, Krishnasuri Narayanam, Dhinakaran Vinayagamurthy
- Status: Proposed
- Since: 26-Dec-2021

## Summary

This document specifies the Hyperledger Fabric implementation of modules, and application adaptation guidelines, for the asset transfer protocol.
Within Weaver, the protocol units to operate on the asset being transferred will be implemented in the Fabric Interoperation Chaincode, which is the [interoperation module](../../models/infrastructure/interoperation-modules.md) for a Fabric-based network.
- The functions are implemented in a library package that can be imported in any chaincode. The Fabric Interoperation Chaincode will import them by default.
Any application chaincode that is either pledging/burning or claiming/minting an asset at either end of the protocol will import this library too and incorporate suitable function calls in its adapted workflow.
Within Weaver, the SDK will provide user agents (clients) the capability to trigger transfer operations on particular chaincodes maintaining particular digital assets.

## Fabric Interoperation Chaincode

The following functions should be implemented in a separate package within the Fabric Interoperation Chaincode according to the guidelines specified for the [building blocks](./generic.md#protocol-units-or-building-blocks) (*Note*: we use Golang syntax here because this chaincode is implemented within Weaver in Golang):
- `func PledgeAsset(ctx contractapi.TransactionContextInterface, assetJSON []byte, assetType, assetIdOrQuantity, remoteNetworkId, recipientCert string, expiryTimeSecs uint64) (string, error)`: return value contains the unique pledge ID for this transfer instance
- `func ClaimRemoteAsset(ctx contractapi.TransactionContextInterface, pledgeId, remoteNetworkId, pledgeBytes64 string) ([]byte, error)`: return value contains the asset information blob associated with the pledge, which the caller must parse and validate
- `func ReclaimAsset(ctx contractapi.TransactionContextInterface, pledgeId, recipientCert, remoteNetworkId, claimStatusBytes64 string) ([]byte, []byte, error)`: return value contains asset information blobs associated with the claim and the pledge, which the caller must parse and validate
- `func GetAssetPledgeStatus(ctx contractapi.TransactionContextInterface, pledgeId, recipientNetworkId, recipientCert string, blankAssetJSON []byte) (string, error)`: return value contains the pledge details associuated with the asset being transferred
- `func GetAssetPledgeDetails(ctx contractapi.TransactionContextInterface, pledgeId string) (string, error)`: return value contains the pledge details associuated with the asset being transferred
- `func GetAssetClaimStatus(ctx contractapi.TransactionContextInterface, pledgeId, recipientCert, pledger, pledgerNetworkId string, pledgeExpiryTimeSecs uint64, blankAssetJSON []byte) (string, error)`: return value contains the claim details associated with the asset being transferred

Optionally, the functions may contain additional parameters and return values for developer convenience and to optimize the processing across application chaincode and the Interoperation Chaincode. (The [current implementation](../../../core/network/fabric-interop-cc/libs/utils/) has some such variations.)

We recommend that serialized forms of structures be communicated in parameters and in function return values in Base64-encoded form to avoid distortion occurring in communication and format conversions. `pledgeBytes64` and `claimStatusBytes64` are examples in the above function signatures.

### Exercising the Functions

The following functions are meant to be imported into an application chaincode and interwoven with that application contract's workflow:
- `PledgeAsset`
- `ClaimRemoteAsset`
- `ReclaimAsset`
- `GetAssetPledgeDetails`

The following functions are meant to be called by a remote entity using a [data sharing query](../data-sharing/generic.md) or using an [event notification](../events/event-bus.md):
- `GetAssetPledgeStatus`
- `GetAssetClaimStatus`

### Guidelines for Chaincode Maintainers

Fabric chaincode maintainers should implement functions within their chaincodes and expose transactions as specified in the [asset transfer developer guidelines](./generic.md#prerequisites-smart-contract-developer-responsibilities).

## Fabric Interoperation SDK

The Weaver SDK should implement and offer a function API for aset transfer as sketched out in the [asset transfer client API specifications](./generic.md#client-api).
