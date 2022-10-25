<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Cross-Network/Ledger Asset Transfers

- RFC: 03-014
- Authors: Venkatraman Ramakrishna, Krishnasuri Narayanam, Sandeep Nishad, Dhinakaran Vinayagamurthy
- Status: Proposed
- Since: 02-Apr-2022

## Summary
This document specifies the data formats used in [cross-network asset transfer protocol](../../protocols/asset-transfer/).

## Representing an Asset Transfer Pledge

To communicate pledge (burning of an asset in a ledger for minting that asset in the same or in a differet ledger at a later point in time) details between the application layer or a contract and the [interoperation module](models/infrastructure/interoperation-modules.md) or across networks, we need common DLT-neutral structures. Weaver supports atomic asset transfer between two parties, so a pledge agreement consists of the asset transfer commitment by a party in one ledger to an other party in a different ledger. The general structure to pledge assets (both fungible and non-fungible) is as follows (this structure can be extended in future when Weaver supports multi-party multi-asset transfers):
```protobuf
message AssetPledge {
	bytes assetDetails = 1;
	string localNetworkID = 2;
	string remoteNetworkID = 3;
	string recipient = 4;
	uint64 expiryTimeSecs = 5;
}
```
- `assetDetails` field is a serialized asset details structure containing specific information about the asset being pledged. Note that only the party owning the asset (captured as part of asset details structure) should be able to perform the pledge on the asset
- `localNetworkID` field is the identifier of the ledger in which the asset resides before the transfer (this is the network that exports the asset)
- `remoteNetworkID` field is the identifier of the ledger in which the asset resides after the transfer (this is the network that imports the asset)
- `recipient` field is the party in the importing network who owns the asset post the asset transfer
- `expiryTimeSecs` field is the pledge validity time period before which the `recipient` can mint the asset in the importing network `remoteNetworkID`

## Representing claims on pledged assets

To communicate claim (minting of the asset after transfer) details between the application layer or a contract and the [interoperation module](models/infrastructure/interoperation-modules.md) or across networks, we need common DLT-neutral structures. The general structure to claim assets (both fungible and non-fungible) is as follows:
```protobuf
message AssetClaimStatus {
	bytes assetDetails = 1;
	string localNetworkID = 2;
	string remoteNetworkID = 3;
	string recipient = 4;
	bool claimStatus = 5;
	uint64 expiryTimeSecs = 6;
	bool expirationStatus = 7;
}
```
- `assetDetails` field is a serialized asset details structure containing specific information about the asset being claimed. Note that the party owning the asset (captured as part of asset details structure) is set to the party specified as the `recipient`
- `localNetworkID` field is the identifier of the ledger in which the asset resides after the transfer (this is the network that imports the asset)
- `remoteNetworkID` field is the identifier of the ledger in which the asset resides before the transfer (this is the network that exports the asset)
- `recipient` field is the party in the importing network who owns the asset post the asset transfer; only this party can perform the claim on the asset that was pledged earlier
- `claimStatus` boolean field specifies if claim on the asset has taken place or not
- `expiryTimeSecs` field is the pledge validity time period (captured as EPOCH time instant) before which the `recipient` can mint the asset in the importing network `localNetworkID`
- `expirationStatus` boolean field captures if current time in the importing ledger (`localNetworkID`) is beyond `expiryTimeSecs` or not. This field helps the Weaver asset transfer protocol to tolerate even if the clock in export network is not synchronized with clock in the import network (minting of asset in export network is only possible after `expirationStatus` becomes `ture` and `claimStatus` is `false`);
