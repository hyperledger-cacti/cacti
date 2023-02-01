<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Asset Exchange - HTLC Protocol Units in Fabric Networks

- RFC: 02-005
- Authors: Ermyas Abebe, Venkatraman Ramakrishna, Sandeep Nishad, Krishnasuri Narayanam, Dhinakaran Vinayagamurthy
- Status: Proposed
- Since: 05-Jan-2023

## Summary

- This document specifies the Hyperledger Fabric implementation of modules, and application adaptation guidelines, for the asset exchange protocol.
- There are two types of implementation for asset exchange in Fabric:
  - The protocol unit functions are implemented in a library package that can be imported in any application chaincode.
  - The Fabric Interoperation Chaincode will already import the above library, and its functions can be invoked from an application chaincode, using an interface that needs to be extended by the application chaincode.
- Within Weaver, the SDK will provide user agents (clients) the capability to trigger HTLC operations on particular chaincodes maintaining particular digital assets.

## HTLC Asset Exchange Capabilities in Weaver

Weaver asset exchange capabilities are asset and application-agnostic. Weaver interoperation module verifies the HTLC parameters and maintains asset and claim state in the ledger for the corresponding asset exchange. Other verifications and operations must be done in the application contract. Following are the core capabilities of Weaver for HTLC asset exchange:

