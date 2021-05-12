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
	"encoding/base64"
	"time"

	"github.com/stretchr/testify/require"
	"github.com/golang/protobuf/proto"
	log "github.com/sirupsen/logrus"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/contracts/interop/protos-go/common"
)

const(
	defaultTimeLockSecs = 5 * 60		// 5 minutes
)

func TestLockAsset(t *testing.T) {
	ctx, chaincodeStub, interopcc := prepMockStub()

	assetType := "bond"
	assetId := "A001"
	recipient := "Bob"
	locker := "Alice"
	preimage := "abcd"
	hashBase64 := generateSHA256HashInBase64Form(preimage)
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
	hashBase64 := generateSHA256HashInBase64Form(preimage)
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
	hashBase64 := generateSHA256HashInBase64Form(preimage)
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
	hashBase64 := generateSHA256HashInBase64Form(preimage)
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

func TestUnLockAssetUsingContractId(t *testing.T) {
	ctx, chaincodeStub, interopcc := prepMockStub()

	assetType := "bond"
	assetId := "A001"
	locker := "Alice"
	recipient := "Bob"
	preimage := "abcd"

	hashBase64 := generateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())

	assetAgreement := &common.AssetExchangeAgreement {
		Type: assetType,
		Id: assetId,
		Recipient: recipient,
		Locker: locker,
	}
	assetLockKey, contractId := generateAssetLockKeyAndContractId(assetAgreement)

	// Test failure with GetState(contractId) fail to read the world state
	chaincodeStub.GetStateReturnsOnCall(0, nil, fmt.Errorf("unable to retrieve contractId %s", contractId))
	err := interopcc.UnLockAssetUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "unable to retrieve contractId " + contractId)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with not a valid contractId being passed as the arguement
	chaincodeStub.GetStateReturnsOnCall(1, nil, nil)
	err = interopcc.UnLockAssetUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "no contractId " + contractId + " exists on the ledger")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with GetState(assetLockKey) fail to read from the world state
	assetLockKeyBytes, _ := json.Marshal(assetLockKey)
	chaincodeStub.GetStateReturnsOnCall(2, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(3, nil, fmt.Errorf("unable to retrieve asset %s", assetLockKey))
	err = interopcc.UnLockAssetUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "failed to retrieve from the world state: unable to retrieve asset " + assetLockKey)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure under the scenario that the contractId is valid but there is no asset locked with the assetLockKey
	chaincodeStub.GetStateReturnsOnCall(4, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(5, nil, nil)
	err = interopcc.UnLockAssetUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "contractId " + contractId + " is not associated with any currently locked asset")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure for asset unlock exercised with expiry time not yet elapsed
	chaincodeStub.GetStateReturnsOnCall(6, assetLockKeyBytes, nil)
	assetLockVal := AssetLockValue{Locker: locker, Recipient: recipient, Hash: hashBase64, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(7, assetLockValBytes, nil)
	err = interopcc.UnLockAssetUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "cannot unlock asset associated with the contractId " + contractId + " as the expiry time is not yet elapsed")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with DelState failing on assetLockKey
	chaincodeStub.GetStateReturnsOnCall(8, assetLockKeyBytes, nil)
	assetLockVal = AssetLockValue{Locker: locker, Recipient: recipient, Hash: hashBase64, ExpiryTimeSecs: currentTimeSecs - defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(9, assetLockValBytes, nil)
	chaincodeStub.DelStateReturnsOnCall(0, fmt.Errorf("unable to delete asset with key %s from world state", assetLockKey))
	err = interopcc.UnLockAssetUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "failed to delete lock for the asset associated with the contractId " +
		contractId + ": unable to delete asset with key " + assetLockKey + " from world state")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with DelState failing on contractId
	chaincodeStub.GetStateReturnsOnCall(10, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(11, assetLockValBytes, nil)
	chaincodeStub.DelStateReturnsOnCall(1, nil)
	chaincodeStub.DelStateReturnsOnCall(2, fmt.Errorf("unable to delete contractId from world state"))
	err = interopcc.UnLockAssetUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "failed to delete the contractId " +
		contractId + " as part of asset unlock: unable to delete contractId from world state")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test success with asset being unlocked using contractId
	chaincodeStub.GetStateReturnsOnCall(12, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(13, assetLockValBytes, nil)
	chaincodeStub.DelStateReturnsOnCall(3, nil)
	chaincodeStub.DelStateReturnsOnCall(4, nil)
	err = interopcc.UnLockAssetUsingContractId(ctx, contractId)
	require.NoError(t, err)
	fmt.Printf("Test success as expected since a valid contractId is specified.\n")
}

