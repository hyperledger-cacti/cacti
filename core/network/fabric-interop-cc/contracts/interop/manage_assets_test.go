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
	"crypto/sha256"
	"encoding/base64"
	"time"

	"github.com/stretchr/testify/require"
	"github.com/golang/protobuf/proto"
	log "github.com/sirupsen/logrus"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/contracts/interop/protos-go/common"
)

const(
	defaultTimeLockSecs = 5 * 60      // 5 minutes
)

// function to generate "SHA256" hash for a given preimage
func generateHash(preimage string) string {
	hasher := sha256.New()
	hasher.Write([]byte(preimage))
	shaHash := hasher.Sum(nil)
	log.Info(fmt.Println("shaHash:", string(shaHash)))
	shaBase64 := base64.StdEncoding.EncodeToString(shaHash)
	log.Info(fmt.Println("Hash for the preimage ", preimage, " is ", shaBase64))
	return shaBase64
}

func TestLockAsset(t *testing.T) {
	ctx, chaincodeStub, interopcc := prepMockStub()

	assetType := "bond"
	assetId := "A001"
	recipient := "Bob"
	locker := "Alice"
	preimage := "abcd"
	hashBase64 := generateHash(preimage)
	currentTimeSecs := uint64(time.Now().Unix())

	lockInfoHTLC := &common.AssetLockHTLC {
		Hash: []byte(hashBase64),
		// lock for next 5 minutes
		ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs,
		TimeSpec: common.AssetLockHTLC_EPOCH,
	}
	lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)

	assetAgreement := &common.AssetExchangeAgreement {
		Type: assetType,
		Id: assetId,
		Recipient: recipient,
		Locker: locker,
	}
	assetAgreementBytes, _ := proto.Marshal(assetAgreement)

	// chaincodeStub.GetStateReturns should return nil to be able to lock the asset
	chaincodeStub.GetStateReturns(nil, nil)
	// Test success with asset agreement specified properly
	_, err := interopcc.LockAsset(ctx, string(assetAgreementBytes), string(lockInfoBytes))
	require.NoError(t, err)

	assetLockVal := AssetLockValue{Locker: locker, Recipient: recipient}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)
	// Test failure by trying to lock an asset that is already locked
	_, err = interopcc.LockAsset(ctx, string(assetAgreementBytes), string(lockInfoBytes))
	require.Error(t, err)
	log.Info(fmt.Println("Test failed as expected with error:", err))

	// no need to set chaincodeStub.GetStateReturns below since the error is hit before GetState() ledger access in LockAsset()
	lockInfoHTLC = &common.AssetLockHTLC {
		Hash: []byte(hashBase64),
		// lock for next 5 mintues
		ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs,
		// TimeSpec of AssetLockHTLC_DURATION is not currently supported
		TimeSpec: common.AssetLockHTLC_DURATION,
	}
	lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
	// Test failure with lock information not specified properly
	_, err = interopcc.LockAsset(ctx, string(assetAgreementBytes), string(lockInfoBytes))
	require.Error(t, err)
	log.Info(fmt.Println("Test failed as expected with error:", err))
}

func TestUnLockAsset(t *testing.T) {
	ctx, chaincodeStub, interopcc := prepMockStub()

	assetType := "bond"
	assetId := "A001"
	recipient := "Bob"
	locker := "Alice"
	preimage := "abcd"
	hashBase64 := generateHash(preimage)
	currentTimeSecs := uint64(time.Now().Unix())

	lockInfoHTLC := &common.AssetLockHTLC {
		Hash: []byte(hashBase64),
		// lock for sometime in the past for testing UnLockAsset functionality
		ExpiryTimeSecs: currentTimeSecs - defaultTimeLockSecs,
		TimeSpec: common.AssetLockHTLC_EPOCH,
	}
	lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)

	assetAgreement := &common.AssetExchangeAgreement {
		Type: assetType,
		Id: assetId,
		Recipient: recipient,
		Locker: locker,
	}
	assetAgreementBytes, _ := proto.Marshal(assetAgreement)

	// chaincodeStub.GetStateReturns should return nil to be able to lock the asset
	chaincodeStub.GetStateReturns(nil, nil)
	// Lock asset as per the agreement specified
	_, err := interopcc.LockAsset(ctx, string(assetAgreementBytes), string(lockInfoBytes))
	require.NoError(t, err)
	log.Info(fmt.Println("Completed locking as asset. Proceed to test unlock asset."))

	assetLockVal := AssetLockValue{Locker: locker, Recipient: recipient}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)
	// Test success with asset agreement specified properly
	err = interopcc.UnLockAsset(ctx, string(assetAgreementBytes))
	require.NoError(t, err)

	// Let GetState() to return nil to simulate the case that unlocking an asset which is not locked is not possible
	chaincodeStub.GetStateReturns(nil, nil)
	// Test failure with asset agreement specified for unlock which was not locked earlier
	err = interopcc.UnLockAsset(ctx, string(assetAgreementBytes))
	require.Error(t, err)
	log.Info(fmt.Println("Test failed as expected with error:", err))

	// Assume that the asset is locked by Alice for Bob; then trying to unlock the asset by Alice for Charlie should fail since the locking is done for a different recipient
	assetLockVal = AssetLockValue{Locker: locker, Recipient: "Charlie"}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)
	// Test failure with asset id being locked for a different <locker, recipient>
	err = interopcc.UnLockAsset(ctx, string(assetAgreementBytes))
	require.Error(t, err)
	log.Info(fmt.Println("Test failed as expected with error:", err))

	// lock for sometime in the future for testing UnLockAsset functionality
	assetLockVal = AssetLockValue{Locker: locker, Recipient: recipient, Hash: hashBase64, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)
	// Test failure of unlock asset with expiry time not yet elapsed
	err = interopcc.UnLockAsset(ctx, string(assetAgreementBytes))
	require.Error(t, err)
	log.Info(fmt.Println("Test failed as expected with error:", err))
}

