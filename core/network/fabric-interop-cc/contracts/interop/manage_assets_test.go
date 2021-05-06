/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package main

import (
	"encoding/json"
	"fmt"
	"testing"

	"github.com/stretchr/testify/require"
	"github.com/golang/protobuf/proto"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/contracts/interop/protos-go/common"
)

func TestLockAsset(t *testing.T) {
	ctx, _, interopcc := prepMockStub()

	assetType := "bond"
	assetId := "A001"
	recipient := "Bob"
	locker := "Alice"
	hash := []byte("j8r484r484")

	lockInfoHTLC := &common.AssetLockHTLC {
		Hash: hash,
		ExpiryTimeSecs: 0,
	}
	lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)

	assetAgreement := &common.AssetExchangeAgreement {
		Type: assetType,
		Id: assetId,
		Recipient: recipient,
		Locker: locker,
	}
	assetAgreementBytes, _ := proto.Marshal(assetAgreement)

	// Test success with asset agreement specified properly
	err := interopcc.LockAsset(ctx, string(assetAgreementBytes), string(lockInfoBytes))
	require.NoError(t, err)
}

func TestUnLockAsset(t *testing.T) {
	ctx, chaincodeStub, interopcc := prepMockStub()

	assetType := "bond"
	assetId := "A001"
	recipient := "Bob"
	locker := "Alice"
	hash := []byte("j8r484r484")

	lockInfoHTLC := &common.AssetLockHTLC {
		Hash: hash,
		ExpiryTimeSecs: 0,
	}
	lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)

	assetAgreement := &common.AssetExchangeAgreement {
		Type: assetType,
		Id: assetId,
		Recipient: recipient,
		Locker: locker,
	}
	assetAgreementBytes, _ := proto.Marshal(assetAgreement)

	// Lock asset as per the agreement specified
	err := interopcc.LockAsset(ctx, string(assetAgreementBytes), string(lockInfoBytes))
	require.NoError(t, err)
	fmt.Println("Completed locking as asset. Proceed to test unlock asset.")

	assetLockVal := AssetLockValue{Locker: locker, Recipient: recipient}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)

	// Test success with asset agreement specified properly
	err = interopcc.UnLockAsset(ctx, string(assetAgreementBytes))
	require.NoError(t, err)
}

func TestIsAssetLocked(t *testing.T) {
	ctx, chaincodeStub, interopcc := prepMockStub()

	assetType := "bond"
	assetId := "A001"
	recipient := "Bob"
	locker := "Alice"
	hash := []byte("j8r484r484")

	lockInfoHTLC := &common.AssetLockHTLC {
		Hash: hash,
		ExpiryTimeSecs: 0,
	}
	lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)

	assetAgreement := &common.AssetExchangeAgreement {
		Type: assetType,
		Id: assetId,
		Recipient: recipient,
		Locker: locker,
	}
	assetAgreementBytes, _ := proto.Marshal(assetAgreement)

	// Lock asset as per the agreement specified
	err := interopcc.LockAsset(ctx, string(assetAgreementBytes), string(lockInfoBytes))
	require.NoError(t, err)
	fmt.Println("Completed locking as asset. Proceed to test if asset is locked or not.")

	assetLockVal := AssetLockValue{Locker: locker, Recipient: "Charlie"}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)

	// Test failure with asset agreement not specified properly
	isAssetLocked, err := interopcc.IsAssetLocked(ctx, string(assetAgreementBytes))
	require.Error(t, err)
	require.False(t, isAssetLocked)
	fmt.Println("Test failed as expected with error:", err)

	assetLockVal = AssetLockValue{Locker: locker, Recipient: recipient}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)

	// Test success with asset agreement specified properly
	isAssetLocked, err = interopcc.IsAssetLocked(ctx, string(assetAgreementBytes))
	require.NoError(t, err)
	require.True(t, isAssetLocked)
	fmt.Println("Test succeeded as expected since the asset agreement is specified properly.")

	assetLockVal = AssetLockValue{Locker: "Dave", Recipient: recipient}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)

	// Test failure with asset agreement not specified properly
	isAssetLocked, err = interopcc.IsAssetLocked(ctx, string(assetAgreementBytes))
	require.Error(t, err)
	require.False(t, isAssetLocked)
	fmt.Println("Test failed as expected with error:", err)
}

