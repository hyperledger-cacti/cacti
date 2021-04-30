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
    fungibleAssetTotalCount map[string]int
    fungibleAssetUnlockedCount map[string]int
}

func (cc *InteropCC) Init(stub shim.ChaincodeStubInterface) pb.Response {
    fmt.Println("Initializing Mock Fabric Interop CC")
    cc.assetLockMap = make(map[string]string)
    cc.fungibleAssetLockMap = make(map[string]string)
    cc.fungibleAssetTotalCount = make(map[string]int)
    cc.fungibleAssetUnlockedCount = make(map[string]int)
    return shim.Success(nil)
}

func (cc *InteropCC) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
    fmt.Println("Invoking Mock Fabric Interop CC")
    function, args := stub.GetFunctionAndParameters()
    if function == "AddFungibleAssetCount" {
        numUnits, _ := strconv.Atoi(args[1])
        cc.fungibleAssetTotalCount[args[0]] = cc.fungibleAssetTotalCount[args[0]] + numUnits
        cc.fungibleAssetUnlockedCount[args[0]] = cc.fungibleAssetUnlockedCount[args[0]] + numUnits
        return shim.Success(nil)
    }
    if function == "GetTotalFungibleAssetCount" {
        if cc.fungibleAssetTotalCount[args[0]] == 0 {
            return shim.Error(fmt.Sprintf("Asset type %s doesn't have a count declared", args[0]))
        }
        return shim.Success([]byte(strconv.Itoa(cc.fungibleAssetTotalCount[args[0]])))
    }
    if function == "GetTotalFungibleLockedAssets" {
        if cc.fungibleAssetTotalCount[args[0]] == 0 {
            return shim.Error(fmt.Sprintf("Asset type %s doesn't have a count declared", args[0]))
        }
        return shim.Success([]byte(strconv.Itoa(cc.fungibleAssetTotalCount[args[0]] - cc.fungibleAssetUnlockedCount[args[0]])))
    }
    if function == "GetUnlockedFungibleAssetCount" {
        if cc.fungibleAssetUnlockedCount[args[0]] == 0 {
            return shim.Error(fmt.Sprintf("Asset type %s doesn't have a count declared", args[0]))
        }
        return shim.Success([]byte(strconv.Itoa(cc.fungibleAssetUnlockedCount[args[0]])))
    }
    caller, _ := stub.GetCreator()
    if function == "LockAsset" {
        assetAgreement := &common.AssetAgreement{}
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
        assetAgreement := &common.FungibleAssetAgreement{}
        _ = proto.Unmarshal([]byte(args[0]), assetAgreement)
        key := assetAgreement.Type + ":" + strconv.Itoa(int(assetAgreement.NumUnits))
        val := string(caller) + ":" + assetAgreement.Recipient
        if cc.fungibleAssetUnlockedCount[assetAgreement.Type] < int(assetAgreement.NumUnits) {
            return shim.Error(fmt.Sprintf("Requested %d units of asset type %s; only %d available", assetAgreement.NumUnits, assetAgreement.Type, cc.fungibleAssetUnlockedCount[assetAgreement.Type]))
        }
        cc.fungibleAssetLockMap[key] = val
        cc.fungibleAssetUnlockedCount[assetAgreement.Type] = cc.fungibleAssetUnlockedCount[assetAgreement.Type] - int(assetAgreement.NumUnits)
        return shim.Success(nil)
    }
    if function == "IsAssetLocked" {
        expectedKey := args[0] + ":" + args[1]
        expectedVal := args[3] + ":" + args[2]
        if cc.assetLockMap[expectedKey] == expectedVal {
            return shim.Success([]byte("true"))
        } else {
            return shim.Success([]byte("false"))
        }
    }
    if function == "IsFungibleAssetLocked" {
        expectedKey := args[0] + ":" + args[1]
        expectedVal := args[3] + ":" + args[2]
        if cc.fungibleAssetLockMap[expectedKey] == expectedVal {
            return shim.Success([]byte("true"))
        } else {
            return shim.Success([]byte("false"))
        }
    }
    if function == "UnlockAsset" {
        expectedKey := args[0] + ":" + args[1]
        expectedVal := string(caller) + ":" + args[2]
        if cc.assetLockMap[expectedKey] == "" {
            return shim.Error(fmt.Sprintf("No asset of type %s and ID/Units %s is locked", args[0], args[1]))
        } else if cc.assetLockMap[expectedKey] != expectedVal {
            return shim.Error(fmt.Sprintf("Cannot unlock asset of type %s and ID/Units %s as it is locked by %s for %s", args[0], args[1], string(caller), args[2]))
        } else {
            delete(cc.assetLockMap, expectedKey)
            return shim.Success(nil)
        }
    }
    if function == "UnlockFungibleAsset" {
        expectedKey := args[0] + ":" + args[1]
        expectedVal := string(caller) + ":" + args[2]
        if cc.fungibleAssetLockMap[expectedKey] == "" {
            return shim.Error(fmt.Sprintf("No asset of type %s and ID/Units %s is locked", args[0], args[1]))
        } else if cc.fungibleAssetLockMap[expectedKey] != expectedVal {
            return shim.Error(fmt.Sprintf("Cannot unlock asset of type %s and ID/Units %s as it is locked by %s for %s", args[0], args[1], string(caller), args[2]))
        } else {
            delete(cc.fungibleAssetLockMap, expectedKey)
            return shim.Success(nil)
        }
    }
    if function == "ClaimAssetHTLC" {
        expectedKey := args[0] + ":" + args[1]
        expectedVal := args[2] + ":" + string(caller)
        if cc.assetLockMap[expectedKey] == "" {
            return shim.Error(fmt.Sprintf("No asset of type %s and ID/Units %s is locked", args[0], args[1]))
        } else if cc.assetLockMap[expectedKey] != expectedVal {
            return shim.Error(fmt.Sprintf("Cannot unlock asset of type %s and ID/Units %s as it is locked by %s for %s", args[0], args[1], args[2], string(caller)))
        } else {
            delete(cc.assetLockMap, expectedKey)
            return shim.Success(nil)
        }
    }
    if function == "ClaimFungibleAssetHTLC" {
        expectedKey := args[0] + ":" + args[1]
        expectedVal := args[2] + ":" + string(caller)
        if cc.fungibleAssetLockMap[expectedKey] == "" {
            return shim.Error(fmt.Sprintf("No asset of type %s and ID/Units %s is locked", args[0], args[1]))
        } else if cc.fungibleAssetLockMap[expectedKey] != expectedVal {
            return shim.Error(fmt.Sprintf("Cannot unlock asset of type %s and ID/Units %s as it is locked by %s for %s", args[0], args[1], args[2], string(caller)))
        } else {
            delete(cc.fungibleAssetLockMap, expectedKey)
            return shim.Success(nil)
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
        ExpiryTimeMillis: 0,
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }
    assetAgreement := &common.AssetAgreement {
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
    lockInfoHTLC.ExpiryTimeMillis = uint64(expiryTime.UnixNano()/(1000*1000))
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
    totalUnits := 10000
    numUnits := 1000
    recipient := "Bob"
    locker := clientId
    hash := []byte("j8r484r484")
    lockInfoHTLC := &common.AssetLockHTLC {
        Hash: nil,
        ExpiryTimeMillis: 0,
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }
    assetAgreement := &common.FungibleAssetAgreement {
        Type: assetType,
        NumUnits: int32(numUnits),
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
    assetAgreement.NumUnits = -1
    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetAgreement, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    assetAgreement.Recipient = ""
    lockInfoHTLC.Hash = hash
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    assetAgreement.NumUnits = int32(numUnits)
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

    // Test failure when there is no unit balance (total not declared yet)
    lockInfoHTLC.Hash = hash
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetAgreement, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Test success
    addSuccess, err := amcc.AddFungibleAssetCount(amstub, assetType, totalUnits)
    require.NoError(t, err)
    require.True(t, addSuccess)

    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test failure when there is insufficient unit balance for the requested units
    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockInfoHTLC.ExpiryTimeMillis = uint64(expiryTime.UnixNano()/(1000*1000))
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    assetAgreement.NumUnits = int32(totalUnits)
    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetAgreement, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Test success wih a different number of units
    assetAgreement.NumUnits = int32(2 * numUnits)
    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    assetAgreement.NumUnits = int32(2 * numUnits)
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
    assetAgreement := &common.AssetAgreement {
        Type: assetType,
        Id: assetId,
        Recipient: recipient,
        Locker: locker,
    }
    lockInfoHTLC := &common.AssetLockHTLC {
        Hash: hash,
        ExpiryTimeMillis: 0,
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
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
    require.Error(t, err)
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
    claimSuccess, err := amcc.ClaimAssetHTLC(amstub, assetType, assetId, locker, hashPreimage)
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
    totalUnits := 10000
    numUnits := 1000
    recipient := "Bob"
    locker := clientId
    hash := []byte("j8r484r484")
    hashPreimage := []byte("asset-exchange-scenario")
    assetAgreement := &common.FungibleAssetAgreement {
        Type: assetType,
        NumUnits: int32(numUnits),
        Recipient: recipient,
        Locker: locker,
    }
    lockInfoHTLC := &common.AssetLockHTLC {
        Hash: hash,
        ExpiryTimeMillis: 0,
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
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
    assetAgreement.NumUnits = int32(-1)
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Test failures when parameters are invalid
    assetAgreement.NumUnits = int32(numUnits)
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
    require.Error(t, err)
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

    // Test success of query
    addSuccess, err := amcc.AddFungibleAssetCount(amstub, assetType, totalUnits)
    require.NoError(t, err)
    require.True(t, addSuccess)

    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test success of query after asset is claimed
    setCreator(amstub, recipient)
    setCreator(istub, recipient)
    claimSuccess, err := amcc.ClaimFungibleAssetHTLC(amstub, assetType, numUnits, locker, hashPreimage)
    require.NoError(t, err)
    require.True(t, claimSuccess)
    setCreator(amstub, locker)
    setCreator(istub, locker)

    assetAgreement.Locker = ""
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test success of query after asset is locked and unlocked
    addSuccess, err = amcc.AddFungibleAssetCount(amstub, assetType, totalUnits)
    require.NoError(t, err)
    require.True(t, addSuccess)

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
    assetAgreement := &common.AssetAgreement {
        Type: assetType,
        Id: assetId,
        Recipient: recipient,
        Locker: locker,
    }
    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockInfoHTLC := &common.AssetLockHTLC {
        Hash: hash,
        ExpiryTimeMillis: uint64(expiryTime.UnixNano()/(1000*1000)),
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
    totalUnits := 10000
    numUnits := 1000
    recipient := "Bob"
    locker := clientId
    hash := []byte("j8r484r484")
    assetAgreement := &common.FungibleAssetAgreement {
        Type: assetType,
        NumUnits: int32(numUnits),
        Recipient: recipient,
        Locker: locker,
    }
    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockInfoHTLC := &common.AssetLockHTLC {
        Hash: hash,
        ExpiryTimeMillis: uint64(expiryTime.UnixNano()/(1000*1000)),
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
    assetAgreement.NumUnits = int32(-1)
    unlockSuccess, err = amcc.UnlockFungibleAsset(amstub, assetAgreement)
    require.Error(t, err)
    require.False(t, unlockSuccess)

    assetAgreement.NumUnits = int32(numUnits)
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
    // First, lock an asset
    addSuccess, err := amcc.AddFungibleAssetCount(amstub, assetType, totalUnits)
    require.NoError(t, err)
    require.True(t, addSuccess)

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

func TestAssetClaimHTLC(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "bond"
    assetId := "A001"
    recipient := "Bob"
    locker := clientId
    hash := []byte("j8r484r484")
    hashPreimage := []byte("asset-exchange-scenario")
    assetAgreement := &common.AssetAgreement {
        Type: assetType,
        Id: assetId,
        Recipient: recipient,
        Locker: locker,
    }
    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockInfoHTLC := &common.AssetLockHTLC {
        Hash: hash,
        ExpiryTimeMillis: uint64(expiryTime.UnixNano()/(1000*1000)),
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }

    // Test failure when interop CC is not set
    claimSuccess, err := amcc.ClaimAssetHTLC(amstub, assetType, assetId, locker, hashPreimage)
    require.Error(t, err)
    require.False(t, claimSuccess)

    _, istub := associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    claimSuccess, err = amcc.ClaimAssetHTLC(amstub, "", assetId, locker, hashPreimage)
    require.Error(t, err)
    require.False(t, claimSuccess)

    claimSuccess, err = amcc.ClaimAssetHTLC(amstub, assetType, "", locker, hashPreimage)
    require.Error(t, err)
    require.False(t, claimSuccess)

    claimSuccess, err = amcc.ClaimAssetHTLC(amstub, assetType, assetId, "", hashPreimage)
    require.Error(t, err)
    require.False(t, claimSuccess)

    claimSuccess, err = amcc.ClaimAssetHTLC(amstub, assetType, assetId, locker, []byte{})
    require.Error(t, err)
    require.False(t, claimSuccess)

    // Confirm that asset is not locked
    lockSuccess, err := amcc.IsAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test failure when asset is not locked
    claimSuccess, err = amcc.ClaimAssetHTLC(amstub, assetType, assetId, locker, hashPreimage)
    require.Error(t, err)
    require.False(t, claimSuccess)

    // Test success
    // First, lock an asset
    lockSuccess, err = amcc.LockAsset(amstub, assetAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test failure when claimer is not the lock's intended recipient
    claimSuccess, err = amcc.ClaimAssetHTLC(amstub, assetType, assetId, locker, hashPreimage)
    require.Error(t, err)
    require.False(t, claimSuccess)

    // Test success: now claim the asset
    setCreator(amstub, recipient)
    setCreator(istub, recipient)
    claimSuccess, err = amcc.ClaimAssetHTLC(amstub, assetType, assetId, locker, hashPreimage)
    require.NoError(t, err)
    require.True(t, claimSuccess)
    setCreator(amstub, locker)
    setCreator(istub, locker)

    // Confirm that asset is not locked
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetAgreement)
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
    assetAgreement := &common.AssetAgreement {
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
        ExpiryTimeMillis: 0,
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

func TestFungibleAssetClaimHTLC(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "cbdc"
    totalUnits := 10000
    numUnits := 1000
    recipient := "Bob"
    locker := clientId
    hash := []byte("j8r484r484")
    hashPreimage := []byte("asset-exchange-scenario")
    assetAgreement := &common.FungibleAssetAgreement {
        Type: assetType,
        NumUnits: int32(numUnits),
        Recipient: recipient,
        Locker: locker,
    }
    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockInfoHTLC := &common.AssetLockHTLC {
        Hash: hash,
        ExpiryTimeMillis: uint64(expiryTime.UnixNano()/(1000*1000)),
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }

    // Test failure when interop CC is not set
    claimSuccess, err := amcc.ClaimFungibleAssetHTLC(amstub, assetType, numUnits, locker, hashPreimage)
    require.Error(t, err)
    require.False(t, claimSuccess)

    _, istub := associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    claimSuccess, err = amcc.ClaimFungibleAssetHTLC(amstub, "", numUnits, locker, hashPreimage)
    require.Error(t, err)
    require.False(t, claimSuccess)

    claimSuccess, err = amcc.ClaimFungibleAssetHTLC(amstub, assetType, -1, locker, hashPreimage)
    require.Error(t, err)
    require.False(t, claimSuccess)

    claimSuccess, err = amcc.ClaimFungibleAssetHTLC(amstub, assetType, numUnits, "", hashPreimage)
    require.Error(t, err)
    require.False(t, claimSuccess)

    claimSuccess, err = amcc.ClaimFungibleAssetHTLC(amstub, assetType, numUnits, locker, []byte{})
    require.Error(t, err)
    require.False(t, claimSuccess)

    // Confirm that asset is not locked
    lockSuccess, err := amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test failure when asset is not locked
    claimSuccess, err = amcc.ClaimFungibleAssetHTLC(amstub, assetType, numUnits, locker, hashPreimage)
    require.Error(t, err)
    require.False(t, claimSuccess)

    // Test success
    // First, lock an asset
    addSuccess, err := amcc.AddFungibleAssetCount(amstub, assetType, totalUnits)
    require.NoError(t, err)
    require.True(t, addSuccess)

    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test failure when claimer is not the lock's intended recipient
    claimSuccess, err = amcc.ClaimFungibleAssetHTLC(amstub, assetType, numUnits, locker, hashPreimage)
    require.Error(t, err)
    require.False(t, claimSuccess)

    // Test success: now claim the asset
    setCreator(amstub, recipient)
    setCreator(istub, recipient)
    claimSuccess, err = amcc.ClaimFungibleAssetHTLC(amstub, assetType, numUnits, locker, hashPreimage)
    require.NoError(t, err)
    require.True(t, claimSuccess)
    setCreator(amstub, locker)
    setCreator(istub, locker)

    // Confirm that asset is not locked
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetAgreement)
    require.NoError(t, err)
    require.False(t, lockSuccess)
}

func TestFungibleAssetClaim(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "cbdc"
    totalUnits := 10000
    numUnits := 1000
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
    assetAgreement := &common.FungibleAssetAgreement {
        Type: assetType,
        NumUnits: int32(numUnits),
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
    assetAgreement.NumUnits = int32(-1)
    claimSuccess, err = amcc.ClaimFungibleAsset(amstub, assetAgreement, claimInfo)
    require.Error(t, err)
    require.False(t, claimSuccess)

    assetAgreement.Locker = ""
    claimInfoHTLC.HashPreimage = hashPreimage
    claimInfoBytes, _ = proto.Marshal(claimInfoHTLC)
    claimInfo.ClaimInfo = claimInfoBytes
    assetAgreement.NumUnits = int32(numUnits)
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
    // First, lock an asset
    addSuccess, err := amcc.AddFungibleAssetCount(amstub, assetType, totalUnits)
    require.NoError(t, err)
    require.True(t, addSuccess)

    lockInfoHTLC := &common.AssetLockHTLC {
        Hash: hash,
        ExpiryTimeMillis: 0,
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
    totalUnits := 10000
    numUnits := 1000
    recipient := "Bob"
    hash := []byte("j8r484r484")
    fungibleAssetAgreement := &common.FungibleAssetAgreement {
        Type: assetType,
        NumUnits: int32(numUnits),
        Recipient: recipient,
    }
    lockInfoHTLC := &common.AssetLockHTLC {
        Hash: hash,
        ExpiryTimeMillis: 0,
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }

    // Test failure when interop CC is not set
    addSuccess, err := amcc.AddFungibleAssetCount(amstub, assetType, totalUnits)
    require.Error(t, err)
    require.False(t, addSuccess)

    associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    addSuccess, err = amcc.AddFungibleAssetCount(amstub, "", totalUnits)
    require.Error(t, err)
    require.False(t, addSuccess)

    addSuccess, err = amcc.AddFungibleAssetCount(amstub, assetType, -1)
    require.Error(t, err)
    require.False(t, addSuccess)

    // Test fetch count failures when asset type is not declared yet
    totalCount, err := amcc.GetTotalFungibleAssetCount(amstub, assetType)
    require.Error(t, err)

    unlockedCount, err := amcc.GetUnlockedFungibleAssetCount(amstub, assetType)
    require.Error(t, err)

    // Test add success
    addSuccess, err = amcc.AddFungibleAssetCount(amstub, assetType, totalUnits)
    require.NoError(t, err)
    require.True(t, addSuccess)

    // Test total count success
    totalCount, err = amcc.GetTotalFungibleAssetCount(amstub, assetType)
    require.NoError(t, err)
    require.Equal(t, totalCount, totalUnits)

    // Test locked count success
    lockedCount, err := amcc.GetTotalFungibleLockedAssets(amstub, assetType)
    require.NoError(t, err)
    require.Equal(t, lockedCount, 0)

    // Test unlocked count success
    unlockedCount, err = amcc.GetUnlockedFungibleAssetCount(amstub, assetType)
    require.NoError(t, err)
    require.Equal(t, unlockedCount, totalUnits)

    // Lock some units of an asset
    lockSuccess, err := amcc.LockFungibleAsset(amstub, fungibleAssetAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test total count success
    totalCount, err = amcc.GetTotalFungibleAssetCount(amstub, assetType)
    require.NoError(t, err)
    require.Equal(t, totalCount, totalUnits)

    // Test locked count success
    lockedCount, err = amcc.GetTotalFungibleLockedAssets(amstub, assetType)
    require.NoError(t, err)
    require.Equal(t, lockedCount, numUnits)

    // Test unlocked count success
    unlockedCount, err = amcc.GetUnlockedFungibleAssetCount(amstub, assetType)
    require.NoError(t, err)
    require.Equal(t, unlockedCount, totalUnits - numUnits)
}

func TestAssetListFunctions(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "bond"
    assetId := "A001"
    newAssetId := "A002"
    fungibleAssetType := "cbdc"
    totalUnits := 10000
    numUnits := 1000
    recipient := "Bob"
    locker := clientId
    hash := []byte("j8r484r484")
    assetAgreement := &common.AssetAgreement {
        Type: assetType,
        Id: assetId,
        Recipient: recipient,
        Locker: locker,
    }
    fungibleAssetAgreement := &common.FungibleAssetAgreement {
        Type: fungibleAssetType,
        NumUnits: int32(numUnits),
        Recipient: recipient,
        Locker: locker,
    }
    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockInfoHTLC := &common.AssetLockHTLC {
        Hash: hash,
        ExpiryTimeMillis: uint64(expiryTime.UnixNano()/(1000*1000)),
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

    // Declare total fungible asset count
    addSuccess, err := amcc.AddFungibleAssetCount(amstub, fungibleAssetType, totalUnits)
    require.NoError(t, err)
    require.True(t, addSuccess)

    // Lock a fungible asset
    lockSuccess, err = amcc.LockFungibleAsset(amstub, fungibleAssetAgreement, lockInfo)
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
    fungibleAssetAgreement.NumUnits = int32(2 * numUnits)
    lockSuccess, err = amcc.LockFungibleAsset(amstub, fungibleAssetAgreement, lockInfo)
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
    totalUnits := 10000
    numUnits := 1000
    recipient := "Bob"
    locker := clientId
    hash := []byte("j8r484r484")
    assetAgreement := &common.AssetAgreement {
        Type: assetType,
        Id: assetId,
        Recipient: recipient,
        Locker: locker,
    }
    fungibleAssetAgreement := &common.FungibleAssetAgreement {
        Type: assetType,
        NumUnits: int32(numUnits),
        Recipient: recipient,
        Locker: locker,
    }
    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockInfoHTLC := &common.AssetLockHTLC {
        Hash: hash,
        ExpiryTimeMillis: uint64(expiryTime.UnixNano()/(1000*1000)),
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }

    // Test failure when interop CC is not set
    getSuccess, err := amcc.GetAssetTimeToRelease(amstub, assetAgreement)
    require.Error(t, err)
    require.Equal(t, int64(-1), getSuccess)

    getSuccess, err = amcc.GetFungibleAssetTimeToRelease(amstub, fungibleAssetAgreement)
    require.Error(t, err)
    require.Equal(t, int64(-1), getSuccess)

    endTime := currTime.Add(30 * time.Second)     // 30 seconds time window
    getListSuccess, err := amcc.GetAllAssetsLockedUntil(amstub, endTime.UnixNano()/(1000*1000))
    require.Error(t, err)
    require.Equal(t, 0, len(getListSuccess))

    associateInteropCCInstance(amcc, amstub)

    // Test failures when parameters are invalid
    assetAgreement.Type = ""
    getSuccess, err = amcc.GetAssetTimeToRelease(amstub, assetAgreement)
    require.Error(t, err)
    require.Equal(t, int64(-1), getSuccess)

    assetAgreement.Type = assetType
    assetAgreement.Id = ""
    getSuccess, err = amcc.GetAssetTimeToRelease(amstub, assetAgreement)
    require.Error(t, err)
    require.Equal(t, int64(-1), getSuccess)

    assetAgreement.Id = assetId
    assetAgreement.Recipient = ""
    assetAgreement.Locker = ""
    getSuccess, err = amcc.GetAssetTimeToRelease(amstub, assetAgreement)
    require.Error(t, err)
    require.Equal(t, int64(-1), getSuccess)

    assetAgreement.Recipient = locker
    assetAgreement.Locker = locker
    getSuccess, err = amcc.GetAssetTimeToRelease(amstub, assetAgreement)
    require.Error(t, err)
    require.Equal(t, int64(-1), getSuccess)

    assetAgreement.Recipient = recipient
    assetAgreement.Locker = recipient
    getSuccess, err = amcc.GetAssetTimeToRelease(amstub, assetAgreement)
    require.Error(t, err)
    require.Equal(t, int64(-1), getSuccess)

    fungibleAssetAgreement.Type = ""
    getSuccess, err = amcc.GetFungibleAssetTimeToRelease(amstub, fungibleAssetAgreement)
    require.Error(t, err)
    require.Equal(t, int64(-1), getSuccess)

    fungibleAssetAgreement.Type = fungibleAssetType
    fungibleAssetAgreement.NumUnits = -1
    getSuccess, err = amcc.GetFungibleAssetTimeToRelease(amstub, fungibleAssetAgreement)
    require.Error(t, err)
    require.Equal(t, int64(-1), getSuccess)

    fungibleAssetAgreement.NumUnits = int32(numUnits)
    fungibleAssetAgreement.Recipient = ""
    fungibleAssetAgreement.Locker = ""
    getSuccess, err = amcc.GetFungibleAssetTimeToRelease(amstub, fungibleAssetAgreement)
    require.Error(t, err)
    require.Equal(t, int64(-1), getSuccess)

    fungibleAssetAgreement.Recipient = locker
    fungibleAssetAgreement.Locker = locker
    getSuccess, err = amcc.GetFungibleAssetTimeToRelease(amstub, fungibleAssetAgreement)
    require.Error(t, err)
    require.Equal(t, int64(-1), getSuccess)

    fungibleAssetAgreement.Recipient = recipient
    fungibleAssetAgreement.Locker = recipient
    getSuccess, err = amcc.GetFungibleAssetTimeToRelease(amstub, fungibleAssetAgreement)
    require.Error(t, err)
    require.Equal(t, int64(-1), getSuccess)

    getListSuccess, err = amcc.GetAllAssetsLockedUntil(amstub, -1)
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
    require.Less(t, int64(0), getSuccess)

    // Declare total fungible asset count
    addSuccess, err := amcc.AddFungibleAssetCount(amstub, fungibleAssetType, totalUnits)
    require.NoError(t, err)
    require.True(t, addSuccess)

    // Lock a fungible asset
    lockSuccess, err = amcc.LockFungibleAsset(amstub, fungibleAssetAgreement, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test success
    fungibleAssetAgreement.Recipient = recipient
    fungibleAssetAgreement.Locker = locker
    getSuccess, err = amcc.GetFungibleAssetTimeToRelease(amstub, fungibleAssetAgreement)
    require.NoError(t, err)
    require.Less(t, int64(0), getSuccess)

    // Test success
    getListSuccess, err = amcc.GetAllAssetsLockedUntil(amstub, endTime.UnixNano()/(1000*1000))
    require.NoError(t, err)
    require.Equal(t, 2, len(getListSuccess))
}
