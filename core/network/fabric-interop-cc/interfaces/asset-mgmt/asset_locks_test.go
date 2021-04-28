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
    fungibleAssetTotalCount map[string]int
    fungibleAssetUnlockedCount map[string]int
}

func (cc *InteropCC) Init(stub shim.ChaincodeStubInterface) pb.Response {
    fmt.Println("Initializing Mock Fabric Interop CC")
    cc.assetLockMap = make(map[string]string)
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
    if function == "GetUnlockedFungibleAssetCount" {
        if cc.fungibleAssetUnlockedCount[args[0]] == 0 {
            return shim.Error(fmt.Sprintf("Asset type %s doesn't have a count declared", args[0]))
        }
        return shim.Success([]byte(strconv.Itoa(cc.fungibleAssetUnlockedCount[args[0]])))
    }
    if function == "LockAssetHTLC" {
        caller, _ := stub.GetCreator()
        key := args[0] + ":" + args[1]
        val := string(caller) + ":" + args[2]
        if cc.assetLockMap[key] != "" {
            return shim.Error(fmt.Sprintf("Asset of type %s and ID %s is already locked", args[0], args[1]))
        }
        cc.assetLockMap[key] = val
        return shim.Success(nil)
    }
    if function == "LockFungibleAssetHTLC" {    // We are only going to lock once or twice in each unit test function, so bookkeeping doesn't need to be thorough
        caller, _ := stub.GetCreator()
        key := args[0] + ":" + args[1]
        val := string(caller) + ":" + args[2]
        numUnits, _ := strconv.Atoi(args[1])
        if cc.fungibleAssetUnlockedCount[args[0]] < numUnits {
            return shim.Error(fmt.Sprintf("Requested %d units of asset type %s; only %d available", numUnits, args[0], cc.fungibleAssetUnlockedCount[args[0]]))
        }
        cc.assetLockMap[key] = val
        cc.fungibleAssetUnlockedCount[args[0]] = cc.fungibleAssetUnlockedCount[args[0]] - numUnits
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
    if function == "UnlockAsset" || function == "UnlockFungibleAsset" || function == "ClaimAssetHTLC" || function == "ClaimFungibleAssetHTLC" {
        expectedKey := args[0] + ":" + args[1]
        if cc.assetLockMap[expectedKey] == "" {
            return shim.Error(fmt.Sprintf("No asset of type %s and ID/Units %s is locked", args[0], args[1]))
        } else {
            delete(cc.assetLockMap, expectedKey)
            return shim.Success(nil)
        }
    }
    return shim.Error(fmt.Sprintf("Invalid invoke function name: %s", function))
}


// Utility functions
func createAssetMgmtCCInstance() (*AssetManagement, *shimtest.MockStub) {
    amcc := new(AssetManagement)
    mockStub := shimtest.NewMockStub("Asset Management chaincode", amcc)
    mockStub.Creator = []byte(clientId)
    return amcc, mockStub
}

func associateInteropCCInstance(amcc *AssetManagement, stub *shimtest.MockStub) {
    icc := new(InteropCC)
    mockStub := shimtest.NewMockStub(interopCCId, icc)
    mockStub.Creator = []byte(clientId)
    mockStub.MockInit("1", [][]byte{})
    amcc.interopChaincodeId = interopCCId
    stub.MockPeerChaincode(interopCCId, mockStub, mockStub.GetChannelID())
    return
}


// Unit test functions
func TestAssetLockHTLC(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "bond"
    assetId := "A001"
    newAssetId := "A002"
    recipient := "Bob"
    locker := clientId
    hash := []byte("j8r484r484")

    // Test failure when interop CC is not set
    lockSuccess, err := amcc.LockAssetHTLC(amstub, assetType, assetId, recipient, hash, 0)
    require.Error(t, err)
    require.False(t, lockSuccess)

    associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    lockSuccess, err = amcc.LockAssetHTLC(amstub, "", assetId, recipient, hash, 0)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, "", recipient, hash, 0)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, assetId, "", hash, 0)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, assetId, recipient, []byte{}, 0)
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Confirm that asset is not locked
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetType, assetId, recipient, locker)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test success
    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, assetId, recipient, hash, 0)         // Invalid expiry time: should still succeed
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetType, assetId, recipient, locker)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test failure when we try to lock an already locked asset
    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, assetId, recipient, hash, expiryTime.UnixNano()/(1000*1000))
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Test success
    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, newAssetId, recipient, hash, expiryTime.UnixNano()/(1000*1000))
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetType, newAssetId, recipient, locker)
    require.NoError(t, err)
    require.True(t, lockSuccess)
}

