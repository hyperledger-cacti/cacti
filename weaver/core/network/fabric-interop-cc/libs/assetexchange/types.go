/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// manage_assets is a chaincode that contains all the code related to asset management operations (e.g., Lock, Unlock, Claim)
// and any related utility functions
package assetexchange

import (
    "github.com/hyperledger-cacti/cacti/weaver/common/protos-go/v2/common"
)

type AssetLockInterface interface {
    GetLocker() string
    GetRecipient() string
    GetLockInfo() interface{}
    GetExpiryTimeSecs() uint64
}

// Object used to capture the HashLock details used in Asset Locking
type HashLock struct {
    HashMechanism common.HashMechanism `json:"hashMechanism"`
    HashBase64 string `json:"hashBase64"`
}

// Object used in the map, <asset-type, asset-id> --> <contractId, locker, recipient, ...> (for non-fungible assets)
type AssetLockValue struct {
    ContractId     string      `json:"contractId"`
    Locker         string      `json:"locker"`
    Recipient      string      `json:"recipient"`
    LockInfo       interface{} `json:"lockInfo"`
    ExpiryTimeSecs uint64      `json:"expiryTimeSecs"`
}

func (a AssetLockValue) GetLocker() string {
    return a.Locker
}
func (a AssetLockValue) GetRecipient() string {
    return a.Recipient
}
func (a AssetLockValue) GetLockInfo() interface{} {
    return a.LockInfo
}
func (a AssetLockValue) GetExpiryTimeSecs() uint64 {
    return a.ExpiryTimeSecs
}

// Object used in the map, contractId --> <asset-type, num-units, locker, ...> (for fungible assets)
type FungibleAssetLockValue struct {
    Type           string      `json:"type"`
    NumUnits       uint64      `json:"numUnits"`
    Locker         string      `json:"locker"`
    Recipient      string      `json:"recipient"`
    LockInfo       interface{} `json:"lockInfo"`
    ExpiryTimeSecs uint64      `json:"expiryTimeSecs"`
}

func (a FungibleAssetLockValue) GetLocker() string {
    return a.Locker
}
func (a FungibleAssetLockValue) GetRecipient() string {
    return a.Recipient
}
func (a FungibleAssetLockValue) GetLockInfo() interface{} {
    return a.LockInfo
}
func (a FungibleAssetLockValue) GetExpiryTimeSecs() uint64 {
    return a.ExpiryTimeSecs
}

const (
    assetKeyPrefix    = "AssetKey_"   // prefix for the map, asset-key --> asset-object
    assetKeyDelimiter = "_"           // delimiter for the asset-key
    contractIdPrefix  = "ContractId_" // prefix for the map, contractId --> asset-key
    claimAssetKeyPrefix = "ClaimAssetKey_"
    claimContractIdPrefix = "ClaimContractId_"
)