func TestIsAssetLocked(t *testing.T) {
	ctx, chaincodeStub, interopcc := prepMockStub()

	assetType := "bond"
	assetId := "A001"
	recipient := "Bob"
	locker := "Alice"
	preimage := "abcd"
	hashBase64 := generateHash(preimage)
	currentTimeSecs := uint64(time.Now().Unix())

	lockInfoHTLC := &common.AssetLockHTLC {
		Hash: []byte(hashBase64),
		ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs,
		TimeSpec: common.AssetLockHTLC_EPOCH,
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
	_, err := interopcc.LockAsset(ctx, string(assetAgreementBytes), string(lockInfoBytes))
	require.NoError(t, err)
	log.Info(fmt.Println("Completed locking as asset. Proceed to test if asset is locked or not."))


	assetLockVal := AssetLockValue{Locker: locker, Recipient: "Charlie"}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)
	// Test failure with asset agreement not specified properly
	isAssetLocked, err := interopcc.IsAssetLocked(ctx, string(assetAgreementBytes))
	require.Error(t, err)
	require.False(t, isAssetLocked)
	log.Info(fmt.Println("Test failed as expected with error:", err))


	assetLockVal = AssetLockValue{Locker: locker, Recipient: recipient, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)
	// Test success with asset agreement specified properly
	isAssetLocked, err = interopcc.IsAssetLocked(ctx, string(assetAgreementBytes))
	require.NoError(t, err)
	require.True(t, isAssetLocked)
	log.Info(fmt.Println("Test succeeded as expected since the asset agreement is specified properly."))


	assetLockVal = AssetLockValue{Locker: locker, Recipient: recipient, ExpiryTimeSecs: currentTimeSecs - defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)
	// Test failure with expiry time elapsed already
	isAssetLocked, err = interopcc.IsAssetLocked(ctx, string(assetAgreementBytes))
	require.Error(t, err)
	require.False(t, isAssetLocked)
	log.Info(fmt.Println("Test failed as expected with error:", err))


	assetLockVal = AssetLockValue{Locker: "Dave", Recipient: recipient, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)
	// Test failure with asset agreement not specified properly
	isAssetLocked, err = interopcc.IsAssetLocked(ctx, string(assetAgreementBytes))
	require.Error(t, err)
	require.False(t, isAssetLocked)
	log.Info(fmt.Println("Test failed as expected with error:", err))


	assetAgreement = &common.AssetExchangeAgreement {
		Type: assetType,
		Id: assetId,
		Recipient: recipient,
		// arbitrary locker specification
		Locker: "*",
	}
	assetAgreementBytes, _ = proto.Marshal(assetAgreement)
	// Test success with asset agreement specified to include arbitrary locker
	isAssetLocked, err = interopcc.IsAssetLocked(ctx, string(assetAgreementBytes))
	require.NoError(t, err)
	require.True(t, isAssetLocked)
	log.Info(fmt.Println("Test succeeded as expected since the asset agreement is specified to include arbitrary locker."))


	assetAgreement = &common.AssetExchangeAgreement {
		Type: assetType,
		Id: assetId,
		// wrong recipient specification
		Recipient: "Charlie",
		// arbitrary locker specification
		Locker: "*",
	}
	assetAgreementBytes, _ = proto.Marshal(assetAgreement)
	// Test failure with asset agreement specified to include arbitrary locker and wrong recipient
	isAssetLocked, err = interopcc.IsAssetLocked(ctx, string(assetAgreementBytes))
	require.Error(t, err)
	require.False(t, isAssetLocked)
	log.Info(fmt.Println("Test failed as expected with error:", err))


	assetAgreement = &common.AssetExchangeAgreement {
		Type: assetType,
		Id: assetId,
		// arbitrary recipient specification
		Recipient: "*",
		Locker: "Dave",
	}
	assetAgreementBytes, _ = proto.Marshal(assetAgreement)
	// Test success with asset agreement specified to include arbitrary recipient
	isAssetLocked, err = interopcc.IsAssetLocked(ctx, string(assetAgreementBytes))
	require.NoError(t, err)
	require.True(t, isAssetLocked)
	log.Info(fmt.Println("Test succeeded as expected since the asset agreement is specified to include arbitrary recipient."))


	assetAgreement = &common.AssetExchangeAgreement {
		Type: assetType,
		Id: assetId,
		// arbitrary recipient specification
		Recipient: "*",
		// wrong locker specification
		Locker: "Charlie",
	}
	assetAgreementBytes, _ = proto.Marshal(assetAgreement)
	// Test failure with asset agreement specified to include arbitrary locker and wrong locker
	isAssetLocked, err = interopcc.IsAssetLocked(ctx, string(assetAgreementBytes))
	require.Error(t, err)
	require.False(t, isAssetLocked)
	log.Info(fmt.Println("Test failed as expected with error:", err))


	assetAgreement = &common.AssetExchangeAgreement {
		Type: assetType,
		Id: assetId,
		// arbitrary recipient specification
		Recipient: "*",
		// arbitrary locker specification
		Locker: "*",
	}
	assetAgreementBytes, _ = proto.Marshal(assetAgreement)
	// Test success with asset agreement specified to include arbitrary locker
	isAssetLocked, err = interopcc.IsAssetLocked(ctx, string(assetAgreementBytes))
	require.NoError(t, err)
	require.True(t, isAssetLocked)
	log.Info(fmt.Println("Test succeeded as expected since the asset agreement is specified to include arbitrary locker and arbitrary recipient."))
}

