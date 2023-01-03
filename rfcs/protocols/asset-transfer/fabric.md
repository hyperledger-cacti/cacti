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

- This document specifies the Hyperledger Fabric implementation of modules, and application adaptation guidelines, for the asset transfer protocol.
- Within Weaver, the protocol units to operate on the asset being transferred will be implemented in the Fabric Interoperation Chaincode, which is the [interoperation module](../../models/infrastructure/interoperation-modules.md) for a Fabric-based network.
- The protocol unit functions are implemented in a library package that can be imported in any chaincode. The Fabric Interoperation Chaincode will import them by default.
- Any application chaincode that is either pledging/burning or claiming/minting an asset at either end of the protocol will import this library too and incorporate suitable function calls in its adapted workflow.
- Within Weaver, the SDK will provide user agents (clients) the capability to trigger transfer operations on particular chaincodes maintaining particular digital assets.

## Fabric Interoperation Chaincode

The following functions should be implemented in a separate package within the Fabric Interoperation Chaincode according to the guidelines specified for the [building blocks](./generic.md#protocol-units-or-building-blocks) (*Note*: we use Golang syntax here because this chaincode is implemented within Weaver in Golang):
- `func PledgeAsset(ctx contractapi.TransactionContextInterface, assetJSON []byte, assetType, assetIdOrQuantity, remoteNetworkId, recipientCert string, expiryTimeSecs uint64) (string, error)`: return value contains the unique pledge ID for this transfer instance
- `func ClaimRemoteAsset(ctx contractapi.TransactionContextInterface, pledgeId, remoteNetworkId, pledgeBytes64 string) ([]byte, error)`: return value contains the asset information blob associated with the pledge, which the caller must parse and validate
- `func ReclaimAsset(ctx contractapi.TransactionContextInterface, pledgeId, recipientCert, remoteNetworkId, claimStatusBytes64 string) ([]byte, []byte, error)`: return value contains asset information blobs associated with the claim and the pledge, which the caller must parse and validate
- `func GetAssetPledgeStatus(ctx contractapi.TransactionContextInterface, pledgeId, recipientNetworkId, recipientCert string, blankAssetJSON []byte) (string, error)`: return value contains the pledge details associuated with the asset being transferred
- `func GetAssetClaimStatus(ctx contractapi.TransactionContextInterface, pledgeId, recipientCert, pledger, pledgerNetworkId string, pledgeExpiryTimeSecs uint64, blankAssetJSON []byte) (string, error)`: return value contains the claim details associated with the asset being transferred

The following function can also be implemented for app developer convenience, though it is not a core building block in the asset transfer protocol:
- `func GetAssetPledgeDetails(ctx contractapi.TransactionContextInterface, pledgeId string) (string, error)`: it returns the [AssetPledge structure](../../formats/assets/transfer.md#representing-an-asset-transfer-pledge) on the ledger (or a serialized form of it) corresponding to the `<pledge-id>`. Its purpose is similar to `GetAssetPledgeStatus` except that it doesn't perform validations. It is meant to be used as a lookup function within the network in which the asset has been pledged.

Optionally, these functions may contain additional parameters and return values for developer convenience and to optimize the processing across application chaincode and the Interoperation Chaincode. (The [current implementation](../../../core/network/fabric-interop-cc/libs/utils/) has some such variations.)

We recommend that serialized forms of structures be communicated in parameters and in function return values in Base64-encoded form to avoid distortion occurring in communication and format conversions. `pledgeBytes64` and `claimStatusBytes64` are examples in the above function signatures.

### Exercising the Functions: Smart Contract Developer Responsibilities

The application chaincode must import the library package implementing the functions listed in the previous section and write suitable functions to exercise them.

The following functions are meant to be implemented in an application chaincode and interwoven with that application contract's workflow:
- `PledgeAsset(<asset-type>, <asset-id>, <recipient-network-id>, <recipient-user-id>, <pledge-expiration-time>)`: This function should lookup an asset of a non-fungible nature, serialize it into a blob and invoke the interoperation module's `PledgeAsset` function to record a pledge. It may perform additional bookkeeping on the state of the asset and access control checks as required by it's contract workflow. It must return the pledge ID (returned by the call to the interoperation module) to the caller.
- `PledgeFungibleAsset(<asset-type>, <asset-quantity>, <recipient-network-id>, <recipient-user-id>, <pledge-expiration-time>)`: This function should lookup an asset of a fungible nature, serialize it into a blob and invoke the interoperation module's `PledgeAsset` function to record a pledge. It may perform additional bookkeeping on the state of the asset and access control checks as required by it's contract workflow. It must return the pledge ID (returned by the call to the interoperation module) to the caller.
- `ClaimRemoteAsset(<pledge-id>, <asset-type>, <asset-id>, <pledging-network-id>, <pledging-user-id>, <pledge-status>)`: This function should invoke the interoperation module's `ClaimRemoteAsset` function to record a claim to a non-fungible asset on the ledger record. In addition, it should unmarshal the asset specifications (known to it and not to the interoperation module, which just sees a blob) and match them to the specifications in the pledge status (fetched from a foreign ledger on which the asset was pledged). Finally, it should mint the asset and issue it to the caller according to the logic of the application smart contract and the asset's semantics. It may perform additional bookkeeping on the state of the asset and access control checks as required by it's contract workflow.
- `ClaimRemoteFungibleAsset(<pledge-id>, <asset-type>, <asset-quantity>, <pleding-network-id>, <pledging-user-id>, <pledge-status>)`: This function should invoke the interoperation module's `ClaimRemoteAsset` function to record a claim to a fungible asset on the ledger record. In addition, it should unmarshal the asset specifications (known to it and not to the interoperation module, which just sees a blob) and match them to the specifications in the pledge status (fetched from a foreign ledger on which the asset was pledged). Finally, it should mint the asset and issue it to the caller according to the logic of the application smart contract and the asset's semantics. It may perform additional bookkeeping on the state of the asset and access control checks as required by it's contract workflow.
- `ReclaimAsset(<pledge-id>, <recipient-network-id>, <recipient-user-id>, <claim-status>)`: This function should invoke the interoperation module's `ReclaimAsset` function to delete a pledge (or remove a lock) on an asset (fungible or non-fungible). It should also match the asset specifications in the passed claim status with those in the pledge status recorded on ledger. Optionally, if required by the smart contract's workflow, it can perform additional bookkeeping operations on the asset, including unlocking it or re-minting and re-issuing it to the caller (the asset's original owner). It may perform additional bookkeeping on the state of the asset and access control checks as required by it's contract workflow.
- `GetAssetPledgeDetails(<pledge-id>)`: This function should invoke the interoperation module's `GetAssetPledgeDetails` function to lookup the pledge status recorded on the ledger based on the `<pledge-id>`. It may additionally (and optionally) perform access control checks before returning. This function should return an [AssetPledge structure](../../formats/assets/transfer.md#representing-an-asset-transfer-pledge) or a serialized form of it.

The following functions are meant to be called by a remote entity using a [data sharing query](../data-sharing/generic.md) or using an [event notification](../events/event-bus.md):
- `GetAssetPledgeStatus(<pledge-id>, <pledging-user-id>, <recipient-network-id>, <recipient-user-id>)`: This function should invoke the interoperation module's `GetAssetPledgeStatus` function to lookup the pledge status recorded on ledger based on the `<pledge-id>` and subsequently match the owner associated with the asset details in the pledge status (the asset details can only be interpreted by the application contract) with the passed parameter value. This function need not be access-controlled, to allow any user to check whether a given asset has been pledged by a particular user. This function should return an [AssetPledge structure](../../formats/assets/transfer.md#representing-an-asset-transfer-pledge) or a serialized form of it. This function is meant to be called from a foreign entity via a data sharing query.
- `GetAssetClaimStatus(<pledge-id>, <asset-type>, <asset-id>, <recipient-user-id>, <pledging-network-id>, <pledging-user-id>, <pledge-expiration-time>)`: This function should invoke the interoperation module's GetAssetClaimStatus` function to lookup the claim status recorded on the ledger based on the `<pledge-id>` for a non-fungible asset. In addition, it should unmarshal the asset specifications in the claim structure and match them with the passed parameter values. This function should return an [AssetClaimStatus structure](../../formats/assets/transfer.md#representing-claims-on-pledged-assets) or a serialized form of it. This function is meant to be called from a foreign entity via a data sharing query.
- `GetFungibleAssetClaimStatus(<pledge-id>, <asset-type>, <asset-quantity>, <recipient-user-id>, <pledging-network-id>, <pledging-user-id>, <pledge-expiration-time>)`: This function should invoke the interoperation module's GetAssetClaimStatus` function to lookup the claim status recorded on the ledger based on the `<pledge-id>` for a fungible asset. In addition, it should unmarshal the asset specifications in the claim structure and match them with the passed parameter values. This function should return an [AssetClaimStatus structure](../../formats/assets/transfer.md#representing-claims-on-pledged-assets) or a serialized form of it. This function is meant to be called from a foreign entity via a data sharing query.

The following functions are recommended in some form if the application chaincode does not already have an equivalent:
- `IsAssetLocked(<asset-type>, <asset-id>)` or `IsAssetPledged(<asset-type>, <asset-id>)`: These are functions the contract should offer, not necessarily through the transaction API but at least as internal functions, to determine whether a given non-fungible asset is currently locked or pledged and therefore is unavailable to be operated on (including for pledging).
- `GetFungibleAssetBalance(<asset-type>)`: This is a function the contract should offer, not necessarily through the transaction API but at least as an internal function, to determine the available and unlocked/unpledged quantity of a given fungible asset. This tells the caller whether a desired quantity of that asset can be pledged for transfer.

(*Note*: the function names specified in these pages are suggestive; the developer may pick any suitable names.)

## Fabric Interoperation SDK

The Weaver SDK should implement and offer a function API for aset transfer as sketched out in the [asset transfer client API specifications](./generic.md#client-api).
