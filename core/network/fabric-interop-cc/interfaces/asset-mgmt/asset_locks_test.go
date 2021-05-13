/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package main

import (
    "fmt"
    "testing"
    "time"
    "strconv"
    "encoding/json"

    "github.com/stretchr/testify/require"
    "github.com/hyperledger/fabric-chaincode-go/shim"
    "github.com/hyperledger/fabric-chaincode-go/shimtest"
    pb "github.com/hyperledger/fabric-protos-go/peer"
    "github.com/golang/protobuf/proto"
    "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/interfaces/asset-mgmt/protos-go/common"
)


const (
    interopCCId = "interopcc"
    clientId = "Alice"
)

// Mock function to simulate the Fabric Interop CC
type InteropCC struct {
    assetLockMap map[string]string
    fungibleAssetLockMap map[string]string
    fungibleAssetLockedCount map[string]int
}

func (cc *InteropCC) Init(stub shim.ChaincodeStubInterface) pb.Response {
    fmt.Println("Initializing Mock Fabric Interop CC")
    cc.assetLockMap = make(map[string]string)
    cc.fungibleAssetLockMap = make(map[string]string)
    cc.fungibleAssetLockedCount = make(map[string]int)
    return shim.Success(nil)
}

// This logic is not meant to comprehensively cover all the functionality offered by the Fabric Interop CC
// Minimal bookkeeping of asset locks is implemented here to run unit tests for the 'asset_locks' base class functions
func (cc *InteropCC) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
    fmt.Println("Invoking Mock Fabric Interop CC")
    function, args := stub.GetFunctionAndParameters()
    if function == "GetTotalFungibleLockedAssets" {
        return shim.Success([]byte(strconv.Itoa(cc.fungibleAssetLockedCount[args[0]])))
    }
    caller, _ := stub.GetCreator()
    if function == "LockAsset" {
        assetAgreement := &common.AssetExchangeAgreement{}
        _ = proto.Unmarshal([]byte(args[0]), assetAgreement)
        key := assetAgreement.Type + ":" + assetAgreement.Id
        val := string(caller) + ":" + assetAgreement.Recipient
        if cc.assetLockMap[key] != "" {
            return shim.Error(fmt.Sprintf("Asset of type %s and ID %s is already locked", assetAgreement.Type, assetAgreement.Id))
        }
        cc.assetLockMap[key] = val
        return shim.Success(nil)
    }
    if function == "LockFungibleAsset" {    // We are only going to lock once or twice in each unit test function, so bookkeeping doesn't need to be thorough
        assetAgreement := &common.FungibleAssetExchangeAgreement{}
        _ = proto.Unmarshal([]byte(args[0]), assetAgreement)
	val := assetAgreement.Type + ":" + strconv.Itoa(int(assetAgreement.NumUnits)) + ":" + string(caller) + ":" + assetAgreement.Recipient
        contractId := generateSHA256HashInBase64Form(val)
        cc.fungibleAssetLockMap[contractId] = val
	if cc.fungibleAssetLockedCount[assetAgreement.Type] == 0 {
		cc.fungibleAssetLockedCount[assetAgreement.Type] = int(assetAgreement.NumUnits)
	} else {
		cc.fungibleAssetLockedCount[assetAgreement.Type] += int(assetAgreement.NumUnits)
	}
        return shim.Success(nil)
    }
    if function == "IsAssetLocked" {
        assetAgreement := &common.AssetExchangeAgreement{}
        _ = proto.Unmarshal([]byte(args[0]), assetAgreement)
        expectedKey := assetAgreement.Type + ":" + assetAgreement.Id
        expectedVal := assetAgreement.Locker + ":" + assetAgreement.Recipient
        if cc.assetLockMap[expectedKey] == expectedVal {
            return shim.Success([]byte("true"))
        } else {
            return shim.Success([]byte("false"))
        }
    }
    if function == "IsFungibleAssetLocked" {
        contractId := args[0]
	if _, contractExists := cc.fungibleAssetLockMap[contractId]; contractExists {
		return shim.Success([]byte("true"))
	} else {
            return shim.Success([]byte("false"))
	}
    }
    if function == "UnlockAsset" {
        assetAgreement := &common.AssetExchangeAgreement{}
        _ = proto.Unmarshal([]byte(args[0]), assetAgreement)
        expectedKey := assetAgreement.Type + ":" + assetAgreement.Id
        expectedVal := string(caller) + ":" + assetAgreement.Recipient
        if cc.assetLockMap[expectedKey] == "" {
            return shim.Error(fmt.Sprintf("No asset of type %s and ID %s is locked", assetAgreement.Type, assetAgreement.Id))
        } else if cc.assetLockMap[expectedKey] != expectedVal {
            return shim.Error(fmt.Sprintf("Cannot unlock asset of type %s and ID %s as it is locked by %s for %s", assetAgreement.Type, assetAgreement.Id, string(caller), assetAgreement.Recipient))
        } else {
            delete(cc.assetLockMap, expectedKey)
            return shim.Success(nil)
        }
    }
    if function == "UnlockFungibleAsset" {
        contractId := args[0]
	if _, contractExists := cc.fungibleAssetLockMap[contractId]; contractExists {
		delete(cc.fungibleAssetLockMap, contractId)
		return shim.Success(nil)
	} else {
            return shim.Error(fmt.Sprintf("No fungible asset is locked associated with contractId %s", contractId))
	}
    }
    if function == "ClaimAsset" {
        assetAgreement := &common.AssetExchangeAgreement{}
        _ = proto.Unmarshal([]byte(args[0]), assetAgreement)
        expectedKey := assetAgreement.Type + ":" + assetAgreement.Id
        expectedVal := assetAgreement.Locker + ":" + string(caller)
        if cc.assetLockMap[expectedKey] == "" {
            return shim.Error(fmt.Sprintf("No asset of type %s and ID %s is locked", assetAgreement.Type, assetAgreement.Id))
        } else if cc.assetLockMap[expectedKey] != expectedVal {
            return shim.Error(fmt.Sprintf("Cannot unlock asset of type %s and ID %s as it is locked by %s for %s", assetAgreement.Type, assetAgreement.Id, assetAgreement.Locker, string(caller)))
        } else {
            delete(cc.assetLockMap, expectedKey)
            return shim.Success(nil)
        }
    }
    if function == "ClaimFungibleAsset" {
        contractId := args[0]
	if _, contractExists := cc.fungibleAssetLockMap[contractId]; contractExists {
		delete(cc.fungibleAssetLockMap, contractId)
		return shim.Success(nil)
	} else {
            return shim.Error(fmt.Sprintf("No fungible asset is locked associated with contractId %s", contractId))
	}
    }
    if function == "GetAllLockedAssets" || function == "GetAllAssetsLockedUntil" {
        assets := []string{}
        for key, val := range cc.assetLockMap {
            assets = append(assets, key + ":" + val)
        }
        for key, val := range cc.fungibleAssetLockMap {
            assets = append(assets, key + ":" + val)
        }
        assetsBytes, _ := json.Marshal(assets)
        return shim.Success(assetsBytes)
    }
    if function == "GetAllNonFungibleLockedAssets" {
        assets := []string{}
        for key, val := range cc.assetLockMap {
            assets = append(assets, key + ":" + val)
        }
        assetsBytes, _ := json.Marshal(assets)
        return shim.Success(assetsBytes)
    }
    if function == "GetAllFungibleLockedAssets" {
        assets := []string{}
        for key, val := range cc.fungibleAssetLockMap {
            assets = append(assets, key + ":" + val)
        }
        assetsBytes, _ := json.Marshal(assets)
        return shim.Success(assetsBytes)
    }
    if function == "GetAssetTimeToRelease" {
        return shim.Success([]byte(strconv.Itoa(len(cc.assetLockMap))))
    }
    if function == "GetFungibleAssetTimeToRelease" {
        return shim.Success([]byte(strconv.Itoa(len(cc.fungibleAssetLockMap))))
    }
    return shim.Error(fmt.Sprintf("Invalid invoke function name: %s", function))
}