func TestClaimAsset(t *testing.T) {
	ctx, chaincodeStub, interopcc := prepMockStub()

	assetType := "bond"
	assetId := "A001"
	recipient := "Bob"
	locker := "Alice"
	preimage := "abcd"
	hashBase64 := generateHash(preimage)
	preimageBase64 := base64.StdEncoding.EncodeToString([]byte(preimage))
	currentTimeSecs := uint64(time.Now().Unix())

	lockInfoHTLC := &common.AssetLockHTLC {
		Hash: []byte(hashBase64),
		ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs,
		TimeSpec: common.AssetLockHTLC_EPOCH,
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
		HashPreimage: []byte(preimageBase64),
	}
	claimInfoBytes, _ := proto.Marshal(claimInfo)

	// Lock asset as per the agreement specified
	_, err := interopcc.LockAsset(ctx, string(assetAgreementBytes), string(lockInfoBytes))
	require.NoError(t, err)
	log.Info(fmt.Println("Completed locking as asset. Proceed to test claim asset."))

	assetLockVal := AssetLockValue{Locker: locker, Recipient: recipient, Hash: hashBase64, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)

	// Test success with asset agreement specified properly
	err = interopcc.ClaimAsset(ctx, string(assetAgreementBytes), string(claimInfoBytes))
	require.NoError(t, err)
	log.Info(fmt.Println("Test success as expected since the asset agreement and claim information are specified properly."))

	assetLockVal = AssetLockValue{Locker: locker, Recipient: recipient, Hash: hashBase64, ExpiryTimeSecs: currentTimeSecs - defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)
	// Test failure with expiry time elapsed to claim the asset
	err = interopcc.ClaimAsset(ctx, string(assetAgreementBytes), string(claimInfoBytes))
	require.Error(t, err)
	log.Info(fmt.Println("Test failed as expected with error:", err))

	wrongPreimage := "abc"
	wrongPreimageBase64 := base64.StdEncoding.EncodeToString([]byte(wrongPreimage))
	wrongClaimInfo := &common.AssetClaimHTLC {
		HashPreimage: []byte(wrongPreimageBase64),
	}
	wrongClaimInfoBytes, _ := proto.Marshal(wrongClaimInfo)

	assetLockVal = AssetLockValue{Locker: locker, Recipient: recipient, Hash: hashBase64, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)
	// Test failure with claim information (i.e., preimage) not specified properly
	err = interopcc.ClaimAsset(ctx, string(assetAgreementBytes), string(wrongClaimInfoBytes))
	require.Error(t, err)
	log.Info(fmt.Println("Test failed as expected with error:", err))

	assetAgreement.Locker = "Charlie"
	assetAgreementBytes, _ = proto.Marshal(assetAgreement)

	// Test failure with asset agreement specified not properly
	err = interopcc.ClaimAsset(ctx, string(assetAgreementBytes), string(claimInfoBytes))
	require.Error(t, err)
	log.Info(fmt.Println("Test failed as expected with error:", err))

	assetAgreement.Locker = locker
	assetAgreement.Id = "A002"
	assetAgreementBytes, _ = proto.Marshal(assetAgreement)
	chaincodeStub.GetStateReturns(nil, nil)

	// Test failure with asset agreement (i.e., asset id) specified not properly
	err = interopcc.ClaimAsset(ctx, string(assetAgreementBytes), string(claimInfoBytes))
	require.Error(t, err)
	log.Info(fmt.Println("Test failed as expected with error:", err))
}
