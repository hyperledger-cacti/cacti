<!--
 Copyright IBM Corp. All Rights Reserved.

 SPDX-License-Identifier: CC-BY-4.0
 -->
# Cross-Network/Ledger Asset Exchanges

- RFC: 03-013
- Authors: Venkatraman Ramakrishna, Krishnasuri Narayanam, Sandeep Nishad, Dhinakaran Vinayagamurthy
- Status: Proposed
- Since: 02-Apr-2022

## Locking Mechanisms for the Exchange Protocol

This document specifies the data formats used in the [cross-network asset exchange protocol](../../protocols/asset-exchange/). We envision supporting several distinct kinds of asset locking mechanisms for asset exchanges in Weaver, which are listed in and can be selected from an enumeration as follows:
```protobuf
enum LockMechanism {
  HTLC = 0;
}
```
Currently, only the [HTLC protocol](../../protocols/asset-exchange/generic-htlc.md) is supported, as indicated above.

## Representing Locks on Assets

To communicate locking instructions between the application layer or a contract and the [interoperation module](models/infrastructure/interoperation-modules.md) or across networks, we need common DLT-neutral structures. The general structure to lock assets (both fungible and non-fungible) is as follows:
```protobuf
message AssetLock {
  LockMechanism lockMechanism = 1;
  bytes lockInfo = 2;
}
```
The `lockMechanism` field can assume any of the values in the `LockMechanism` enumeration specified earlier. The `lockInfo` field is a serialized lock structure containing specific information about the lock. For the `HTLC` locking mechanism, the lock structure is as follows:
```protobuf
message AssetLockHTLC {
  HashMechanism hashMechanism = 1;
  bytes hashBase64 = 2;
  uint64 expiryTimeSecs = 3;
  enum TimeSpec {
    EPOCH = 0;
    DURATION = 1;
  }
  TimeSpec timeSpec = 4;
}
```
- `hashMechanism` is the algorithm used for the generation of the hash value captured by `hashBase64`. It can be selected from an enumeration `HashMechanism` as follows:
  - `SHA256` represents the cryptographic hash function (secure hash algorithm) that produces 256-bit hash value
  - `SHA512` represents the cryptographic hash function (secure hash algorithm) that produces 512-bit hash value
```protobuf
enum HashMechanism {
  SHA256 = 0;
  SHA512 = 1;
}
```
- `hashBase64` is the _hash lock_, or the hash value with which an asset is locked, pending revelation of the secret preimage of this hash
  - It is encoded in Base64 for communication safety and portability
- `expiryTimeSecs` is the _time lock_, which can either indicate an expiration time period for the lock or the time instant at which the lock ceases to be active
  - The nature of this field is set using the `timeSpec` field, which can be `EPOCH` (representing a time instant) or `DURATION` (representing a time period), as listed in the `TimeSpec` enumeration

## Representing Claims on Assets

To communicate claiming instructions between the application layer or a contract and the [interoperation module](models/infrastructure/interoperation-modules.md) or across networks, we need common DLT-neutral structures. The general structure to claim assets (both fungible and non-fungible) is as follows:
```protobuf
message AssetClaim {
  LockMechanism lockMechanism = 1;
  bytes claimInfo = 2;
}
```
Since every claim is associated with a lock, the above structure needs a `lockMechanism` field just like the `AssetLock` structure does, with identical semantics. The `claimInfo` field is a serialized claim structure containing specific information about the claim. For the `HTLC` locking mechanism, the claim structure is as follows:
```protobuf
message AssetClaimHTLC {
  HashMechanism hashMechanism = 1;
  bytes hashPreimageBase64 = 2;
}
```
An HTLC claim simply needs to specify the secret preimage (`hashPreimageBase64`) of the hash in the corresponding HTLC lock. It is encoded in Base64 for communication safety and portability. The `hashMechanism` field assumes a value from the `HashMechanism` enumeration specified earlier, and must match the `hashMechanism` value in the `AssetLockHTLC` object corresponding to this claim.

## Representing Two-Party Asset Exchange Agreements

To allow interoperation modules to manage locked assets, the exchange that the counterparties have agreed on must be specified in a DLT-neutral structure for communication between application or contract and the interoperation module or across networks. Weaver supports atomic asset exchanges between two parties, so an agreement consists of two asset transfer commitments in opposite directions. Both commitments can take similar forms, which can be specified in a standard format. (_Note_: Weaver currently supports two-party two-asset exchanges. The structures described in this document can be generalized in the future when Weaver supports multi-party multi-asset exchanges.)

For a generic non-fungible asset, a commitment is specified in the following format.
```protobuf
message AssetExchangeAgreement {
  string type = 1;
  string id = 2;
  string locker = 3;
  string recipient = 4;
}
```
- `type` represents a category to which the non-fungible asset belongs, and which is well-known to the application that is managing the asset
- `id` represents a unique ID of an asset instance of the type specified using the `type` field
- `locker` represents the present owner of the asset who is committing to giving this asset (and locking it for that purpose) in exchange for something else
- `recipient` represents the future owner of the asset to whom `locker` is making the commitment (and in whose favor the asset is being locked)

For a generic fungible asset, a commitment is specified in the following format.
```protobuf
message FungibleAssetExchangeAgreement {
  string type = 1;
  uint64 numUnits = 2;
  string locker = 3;
  string recipient = 4;
}
```
This is identical to the `AssetExchangeAgreement` structure except that the `numUnits` field replaces `id`, because a fungible asset instance of a given `type` is indistinguishable from another instance of the same type for the purpose of exchanges. Hence, the number of units of the fungible asset is what one party can commit to locking in another's favor as part of an atomic exchange agreement.

## Representing Two-Party HTLC Actions

The portion of the HTLC contract that corresponds to a commitment described in the previous section needs to be represented in a DLT-neutral manner for event communication from interoperation modules to applications and across networks. This structure links a commitment to an action, namely a lock or a claim or an unlock.

The structure for a non-fungible asset exchanged in an HTLC is as follows.
```protobuf
message AssetContractHTLC {
  string contractId = 1;
  AssetExchangeAgreement agreement = 2;
  AssetLockHTLC lock = 3;
  AssetClaimHTLC claim = 4;
}
```
`contractId` represents a unique ID on the ledger created by the interoperation module for this particular asset that is involved in an exchange, and `agreement` is simply an instance of the structure described in the previous section. The other fields are populated depending on the nature of the action being communicated through this structure:
- Locking of an asset: `lock` field is populated and `claim` field is empty
- Claiming of an asset: `lock` field is empty and `claim` field is populated
- Unlocking of an asset: both `lock` and `claim` fields are empty

The structure for a fungible asset exchanged in an HTLC is as follows.
```protobuf
message FungibleAssetContractHTLC {
  string contractId = 1;
  FungibleAssetExchangeAgreement agreement = 2;
  AssetLockHTLC lock = 3;
  AssetClaimHTLC claim = 4;
}
```
The semantics are identical to those described above for `AssetContractHTLC` except that the `agreement` field is of type `FungibleAssetExchangeAgreement` instead of `AssetExchangeAgreement`.