func TestClaimAsset(t *testing.T) {
	ctx, chaincodeStub, interopcc := prepMockStub()

	assetType := "bond"
	assetId := "A001"
	recipient := "Bob"
	locker := "Alice"
	hash := []byte("j8r484r484")
	preimage := []byte("j8r484r484")

	lockInfoHTLC := &common.AssetLockHTLC {
		Hash: hash,
		ExpiryTimeSecs: 300,
	}
	lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)

	assetAgreement := &common.AssetExchangeAgreement {
		Type: assetType,
		Id: assetId,
		Recipient: recipient,
		Locker: locker,
	}
	assetAgreementBytes, _ := proto.Marshal(assetAgreement)

	claimInfo := &common.AssetClaimHTLC {
		HashPreimage: preimage,
	}
	claimInfoBytes, _ := proto.Marshal(claimInfo)

	// Lock asset as per the agreement specified
	err := interopcc.LockAsset(ctx, string(assetAgreementBytes), string(lockInfoBytes))
	require.NoError(t, err)
	fmt.Println("Completed locking as asset. Proceed to test claim asset.")

	assetLockVal := AssetLockValue{Locker: locker, Recipient: recipient, Hash: string(hash), ExpiryTimeSecs: 300}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)

	// Test success with asset agreement specified properly
	err = interopcc.ClaimAsset(ctx, string(assetAgreementBytes), string(claimInfoBytes))
	require.NoError(t, err)
	fmt.Println("Test success as expected since the asset agreement is specified properly.")

	assetAgreement.Locker = "Charlie"
	assetAgreementBytes, _ = proto.Marshal(assetAgreement)

	// Test failure with asset agreement specified not properly
	err = interopcc.ClaimAsset(ctx, string(assetAgreementBytes), string(claimInfoBytes))
	require.Error(t, err)
	fmt.Println("Test failed as expected with error:", err)

	assetAgreement.Locker = locker
	assetAgreement.Id = "A002"
	assetAgreementBytes, _ = proto.Marshal(assetAgreement)
	chaincodeStub.GetStateReturns(nil, nil)

	// Test failure with asset agreement specified not properly
	err = interopcc.ClaimAsset(ctx, string(assetAgreementBytes), string(claimInfoBytes))
	require.Error(t, err)
	fmt.Println("Test failed as expected with error:", err)
}

func TestLockFungibleAsset(t *testing.T) {
	ctx, chaincodeStub, interopcc := prepMockStub()

	assetType := "CBDC"
	numUnits := uint64(10)
	recipient := "Bob"
	locker := "Alice"
	hash := []byte("j8r484r484")

	lockInfoHTLC := &common.AssetLockHTLC {
		Hash: hash,
		ExpiryTimeSecs: 0,
	}
	lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)

	assetAgreement := &common.FungibleAssetExchangeAgreement {
		Type: assetType,
		NumUnits: numUnits,
		Recipient: recipient,
		Locker: locker,
	}
	assetAgreementBytes, _ := proto.Marshal(assetAgreement)

	chaincodeStub.GetStateReturns(nil, nil)

	// Test success with fungible asset agreement specified properly
	err := interopcc.LockFungibleAsset(ctx, string(assetAgreementBytes), string(lockInfoBytes))
	require.NoError(t, err)
	fmt.Println("Test success as expected since the fungible asset agreement is specified properly.")

	assetLockValueChunks := make([]FungibleAssetLockValueChunk, 0)
	assetLockValueChunk := FungibleAssetLockValueChunk{Locker: locker, Recipient: recipient, Hash: string(lockInfoHTLC.Hash), ExpiryTimeSecs: lockInfoHTLC.ExpiryTimeSecs}
	assetLockValueChunks = append(assetLockValueChunks, assetLockValueChunk)
	assetLockVal := FungibleAssetLockValue{FungibleAssetLockValueChunks: assetLockValueChunks}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)

	// Test success with the same fungible asset agreement specified
	err = interopcc.LockFungibleAsset(ctx, string(assetAgreementBytes), string(lockInfoBytes))
	require.NoError(t, err)
	fmt.Println("Test success as expected since the fungible asset agreement is specified properly.")
}