func TestClaimAssetUsingContractId(t *testing.T) {
	ctx, chaincodeStub, interopcc := prepMockStub()

	assetType := "bond"
	assetId := "A001"
	locker := "Alice"
	recipient := "Bob"
	preimage := "abcd"

	hashBase64 := generateSHA256HashInBase64Form(preimage)
	preimageBase64 := base64.StdEncoding.EncodeToString([]byte(preimage))
	currentTimeSecs := uint64(time.Now().Unix())

	assetAgreement := &common.AssetExchangeAgreement {
		Type: assetType,
		Id: assetId,
		Recipient: recipient,
		Locker: locker,
	}
	assetLockKey, contractId := generateAssetLockKeyAndContractId(assetAgreement)

	claimInfo := &common.AssetClaimHTLC {
		HashPreimage: []byte(preimageBase64),
	}
	claimInfoBytes, _ := proto.Marshal(claimInfo)

	// Test failure with GetState(contractId) fail to read the world state
	chaincodeStub.GetStateReturnsOnCall(0, nil, fmt.Errorf("unable to retrieve contractId %s", contractId))
	err := interopcc.ClaimAssetUsingContractId(ctx, contractId, string(claimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "unable to retrieve contractId " + contractId)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with not a valid contractId being passed as the arguement
	chaincodeStub.GetStateReturnsOnCall(1, nil, nil)
	err = interopcc.ClaimAssetUsingContractId(ctx, contractId, string(claimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "no contractId " + contractId + " exists on the ledger")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with GetState(assetLockKey) fail to read from the world state
	assetLockKeyBytes, _ := json.Marshal(assetLockKey)
	chaincodeStub.GetStateReturnsOnCall(2, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(3, nil, fmt.Errorf("unable to retrieve asset %s", assetLockKey))
	err = interopcc.ClaimAssetUsingContractId(ctx, contractId, string(claimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "failed to retrieve from the world state: unable to retrieve asset " + assetLockKey)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure under the scenario that the contractId is valid but there is no asset locked with the assetLockKey
	chaincodeStub.GetStateReturnsOnCall(4, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(5, nil, nil)
	err = interopcc.ClaimAssetUsingContractId(ctx, contractId, string(claimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "contractId " + contractId + " is not associated with any currently locked asset")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure for asset claim exercised with expiry time elapsed already
	chaincodeStub.GetStateReturnsOnCall(6, assetLockKeyBytes, nil)
	assetLockVal := AssetLockValue{Locker: locker, Recipient: recipient, Hash: hashBase64, ExpiryTimeSecs: currentTimeSecs - defaultTimeLockSecs}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(7, assetLockValBytes, nil)
	err = interopcc.ClaimAssetUsingContractId(ctx, contractId, string(claimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "cannot claim asset associated with contractId " + contractId + " as the expiry time is already elapsed")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with claim information (i.e., preimage) not specified properly
	chaincodeStub.GetStateReturnsOnCall(8, assetLockKeyBytes, nil)
	wrongPreimage := "abc"
	wrongPreimageBase64 := base64.StdEncoding.EncodeToString([]byte(wrongPreimage))
	wrongClaimInfo := &common.AssetClaimHTLC {
		HashPreimage: []byte(wrongPreimageBase64),
	}
	wrongClaimInfoBytes, _ := proto.Marshal(wrongClaimInfo)
	assetLockVal = AssetLockValue{Locker: locker, Recipient: recipient, Hash: hashBase64, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(9, assetLockValBytes, nil)
	err = interopcc.ClaimAssetUsingContractId(ctx, contractId, string(wrongClaimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "cannot claim asset associated with contractId " + contractId + " as the hash preimage is not matching")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with DelState failing on assetLockKey
	chaincodeStub.GetStateReturnsOnCall(10, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(11, assetLockValBytes, nil)
	chaincodeStub.DelStateReturnsOnCall(0, fmt.Errorf("unable to delete asset with key %s from world state", assetLockKey))
	err = interopcc.ClaimAssetUsingContractId(ctx, contractId, string(claimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "failed to delete lock for the asset associated with the contractId " +
		contractId + ": unable to delete asset with key " + assetLockKey + " from world state")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with DelState failing on contractId
	chaincodeStub.GetStateReturnsOnCall(12, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(13, assetLockValBytes, nil)
	chaincodeStub.DelStateReturnsOnCall(1, nil)
	chaincodeStub.DelStateReturnsOnCall(2, fmt.Errorf("unable to delete contractId from world state"))
	err = interopcc.ClaimAssetUsingContractId(ctx, contractId, string(claimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "failed to delete the contractId " +
		contractId + " as part of asset claim: unable to delete contractId from world state")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test success with asset being claimed using contractId
	chaincodeStub.GetStateReturnsOnCall(14, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(15, assetLockValBytes, nil)
	chaincodeStub.DelStateReturnsOnCall(3, nil)
	chaincodeStub.DelStateReturnsOnCall(4, nil)
	err = interopcc.ClaimAssetUsingContractId(ctx, contractId, string(claimInfoBytes))
	require.NoError(t, err)
	fmt.Printf("Test success as expected since a valid contractId is specified.\n")
}

func TestIsAssetLockedUsingContractId(t *testing.T) {
	ctx, chaincodeStub, interopcc := prepMockStub()

	assetType := "bond"
	assetId := "A001"
	locker := "Alice"
	recipient := "Bob"
	preimage := "abcd"

	hashBase64 := generateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())

	assetAgreement := &common.AssetExchangeAgreement {
		Type: assetType,
		Id: assetId,
		Recipient: recipient,
		Locker: locker,
	}
	assetLockKey, contractId := generateAssetLockKeyAndContractId(assetAgreement)

	// Test failure with GetState(contractId) fail to read the world state
	chaincodeStub.GetStateReturnsOnCall(0, nil, fmt.Errorf("unable to retrieve contractId %s", contractId))
	isAssetLocked, err := interopcc.IsAssetLockedUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "unable to retrieve contractId " + contractId)
	require.False(t, isAssetLocked)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with not a valid contractId being passed as the arguement
	chaincodeStub.GetStateReturnsOnCall(1, nil, nil)
	isAssetLocked, err = interopcc.IsAssetLockedUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "no contractId " + contractId + " exists on the ledger")
	require.False(t, isAssetLocked)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with GetState(assetLockKey) fail to read from the world state
	assetLockKeyBytes, _ := json.Marshal(assetLockKey)
	chaincodeStub.GetStateReturnsOnCall(2, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(3, nil, fmt.Errorf("unable to retrieve asset %s", assetLockKey))
	isAssetLocked, err = interopcc.IsAssetLockedUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "failed to retrieve from the world state: unable to retrieve asset " + assetLockKey)
	require.False(t, isAssetLocked)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure under the scenario that the contractId is valid but there is no asset locked with the assetLockKey
	chaincodeStub.GetStateReturnsOnCall(4, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(5, nil, nil)
	isAssetLocked, err = interopcc.IsAssetLockedUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "contractId " + contractId + " is not associated with any currently locked asset")
	require.False(t, isAssetLocked)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure for query if asset is locked with lock expiry time elapsed already
	chaincodeStub.GetStateReturnsOnCall(6, assetLockKeyBytes, nil)
	assetLockVal := AssetLockValue{Locker: locker, Recipient: recipient, Hash: hashBase64, ExpiryTimeSecs: currentTimeSecs - defaultTimeLockSecs}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(7, assetLockValBytes, nil)
	isAssetLocked, err = interopcc.IsAssetLockedUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "expiry time for asset associated with contractId " + contractId + " is already elapsed")
	require.False(t, isAssetLocked)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test success with asset being queried using contractId
	chaincodeStub.GetStateReturnsOnCall(8, assetLockKeyBytes, nil)
	assetLockVal = AssetLockValue{Locker: locker, Recipient: recipient, Hash: hashBase64, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(9, assetLockValBytes, nil)
	isAssetLocked, err = interopcc.IsAssetLockedUsingContractId(ctx, contractId)
	require.NoError(t, err)
	require.True(t, isAssetLocked)
	fmt.Printf("Test success as expected since a valid contractId is specified.\n")
}

func TestLockFungibleAsset(t *testing.T) {
	ctx, chaincodeStub, interopcc := prepMockStub()

	assetType := "cbdc"
	numUnits := uint64(10)
	locker := "Alice"
	recipient := "Bob"
	preimage := "abcd"

	hashBase64 := generateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())

	assetAgreement := &common.FungibleAssetExchangeAgreement {
		Type: assetType,
		NumUnits: numUnits,
		Locker: locker,
		Recipient: recipient,
	}
	assetAgreementBytes, _ := proto.Marshal(assetAgreement)
	contractId := generateFungibleAssetLockContractId(assetAgreement)

	// Test failure with TimeSpec that is part of lock information not being currently supported
	// no need to set chaincodeStub.GetStateReturns below since the error is hit before GetState() ledger access
	lockInfoHTLC := &common.AssetLockHTLC {
		Hash: []byte(hashBase64),
		// lock for next 5 mintues
		ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs,
		// TimeSpec of AssetLockHTLC_DURATION is not currently supported
		TimeSpec: common.AssetLockHTLC_DURATION,
	}
	lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
	_, err := interopcc.LockAsset(ctx, string(assetAgreementBytes), string(lockInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "only EPOCH time is supported at present")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with GetState(contractId) fail to read the world state
	chaincodeStub.GetStateReturns(nil, fmt.Errorf("unable to retrieve contractId %s", contractId))
	lockInfoHTLC = &common.AssetLockHTLC {
		Hash: []byte(hashBase64),
		// lock for next 5 mintues
		ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs,
		// TimeSpec of AssetLockHTLC_EPOCH is only supported currently
		TimeSpec: common.AssetLockHTLC_EPOCH,
	}
	lockInfoBytes, _ = proto.Marshal(lockInfoHTLC)
	_, err = interopcc.LockFungibleAsset(ctx, string(assetAgreementBytes), string(lockInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "failed to retrieve from the world state: unable to retrieve contractId " + contractId)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with contractId already existing on the ledger
	assetLockVal := FungibleAssetLockValue{Type: assetType, NumUnits: numUnits, Locker: locker, Recipient: recipient,
			Hash: string(lockInfoHTLC.Hash), ExpiryTimeSecs: lockInfoHTLC.ExpiryTimeSecs}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)
	_, err = interopcc.LockFungibleAsset(ctx, string(assetAgreementBytes), string(lockInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "contractId " + contractId + " already exists for the requested fungible asset agreement")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with PutState failing to write to the ledger
	chaincodeStub.GetStateReturns(nil, nil)
	chaincodeStub.PutStateReturnsOnCall(0, fmt.Errorf("unable to write the fungible asset lock to the ledger for contractId %s", contractId))
	_, err = interopcc.LockFungibleAsset(ctx, string(assetAgreementBytes), string(lockInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "failed to write to the world state: unable to write the fungible asset lock to the ledger for contractId " + contractId)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test success with fungible asset agreement specified properly
	chaincodeStub.GetStateReturns(nil, nil)
	_, err = interopcc.LockFungibleAsset(ctx, string(assetAgreementBytes), string(lockInfoBytes))
	require.NoError(t, err)
	fmt.Println("Test success as expected since the fungible asset agreement is specified properly.")
}
