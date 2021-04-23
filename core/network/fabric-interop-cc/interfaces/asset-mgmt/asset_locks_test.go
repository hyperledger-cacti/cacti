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
)


const (
    interopCCId = "interopcc"
)

// Mock function to simulate the Fabric Interop CC
type InteropCC struct {
}

func (cc *InteropCC) Init(stub shim.ChaincodeStubInterface) pb.Response {
    fmt.Println("Initializing Mock Fabric Interop CC")
    return shim.Success(nil)
}

func (cc *InteropCC) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
    fmt.Println("Invoking Mock Fabric Interop CC")
    function, _ := stub.GetFunctionAndParameters()
    if function == "LockAssetHTLC" {
        return shim.Success(nil)
    }
    return shim.Error(fmt.Sprintf("Invalid invoke function name: %s", function))
}


// Utility functions
func createAssetMgmtCCInstance() (*AssetManagement, *shimtest.MockStub) {
    amcc := new(AssetManagement)
    mockStub := shimtest.NewMockStub("Asset Management chaincode", amcc)
    return amcc, mockStub
}

func associateInteropCCInstance(amcc *AssetManagement, stub *shimtest.MockStub) {
    icc := new(InteropCC)
    mockStub := shimtest.NewMockStub(interopCCId, icc)
    amcc.interopChaincodeId = interopCCId
    stub.MockPeerChaincode(interopCCId, mockStub, mockStub.GetChannelID())
    return
}


// Unit test functions
func TestAssetLockHTLC(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "bond"
    assetId := "A001"
    target := "Bob"
    hash := []byte("j8r484r484")

    // Test failure when interop CC is not set
    lockSuccess, err := amcc.LockAssetHTLC(amstub, assetType, assetId, target, hash, 0)
    require.Error(t, err)
    require.False(t, lockSuccess)

    associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    lockSuccess, err = amcc.LockAssetHTLC(amstub, "", assetId, target, hash, 0)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, "", target, hash, 0)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, assetId, "", hash, 0)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, assetId, target, []byte{}, 0)
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Test success
    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, assetId, target, hash, 0)         // Invalid expiry time: should still succeed
    require.NoError(t, err)
    require.True(t, lockSuccess)

    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, assetId, target, hash, expiryTime.UnixNano()/(1000*1000))
    require.NoError(t, err)
    require.True(t, lockSuccess)
}

/*func TestAssetLock(t *testing.T) {
    amcc, amstub := createAssetMgmtCCInstance()
    assetType := "bond"
    assetId := "A001"
    target := "Bob"
    hash := []byte("j8r484r484")

    // Test failure when interop CC is not set
    lockSuccess, err := amcc.LockAsset(amstub, assetType, assetId, target, hash, 0)
    require.Error(t, err)
    require.False(t, lockSuccess)

    associateInteropCCInstance(amcc, amstub)

    // Test failures when any of the essential parameters are not supplied
    lockSuccess, err = amcc.LockAssetHTLC(amstub, "", assetId, target, hash, 0)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, "", target, hash, 0)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, assetId, "", hash, 0)
    require.Error(t, err)
    require.False(t, lockSuccess)

    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, assetId, target, []byte{}, 0)
    require.Error(t, err)
    require.False(t, lockSuccess)

    // Test success
    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, assetId, target, hash, 0)         // Invalid expiry time: should still succeed
    require.NoError(t, err)
    require.True(t, lockSuccess)

    currTime := time.Now()
    expiryTime := currTime.Add(time.Minute)     // expires in 1 minute
    lockSuccess, err = amcc.LockAssetHTLC(amstub, assetType, assetId, target, hash, expiryTime.UnixNano()/(1000*1000))
    require.NoError(t, err)
    require.True(t, lockSuccess)
}*/
