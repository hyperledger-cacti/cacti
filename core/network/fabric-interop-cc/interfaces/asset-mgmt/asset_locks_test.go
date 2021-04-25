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

	"github.com/stretchr/testify/require"
    "github.com/hyperledger/fabric-chaincode-go/shim"
    "github.com/hyperledger/fabric-chaincode-go/shimtest"
    pb "github.com/hyperledger/fabric-protos-go/peer"
    "github.com/golang/protobuf/proto"
    "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/interfaces/asset-mgmt/protos-go/common"
)


const (
    interopCCId = "interopcc"
)

// Mock function to simulate the Fabric Interop CC
type InteropCC struct {
    assetLockMap map[string]string
}

func (cc *InteropCC) Init(stub shim.ChaincodeStubInterface) pb.Response {
    fmt.Println("Initializing Mock Fabric Interop CC")
    cc.assetLockMap = make(map[string]string)
    return shim.Success(nil)
}

func (cc *InteropCC) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
    fmt.Println("Invoking Mock Fabric Interop CC")
    function, args := stub.GetFunctionAndParameters()
    if function == "LockAssetHTLC" || function == "LockFungibleAssetHTLC" {
        caller, _ := stub.GetCreator()
        cc.assetLockMap[args[0] + ":" + args[1]] = string(caller) + ":" + args[2]
        return shim.Success(nil)
    }
    if function == "IsAssetLocked" {
        expectedKey := args[0] + ":" + args[1]
        expectedVal := args[3] + ":" + args[2]
        fmt.Printf("key: %s, val: %s, map: %+v\n", expectedKey, expectedVal, cc.assetLockMap)
        if cc.assetLockMap[expectedKey] == expectedVal {
            return shim.Success([]byte("true"))
        } else {
            return shim.Success([]byte("false"))
        }
    }
    return shim.Error(fmt.Sprintf("Invalid invoke function name: %s", function))
}


// Utility functions
func createAssetMgmtCCInstance() (*AssetManagement, *shimtest.MockStub) {
    amcc := new(AssetManagement)
    mockStub := shimtest.NewMockStub("Asset Management chaincode", amcc)
    mockStub.Creator = []byte("Alice")
    return amcc, mockStub
}

func associateInteropCCInstance(amcc *AssetManagement, stub *shimtest.MockStub) {
    icc := new(InteropCC)
    mockStub := shimtest.NewMockStub(interopCCId, icc)
    mockStub.Creator = []byte("Alice")
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
    recipient := "Bob"
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

    // Test success
    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, assetId, recipient, hash, 0)         // Invalid expiry time: should still succeed
    require.NoError(t, err)
    require.True(t, lockSuccess)

    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, assetId, recipient, hash, expiryTime.UnixNano()/(1000*1000))
    require.NoError(t, err)
    require.True(t, lockSuccess)
}

func TestAssetLock(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "bond"
    assetId := "A001"
    recipient := "Bob"
    hash := []byte("j8r484r484")
    lockInfoHTLC := &common.AssetLockHTLC {
        Recipient: recipient,
        Hash: nil,
        ExpiryTimeMillis: 0,
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.AssetLock_HTLC,
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

    // Test success
    lockInfoHTLC.Hash = hash
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockAsset(amstub, assetType, assetId, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockInfoHTLC.ExpiryTimeMillis = uint64(expiryTime.UnixNano()/(1000*1000))
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockAsset(amstub, assetType, assetId, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)
}

func TestFungibleAssetLockHTLC(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "cbdc"
    numUnits := 1000
    recipient := "Bob"
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

    // Test success
    lockSuccess, err = amcc.LockFungibleAssetHTLC(amstub, assetType, numUnits, recipient, hash, 0)         // Invalid expiry time: should still succeed
    require.NoError(t, err)
    require.True(t, lockSuccess)

    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockSuccess, err = amcc.LockFungibleAssetHTLC(amstub, assetType, numUnits, recipient, hash, expiryTime.UnixNano()/(1000*1000))
    require.NoError(t, err)
    require.True(t, lockSuccess)
}

func TestFungibleAssetLock(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "cbdc"
    numUnits := 1000
    recipient := "Bob"
    hash := []byte("j8r484r484")
    lockInfoHTLC := &common.AssetLockHTLC {
        Recipient: recipient,
        Hash: nil,
        ExpiryTimeMillis: 0,
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.AssetLock_HTLC,
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

    // Test success
    lockInfoHTLC.Hash = hash
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetType, numUnits, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockInfoHTLC.ExpiryTimeMillis = uint64(expiryTime.UnixNano()/(1000*1000))
    lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
    lockInfo.LockInfo = lockInfoBytes
    lockSuccess, err = amcc.LockFungibleAsset(amstub, assetType, numUnits, lockInfo)
    require.NoError(t, err)
    require.True(t, lockSuccess)
}

func TestIsAssetLocked(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "bond"
    assetId := "A001"
    recipient := "Bob"
    locker := "Alice"
    hash := []byte("j8r484r484")

    // Test failure when interop CC is not set
    lockSuccess, err := amcc.IsAssetLocked(amstub, assetType, assetId, recipient, locker)
    require.Error(t, err)
    require.False(t, lockSuccess)

    associateInteropCCInstance(amcc, amstub)
    creator, _ := amstub.GetCreator()
    fmt.Printf("Mock stub creator: %s\n", string(creator))

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

    // Test success of query
    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, assetId, recipient, hash, 0)
    require.NoError(t, err)
    require.True(t, lockSuccess)

    lockSuccess, err = amcc.IsAssetLocked(amstub, assetType, assetId, recipient, locker)
    require.NoError(t, err)
    require.True(t, lockSuccess)
}