func TestAssetLock(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "bond"
    assetId := "A001"
    newAssetId := "A002"
    recipient := "Bob"
    locker := clientId
    hash := []byte("j8r484r484")
    lockInfoHTLC := &common.AssetLockHTLC {
        Recipient: recipient,
        Hash: nil,
        ExpiryTimeMillis: 0,
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }

    // Test failure when interop CC is not set
    lockSuccess, err := amcc.LockAsset(amstub, assetType, assetId, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    lockInfoHTLC.Recipient = ""
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockAsset(amstub, assetType, assetId, lockInfo)     // Empty lock info (bytes)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockInfoHTLC.Recipient = recipient
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockAsset(amstub, "", assetId, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.LockAsset(amstub, assetType, "", lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockInfoHTLC.Recipient = ""
    lockInfoHTLC.Hash = hash
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockAsset(amstub, assetType, assetId, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockInfoHTLC.Recipient = recipient
    lockInfoHTLC.Hash = []byte{}
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockAsset(amstub, assetType, assetId, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Confirm that asset is not locked
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetType, assetId, recipient, locker)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test success
    lockInfoHTLC.Hash = hash
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockAsset(amstub, assetType, assetId, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetType, assetId, recipient, locker)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test failure when we try to lock an already locked asset
    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockInfoHTLC.ExpiryTimeMillis = uint64(expiryTime.UnixNano()/(1000*1000))
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockAsset(amstub, assetType, assetId, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Test success
    lockSuccess, err = amcc.LockAsset(amstub, assetType, newAssetId, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetType, newAssetId, recipient, locker)
    require.NoError(t, err)
    require.True(t, lockSuccess)
}

func TestFungibleAssetLockHTLC(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "cbdc"
    totalUnits := 10000
    numUnits := 1000
    recipient := "Bob"
    locker := clientId
    hash := []byte("j8r484r484")

    // Test failure when interop CC is not set
    lockSuccess, err := amcc.LockFungibleAssetHTLC(amstub, assetType, numUnits, recipient, hash, 0)
    require.Error(t, err)
    require.False(t, lockSuccess)

    associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    lockSuccess, err = amcc.LockFungibleAssetHTLC(amstub, "", numUnits, recipient, hash, 0)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.LockFungibleAssetHTLC(amstub, assetType, -1, recipient, hash, 0)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.LockFungibleAssetHTLC(amstub, assetType, numUnits, "", hash, 0)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.LockFungibleAssetHTLC(amstub, assetType, numUnits, recipient, []byte{}, 0)
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Confirm that asset is not locked
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetType, numUnits, recipient, locker)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test failure when there is no unit balance (total not declared yet)
    lockSuccess, err = amcc.LockFungibleAssetHTLC(amstub, assetType, numUnits, recipient, hash, 0)
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Test success
    addSuccess, err := amcc.AddFungibleAssetCount(amstub, assetType, totalUnits)
    require.NoError(t, err)
    require.True(t, addSuccess)

    lockSuccess, err = amcc.LockFungibleAssetHTLC(amstub, assetType, numUnits, recipient, hash, 0)         // Invalid expiry time: should still succeed
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetType, numUnits, recipient, locker)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test failure when there is insufficient unit balance for the requested units
    lockSuccess, err = amcc.LockFungibleAssetHTLC(amstub, assetType, totalUnits, recipient, hash, 0)
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Test success wih a different number of units
    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockSuccess, err = amcc.LockFungibleAssetHTLC(amstub, assetType, 2 * numUnits, recipient, hash, expiryTime.UnixNano()/(1000*1000))
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetType, 2 * numUnits, recipient, locker)
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
        Recipient: recipient,
        Hash: nil,
        ExpiryTimeMillis: 0,
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }

    // Test failure when interop CC is not set
    lockSuccess, err := amcc.LockFungibleAsset(amstub, assetType, numUnits, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    lockInfoHTLC.Recipient = ""
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetType, numUnits, lockInfo)     // Empty lock info (bytes)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockInfoHTLC.Recipient = recipient
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockFungibleAsset(amstub, "", numUnits, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetType, -1, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockInfoHTLC.Recipient = ""
    lockInfoHTLC.Hash = hash
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetType, numUnits, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockInfoHTLC.Recipient = recipient
    lockInfoHTLC.Hash = []byte{}
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetType, numUnits, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Confirm that asset is not locked
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetType, numUnits, recipient, locker)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test failure when there is no unit balance (total not declared yet)
    lockInfoHTLC.Hash = hash
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetType, numUnits, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Test success
    addSuccess, err := amcc.AddFungibleAssetCount(amstub, assetType, totalUnits)
    require.NoError(t, err)
    require.True(t, addSuccess)

    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetType, numUnits, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetType, numUnits, recipient, locker)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test failure when there is insufficient unit balance for the requested units
    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockInfoHTLC.ExpiryTimeMillis = uint64(expiryTime.UnixNano()/(1000*1000))
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetType, totalUnits, lockInfo)
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Test success wih a different number of units
    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetType, 2 * numUnits, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetType, 2 * numUnits, recipient, locker)
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

    // Test failure when interop CC is not set
    lockSuccess, err := amcc.IsAssetLocked(amstub, assetType, assetId, recipient, locker)
    require.Error(t, err)
    require.False(t, lockSuccess)

    associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    lockSuccess, err = amcc.IsAssetLocked(amstub, "", assetId, recipient, locker)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.IsAssetLocked(amstub, assetType, "", recipient, locker)
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Test failures when parameters are invalid
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetType, assetId, "", locker)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.IsAssetLocked(amstub, assetType, assetId, locker, locker)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.IsAssetLocked(amstub, assetType, assetId, recipient, "Somebody")        // Neither locker nor recipient is the caller
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Test success of query when no asset is locked
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetType, assetId, recipient, "")
    require.NoError(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.IsAssetLocked(amstub, assetType, assetId, recipient, locker)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test success of query after asset is locked
    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, assetId, recipient, hash, 0)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    lockSuccess, err = amcc.IsAssetLocked(amstub, assetType, assetId, recipient, locker)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test success of query after asset is claimed
    claimSuccess, err := amcc.ClaimAssetHTLC(amstub, assetType, assetId, locker, hashPreimage)
    require.NoError(t, err)
    require.True(t, claimSuccess)

    lockSuccess, err = amcc.IsAssetLocked(amstub, assetType, assetId, recipient, "")
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test success of query after asset is locked and unlocked
    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, assetId, recipient, hash, 0)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    unlockSuccess, err := amcc.UnlockAsset(amstub, assetType, assetId)
    require.NoError(t, err)
    require.True(t, unlockSuccess)

    lockSuccess, err = amcc.IsAssetLocked(amstub, assetType, assetId, recipient, locker)
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

    // Test failure when interop CC is not set
    lockSuccess, err := amcc.IsFungibleAssetLocked(amstub, assetType, numUnits, recipient, locker)
    require.Error(t, err)
    require.False(t, lockSuccess)

    associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, "", numUnits, recipient, locker)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetType, -1, recipient, locker)
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Test failures when parameters are invalid
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetType, numUnits, "", locker)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetType, numUnits, locker, locker)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetType, numUnits, recipient, "Somebody")        // Neither locker nor recipient is the caller
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Test success of query when no asset is locked
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetType, numUnits, recipient, "")
    require.NoError(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetType, numUnits, recipient, locker)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test success of query
    addSuccess, err := amcc.AddFungibleAssetCount(amstub, assetType, totalUnits)
    require.NoError(t, err)
    require.True(t, addSuccess)

    lockSuccess, err = amcc.LockFungibleAssetHTLC(amstub, assetType, numUnits, recipient, hash, 0)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetType, numUnits, recipient, locker)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test success of query after asset is claimed
    claimSuccess, err := amcc.ClaimFungibleAssetHTLC(amstub, assetType, numUnits, locker, hashPreimage)
    require.NoError(t, err)
    require.True(t, claimSuccess)

    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetType, numUnits, recipient, "")
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test success of query after asset is locked and unlocked
    addSuccess, err = amcc.AddFungibleAssetCount(amstub, assetType, totalUnits)
    require.NoError(t, err)
    require.True(t, addSuccess)

    lockSuccess, err = amcc.LockFungibleAssetHTLC(amstub, assetType, numUnits, recipient, hash, 0)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    unlockSuccess, err := amcc.UnlockFungibleAsset(amstub, assetType, numUnits)
    require.NoError(t, err)
    require.True(t, unlockSuccess)

    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetType, numUnits, recipient, locker)
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

    // Test failure when interop CC is not set
    unlockSuccess, err := amcc.UnlockAsset(amstub, assetType, assetId)
    require.Error(t, err)
    require.False(t, unlockSuccess)

    associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    unlockSuccess, err = amcc.UnlockAsset(amstub, "", assetId)
    require.Error(t, err)
    require.False(t, unlockSuccess)

    unlockSuccess, err = amcc.UnlockAsset(amstub, assetType, "")
    require.Error(t, err)
    require.False(t, unlockSuccess)

    // Confirm that asset is not locked
    lockSuccess, err := amcc.IsAssetLocked(amstub, assetType, assetId, recipient, locker)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test failure when asset is not locked
    unlockSuccess, err = amcc.UnlockAsset(amstub, assetType, assetId)
    require.Error(t, err)
    require.False(t, unlockSuccess)

    // Test success
    // First, lock an asset
    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, assetId, recipient, hash, expiryTime.UnixNano()/(1000*1000))
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetType, assetId, recipient, locker)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Now unlock the asset
    unlockSuccess, err = amcc.UnlockAsset(amstub, assetType, assetId)
    require.NoError(t, err)
    require.True(t, unlockSuccess)

    // Confirm that asset is not locked
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetType, assetId, recipient, locker)
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

    // Test failure when interop CC is not set
    unlockSuccess, err := amcc.UnlockFungibleAsset(amstub, assetType, numUnits)
    require.Error(t, err)
    require.False(t, unlockSuccess)

    associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    unlockSuccess, err = amcc.UnlockFungibleAsset(amstub, "", numUnits)
    require.Error(t, err)
    require.False(t, unlockSuccess)

    unlockSuccess, err = amcc.UnlockFungibleAsset(amstub, assetType, -1)
    require.Error(t, err)
    require.False(t, unlockSuccess)

    // Confirm that asset is not locked
    lockSuccess, err := amcc.IsFungibleAssetLocked(amstub, assetType, numUnits, recipient, locker)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test failure when asset is not locked
    unlockSuccess, err = amcc.UnlockFungibleAsset(amstub, assetType, numUnits)
    require.Error(t, err)
    require.False(t, unlockSuccess)

    // Test success
    // First, lock an asset
    addSuccess, err := amcc.AddFungibleAssetCount(amstub, assetType, totalUnits)
    require.NoError(t, err)
    require.True(t, addSuccess)

    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockSuccess, err = amcc.LockFungibleAssetHTLC(amstub, assetType, numUnits, recipient, hash, expiryTime.UnixNano()/(1000*1000))
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetType, numUnits, recipient, locker)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Now unlock the asset
    unlockSuccess, err = amcc.UnlockFungibleAsset(amstub, assetType, numUnits)
    require.NoError(t, err)
    require.True(t, unlockSuccess)

    // Confirm that asset is not locked
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetType, numUnits, recipient, locker)
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

    // Test failure when interop CC is not set
    claimSuccess, err := amcc.ClaimAssetHTLC(amstub, assetType, assetId, locker, hashPreimage)
    require.Error(t, err)
    require.False(t, claimSuccess)

    associateInteropCCInstance(amcc, amstub)

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
    lockSuccess, err := amcc.IsAssetLocked(amstub, assetType, assetId, recipient, locker)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test failure when asset is not locked
    claimSuccess, err = amcc.ClaimAssetHTLC(amstub, assetType, assetId, locker, hashPreimage)
    require.Error(t, err)
    require.False(t, claimSuccess)

    // Test success
    // First, lock an asset
    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, assetId, recipient, hash, expiryTime.UnixNano()/(1000*1000))
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetType, assetId, recipient, locker)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Now claim the asset
    claimSuccess, err = amcc.ClaimAssetHTLC(amstub, assetType, assetId, locker, hashPreimage)
    require.NoError(t, err)
    require.True(t, claimSuccess)

    // Confirm that asset is not locked
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetType, assetId, recipient, locker)
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
        Locker: locker,
        HashPreimage: nil,
    }
    claimInfoBytes, _ := proto.Marshal(claimInfoHTLC)
    claimInfo := &common.AssetClaim {
        LockMechanism: common.LockMechanism_HTLC,
        ClaimInfo: claimInfoBytes,
    }

    // Test failure when interop CC is not set
    claimSuccess, err := amcc.ClaimAsset(amstub, assetType, assetId, claimInfo)
    require.Error(t, err)
    require.False(t, claimSuccess)

    associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    claimInfoHTLC.Locker = ""
    claimInfoBytes, _ = proto.Marshal(claimInfoHTLC)
    claimInfo.ClaimInfo = claimInfoBytes
    claimSuccess, err = amcc.ClaimAsset(amstub, assetType, assetId, claimInfo)     // Empty lock info (bytes)
    require.Error(t, err)
    require.False(t, claimSuccess)

    claimInfoHTLC.Locker = locker
    claimInfoBytes, _ = proto.Marshal(claimInfoHTLC)
    claimInfo.ClaimInfo = claimInfoBytes
    claimSuccess, err = amcc.ClaimAsset(amstub, "", assetId, claimInfo)
    require.Error(t, err)
    require.False(t, claimSuccess)

    claimSuccess, err = amcc.ClaimAsset(amstub, assetType, "", claimInfo)
    require.Error(t, err)
    require.False(t, claimSuccess)

    claimInfoHTLC.Locker = ""
    claimInfoHTLC.HashPreimage = hashPreimage
    claimInfoBytes, _ = proto.Marshal(claimInfoHTLC)
    claimInfo.ClaimInfo = claimInfoBytes
    claimSuccess, err = amcc.ClaimAsset(amstub, assetType, assetId, claimInfo)
    require.Error(t, err)
    require.False(t, claimSuccess)

    claimInfoHTLC.Locker = locker
    claimInfoHTLC.HashPreimage = []byte{}
    claimInfoBytes, _ = proto.Marshal(claimInfoHTLC)
    claimInfo.ClaimInfo = claimInfoBytes
    claimSuccess, err = amcc.ClaimAsset(amstub, assetType, assetId, claimInfo)
    require.Error(t, err)
    require.False(t, claimSuccess)

    // Confirm that asset is not locked
    lockSuccess, err := amcc.IsAssetLocked(amstub, assetType, assetId, recipient, locker)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test success
    // First, lock an asset
    lockInfoHTLC := &common.AssetLockHTLC {
        Recipient: recipient,
        Hash: hash,
        ExpiryTimeMillis: 0,
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }
    lockSuccess, err = amcc.LockAsset(amstub, assetType, assetId, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetType, assetId, recipient, locker)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Now claim the asset
    claimInfoHTLC.Locker = locker
    claimInfoHTLC.HashPreimage = hashPreimage
    claimInfoBytes, _ = proto.Marshal(claimInfoHTLC)
    claimInfo.ClaimInfo = claimInfoBytes
    claimSuccess, err = amcc.ClaimAsset(amstub, assetType, assetId, claimInfo)
    require.NoError(t, err)
    require.True(t, claimSuccess)

    // Confirm that asset is not locked
    lockSuccess, err = amcc.IsAssetLocked(amstub, assetType, assetId, recipient, locker)
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

    // Test failure when interop CC is not set
    claimSuccess, err := amcc.ClaimFungibleAssetHTLC(amstub, assetType, numUnits, locker, hashPreimage)
    require.Error(t, err)
    require.False(t, claimSuccess)

    associateInteropCCInstance(amcc, amstub)

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
    lockSuccess, err := amcc.IsFungibleAssetLocked(amstub, assetType, numUnits, recipient, locker)
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

    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockSuccess, err = amcc.LockFungibleAssetHTLC(amstub, assetType, numUnits, recipient, hash, expiryTime.UnixNano()/(1000*1000))
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetType, numUnits, recipient, locker)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Now claim the asset
    claimSuccess, err = amcc.ClaimFungibleAssetHTLC(amstub, assetType, numUnits, locker, hashPreimage)
    require.NoError(t, err)
    require.True(t, claimSuccess)

    // Confirm that asset is not locked
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetType, numUnits, recipient, locker)
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
        Locker: locker,
        HashPreimage: nil,
    }
    claimInfoBytes, _ := proto.Marshal(claimInfoHTLC)
    claimInfo := &common.AssetClaim {
        LockMechanism: common.LockMechanism_HTLC,
        ClaimInfo: claimInfoBytes,
    }

    // Test failure when interop CC is not set
    claimSuccess, err := amcc.ClaimFungibleAsset(amstub, assetType, numUnits, claimInfo)
    require.Error(t, err)
    require.False(t, claimSuccess)

    associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    claimInfoHTLC.Locker = ""
    claimInfoBytes, _ = proto.Marshal(claimInfoHTLC)
    claimInfo.ClaimInfo = claimInfoBytes
    claimSuccess, err = amcc.ClaimFungibleAsset(amstub, assetType, numUnits, claimInfo)     // Empty lock info (bytes)
    require.Error(t, err)
    require.False(t, claimSuccess)

    claimInfoHTLC.Locker = locker
    claimInfoBytes, _ = proto.Marshal(claimInfoHTLC)
    claimInfo.ClaimInfo = claimInfoBytes
    claimSuccess, err = amcc.ClaimFungibleAsset(amstub, "", numUnits, claimInfo)
    require.Error(t, err)
    require.False(t, claimSuccess)

    claimSuccess, err = amcc.ClaimFungibleAsset(amstub, assetType, -1, claimInfo)
    require.Error(t, err)
    require.False(t, claimSuccess)

    claimInfoHTLC.Locker = ""
    claimInfoHTLC.HashPreimage = hashPreimage
    claimInfoBytes, _ = proto.Marshal(claimInfoHTLC)
    claimInfo.ClaimInfo = claimInfoBytes
    claimSuccess, err = amcc.ClaimFungibleAsset(amstub, assetType, numUnits, claimInfo)
    require.Error(t, err)
    require.False(t, claimSuccess)

    claimInfoHTLC.Locker = locker
    claimInfoHTLC.HashPreimage = []byte{}
    claimInfoBytes, _ = proto.Marshal(claimInfoHTLC)
    claimInfo.ClaimInfo = claimInfoBytes
    claimSuccess, err = amcc.ClaimFungibleAsset(amstub, assetType, numUnits, claimInfo)
    require.Error(t, err)
    require.False(t, claimSuccess)

    // Confirm that asset is not locked
    lockSuccess, err := amcc.IsFungibleAssetLocked(amstub, assetType, numUnits, recipient, locker)
    require.NoError(t, err)
    require.False(t, lockSuccess)

    // Test success
    // First, lock an asset
    addSuccess, err := amcc.AddFungibleAssetCount(amstub, assetType, totalUnits)
    require.NoError(t, err)
    require.True(t, addSuccess)

    lockInfoHTLC := &common.AssetLockHTLC {
        Recipient: recipient,
        Hash: hash,
        ExpiryTimeMillis: 0,
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }
    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetType, numUnits, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Confirm that asset is locked
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetType, numUnits, recipient, locker)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Now claim the asset
    claimInfoHTLC.Locker = locker
    claimInfoHTLC.HashPreimage = hashPreimage
    claimInfoBytes, _ = proto.Marshal(claimInfoHTLC)
    claimInfo.ClaimInfo = claimInfoBytes
    claimSuccess, err = amcc.ClaimFungibleAsset(amstub, assetType, numUnits, claimInfo)
    require.NoError(t, err)
    require.True(t, claimSuccess)

    // Confirm that asset is not locked
    lockSuccess, err = amcc.IsFungibleAssetLocked(amstub, assetType, numUnits, recipient, locker)
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

    // Test unlocked count success
    unlockedCount, err = amcc.GetUnlockedFungibleAssetCount(amstub, assetType)
    require.NoError(t, err)
    require.Equal(t, unlockedCount, totalUnits)

    // Lock some units of an asset
    lockSuccess, err := amcc.LockFungibleAssetHTLC(amstub, assetType, numUnits, recipient, hash, 0)         // Invalid expiry time: should still succeed
    require.NoError(t, err)
    require.True(t, lockSuccess)

    // Test total count success
    totalCount, err = amcc.GetTotalFungibleAssetCount(amstub, assetType)
    require.NoError(t, err)
    require.Equal(t, totalCount, totalUnits)

    // Test unlocked count success
    unlockedCount, err = amcc.GetUnlockedFungibleAssetCount(amstub, assetType)
    require.NoError(t, err)
    require.Equal(t, unlockedCount, totalUnits - numUnits)
}