// Utility functions
func setCreator(stub *shimtest.MockStub, creator string) {
    stub.Creator = []byte(creator)
}

func createAssetMgmtCCInstance() (*AssetManagement, *shimtest.MockStub) {
    amcc := new(AssetManagement)
    mockStub := shimtest.NewMockStub("Asset Management chaincode", amcc)
    setCreator(mockStub, clientId)
    return amcc, mockStub
}

func associateInteropCCInstance(amcc *AssetManagement, stub *shimtest.MockStub) (*InteropCC, *shimtest.MockStub) {
    icc := new(InteropCC)
    mockStub := shimtest.NewMockStub(interopCCId, icc)
    setCreator(mockStub, clientId)
    mockStub.MockInit("1", [][]byte{})
    amcc.interopChaincodeId = interopCCId
    stub.MockPeerChaincode(interopCCId, mockStub, mockStub.GetChannelID())
    return icc, mockStub
}


// Unit test functions
func TestAssetLock(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "bond"
    assetId := "A001"
    newAssetId := "A002"
    recipient := "Bob"
    locker := clientId
    hash := []byte("j8r484r484")
    lockInfoHTLC := &common.AssetLockHTLC {
        Hash: nil,
        ExpiryTimeSecs: 0,
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }
    assetAgreement := &common.AssetExchangeAgreement {
        Type: assetType,
        Id: assetId,
        Recipient: recipient,
        Locker: locker,
    }

    // Test failure when interop CC is not set
    lockSuccess, err := amcc.LockAsset(amstub, assetAgreement, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    assetAgreement.Recipient = ""
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockAsset(amstub, assetAgreement, lockInfo)     // Empty lock info (bytes)
    require.Error(t, err)
    require.False(t, lockSuccess)

    assetAgreement.Recipient = recipient
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    assetAgreement.Type = ""
    lockSuccess, err = amcc.LockAsset(amstub, assetAgreement, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    assetAgreement.Type = assetType
    assetAgreement.Id = ""
    lockSuccess, err = amcc.LockAsset(amstub, assetAgreement, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    assetAgreement.Recipient = ""
    lockInfoHTLC.Hash = hash
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    assetAgreement.Id = assetId
    lockSuccess, err = amcc.LockAsset(amstub, assetAgreement, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    assetAgreement.Recipient = recipient
    lockInfoHTLC.Hash = []byte{}
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockAsset(amstub, assetAgreement, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Confirm that asset is not locked
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test success
    lockInfoHTLC.Hash = hash
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockAsset(amstub, assetAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test failure when we try to lock an already locked asset
    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockInfoHTLC.ExpiryTimeSecs = uint64(expiryTime.Unix())
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockAsset(amstub, assetAgreement, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Test success
    assetAgreement.Id = newAssetId
    lockSuccess, err = amcc.LockAsset(amstub, assetAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.True(t, lockSuccess)
}

func TestFungibleAssetLock(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "cbdc"
    numUnits := uint64(1000)
    recipient := "Bob"
    locker := clientId
    hash := []byte("j8r484r484")
    lockInfoHTLC := &common.AssetLockHTLC {
        Hash: nil,
        ExpiryTimeSecs: 0,
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }
    assetAgreement := &common.FungibleAssetExchangeAgreement {
        Type: assetType,
        NumUnits: numUnits,
        Recipient: recipient,
        Locker: locker,
    }

    // Test failure when interop CC is not set
    lockSuccess, err := amcc.LockFungibleAsset(amstub, assetAgreement, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    assetAgreement.Recipient = ""
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetAgreement, lockInfo)     // Empty lock info (bytes)
    require.Error(t, err)
    require.False(t, lockSuccess)

    assetAgreement.Recipient = recipient
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    assetAgreement.Type = ""
    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetAgreement, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    assetAgreement.Type = assetType
    assetAgreement.NumUnits = 0
    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetAgreement, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    assetAgreement.Recipient = ""
    lockInfoHTLC.Hash = hash
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    assetAgreement.NumUnits = numUnits
    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetAgreement, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    assetAgreement.Recipient = recipient
    lockInfoHTLC.Hash = []byte{}
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetAgreement, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Confirm that asset is not locked
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test success when both asset agreement and lock information are provided
    lockInfoHTLC.Hash = hash
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test success wih a different number of units
    assetAgreement.NumUnits = 2 * numUnits
    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    assetAgreement.NumUnits = 2 * numUnits
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.True(t, lockSuccess)
}

func TestIsAssetLocked(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "bond"
    assetId := "A001"
    recipient := "Bob"
    locker := clientId
    hash := []byte("j8r484r484")
    hashPreimage := []byte("asset-exchange-scenario")
    assetAgreement := &common.AssetExchangeAgreement {
        Type: assetType,
        Id: assetId,
        Recipient: recipient,
        Locker: locker,
    }
    lockInfoHTLC := &common.AssetLockHTLC {
        Hash: hash,
        ExpiryTimeSecs: 0,
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }
    claimInfoHTLC := &common.AssetClaimHTLC {
        HashPreimage: hashPreimage,
    }
    claimInfoBytes, _ := proto.Marshal(claimInfoHTLC)
    claimInfo := &common.AssetClaim {
        LockMechanism: common.LockMechanism_HTLC,
        ClaimInfo: claimInfoBytes,
    }

    // Test failure when interop CC is not set
    lockSuccess, err := amcc.IsAssetLocked(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, lockSuccess)

    _, istub := associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    assetAgreement.Type = ""
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, lockSuccess)

    assetAgreement.Type = assetType
    assetAgreement.Id = ""
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Test failures when parameters are invalid
    assetAgreement.Id = assetId
    assetAgreement.Recipient = ""
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, lockSuccess)

    assetAgreement.Recipient = locker
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, lockSuccess)

    assetAgreement.Recipient = recipient
    assetAgreement.Locker = "Somebody"
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetAgreement)        // Neither locker nor recipient is the caller
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test success of query when no asset is locked
    assetAgreement.Locker = ""
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    assetAgreement.Locker = locker
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test success of query after asset is locked
    lockSuccess, err = amcc.LockAsset(amstub, assetAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    lockSuccess, err = amcc.IsAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test success of query after asset is claimed
    setCreator(amstub, recipient)
    setCreator(istub, recipient)
    claimSuccess, err := amcc.ClaimAsset(amstub, assetAgreement, claimInfo)
    require.NoError(t, err)
    require.True(t, claimSuccess)
    setCreator(amstub, locker)
    setCreator(istub, locker)

    assetAgreement.Locker = ""
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test success of query after asset is locked and unlocked
    lockSuccess, err = amcc.LockAsset(amstub, assetAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    assetAgreement.Locker = locker
    unlockSuccess, err := amcc.UnlockAsset(amstub, assetAgreement)
    require.NoError(t, err)
    require.True(t, unlockSuccess)

    lockSuccess, err = amcc.IsAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.False(t, lockSuccess)
}

func TestIsFungibleAssetLocked(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "cbdc"
    numUnits := uint64(1000)
    recipient := "Bob"
    locker := clientId
    hash := []byte("j8r484r484")
    hashPreimage := []byte("asset-exchange-scenario")
    assetAgreement := &common.FungibleAssetExchangeAgreement {
        Type: assetType,
        NumUnits: numUnits,
        Recipient: recipient,
        Locker: locker,
    }
    lockInfoHTLC := &common.AssetLockHTLC {
        Hash: hash,
        ExpiryTimeSecs: 0,
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }
    claimInfoHTLC := &common.AssetClaimHTLC {
        HashPreimage: hashPreimage,
    }
    claimInfoBytes, _ := proto.Marshal(claimInfoHTLC)
    claimInfo := &common.AssetClaim {
        LockMechanism: common.LockMechanism_HTLC,
        ClaimInfo: claimInfoBytes,
    }

    // Test failure when interop CC is not set
    lockSuccess, err := amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, lockSuccess)

    _, istub := associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    assetAgreement.Type = ""
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, lockSuccess)

    assetAgreement.Type = assetType
    assetAgreement.NumUnits = 0
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Test failures when parameters are invalid
    assetAgreement.NumUnits = numUnits
    assetAgreement.Recipient = ""
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, lockSuccess)

    assetAgreement.Recipient = locker
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, lockSuccess)

    assetAgreement.Recipient = recipient
    assetAgreement.Locker = "Somebody"
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)        // Neither locker nor recipient is the caller
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test success of query when no asset is locked
    assetAgreement.Locker = ""
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    assetAgreement.Locker = locker
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test success of query after asset is claimed
    setCreator(amstub, recipient)
    setCreator(istub, recipient)
    claimSuccess, err := amcc.ClaimFungibleAsset(amstub, assetAgreement, claimInfo)
    require.NoError(t, err)
    require.True(t, claimSuccess)
    setCreator(amstub, locker)
    setCreator(istub, locker)

    assetAgreement.Locker = ""
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    assetAgreement.Locker = locker
    unlockSuccess, err := amcc.UnlockFungibleAsset(amstub, assetAgreement)
    require.NoError(t, err)
    require.True(t, unlockSuccess)

    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.False(t, lockSuccess)
}

func TestAssetUnlock(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "bond"
    assetId := "A001"
    recipient := "Bob"
    locker := clientId
    hash := []byte("j8r484r484")
    assetAgreement := &common.AssetExchangeAgreement {
        Type: assetType,
        Id: assetId,
        Recipient: recipient,
        Locker: locker,
    }
    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockInfoHTLC := &common.AssetLockHTLC {
        Hash: hash,
        ExpiryTimeSecs: uint64(expiryTime.Unix()),
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }

    // Test failure when interop CC is not set
    unlockSuccess, err := amcc.UnlockAsset(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, unlockSuccess)

    _, istub := associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    assetAgreement.Type = ""
    unlockSuccess, err = amcc.UnlockAsset(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, unlockSuccess)

    assetAgreement.Type = assetType
    assetAgreement.Id = ""
    unlockSuccess, err = amcc.UnlockAsset(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, unlockSuccess)

    assetAgreement.Id = assetId
    assetAgreement.Recipient = ""
    unlockSuccess, err = amcc.UnlockAsset(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, unlockSuccess)

    // Confirm that asset is not locked
    assetAgreement.Recipient = recipient
    lockSuccess, err := amcc.IsAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test failure when asset is not locked
    unlockSuccess, err = amcc.UnlockAsset(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, unlockSuccess)

    // Test success
    // First, lock an asset
    lockSuccess, err = amcc.LockAsset(amstub, assetAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test failure when the unlocker is different from the locker
    setCreator(amstub, recipient)
    setCreator(istub, recipient)
    unlockSuccess, err = amcc.UnlockAsset(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, unlockSuccess)
    setCreator(amstub, locker)
    setCreator(istub, locker)

    // Test success: now unlock the asset
    unlockSuccess, err = amcc.UnlockAsset(amstub, assetAgreement)
    require.NoError(t, err)
    require.True(t, unlockSuccess)

    // Confirm that asset is not locked
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.False(t, lockSuccess)
}

func TestFungibleAssetUnlock(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "cbdc"
    numUnits := uint64(1000)
    recipient := "Bob"
    locker := clientId
    hash := []byte("j8r484r484")
    assetAgreement := &common.FungibleAssetExchangeAgreement {
        Type: assetType,
        NumUnits: numUnits,
        Recipient: recipient,
        Locker: locker,
    }
    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockInfoHTLC := &common.AssetLockHTLC {
        Hash: hash,
        ExpiryTimeSecs: uint64(expiryTime.Unix()),
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }

    // Test failure when interop CC is not set
    unlockSuccess, err := amcc.UnlockFungibleAsset(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, unlockSuccess)

    _, istub := associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    assetAgreement.Type = ""
    unlockSuccess, err = amcc.UnlockFungibleAsset(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, unlockSuccess)

    assetAgreement.Type = assetType
    assetAgreement.NumUnits = 0
    unlockSuccess, err = amcc.UnlockFungibleAsset(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, unlockSuccess)

    assetAgreement.NumUnits = numUnits
    assetAgreement.Recipient = ""
    unlockSuccess, err = amcc.UnlockFungibleAsset(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, unlockSuccess)

    // Confirm that asset is not locked
    assetAgreement.Recipient = recipient
    lockSuccess, err := amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test failure when asset is not locked
    unlockSuccess, err = amcc.UnlockFungibleAsset(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, unlockSuccess)

    // Test success
    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test failure when the unlocker is different from the locker
    setCreator(amstub, recipient)
    setCreator(istub, recipient)
    unlockSuccess, err = amcc.UnlockFungibleAsset(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, unlockSuccess)
    setCreator(amstub, locker)
    setCreator(istub, locker)

    // Test success: now unlock the asset
    unlockSuccess, err = amcc.UnlockFungibleAsset(amstub, assetAgreement)
    require.NoError(t, err)
    require.True(t, unlockSuccess)

    // Confirm that asset is not locked
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.False(t, lockSuccess)
}

func TestAssetClaim(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "bond"
    assetId := "A001"
    recipient := "Bob"
    locker := clientId
    hash := []byte("j8r484r484")
    hashPreimage := []byte("asset-exchange-scenario")
    claimInfoHTLC := &common.AssetClaimHTLC {
        HashPreimage: nil,
    }
    claimInfoBytes, _ := proto.Marshal(claimInfoHTLC)
    claimInfo := &common.AssetClaim {
        LockMechanism: common.LockMechanism_HTLC,
        ClaimInfo: claimInfoBytes,
    }
    assetAgreement := &common.AssetExchangeAgreement {
        Type: assetType,
        Id: assetId,
        Recipient: recipient,
        Locker: locker,
    }

    // Test failure when interop CC is not set
    claimSuccess, err := amcc.ClaimAsset(amstub, assetAgreement, claimInfo)
    require.Error(t, err)
    require.False(t, claimSuccess)

    _, istub := associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    assetAgreement.Locker = ""
    claimInfoBytes, _ = proto.Marshal(claimInfoHTLC)
    claimInfo.ClaimInfo = claimInfoBytes
    claimSuccess, err = amcc.ClaimAsset(amstub, assetAgreement, claimInfo)     // Empty lock info (bytes)
    require.Error(t, err)
    require.False(t, claimSuccess)

    assetAgreement.Locker = locker
    claimInfoBytes, _ = proto.Marshal(claimInfoHTLC)
    claimInfo.ClaimInfo = claimInfoBytes
    assetAgreement.Type = ""
    claimSuccess, err = amcc.ClaimAsset(amstub, assetAgreement, claimInfo)
    require.Error(t, err)
    require.False(t, claimSuccess)

    assetAgreement.Type = assetType
    assetAgreement.Id = ""
    claimSuccess, err = amcc.ClaimAsset(amstub, assetAgreement, claimInfo)
    require.Error(t, err)
    require.False(t, claimSuccess)

    assetAgreement.Locker = ""
    claimInfoHTLC.HashPreimage = hashPreimage
    claimInfoBytes, _ = proto.Marshal(claimInfoHTLC)
    claimInfo.ClaimInfo = claimInfoBytes
    assetAgreement.Id = assetId
    claimSuccess, err = amcc.ClaimAsset(amstub, assetAgreement, claimInfo)
    require.Error(t, err)
    require.False(t, claimSuccess)

    assetAgreement.Locker = locker
    claimInfoHTLC.HashPreimage = []byte{}
    claimInfoBytes, _ = proto.Marshal(claimInfoHTLC)
    claimInfo.ClaimInfo = claimInfoBytes
    claimSuccess, err = amcc.ClaimAsset(amstub, assetAgreement, claimInfo)
    require.Error(t, err)
    require.False(t, claimSuccess)

    // Confirm that asset is not locked
    lockSuccess, err := amcc.IsAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test success
    // First, lock an asset
    lockInfoHTLC := &common.AssetLockHTLC {
        Hash: hash,
        ExpiryTimeSecs: 0,
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }
    lockSuccess, err = amcc.LockAsset(amstub, assetAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Now claim the asset
    assetAgreement.Locker = locker
    claimInfoHTLC.HashPreimage = hashPreimage
    claimInfoBytes, _ = proto.Marshal(claimInfoHTLC)
    claimInfo.ClaimInfo = claimInfoBytes
    setCreator(amstub, recipient)
    setCreator(istub, recipient)
    claimSuccess, err = amcc.ClaimAsset(amstub, assetAgreement, claimInfo)
    require.NoError(t, err)
    require.True(t, claimSuccess)
    setCreator(amstub, locker)
    setCreator(istub, locker)

    // Confirm that asset is not locked
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.False(t, lockSuccess)
}

func TestFungibleAssetClaim(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "cbdc"
    numUnits := uint64(1000)
    recipient := "Bob"
    locker := clientId
    hash := []byte("j8r484r484")
    hashPreimage := []byte("asset-exchange-scenario")
    claimInfoHTLC := &common.AssetClaimHTLC {
        HashPreimage: nil,
    }
    claimInfoBytes, _ := proto.Marshal(claimInfoHTLC)
    claimInfo := &common.AssetClaim {
        LockMechanism: common.LockMechanism_HTLC,
        ClaimInfo: claimInfoBytes,
    }
    assetAgreement := &common.FungibleAssetExchangeAgreement {
        Type: assetType,
        NumUnits: numUnits,
        Recipient: recipient,
        Locker: locker,
    }

    // Test failure when interop CC is not set
    claimSuccess, err := amcc.ClaimFungibleAsset(amstub, assetAgreement, claimInfo)
    require.Error(t, err)
    require.False(t, claimSuccess)

    _, istub := associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    assetAgreement.Locker = ""
    claimInfoBytes, _ = proto.Marshal(claimInfoHTLC)
    claimInfo.ClaimInfo = claimInfoBytes
    claimSuccess, err = amcc.ClaimFungibleAsset(amstub, assetAgreement, claimInfo)     // Empty lock info (bytes)
    require.Error(t, err)
    require.False(t, claimSuccess)

    assetAgreement.Locker = locker
    claimInfoBytes, _ = proto.Marshal(claimInfoHTLC)
    claimInfo.ClaimInfo = claimInfoBytes
    assetAgreement.Type = ""
    claimSuccess, err = amcc.ClaimFungibleAsset(amstub, assetAgreement, claimInfo)
    require.Error(t, err)
    require.False(t, claimSuccess)

    assetAgreement.Type = assetType
    assetAgreement.NumUnits = 0
    claimSuccess, err = amcc.ClaimFungibleAsset(amstub, assetAgreement, claimInfo)
    require.Error(t, err)
    require.False(t, claimSuccess)

    assetAgreement.Locker = ""
    claimInfoHTLC.HashPreimage = hashPreimage
    claimInfoBytes, _ = proto.Marshal(claimInfoHTLC)
    claimInfo.ClaimInfo = claimInfoBytes
    assetAgreement.NumUnits = numUnits
    claimSuccess, err = amcc.ClaimFungibleAsset(amstub, assetAgreement, claimInfo)
    require.Error(t, err)
    require.False(t, claimSuccess)

    assetAgreement.Locker = locker
    claimInfoHTLC.HashPreimage = []byte{}
    claimInfoBytes, _ = proto.Marshal(claimInfoHTLC)
    claimInfo.ClaimInfo = claimInfoBytes
    claimSuccess, err = amcc.ClaimFungibleAsset(amstub, assetAgreement, claimInfo)
    require.Error(t, err)
    require.False(t, claimSuccess)

    // Confirm that asset is not locked
    lockSuccess, err := amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test success
    lockInfoHTLC := &common.AssetLockHTLC {
        Hash: hash,
        ExpiryTimeSecs: 0,
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }
    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Now claim the asset
    assetAgreement.Locker = locker
    claimInfoHTLC.HashPreimage = hashPreimage
    claimInfoBytes, _ = proto.Marshal(claimInfoHTLC)
    claimInfo.ClaimInfo = claimInfoBytes
    setCreator(amstub, recipient)
    setCreator(istub, recipient)
    claimSuccess, err = amcc.ClaimFungibleAsset(amstub, assetAgreement, claimInfo)
    require.NoError(t, err)
    require.True(t, claimSuccess)
    setCreator(amstub, locker)
    setCreator(istub, locker)

    // Confirm that asset is not locked
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.False(t, lockSuccess)
}

func TestFungibleAssetCountFunctions(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "cbdc"
    numUnits := uint64(1000)
    recipient := "Bob"
    hash := []byte("j8r484r484")
    fungibleAssetExchangeAgreement := &common.FungibleAssetExchangeAgreement {
        Type: assetType,
        NumUnits: numUnits,
        Recipient: recipient,
    }
    lockInfoHTLC := &common.AssetLockHTLC {
        Hash: hash,
        ExpiryTimeSecs: 0,
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }

    // Test failure when interop CC is not set
    associateInteropCCInstance(amcc, amstub)

    // Test locked count success
    lockedCount, err := amcc.GetTotalFungibleLockedAssets(amstub, assetType)
    fmt.Printf("lockedCount: %d", lockedCount)
    require.NoError(t, err)
    require.Equal(t, lockedCount, uint64(0))

    // Lock some units of an asset
    lockSuccess, err := amcc.LockFungibleAsset(amstub, fungibleAssetExchangeAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test locked count success
    lockedCount, err = amcc.GetTotalFungibleLockedAssets(amstub, assetType)
    require.NoError(t, err)
    require.Equal(t, lockedCount, numUnits)
}

func TestAssetListFunctions(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "bond"
    assetId := "A001"
    newAssetId := "A002"
    fungibleAssetType := "cbdc"
    numUnits := uint64(1000)
    recipient := "Bob"
    locker := clientId
    hash := []byte("j8r484r484")
    assetAgreement := &common.AssetExchangeAgreement {
        Type: assetType,
        Id: assetId,
        Recipient: recipient,
        Locker: locker,
    }
    fungibleAssetExchangeAgreement := &common.FungibleAssetExchangeAgreement {
        Type: fungibleAssetType,
        NumUnits: numUnits,
        Recipient: recipient,
        Locker: locker,
    }
    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockInfoHTLC := &common.AssetLockHTLC {
        Hash: hash,
        ExpiryTimeSecs: uint64(expiryTime.Unix()),
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }

    // Test failure when interop CC is not set
    getSuccess, err := amcc.GetAllLockedAssets(amstub, recipient, locker)
    require.Error(t, err)
    require.Equal(t, 0, len(getSuccess))

    getSuccess, err = amcc.GetAllNonFungibleLockedAssets(amstub, recipient, locker)
    require.Error(t, err)
    require.Equal(t, 0, len(getSuccess))

    getSuccess, err = amcc.GetAllFungibleLockedAssets(amstub, recipient, locker)
    require.Error(t, err)
    require.Equal(t, 0, len(getSuccess))

    associateInteropCCInstance(amcc, amstub)

    // Test failures when parameters are invalid
    getSuccess, err = amcc.GetAllLockedAssets(amstub, "", "")
    require.Error(t, err)
    require.Equal(t, 0, len(getSuccess))

    getSuccess, err = amcc.GetAllLockedAssets(amstub, locker, locker)
    require.Error(t, err)
    require.Equal(t, 0, len(getSuccess))

    getSuccess, err = amcc.GetAllLockedAssets(amstub, recipient, recipient)
    require.Error(t, err)
    require.Equal(t, 0, len(getSuccess))

    getSuccess, err = amcc.GetAllNonFungibleLockedAssets(amstub, "", "")
    require.Error(t, err)
    require.Equal(t, 0, len(getSuccess))

    getSuccess, err = amcc.GetAllNonFungibleLockedAssets(amstub, locker, locker)
    require.Error(t, err)
    require.Equal(t, 0, len(getSuccess))

    getSuccess, err = amcc.GetAllNonFungibleLockedAssets(amstub, recipient, recipient)
    require.Error(t, err)
    require.Equal(t, 0, len(getSuccess))

    getSuccess, err = amcc.GetAllFungibleLockedAssets(amstub, "", "")
    require.Error(t, err)
    require.Equal(t, 0, len(getSuccess))

    getSuccess, err = amcc.GetAllFungibleLockedAssets(amstub, locker, locker)
    require.Error(t, err)
    require.Equal(t, 0, len(getSuccess))

    getSuccess, err = amcc.GetAllFungibleLockedAssets(amstub, recipient, recipient)
    require.Error(t, err)
    require.Equal(t, 0, len(getSuccess))

    // Lock an asset
    lockSuccess, err := amcc.LockAsset(amstub, assetAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test success
    getSuccess, err = amcc.GetAllLockedAssets(amstub, recipient, locker)
    require.NoError(t, err)
    require.Equal(t, 1, len(getSuccess))

    getSuccess, err = amcc.GetAllNonFungibleLockedAssets(amstub, recipient, locker)
    require.NoError(t, err)
    require.Equal(t, 1, len(getSuccess))

    // Lock another asset
    assetAgreement.Id = newAssetId
    lockSuccess, err = amcc.LockAsset(amstub, assetAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test success
    getSuccess, err = amcc.GetAllLockedAssets(amstub, recipient, locker)
    require.NoError(t, err)
    require.Equal(t, 2, len(getSuccess))

    getSuccess, err = amcc.GetAllNonFungibleLockedAssets(amstub, recipient, locker)
    require.NoError(t, err)
    require.Equal(t, 2, len(getSuccess))

    // Lock a fungible asset
    lockSuccess, err = amcc.LockFungibleAsset(amstub, fungibleAssetExchangeAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test success
    getSuccess, err = amcc.GetAllLockedAssets(amstub, recipient, locker)
    require.NoError(t, err)
    require.Equal(t, 3, len(getSuccess))

    getSuccess, err = amcc.GetAllFungibleLockedAssets(amstub, recipient, locker)
    require.NoError(t, err)
    require.Equal(t, 1, len(getSuccess))

    // Lock more fungible asset
    fungibleAssetExchangeAgreement.NumUnits = 2 * numUnits
    lockSuccess, err = amcc.LockFungibleAsset(amstub, fungibleAssetExchangeAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test success
    getSuccess, err = amcc.GetAllLockedAssets(amstub, recipient, locker)
    require.NoError(t, err)
    require.Equal(t, 4, len(getSuccess))

    getSuccess, err = amcc.GetAllFungibleLockedAssets(amstub, recipient, locker)
    require.NoError(t, err)
    require.Equal(t, 2, len(getSuccess))
}

func TestAssetTimeFunctions(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "bond"
    assetId := "A001"
    fungibleAssetType := "cbdc"
    numUnits := uint64(1000)
    recipient := "Bob"
    locker := clientId
    hash := []byte("j8r484r484")
    assetAgreement := &common.AssetExchangeAgreement {
        Type: assetType,
        Id: assetId,
        Recipient: recipient,
        Locker: locker,
    }
    fungibleAssetExchangeAgreement := &common.FungibleAssetExchangeAgreement {
        Type: assetType,
        NumUnits: numUnits,
        Recipient: recipient,
        Locker: locker,
    }
    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockInfoHTLC := &common.AssetLockHTLC {
        Hash: hash,
        ExpiryTimeSecs: uint64(expiryTime.Unix()),
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }

    // Test failure when interop CC is not set
    getSuccess, err := amcc.GetAssetTimeToRelease(amstub, assetAgreement)
    require.Error(t, err)
    require.Equal(t, uint64(0), getSuccess)

    getSuccess, err = amcc.GetFungibleAssetTimeToRelease(amstub, fungibleAssetExchangeAgreement)
    require.Error(t, err)
    require.Equal(t, uint64(0), getSuccess)

    endTime := currTime.Add(30 * time.Second)     // 30 seconds time window
    getListSuccess, err := amcc.GetAllAssetsLockedUntil(amstub, uint64(endTime.Unix()))
    require.Error(t, err)
    require.Equal(t, 0, len(getListSuccess))

    associateInteropCCInstance(amcc, amstub)

    // Test failures when parameters are invalid
    assetAgreement.Type = ""
    getSuccess, err = amcc.GetAssetTimeToRelease(amstub, assetAgreement)
    require.Error(t, err)
    require.Equal(t, uint64(0), getSuccess)

    assetAgreement.Type = assetType
    assetAgreement.Id = ""
    getSuccess, err = amcc.GetAssetTimeToRelease(amstub, assetAgreement)
    require.Error(t, err)
    require.Equal(t, uint64(0), getSuccess)

    assetAgreement.Id = assetId
    assetAgreement.Recipient = ""
    assetAgreement.Locker = ""
    getSuccess, err = amcc.GetAssetTimeToRelease(amstub, assetAgreement)
    require.Error(t, err)
    require.Equal(t, uint64(0), getSuccess)

    assetAgreement.Recipient = locker
    assetAgreement.Locker = locker
    getSuccess, err = amcc.GetAssetTimeToRelease(amstub, assetAgreement)
    require.Error(t, err)
    require.Equal(t, uint64(0), getSuccess)

    assetAgreement.Recipient = recipient
    assetAgreement.Locker = recipient
    getSuccess, err = amcc.GetAssetTimeToRelease(amstub, assetAgreement)
    require.Error(t, err)
    require.Equal(t, uint64(0), getSuccess)

    fungibleAssetExchangeAgreement.Type = ""
    getSuccess, err = amcc.GetFungibleAssetTimeToRelease(amstub, fungibleAssetExchangeAgreement)
    require.Error(t, err)
    require.Equal(t, uint64(0), getSuccess)

    fungibleAssetExchangeAgreement.Type = fungibleAssetType
    fungibleAssetExchangeAgreement.NumUnits = 0
    getSuccess, err = amcc.GetFungibleAssetTimeToRelease(amstub, fungibleAssetExchangeAgreement)
    require.Error(t, err)
    require.Equal(t, uint64(0), getSuccess)

    fungibleAssetExchangeAgreement.NumUnits = numUnits
    fungibleAssetExchangeAgreement.Recipient = ""
    fungibleAssetExchangeAgreement.Locker = ""
    getSuccess, err = amcc.GetFungibleAssetTimeToRelease(amstub, fungibleAssetExchangeAgreement)
    require.Error(t, err)
    require.Equal(t, uint64(0), getSuccess)

    fungibleAssetExchangeAgreement.Recipient = locker
    fungibleAssetExchangeAgreement.Locker = locker
    getSuccess, err = amcc.GetFungibleAssetTimeToRelease(amstub, fungibleAssetExchangeAgreement)
    require.Error(t, err)
    require.Equal(t, uint64(0), getSuccess)

    fungibleAssetExchangeAgreement.Recipient = recipient
    fungibleAssetExchangeAgreement.Locker = recipient
    getSuccess, err = amcc.GetFungibleAssetTimeToRelease(amstub, fungibleAssetExchangeAgreement)
    require.Error(t, err)
    require.Equal(t, uint64(0), getSuccess)

    getListSuccess, err = amcc.GetAllAssetsLockedUntil(amstub, 0)
    require.Error(t, err)
    require.Equal(t, 0, len(getListSuccess))

    // Lock an asset
    lockSuccess, err := amcc.LockAsset(amstub, assetAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test success
    assetAgreement.Recipient = recipient
    assetAgreement.Locker = locker
    getSuccess, err = amcc.GetAssetTimeToRelease(amstub, assetAgreement)
    require.NoError(t, err)
    require.Less(t, uint64(0), getSuccess)

    // Lock a fungible asset
    lockSuccess, err = amcc.LockFungibleAsset(amstub, fungibleAssetExchangeAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test success
    fungibleAssetExchangeAgreement.Recipient = recipient
    fungibleAssetExchangeAgreement.Locker = locker
    getSuccess, err = amcc.GetFungibleAssetTimeToRelease(amstub, fungibleAssetExchangeAgreement)
    require.NoError(t, err)
    require.Less(t, uint64(0), getSuccess)

    // Test success
    getListSuccess, err = amcc.GetAllAssetsLockedUntil(amstub, uint64(endTime.Unix()))
    require.NoError(t, err)
    require.Equal(t, 2, len(getListSuccess))
}