* Lock Functions:
  * `LockAsset`: Function to lock a non-fungible asset. It takes two parameters: base64 encoded serialized protobuf message of type [AssetLock](../../formats/assets/exchange.md#representing-locks-on-assets) defining hash lock and time lock parameters of HTLC and [AssetExchangeAgreement](../../formats/assets/exchange.md#representing-two-party-asset-exchange-agreements).
  * `LockFungibleAsset`: Function to lock fungible assets. Similar to `LockAsset`, it also takes two parameters: base64 encoded serialized protobuf message of type [AssetLock](../../formats/assets/exchange.md#representing-locks-on-assets) defining hash lock and time lock parameters of HTLC and [FungibleAssetExchangeAgreement](../../formats/assets/exchange.md#representing-two-party-asset-exchange-agreements).
  
  Both functions generate a unique ID called `contractId` for this asset exchange, and returns it, which can be used in other functions to refer to this asset exchange. These lock functions only creates a state in the ledger signifying that the corresponding asset is locked and the HTLC parameters. The application contract must make sure to not allow any changes to the state or ownership of the asset while it is locked.
* `IsAssetLocked`: Function to query if the asset is locked. There can be two interfaces for this function, one that takes only `contractId` as input, and other interface only for non-fungible assets, where `AssetExchangeAgreement` protobuf or its fields can be provided as input.
* `ClaimAsset`: Function to claim asset by providing preimage of the lock. This function can also be implemented in two ways, one taking contractId and serialized protobuf [AssetClaim](../../formats/assets/exchange.md#representing-claims-on-assets) as input, and another way for non-fungible assets taking serialized protobufs of type [AssetExchangeAgreement](../../formats/assets/exchange.md#representing-two-party-asset-exchange-agreements) and  [AssetClaim](../../formats/assets/exchange.md#representing-claims-on-assets). The claim function creates a claim state in ledger, and deletes lock state. The actual transfer of asset must be done in the application contract.
* `UnlockAsset`: Function to unlock asset after timeout has expired. This function can also be implemented in two ways, one taking contractId as input, and another way for non-fungible assets taking serialized protobuf [AssetExchangeAgreement](../../formats/assets/exchange.md#representing-two-party-asset-exchange-agreements) as input. The claim function only deletes lock state in ledger.

Utility functions:

* `GetHTLCHash`: Get the hash value used for lock for the given contractId or AssetExchangeAgreement.
* `GetHTLCHashPreImage`: Get the preimage after the claim has occurred, for the given contractId or AssetExchangeAgreement.

## Weaver SDK

Weaver SDK provides an interface `Hash`, which is designed to allow different hashing algorithms to be used for HTLC. Currently there are two implementations: `SHA256` and `SHA512`. The interface `Hash` in `HashFunctions` has following API:

* `generateRandomPreimage(length: number): void`: generates a random preimage of size `length`, and sets it to internal variable
* `setPreimage(preimage: any): void`: sets a user-provided preimage
* `getPreimage(): any`: returns the preimage
* `getSerializedPreimageBase64(): string`: returns serialized preimage in base64 encoded string
* `setSerializedHashBase64(hash64: string)`: sets serialized hash value in base64 encoded string
* `getSerializedHashBase64(): string`: returns serialized hash value in base64 encoded string

The Weaver SDK's `AssetManager` API functions are listed below to help client application developers add HTLC functionalities in their app. Before going to API functions, the parameters used in those functions are explained below:

* `contract: Contract`: application chaincode handle obtained via Fabric SDK using the caller's credentials
* `assetType: string`: type of asset
* `assetID: string`: ID of non-fungible asset
* `numUnits: number`: quantity of fungible assets
* `lockerECert: string`: certificate of locker
* `recipientECert: string`: certificate of recipient
* `hash: Hash`: instance of `Hash` interface explained above (by default `SHA256` is used, and random preimage will be generated)
* `expiryTimeSecs: number`: duration timeout in seconds
* `contractId: string`: Unique ID for an asset exchange agreement/contract generated after locking the asset.
* `timeoutCallback: (c: Contract, t: string, i: string, r: string, h: Hash)`: Callback function to be called after the corresponding chaincode transaction has been executed.

### Lock Asset APIs
* `createHTLC(
    contract: Contract,
    assetType: string,
    assetID: string,
    recipientECert: string,
    hash: Hash,
    expiryTimeSecs: number,
    timeoutCallback: (c: Contract, t: string, i: string, r: string, h: Hash) => any,
)`: To lock a non-fungible asset of type `assetType` and id `assetID`. It returns `contractId`, a unique ID for an asset exchange agreement/contract, which can be used for subsequent transactions/queries.
* `createFungibleHTLC(
    contract: Contract,
    assetType: string,
    numUnits: number,
    recipientECert: string,
    hash: Hash,
    expiryTimeSecs: number,
    timeoutCallback: (c: Contract, i: string, t: string, n: number, r: string, h: Hash) => any,
)`: To lock fungible assets of type `assetType` and quantity `numUnits`. It returns `contractId`, a unique ID for an asset exchange agreement/contract, which can be used for subsequent transactions/queries.

### Claim Asset APIs:
* `claimAssetInHTLCusingContractId(
    contract: Contract,
    contractId: string,
    hash: Hash,
)`: Claim for any kind of asset
* `claimAssetInHTLC(
    contract: Contract,
    assetType: string,
    assetID: string,
    lockerECert: string,
    hash: Hash,
)`: Claim asset for non-fungible assets
* `claimFungibleAssetInHTLC(
    contract: Contract,
    contractId: string,
    hash: Hash,
)`: Claim asset for fungible assets

### Reclaim/Unlock Asset APIs
* `reclaimAssetInHTLCusingContractId(
    contract: Contract,
    contractId: string,
)`: Reclaim/Unlock any kind of asset
* `reclaimAssetInHTLC(
    contract: Contract,
    assetType: string,
    assetID: string,
    recipientECert: string,
)`: Reclaim/Unlock for non-fungible assets
* `reclaimFungibleAssetInHTLC(
    contract: Contract,
    contractId: string,
)`: Reclaim/Unlock asset for fungible assets

### Is Locked Query API
* `isAssetLockedInHTLCqueryUsingContractId(
    contract: Contract,
    contractId: string,
)`: Query to check if any kind of asset is locked.
* `isAssetLockedInHTLC (
    contract: Contract,
    assetType: string,
    assetID: string,
    recipientECert: string,
    lockerECert: string,
)`: Query to check if non-fungible asset is locked.
* `isFungibleAssetLockedInHTLC(
    contract: Contract,
    contractId: string,
)`: Query to check if fungible asset is locked.

## Required Application Adaptations

The onus on the changes required to be made lies both on the application developer (as Weaver is agnostic to the client application) and on Weaver as the platform provider.

### Smart Contract

HTLC can be implemented in a network using Weaver in one of two ways:

* **Using AssetExchange library:** All HTLC capabilities are encapsulated in `assetexchange` library, which any Fabric chaincode can import and extend to implement asset exchange.

* **Using Interoperation Module (InteropCC):** Weaver's interoperation module also provides asset exchange capabilities built-in. This requires to install the weaver chaincode on the channel. An interface `asset-mgmt` is designed to help application chaincode invoke different HTLC transactions on interoperation chaincode. The interface also has same API as explained in [HTLC Asset Exchange Capabilities in Weaver](#htlc-asset-exchange-capabilities-in-weaver).

Weaver handles most of the core/generic HTLC operations, but application smart contract needs to perform several application/asset specific checks, and then use `assetexchange` library or `asset-mgmt` interface (using interoperation module) to exercise different HTLC functions in smart contract. Contract developers needs to make sure of:

* Asset to be locked should exist and the caller party has the access to lock the asset.
* After `LockAsset` call to the library or interface, the asset status should be marked locked so that it can't be spent during locked state.
* After `ClaimAsset`/`ReclaimAsset` call to the library or interface, the actual transfer of asset must be done in the application contract.

### Client Application

Developers need to utilize the [Weaver SDK](#weaver-sdk) to adapt their client application to perform HTLC operations.




