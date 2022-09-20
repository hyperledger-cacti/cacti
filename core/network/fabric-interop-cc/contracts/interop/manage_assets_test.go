/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package main

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"testing"

	"time"

	"github.com/golang/protobuf/proto"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/assetexchange"
	mspProtobuf "github.com/hyperledger/fabric-protos-go/msp"
	log "github.com/sirupsen/logrus"
	"github.com/stretchr/testify/require"
	wtest "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils"
)

const (
	defaultTimeLockSecs = 5 * 60 // 5 minutes
)

// function that supplies value that is to be returned by ctx.GetStub().GetCreator()
func getCreator() string {
	serializedIdentity := &mspProtobuf.SerializedIdentity{}
	eCertBytes, _ := base64.StdEncoding.DecodeString(getTxCreatorECertBase64())
	serializedIdentity.IdBytes = []byte(eCertBytes)
	serializedIdentity.Mspid = "ca.org1.example.com"
	serializedIdentityBytes, _ := proto.Marshal(serializedIdentity)

	return string(serializedIdentityBytes)
}

// function that supplies the ECert in base64 for the transaction creator
func getTxCreatorECertBase64() string {
	eCertBase64 := "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNVVENDQWZpZ0F3SUJBZ0lSQU5qaWdnVHRhSERGRmtIaUI3VnhPN013Q2dZSUtvWkl6ajBFQXdJd2N6RUxNQWtHQTFVRUJoTUNWVk14RXpBUkJnTlZCQWdUQ2tOaGJHbG1iM0p1YVdFeEZqQVVCZ05WQkFjVERWTmhiaUJHY21GdVkybHpZMjh4R1RBWEJnTlZCQW9URUc5eVp6RXVaWGhoYlhCc1pTNWpiMjB4SERBYUJnTlZCQU1URTJOaExtOXlaekV1WlhoaGJYQnNaUzVqYjIwd0hoY05NVGt3TkRBeE1EZzBOVEF3V2hjTk1qa3dNekk1TURnME5UQXdXakJ6TVFzd0NRWURWUVFHRXdKVlV6RVRNQkVHQTFVRUNCTUtRMkZzYVdadmNtNXBZVEVXTUJRR0ExVUVCeE1OVTJGdUlFWnlZVzVqYVhOamJ6RVpNQmNHQTFVRUNoTVFiM0puTVM1bGVHRnRjR3hsTG1OdmJURWNNQm9HQTFVRUF4TVRZMkV1YjNKbk1TNWxlR0Z0Y0d4bExtTnZiVEJaTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEEwSUFCT2VlYTRCNlM5ZTlyLzZUWGZFZUFmZ3FrNVdpcHZZaEdveGg1ZEZuK1g0bTN2UXZTQlhuVFdLVzczZVNnS0lzUHc5dExDVytwZW9yVnMxMWdieXdiY0dqYlRCck1BNEdBMVVkRHdFQi93UUVBd0lCcGpBZEJnTlZIU1VFRmpBVUJnZ3JCZ0VGQlFjREFnWUlLd1lCQlFVSEF3RXdEd1lEVlIwVEFRSC9CQVV3QXdFQi96QXBCZ05WSFE0RUlnUWcxYzJHZmJTa3hUWkxIM2VzUFd3c2llVkU1QWhZNHNPQjVGOGEvaHM5WjhVd0NnWUlLb1pJemowRUF3SURSd0F3UkFJZ1JkZ1krNW9iMDNqVjJLSzFWdjZiZE5xM2NLWHc0cHhNVXY5MFZOc0tHdTBDSUE4Q0lMa3ZEZWg3NEFCRDB6QUNkbitBTkMyVVQ2Sk5UNnd6VHNLN3BYdUwKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQ=="

	return eCertBase64
}

func TestLockAsset(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	localCCId := "mycc"
	wtest.SetMockStubCCId(chaincodeStub, localCCId)
	interopcc := SmartContract{}

	assetType := "bond"
	assetId := "A001"
	recipient := "Bob"
	locker := getTxCreatorECertBase64()
	preimage := "abcd"
	hashBase64 := assetexchange.GenerateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())
	chaincodeStub.GetCreatorReturns([]byte(getCreator()), nil)

	lockInfoHTLC := &common.AssetLockHTLC{
		HashMechanism: common.HashMechanism_SHA256,
		HashBase64: []byte(hashBase64),
		// lock for next 5 minutes
		ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs,
		TimeSpec:       common.TimeSpec_EPOCH,
	}
	lockInfoHTLCBytes, _ := proto.Marshal(lockInfoHTLC)
	lockInfo := &common.AssetLock{
		LockMechanism: common.LockMechanism_HTLC,
		LockInfo:      lockInfoHTLCBytes,
	}
	lockInfoBytes, _ := proto.Marshal(lockInfo)

	assetAgreement := &common.AssetExchangeAgreement{
		AssetType: assetType,
		Id:        assetId,
		Recipient: recipient,
		Locker:    locker,
	}
	assetAgreementBytes, _ := proto.Marshal(assetAgreement)

	// chaincodeStub.GetStateReturns should return nil to be able to lock the asset
	chaincodeStub.GetStateReturnsOnCall(0, []byte("interopcc"), nil)
	chaincodeStub.GetStateReturnsOnCall(1, nil, nil)
	// Test success with asset agreement specified properly
	_, err := interopcc.LockAsset(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes), base64.StdEncoding.EncodeToString(lockInfoBytes))
	require.NoError(t, err)
	fmt.Println("Test success as expected since the agreement and lock information are specified properly")

	assetLockVal := assetexchange.AssetLockValue{Locker: locker, Recipient: recipient}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	// Test failure by trying to lock an asset that is already locked
	chaincodeStub.GetStateReturnsOnCall(2, []byte("interopcc"), nil)
	chaincodeStub.GetStateReturnsOnCall(3, assetLockValBytes, nil)
	_, err = interopcc.LockAsset(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes), base64.StdEncoding.EncodeToString(lockInfoBytes))
	require.Error(t, err)
	log.Info(fmt.Println("Test failed as expected with error:", err))

	// no need to set chaincodeStub.GetStateReturns below since the error is hit before GetState() ledger access in LockAsset()
	lockInfoHTLC = &common.AssetLockHTLC{
		HashMechanism: common.HashMechanism_SHA256,
		HashBase64: []byte(hashBase64),
		// lock for next 5 mintues
		ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs,
		// TimeSpec of AssetLockHTLC_DURATION is not currently supported
		TimeSpec: common.TimeSpec_DURATION,
	}
	lockInfoHTLCBytes, _ = proto.Marshal(lockInfoHTLC)
	lockInfo = &common.AssetLock{
		LockMechanism: common.LockMechanism_HTLC,
		LockInfo:      lockInfoHTLCBytes,
	}
	lockInfoBytes, _ = proto.Marshal(lockInfo)
	// Test failure with lock information not specified properly
	_, err = interopcc.LockAsset(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes), base64.StdEncoding.EncodeToString(lockInfoBytes))
	require.Error(t, err)
	log.Info(fmt.Println("Test failed as expected with error:", err))
}

func TestUnlockAsset(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	localCCId := "mycc"
	wtest.SetMockStubCCId(chaincodeStub, localCCId)
	interopcc := SmartContract{}

	assetType := "bond"
	assetId := "A001"
	recipient := "Bob"
	locker := getTxCreatorECertBase64()
	preimage := "abcd"
	hashBase64 := assetexchange.GenerateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())
	chaincodeStub.GetCreatorReturns([]byte(getCreator()), nil)

	lockInfoHTLC := &common.AssetLockHTLC{
		HashMechanism: common.HashMechanism_SHA256,
		HashBase64: []byte(hashBase64),
		// lock for sometime in the past for testing UnlockAsset functionality
		ExpiryTimeSecs: currentTimeSecs - defaultTimeLockSecs,
		TimeSpec:       common.TimeSpec_EPOCH,
	}
	lockInfoHTLCBytes, _ := proto.Marshal(lockInfoHTLC)
	lockInfo := &common.AssetLock{
		LockMechanism: common.LockMechanism_HTLC,
		LockInfo:      lockInfoHTLCBytes,
	}
	lockInfoBytes, _ := proto.Marshal(lockInfo)

	assetAgreement := &common.AssetExchangeAgreement{
		AssetType: assetType,
		Id:        assetId,
		Recipient: recipient,
		Locker:    locker,
	}
	assetAgreementBytes, _ := proto.Marshal(assetAgreement)

	// chaincodeStub.GetStateReturns should return nil to be able to lock the asset
	chaincodeStub.GetStateReturns(nil, nil)
	// Lock asset as per the agreement specified
	_, err := interopcc.LockAsset(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes), base64.StdEncoding.EncodeToString(lockInfoBytes))
	require.NoError(t, err)
	log.Info(fmt.Println("Completed locking an asset. Proceed to test unlock asset."))

	assetLockVal := assetexchange.AssetLockValue{Locker: locker, Recipient: recipient}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)
	// Test success with asset agreement specified properly
	err = interopcc.UnlockAsset(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes))
	require.NoError(t, err)

	// Let GetState() to return nil to simulate the case that unlocking an asset which is not locked is not possible
	chaincodeStub.GetStateReturns(nil, nil)
	// Test failure with asset agreement specified for unlock which was not locked earlier
	err = interopcc.UnlockAsset(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes))
	require.Error(t, err)
	log.Info(fmt.Println("Test failed as expected with error:", err))

	// Assume that the asset is locked by Alice for Bob; then trying to unlock the asset by Alice for Charlie should fail since the locking is done for a different recipient
	assetLockVal = assetexchange.AssetLockValue{Locker: locker, Recipient: "Charlie"}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)
	// Test failure with asset id being locked for a different <locker, recipient>
	err = interopcc.UnlockAsset(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes))
	require.Error(t, err)
	log.Info(fmt.Println("Test failed as expected with error:", err))

	hashLock := assetexchange.HashLock{HashMechanism: common.HashMechanism_SHA256, HashBase64: hashBase64}
	var lockInfoVal interface{}
	lockInfoVal = hashLock
	// lock for sometime in the future for testing UnlockAsset functionality
	assetLockVal = assetexchange.AssetLockValue{Locker: locker, Recipient: recipient, LockInfo: lockInfoVal, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)
	// Test failure of unlock asset with expiry time not yet elapsed
	err = interopcc.UnlockAsset(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes))
	require.Error(t, err)
	log.Info(fmt.Println("Test failed as expected with error:", err))
}

func TestIsAssetLocked(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	localCCId := "mycc"
	wtest.SetMockStubCCId(chaincodeStub, localCCId)
	interopcc := SmartContract{}

	assetType := "bond"
	assetId := "A001"
	recipient := "Bob"
	locker := "Alice"
	currentTimeSecs := uint64(time.Now().Unix())

	assetAgreement := &common.AssetExchangeAgreement{
		AssetType: assetType,
		Id:        assetId,
		Recipient: recipient,
		Locker:    locker,
	}
	assetAgreementBytes, _ := proto.Marshal(assetAgreement)

	assetLockVal := assetexchange.AssetLockValue{Locker: locker, Recipient: "Charlie"}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)
	// Test failure with asset agreement not specified properly
	isAssetLocked, err := interopcc.IsAssetLocked(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes))
	require.Error(t, err)
	require.False(t, isAssetLocked)
	log.Info(fmt.Println("Test failed as expected with error:", err))

	assetLockVal = assetexchange.AssetLockValue{Locker: locker, Recipient: recipient, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)
	// Test success with asset agreement specified properly
	isAssetLocked, err = interopcc.IsAssetLocked(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes))
	require.NoError(t, err)
	require.True(t, isAssetLocked)
	log.Info(fmt.Println("Test succeeded as expected since the asset agreement is specified properly."))

	assetLockVal = assetexchange.AssetLockValue{Locker: locker, Recipient: recipient, ExpiryTimeSecs: currentTimeSecs - defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)
	// Test failure with expiry time elapsed already
	isAssetLocked, err = interopcc.IsAssetLocked(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes))
	require.Error(t, err)
	require.False(t, isAssetLocked)
	log.Info(fmt.Println("Test failed as expected with error:", err))

	assetLockVal = assetexchange.AssetLockValue{Locker: "Dave", Recipient: recipient, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturns(assetLockValBytes, nil)
	// Test failure with asset agreement not specified properly
	isAssetLocked, err = interopcc.IsAssetLocked(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes))
	require.Error(t, err)
	require.False(t, isAssetLocked)
	log.Info(fmt.Println("Test failed as expected with error:", err))

	assetAgreement = &common.AssetExchangeAgreement{
		AssetType: assetType,
		Id:        assetId,
		Recipient: recipient,
		// arbitrary locker specification
		Locker: "*",
	}
	assetAgreementBytes, _ = proto.Marshal(assetAgreement)
	// Test success with asset agreement specified to include arbitrary locker
	isAssetLocked, err = interopcc.IsAssetLocked(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes))
	require.NoError(t, err)
	require.True(t, isAssetLocked)
	log.Info(fmt.Println("Test succeeded as expected since the asset agreement is specified to include arbitrary locker."))

	assetAgreement = &common.AssetExchangeAgreement{
		AssetType: assetType,
		Id:   assetId,
		// wrong recipient specification
		Recipient: "Charlie",
		// arbitrary locker specification
		Locker: "*",
	}
	assetAgreementBytes, _ = proto.Marshal(assetAgreement)
	// Test failure with asset agreement specified to include arbitrary locker and wrong recipient
	isAssetLocked, err = interopcc.IsAssetLocked(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes))
	require.Error(t, err)
	require.False(t, isAssetLocked)
	log.Info(fmt.Println("Test failed as expected with error:", err))

	assetAgreement = &common.AssetExchangeAgreement{
		AssetType: assetType,
		Id:   assetId,
		// arbitrary recipient specification
		Recipient: "*",
		Locker:    "Dave",
	}
	assetAgreementBytes, _ = proto.Marshal(assetAgreement)
	// Test success with asset agreement specified to include arbitrary recipient
	isAssetLocked, err = interopcc.IsAssetLocked(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes))
	require.NoError(t, err)
	require.True(t, isAssetLocked)
	log.Info(fmt.Println("Test succeeded as expected since the asset agreement is specified to include arbitrary recipient."))

	assetAgreement = &common.AssetExchangeAgreement{
		AssetType: assetType,
		Id:   assetId,
		// arbitrary recipient specification
		Recipient: "*",
		// wrong locker specification
		Locker: "Charlie",
	}
	assetAgreementBytes, _ = proto.Marshal(assetAgreement)
	// Test failure with asset agreement specified to include arbitrary locker and wrong locker
	isAssetLocked, err = interopcc.IsAssetLocked(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes))
	require.Error(t, err)
	require.False(t, isAssetLocked)
	log.Info(fmt.Println("Test failed as expected with error:", err))

	assetAgreement = &common.AssetExchangeAgreement{
		AssetType: assetType,
		Id:   assetId,
		// arbitrary recipient specification
		Recipient: "*",
		// arbitrary locker specification
		Locker: "*",
	}
	assetAgreementBytes, _ = proto.Marshal(assetAgreement)
	// Test success with asset agreement specified to include arbitrary locker
	isAssetLocked, err = interopcc.IsAssetLocked(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes))
	require.NoError(t, err)
	require.True(t, isAssetLocked)
	log.Info(fmt.Println("Test succeeded as expected since the asset agreement is specified to include arbitrary locker and arbitrary recipient."))
}

func TestClaimAsset(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	localCCId := "mycc"
	wtest.SetMockStubCCId(chaincodeStub, localCCId)
	interopcc := SmartContract{}

	assetType := "bond"
	assetId := "A001"
	recipient := getTxCreatorECertBase64()
	locker := "Alice"
	preimage := "abcd"
	hashBase64 := assetexchange.GenerateSHA256HashInBase64Form(preimage)
	preimageBase64 := base64.StdEncoding.EncodeToString([]byte(preimage))
	currentTimeSecs := uint64(time.Now().Unix())
	chaincodeStub.GetCreatorReturns([]byte(getCreator()), nil)

	assetAgreement := &common.AssetExchangeAgreement{
		AssetType: assetType,
		Id:        assetId,
		Recipient: recipient,
		Locker:    locker,
	}
	assetAgreementBytes, _ := proto.Marshal(assetAgreement)

	claimInfoHTLC := &common.AssetClaimHTLC{
		HashMechanism: common.HashMechanism_SHA256,
		HashPreimageBase64: []byte(preimageBase64),
	}
	claimInfoHTLCBytes, _ := proto.Marshal(claimInfoHTLC)
	claimInfo := &common.AssetClaim{
		LockMechanism: common.LockMechanism_HTLC,
		ClaimInfo:     claimInfoHTLCBytes,
	}
	claimInfoBytes, _ := proto.Marshal(claimInfo)

	hashLock := assetexchange.HashLock{HashMechanism: common.HashMechanism_SHA512, HashBase64: hashBase64}
	var lockInfoVal interface{}
	lockInfoVal = hashLock
	assetLockVal := assetexchange.AssetLockValue{Locker: locker, Recipient: recipient, LockInfo: lockInfoVal, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(0, assetLockValBytes, nil)

	// Test failure with hash mechanism not specified properly
	err := interopcc.ClaimAsset(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes), base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "claim asset of type bond and ID " + assetId + " error: hash mechanism used while locking is different from the one supplied: 0")
	log.Info(fmt.Println("Test failed as expected with error:", err))

	hashLock = assetexchange.HashLock{HashMechanism: common.HashMechanism_SHA256, HashBase64: hashBase64}
	lockInfoVal = hashLock
	assetLockVal = assetexchange.AssetLockValue{Locker: locker, Recipient: recipient, LockInfo: lockInfoVal, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(1, assetLockValBytes, nil)

	// Test success with asset agreement specified properly
	err = interopcc.ClaimAsset(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes), base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.NoError(t, err)
	log.Info(fmt.Println("Test success as expected since the asset agreement and claim information are specified properly."))

	assetLockVal = assetexchange.AssetLockValue{Locker: locker, Recipient: recipient, LockInfo: lockInfoVal, ExpiryTimeSecs: currentTimeSecs - defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(2, assetLockValBytes, nil)
	// Test failure with expiry time elapsed to claim the asset
	err = interopcc.ClaimAsset(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes), base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.Error(t, err)
	log.Info(fmt.Println("Test failed as expected with error:", err))

	wrongPreimage := "abc"
	wrongPreimageBase64 := base64.StdEncoding.EncodeToString([]byte(wrongPreimage))
	wrongClaimInfoHTLC := &common.AssetClaimHTLC{
		HashMechanism: common.HashMechanism_SHA256,
		HashPreimageBase64: []byte(wrongPreimageBase64),
	}
	wrongClaimInfoHTLCBytes, _ := proto.Marshal(wrongClaimInfoHTLC)
	wrongClaimInfo := &common.AssetClaim{
		LockMechanism: common.LockMechanism_HTLC,
		ClaimInfo:     wrongClaimInfoHTLCBytes,
	}
	wrongClaimInfoBytes, _ := proto.Marshal(wrongClaimInfo)

	assetLockVal = assetexchange.AssetLockValue{Locker: locker, Recipient: recipient, LockInfo: lockInfoVal, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(3, assetLockValBytes, nil)
	// Test failure with claim information (i.e., preimage) not specified properly
	err = interopcc.ClaimAsset(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes), base64.StdEncoding.EncodeToString(wrongClaimInfoBytes))
	require.Error(t, err)
	log.Info(fmt.Println("Test failed as expected with error:", err))

	assetAgreement.Locker = "Charlie"
	assetAgreementBytes, _ = proto.Marshal(assetAgreement)

	// Test failure with asset agreement specified not properly
	err = interopcc.ClaimAsset(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes), base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.Error(t, err)
	log.Info(fmt.Println("Test failed as expected with error:", err))

	assetAgreement.Locker = locker
	assetAgreement.Id = "A002"
	assetAgreementBytes, _ = proto.Marshal(assetAgreement)
	chaincodeStub.GetStateReturnsOnCall(4, nil, nil)

	// Test failure with asset agreement (i.e., asset id) specified not properly
	err = interopcc.ClaimAsset(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes), base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.Error(t, err)
	log.Info(fmt.Println("Test failed as expected with error:", err))
}

func TestHashSHA512(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	localCCId := "mycc"
	wtest.SetMockStubCCId(chaincodeStub, localCCId)
	interopcc := SmartContract{}

	assetType := "bond"
	assetId := "A001"
	recipient := getTxCreatorECertBase64()
	locker := "Alice"
	preimage := "abcd"
	hashBase64 := assetexchange.GenerateSHA512HashInBase64Form(preimage)
	preimageBase64 := base64.StdEncoding.EncodeToString([]byte(preimage))
	currentTimeSecs := uint64(time.Now().Unix())
	chaincodeStub.GetCreatorReturns([]byte(getCreator()), nil)

	assetAgreement := &common.AssetExchangeAgreement{
		AssetType: assetType,
		Id:        assetId,
		Recipient: recipient,
		Locker:    locker,
	}
	assetAgreementBytes, _ := proto.Marshal(assetAgreement)

	var hashLock interface{}
	hashLock = assetexchange.HashLock{HashMechanism: common.HashMechanism_SHA512, HashBase64: hashBase64}
	assetLockVal := assetexchange.AssetLockValue{Locker: locker, Recipient: recipient, LockInfo: hashLock, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(0, assetLockValBytes, nil)

	// Test failure with hash mechanism not specified properly
	wrongClaimInfoHTLC := &common.AssetClaimHTLC{
		HashMechanism: common.HashMechanism_SHA256,
		HashPreimageBase64: []byte(preimageBase64),
	}
	wrongClaimInfoHTLCBytes, _ := proto.Marshal(wrongClaimInfoHTLC)
	wrongClaimInfo := &common.AssetClaim{
		LockMechanism: common.LockMechanism_HTLC,
		ClaimInfo:     wrongClaimInfoHTLCBytes,
	}
	wrongClaimInfoBytes, _ := proto.Marshal(wrongClaimInfo)

	err := interopcc.ClaimAsset(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes), base64.StdEncoding.EncodeToString(wrongClaimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "claim asset of type bond and ID " + assetId + " error: hash mechanism used while locking is different from the one supplied: 0")
	log.Info(fmt.Println("Test failed as expected with error:", err))

	// Test success with hash mechanism specified properly
	chaincodeStub.GetStateReturnsOnCall(1, assetLockValBytes, nil)
	claimInfoHTLC := &common.AssetClaimHTLC{
		HashMechanism: common.HashMechanism_SHA512,
		HashPreimageBase64: []byte(preimageBase64),
	}
	claimInfoHTLCBytes, _ := proto.Marshal(claimInfoHTLC)
	claimInfo := &common.AssetClaim{
		LockMechanism: common.LockMechanism_HTLC,
		ClaimInfo:     claimInfoHTLCBytes,
	}
	claimInfoBytes, _ := proto.Marshal(claimInfo)

	err = interopcc.ClaimAsset(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes), base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.NoError(t, err)
	log.Info(fmt.Println("Test success as expected since the hash mechanism is specified properly."))
}

func TestGetHTLCHash(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	localCCId := "mycc"
	wtest.SetMockStubCCId(chaincodeStub, localCCId)
	interopcc := SmartContract{}

	assetType := "bond"
	assetId := "A001"
	recipient := getTxCreatorECertBase64()
	locker := "Alice"
	preimage := "abcd"
	hashBase64 := assetexchange.GenerateSHA512HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())
	chaincodeStub.GetCreatorReturns([]byte(getCreator()), nil)

	assetAgreement := &common.AssetExchangeAgreement{
		AssetType: assetType,
		Id:        assetId,
		Recipient: recipient,
		Locker:    locker,
	}
	assetAgreementBytes, _ := proto.Marshal(assetAgreement)

	hashLock := assetexchange.HashLock{HashMechanism: common.HashMechanism_SHA512, HashBase64: hashBase64}
	assetLockVal := assetexchange.AssetLockValue{Locker: locker, Recipient: recipient, LockInfo: hashLock, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ := json.Marshal(assetLockVal)

	// Test failure with no associated asset that is already locked
	chaincodeStub.GetStateReturnsOnCall(0, nil, nil)

	retVal, err := interopcc.GetHTLCHash(ctx, localCCId, base64.StdEncoding.EncodeToString(assetAgreementBytes))
	require.Error(t, err)
	require.EqualError(t, err, "no asset of type " + assetType + " and ID " + assetId + " is locked")
	log.Info(fmt.Println("Test failed as expected with error:", err))

	// Test success querying an asset that is already locked
	chaincodeStub.GetStateReturnsOnCall(1, assetLockValBytes, nil)

	retVal, err = interopcc.GetHTLCHash(ctx, localCCId, base64.StdEncoding.EncodeToString(assetAgreementBytes))
	require.NoError(t, err)
	log.Info(fmt.Println("retVal: ", retVal))
	lockInfoVal := assetexchange.HashLock{}
	_ = json.Unmarshal([]byte(retVal), &lockInfoVal)
	require.Equal(t, lockInfoVal.HashMechanism, hashLock.HashMechanism)
	require.Equal(t, lockInfoVal.HashBase64, hashLock.HashBase64)
	log.Info(fmt.Println("Test success as expected since querying an asset that is already locked."))
}

func TestGetHTLCHashByContractId(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	localCCId := "mycc"
	wtest.SetMockStubCCId(chaincodeStub, localCCId)
	interopcc := SmartContract{}

	assetType := "cbdc"
	numUnits := uint64(10)
	locker := "Alice"
	recipient := "Bob"
	preimage := "abcd"

	hashBase64 := assetexchange.GenerateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())

	assetAgreement := &common.FungibleAssetExchangeAgreement{
		AssetType: assetType,
		NumUnits:  numUnits,
		Locker:    locker,
		Recipient: recipient,
	}
	contractId := assetexchange.GenerateFungibleAssetLockContractId(ctx, localCCId, assetAgreement)

	// Test failure with no associated asset that is already locked
	chaincodeStub.GetStateReturnsOnCall(0, nil, nil)
	_, err := interopcc.GetHTLCHashByContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "contractId " + contractId + " is not associated with any currently locked fungible asset")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test success querying an asset that is already locked
	hashLock := assetexchange.HashLock{HashMechanism: common.HashMechanism_SHA256, HashBase64: hashBase64}
	assetLockVal := assetexchange.FungibleAssetLockValue{Type: assetType, NumUnits: numUnits, Locker: locker, Recipient: recipient,
		LockInfo: hashLock, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(1, assetLockValBytes, nil)
	retVal, err := interopcc.GetHTLCHashByContractId(ctx, contractId)
	require.NoError(t, err)
	log.Info(fmt.Println("retVal: ", retVal))
	lockInfoVal := assetexchange.HashLock{}
	_ = json.Unmarshal([]byte(retVal), &lockInfoVal)
	require.Equal(t, lockInfoVal.HashMechanism, hashLock.HashMechanism)
	require.Equal(t, lockInfoVal.HashBase64, hashLock.HashBase64)
	log.Info(fmt.Println("Test success as expected since querying an asset that is already locked."))
}

func TestUnlockAssetUsingContractId(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	localCCId := "mycc"
	wtest.SetMockStubCCId(chaincodeStub, localCCId)
	interopcc := SmartContract{}

	assetType := "bond"
	assetId := "A001"
	locker := getTxCreatorECertBase64()
	recipient := "Bob"
	preimage := "abcd"

	hashBase64 := assetexchange.GenerateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())
	chaincodeStub.GetCreatorReturns([]byte(getCreator()), nil)

	assetAgreement := &common.AssetExchangeAgreement{
		AssetType: assetType,
		Id:        assetId,
		Recipient: recipient,
		Locker:    locker,
	}
	assetLockKey, contractId, _ := assetexchange.GenerateAssetLockKeyAndContractId(ctx, localCCId, assetAgreement)

	// Test failure with GetState(contractId) fail to read the world state
	chaincodeStub.GetStateReturnsOnCall(0, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(1, nil, fmt.Errorf("unable to retrieve contractId %s", contractId))
	err := interopcc.UnlockAssetUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "unable to retrieve contractId "+contractId)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with not a valid contractId being passed as the arguement
	chaincodeStub.GetStateReturnsOnCall(2, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(3, nil, nil)
	err = interopcc.UnlockAssetUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "no contractId "+contractId+" exists on the ledger")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with GetState(assetLockKey) fail to read from the world state
	assetLockKeyBytes, _ := json.Marshal(assetLockKey)
	chaincodeStub.GetStateReturnsOnCall(4, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(5, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(6, nil, fmt.Errorf("unable to retrieve asset %s", assetLockKey))
	err = interopcc.UnlockAssetUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "failed to retrieve from the world state: unable to retrieve asset "+assetLockKey)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure under the scenario that the contractId is valid but there is no asset locked with the assetLockKey
	chaincodeStub.GetStateReturnsOnCall(7, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(8, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(9, nil, nil)
	err = interopcc.UnlockAssetUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "contractId "+contractId+" is not associated with any currently locked asset")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure for asset unlock exercised with expiry time not yet elapsed
	chaincodeStub.GetStateReturnsOnCall(10, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(11, assetLockKeyBytes, nil)
	hashLock := assetexchange.HashLock{HashMechanism: common.HashMechanism_SHA256, HashBase64: hashBase64}
	var lockInfoVal interface{}
	lockInfoVal = hashLock
	assetLockVal := assetexchange.AssetLockValue{Locker: locker, Recipient: recipient, LockInfo: lockInfoVal, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(12, assetLockValBytes, nil)
	err = interopcc.UnlockAssetUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "cannot unlock asset associated with the contractId "+contractId+" as the expiry time is not yet elapsed")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with DelState failing on assetLockKey
	chaincodeStub.GetStateReturnsOnCall(13, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(14, assetLockKeyBytes, nil)
	assetLockVal = assetexchange.AssetLockValue{Locker: locker, Recipient: recipient, LockInfo: lockInfoVal, ExpiryTimeSecs: currentTimeSecs - defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(15, assetLockValBytes, nil)
	chaincodeStub.DelStateReturnsOnCall(0, fmt.Errorf("unable to delete asset with key %s from world state", assetLockKey))
	err = interopcc.UnlockAssetUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "failed to delete lock for the asset associated with the contractId "+
		contractId+": unable to delete asset with key "+assetLockKey+" from world state")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with DelState failing on contractId
	chaincodeStub.GetStateReturnsOnCall(16, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(17, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(18, assetLockValBytes, nil)
	chaincodeStub.DelStateReturnsOnCall(1, nil)
	chaincodeStub.DelStateReturnsOnCall(2, fmt.Errorf("unable to delete contractId from world state"))
	err = interopcc.UnlockAssetUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "failed to delete the contractId "+
		contractId+" as part of asset unlock: unable to delete contractId from world state")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test success with asset being unlocked using contractId
	chaincodeStub.GetStateReturnsOnCall(19, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(20, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(21, assetLockValBytes, nil)
	chaincodeStub.DelStateReturnsOnCall(3, nil)
	chaincodeStub.DelStateReturnsOnCall(4, nil)
	err = interopcc.UnlockAssetUsingContractId(ctx, contractId)
	require.NoError(t, err)
	fmt.Printf("Test success as expected since a valid contractId is specified.\n")
}

func TestClaimAssetUsingContractId(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	localCCId := "mycc"
	wtest.SetMockStubCCId(chaincodeStub, localCCId)
	interopcc := SmartContract{}

	assetType := "bond"
	assetId := "A001"
	locker := "Alice"
	recipient := getTxCreatorECertBase64()
	preimage := "abcd"

	hashBase64 := assetexchange.GenerateSHA256HashInBase64Form(preimage)
	preimageBase64 := base64.StdEncoding.EncodeToString([]byte(preimage))
	currentTimeSecs := uint64(time.Now().Unix())
	chaincodeStub.GetCreatorReturns([]byte(getCreator()), nil)

	assetAgreement := &common.AssetExchangeAgreement{
		AssetType: assetType,
		Id:        assetId,
		Recipient: recipient,
		Locker:    locker,
	}
	assetLockKey, contractId, _ := assetexchange.GenerateAssetLockKeyAndContractId(ctx, localCCId, assetAgreement)

	claimInfoHTLC := &common.AssetClaimHTLC{
		HashMechanism: common.HashMechanism_SHA256,
		HashPreimageBase64: []byte(preimageBase64),
	}
	claimInfoHTLCBytes, _ := proto.Marshal(claimInfoHTLC)
	claimInfo := &common.AssetClaim{
		LockMechanism: common.LockMechanism_HTLC,
		ClaimInfo:     claimInfoHTLCBytes,
	}
	claimInfoBytes, _ := proto.Marshal(claimInfo)

	// Test failure with GetState(contractId) fail to read the world state
	chaincodeStub.GetStateReturnsOnCall(0, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(1, nil, fmt.Errorf("unable to retrieve contractId %s", contractId))
	err := interopcc.ClaimAssetUsingContractId(ctx, contractId, base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "unable to retrieve contractId "+contractId)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with not a valid contractId being passed as the arguement
	chaincodeStub.GetStateReturnsOnCall(2, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(3, nil, nil)
	err = interopcc.ClaimAssetUsingContractId(ctx, contractId, base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "no contractId "+contractId+" exists on the ledger")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with GetState(assetLockKey) fail to read from the world state
	assetLockKeyBytes, _ := json.Marshal(assetLockKey)
	chaincodeStub.GetStateReturnsOnCall(4, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(5, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(6, nil, fmt.Errorf("unable to retrieve asset %s", assetLockKey))
	err = interopcc.ClaimAssetUsingContractId(ctx, contractId, base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "failed to retrieve from the world state: unable to retrieve asset "+assetLockKey)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure under the scenario that the contractId is valid but there is no asset locked with the assetLockKey
	chaincodeStub.GetStateReturnsOnCall(7, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(8, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(9, nil, nil)
	err = interopcc.ClaimAssetUsingContractId(ctx, contractId, base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "contractId "+contractId+" is not associated with any currently locked asset")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure for asset claim exercised with expiry time elapsed already
	chaincodeStub.GetStateReturnsOnCall(10, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(11, assetLockKeyBytes, nil)
	hashLock := assetexchange.HashLock{HashMechanism: common.HashMechanism_SHA256, HashBase64: hashBase64}
	var lockInfo interface{}
	lockInfo = hashLock
	assetLockVal := assetexchange.AssetLockValue{Locker: locker, Recipient: recipient, LockInfo: lockInfo, ExpiryTimeSecs: currentTimeSecs - defaultTimeLockSecs}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(12, assetLockValBytes, nil)
	err = interopcc.ClaimAssetUsingContractId(ctx, contractId, base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "cannot claim asset associated with contractId "+contractId+" as the expiry time is already elapsed")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with claim information (i.e., preimage) not specified properly
	chaincodeStub.GetStateReturnsOnCall(13, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(14, assetLockKeyBytes, nil)
	wrongPreimage := "abc"
	wrongPreimageBase64 := base64.StdEncoding.EncodeToString([]byte(wrongPreimage))
	wrongClaimInfoHTLC := &common.AssetClaimHTLC{
		HashPreimageBase64: []byte(wrongPreimageBase64),
	}
	wrongClaimInfoHTLCBytes, _ := proto.Marshal(wrongClaimInfoHTLC)
	wrongClaimInfo := &common.AssetClaim{
		LockMechanism: common.LockMechanism_HTLC,
		ClaimInfo:     wrongClaimInfoHTLCBytes,
	}
	wrongClaimInfoBytes, _ := proto.Marshal(wrongClaimInfo)

	assetLockVal = assetexchange.AssetLockValue{Locker: locker, Recipient: recipient, LockInfo: lockInfo, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(15, assetLockValBytes, nil)
	err = interopcc.ClaimAssetUsingContractId(ctx, contractId, base64.StdEncoding.EncodeToString(wrongClaimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "cannot claim asset associated with contractId "+contractId+" as the hash preimage is not matching")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with DelState failing on assetLockKey
	chaincodeStub.GetStateReturnsOnCall(16, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(17, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(18, assetLockValBytes, nil)
	chaincodeStub.DelStateReturnsOnCall(0, fmt.Errorf("unable to delete asset with key %s from world state", assetLockKey))
	err = interopcc.ClaimAssetUsingContractId(ctx, contractId, base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "failed to delete lock for the asset associated with the contractId "+
		contractId+": unable to delete asset with key "+assetLockKey+" from world state")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with DelState failing on contractId
	chaincodeStub.GetStateReturnsOnCall(19, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(20, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(21, assetLockValBytes, nil)
	chaincodeStub.DelStateReturnsOnCall(1, nil)
	chaincodeStub.DelStateReturnsOnCall(2, fmt.Errorf("unable to delete contractId from world state"))
	err = interopcc.ClaimAssetUsingContractId(ctx, contractId, base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "failed to delete the contractId "+
		contractId+" as part of asset claim: unable to delete contractId from world state")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test success with asset being claimed using contractId
	chaincodeStub.GetStateReturnsOnCall(22, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(23, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(24, assetLockValBytes, nil)
	chaincodeStub.DelStateReturnsOnCall(3, nil)
	chaincodeStub.DelStateReturnsOnCall(4, nil)
	err = interopcc.ClaimAssetUsingContractId(ctx, contractId, base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.NoError(t, err)
	fmt.Printf("Test success as expected since a valid contractId is specified.\n")

	// Test failure with hash mechanism not specified properly
	hashLock = assetexchange.HashLock{HashMechanism: common.HashMechanism_SHA512, HashBase64: hashBase64}
	lockInfoVal := hashLock
	assetLockVal = assetexchange.AssetLockValue{Locker: locker, Recipient: recipient, LockInfo: lockInfoVal, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(25, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(26, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(27, assetLockValBytes, nil)

	err = interopcc.ClaimAssetUsingContractId(ctx, contractId, base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "claim asset associated with contractId " + contractId + " failed with error: hash mechanism used while locking is different from the one supplied: 0")
	fmt.Printf("Test failed as expected with error: %s\n", err)
}

func TestIsAssetLockedQueryUsingContractId(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	localCCId := "mycc"
	wtest.SetMockStubCCId(chaincodeStub, localCCId)
	interopcc := SmartContract{}

	assetType := "bond"
	assetId := "A001"
	locker := "Alice"
	recipient := "Bob"
	preimage := "abcd"

	hashBase64 := assetexchange.GenerateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())

	assetAgreement := &common.AssetExchangeAgreement{
		AssetType: assetType,
		Id:        assetId,
		Recipient: recipient,
		Locker:    locker,
	}
	assetLockKey, contractId, _ := assetexchange.GenerateAssetLockKeyAndContractId(ctx, localCCId, assetAgreement)

	// Test failure with GetState(contractId) fail to read the world state
	chaincodeStub.GetStateReturnsOnCall(0, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(1, nil, fmt.Errorf("unable to retrieve contractId %s", contractId))
	isAssetLocked, err := interopcc.IsAssetLockedQueryUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "unable to retrieve contractId "+contractId)
	require.False(t, isAssetLocked)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with not a valid contractId being passed as the arguement
	chaincodeStub.GetStateReturnsOnCall(2, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(3, nil, nil)
	isAssetLocked, err = interopcc.IsAssetLockedQueryUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "no contractId "+contractId+" exists on the ledger")
	require.False(t, isAssetLocked)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with GetState(assetLockKey) fail to read from the world state
	assetLockKeyBytes, _ := json.Marshal(assetLockKey)
	chaincodeStub.GetStateReturnsOnCall(4, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(5, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(6, nil, fmt.Errorf("unable to retrieve asset %s", assetLockKey))
	isAssetLocked, err = interopcc.IsAssetLockedQueryUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "failed to retrieve from the world state: unable to retrieve asset "+assetLockKey)
	require.False(t, isAssetLocked)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure under the scenario that the contractId is valid but there is no asset locked with the assetLockKey
	chaincodeStub.GetStateReturnsOnCall(7, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(8, assetLockKeyBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(9, nil, nil)
	isAssetLocked, err = interopcc.IsAssetLockedQueryUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "contractId "+contractId+" is not associated with any currently locked asset")
	require.False(t, isAssetLocked)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure for query if asset is locked with lock expiry time elapsed already
	chaincodeStub.GetStateReturnsOnCall(10, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(11, assetLockKeyBytes, nil)
	hashLock := assetexchange.HashLock{HashMechanism: common.HashMechanism_SHA256, HashBase64: hashBase64}
	var lockInfo interface{}
	lockInfo = hashLock
	assetLockVal := assetexchange.AssetLockValue{Locker: locker, Recipient: recipient, LockInfo: lockInfo, ExpiryTimeSecs: currentTimeSecs - defaultTimeLockSecs}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(12, assetLockValBytes, nil)
	isAssetLocked, err = interopcc.IsAssetLockedQueryUsingContractId(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "expiry time for asset associated with contractId "+contractId+" is already elapsed")
	require.False(t, isAssetLocked)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test success with asset being queried using contractId
	chaincodeStub.GetStateReturnsOnCall(13, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(14, assetLockKeyBytes, nil)
	assetLockVal = assetexchange.AssetLockValue{Locker: locker, Recipient: recipient, LockInfo: lockInfo, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(15, assetLockValBytes, nil)
	isAssetLocked, err = interopcc.IsAssetLockedQueryUsingContractId(ctx, contractId)
	require.NoError(t, err)
	require.True(t, isAssetLocked)
	fmt.Printf("Test success as expected since a valid contractId is specified.\n")
}

func TestLockFungibleAsset(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	localCCId := "mycc"
	wtest.SetMockStubCCId(chaincodeStub, localCCId)
	interopcc := SmartContract{}

	assetType := "cbdc"
	numUnits := uint64(10)
	locker := getTxCreatorECertBase64()
	recipient := "Bob"
	preimage := "abcd"

	hashBase64 := assetexchange.GenerateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())

	assetAgreement := &common.FungibleAssetExchangeAgreement{
		AssetType: assetType,
		NumUnits:  numUnits,
		Locker:    locker,
		Recipient: recipient,
	}
	assetAgreementBytes, _ := proto.Marshal(assetAgreement)
	contractId := assetexchange.GenerateFungibleAssetLockContractId(ctx, localCCId, assetAgreement)
	chaincodeStub.GetCreatorReturns([]byte(getCreator()), nil)
	chaincodeStub.GetStateReturnsOnCall(0, []byte("interopcc"), nil)

	// Test failure with TimeSpec that is part of lock information not being currently supported
	// no need to set chaincodeStub.GetStateReturns below since the error is hit before GetState() ledger access
	lockInfoHTLC := &common.AssetLockHTLC{
		HashBase64: []byte(hashBase64),
		// lock for next 5 mintues
		ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs,
		// TimeSpec of AssetLockHTLC_DURATION is not currently supported
		TimeSpec: common.TimeSpec_DURATION,
	}
	lockInfoHTLCBytes, _ := proto.Marshal(lockInfoHTLC)
	lockInfo := &common.AssetLock{
		LockMechanism: common.LockMechanism_HTLC,
		LockInfo:      lockInfoHTLCBytes,
	}
	lockInfoBytes, _ := proto.Marshal(lockInfo)
	_, err := interopcc.LockFungibleAsset(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes), base64.StdEncoding.EncodeToString(lockInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "only EPOCH time is supported at present")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with GetState(contractId) fail to read the world state
	chaincodeStub.GetStateReturnsOnCall(1, []byte("interopcc"), nil)
	chaincodeStub.GetStateReturnsOnCall(2, nil, fmt.Errorf("unable to retrieve contractId %s", contractId))
	lockInfoHTLC = &common.AssetLockHTLC{
		HashBase64: []byte(hashBase64),
		// lock for next 5 mintues
		ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs,
		// TimeSpec of AssetLockHTLC_EPOCH is only supported currently
		TimeSpec: common.TimeSpec_EPOCH,
	}
	lockInfoHTLCBytes, _ = proto.Marshal(lockInfoHTLC)
	lockInfo = &common.AssetLock{
		LockMechanism: common.LockMechanism_HTLC,
		LockInfo:      lockInfoHTLCBytes,
	}
	lockInfoBytes, _ = proto.Marshal(lockInfo)
	_, err = interopcc.LockFungibleAsset(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes), base64.StdEncoding.EncodeToString(lockInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "failed to retrieve from the world state: unable to retrieve contractId "+contractId)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with contractId already existing on the ledger
	hashLock := assetexchange.HashLock{HashMechanism: common.HashMechanism_SHA256, HashBase64: hashBase64}
	var lockInfoVal interface{}
	lockInfoVal = hashLock
	assetLockVal := assetexchange.FungibleAssetLockValue{Type: assetType, NumUnits: numUnits, Locker: locker, Recipient: recipient,
		LockInfo: lockInfoVal, ExpiryTimeSecs: lockInfoHTLC.ExpiryTimeSecs}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(3, []byte("interopcc"), nil)
	chaincodeStub.GetStateReturnsOnCall(4, assetLockValBytes, nil)
	_, err = interopcc.LockFungibleAsset(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes), base64.StdEncoding.EncodeToString(lockInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "contractId "+contractId+" already exists for the requested fungible asset agreement")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with PutState failing to write to the ledger
	chaincodeStub.GetStateReturnsOnCall(5, []byte("interopcc"), nil)
	chaincodeStub.GetStateReturnsOnCall(6, nil, nil)
	chaincodeStub.PutStateReturnsOnCall(0, fmt.Errorf("unable to write the fungible asset lock to the ledger for contractId %s", contractId))
	_, err = interopcc.LockFungibleAsset(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes), base64.StdEncoding.EncodeToString(lockInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "failed to write to the world state: unable to write the fungible asset lock to the ledger for contractId "+contractId)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test success with fungible asset agreement specified properly
	chaincodeStub.GetStateReturnsOnCall(7, []byte("interopcc"), nil)
	chaincodeStub.GetStateReturnsOnCall(8, nil, nil)
	_, err = interopcc.LockFungibleAsset(ctx, base64.StdEncoding.EncodeToString(assetAgreementBytes), base64.StdEncoding.EncodeToString(lockInfoBytes))
	require.NoError(t, err)
	fmt.Println("Test success as expected since the fungible asset agreement is specified properly.")
}

func TestIsFungibleAssetLocked(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	localCCId := "mycc"
	wtest.SetMockStubCCId(chaincodeStub, localCCId)
	interopcc := SmartContract{}

	assetType := "cbdc"
	numUnits := uint64(10)
	locker := "Alice"
	recipient := "Bob"
	preimage := "abcd"

	hashBase64 := assetexchange.GenerateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())

	assetAgreement := &common.FungibleAssetExchangeAgreement{
		AssetType: assetType,
		NumUnits:  numUnits,
		Locker:    locker,
		Recipient: recipient,
	}
	contractId := assetexchange.GenerateFungibleAssetLockContractId(ctx, localCCId, assetAgreement)

	// Test failure with GetState(contractId) fail to read the world state
	chaincodeStub.GetStateReturnsOnCall(0, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(1, nil, fmt.Errorf("unable to retrieve contractId %s", contractId))
	isAssetLocked, err := interopcc.IsFungibleAssetLocked(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "failed to retrieve from the world state: unable to retrieve contractId "+contractId)
	require.False(t, isAssetLocked)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure under the scenario that the contractId is not valid and there is no fungible asset locked with it
	chaincodeStub.GetStateReturnsOnCall(2, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(3, nil, nil)
	isAssetLocked, err = interopcc.IsFungibleAssetLocked(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "contractId "+contractId+" is not associated with any currently locked fungible asset")
	require.False(t, isAssetLocked)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure for query if fungible asset is locked with lock expiry time elapsed already
	hashLock := assetexchange.HashLock{HashMechanism: common.HashMechanism_SHA256, HashBase64: hashBase64}
	var lockInfo interface{}
	lockInfo = hashLock
	assetLockVal := assetexchange.FungibleAssetLockValue{Type: assetType, NumUnits: numUnits, Locker: locker, Recipient: recipient,
		LockInfo: lockInfo, ExpiryTimeSecs: currentTimeSecs - defaultTimeLockSecs}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(4, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(5, assetLockValBytes, nil)
	isAssetLocked, err = interopcc.IsFungibleAssetLocked(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "expiry time for fungible asset associated with contractId "+contractId+" is already elapsed")
	require.False(t, isAssetLocked)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test success with asset being queried using contractId
	assetLockVal = assetexchange.FungibleAssetLockValue{Type: assetType, NumUnits: numUnits, Locker: locker, Recipient: recipient,
		LockInfo: lockInfo, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(6, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(7, assetLockValBytes, nil)
	isAssetLocked, err = interopcc.IsFungibleAssetLocked(ctx, contractId)
	require.NoError(t, err)
	require.True(t, isAssetLocked)
	fmt.Printf("Test success as expected since a valid contractId is specified.\n")
}

func TestClaimFungibleAsset(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	localCCId := "mycc"
	wtest.SetMockStubCCId(chaincodeStub, localCCId)
	interopcc := SmartContract{}

	assetType := "cbdc"
	numUnits := uint64(10)
	locker := "Alice"
	recipient := getTxCreatorECertBase64()
	preimage := "abcd"

	hashBase64 := assetexchange.GenerateSHA256HashInBase64Form(preimage)
	preimageBase64 := base64.StdEncoding.EncodeToString([]byte(preimage))
	currentTimeSecs := uint64(time.Now().Unix())
	chaincodeStub.GetCreatorReturns([]byte(getCreator()), nil)

	assetAgreement := &common.FungibleAssetExchangeAgreement{
		AssetType: assetType,
		NumUnits:  numUnits,
		Locker:    locker,
		Recipient: recipient,
	}
	contractId := assetexchange.GenerateFungibleAssetLockContractId(ctx, localCCId, assetAgreement)

	claimInfoHTLC := &common.AssetClaimHTLC{
		HashMechanism: common.HashMechanism_SHA256,
		HashPreimageBase64: []byte(preimageBase64),
	}
	claimInfoHTLCBytes, _ := proto.Marshal(claimInfoHTLC)
	claimInfo := &common.AssetClaim{
		LockMechanism: common.LockMechanism_HTLC,
		ClaimInfo:     claimInfoHTLCBytes,
	}
	claimInfoBytes, _ := proto.Marshal(claimInfo)

	// Test failure with GetState(contractId) fail to read the world state
	chaincodeStub.GetStateReturnsOnCall(0, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(1, nil, fmt.Errorf("unable to retrieve contractId %s", contractId))
	err := interopcc.ClaimFungibleAsset(ctx, contractId, base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "failed to retrieve from the world state: unable to retrieve contractId "+contractId)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure under the scenario that the contractId is not valid and there is no fungible asset locked with it
	chaincodeStub.GetStateReturnsOnCall(2, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(3, nil, nil)
	err = interopcc.ClaimFungibleAsset(ctx, contractId, base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "contractId "+contractId+" is not associated with any currently locked fungible asset")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure for fungible asset claim exercised with expiry time elapsed already
	hashLock := assetexchange.HashLock{HashMechanism: common.HashMechanism_SHA256, HashBase64: hashBase64}
	var lockInfo interface{}
	lockInfo = hashLock
	assetLockVal := assetexchange.FungibleAssetLockValue{Type: assetType, NumUnits: numUnits, Locker: locker, Recipient: recipient,
		LockInfo: lockInfo, ExpiryTimeSecs: currentTimeSecs - defaultTimeLockSecs}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(4, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(5, assetLockValBytes, nil)
	err = interopcc.ClaimFungibleAsset(ctx, contractId, base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "cannot claim fungible asset associated with contractId "+contractId+" as the expiry time is already elapsed")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with claim information (i.e., preimage) not specified properly
	wrongPreimage := "abc"
	wrongPreimageBase64 := base64.StdEncoding.EncodeToString([]byte(wrongPreimage))
	wrongClaimInfoHTLC := &common.AssetClaimHTLC{
		HashMechanism: common.HashMechanism_SHA256,
		HashPreimageBase64: []byte(wrongPreimageBase64),
	}
	wrongClaimInfoHTLCBytes, _ := proto.Marshal(wrongClaimInfoHTLC)
	wrongClaimInfo := &common.AssetClaim{
		LockMechanism: common.LockMechanism_HTLC,
		ClaimInfo:     wrongClaimInfoHTLCBytes,
	}
	wrongClaimInfoBytes, _ := proto.Marshal(wrongClaimInfo)
	assetLockVal = assetexchange.FungibleAssetLockValue{Type: assetType, NumUnits: numUnits, Locker: locker, Recipient: recipient,
		LockInfo: lockInfo, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(6, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(7, assetLockValBytes, nil)
	err = interopcc.ClaimFungibleAsset(ctx, contractId, base64.StdEncoding.EncodeToString(wrongClaimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "cannot claim fungible asset associated with contractId "+contractId+" as the hash preimage is not matching")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with DelState failing on contractId
	chaincodeStub.GetStateReturnsOnCall(8, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(9, assetLockValBytes, nil)
	chaincodeStub.DelStateReturnsOnCall(0, fmt.Errorf("unable to delete contractId from world state"))
	err = interopcc.ClaimFungibleAsset(ctx, contractId, base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "failed to delete the contractId "+
		contractId+" as part of fungible asset claim: unable to delete contractId from world state")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test success with asset being claimed using contractId
	chaincodeStub.GetStateReturnsOnCall(10, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(11, assetLockValBytes, nil)
	chaincodeStub.DelStateReturnsOnCall(1, nil)
	err = interopcc.ClaimFungibleAsset(ctx, contractId, base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.NoError(t, err)
	fmt.Printf("Test success as expected since a valid contractId is specified.\n")

	// Test failure with asset agreement specified not properly
	chaincodeStub.GetStateReturnsOnCall(12, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(13, nil, nil)
	err = interopcc.ClaimFungibleAsset(ctx, contractId, base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "contractId " + contractId + " is not associated with any currently locked fungible asset")
	log.Info(fmt.Println("Test failed as expected with error:", err))

	// Test failure with hash mechanism not specified properly
	hashLock = assetexchange.HashLock{HashMechanism: common.HashMechanism_SHA512, HashBase64: hashBase64}
	assetLockVal = assetexchange.FungibleAssetLockValue{Type: assetType, NumUnits: numUnits, Locker: locker, Recipient: recipient,
		LockInfo: hashLock, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(14, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(15, assetLockValBytes, nil)
	chaincodeStub.DelStateReturnsOnCall(2, nil)

	err = interopcc.ClaimFungibleAsset(ctx, contractId, base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.Error(t, err)
	require.EqualError(t, err, "claim fungible asset associated with contractId " + contractId + " failed with error: hash mechanism used while locking is different from the one supplied: 0")
	fmt.Printf("Test failed as expected with error: %s\n", err)
}

func TestUnlockFungibleAsset(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	localCCId := "mycc"
	wtest.SetMockStubCCId(chaincodeStub, localCCId)
	interopcc := SmartContract{}

	assetType := "cbdc"
	numUnits := uint64(10)
	locker := getTxCreatorECertBase64()
	recipient := "Bob"
	preimage := "abcd"

	hashBase64 := assetexchange.GenerateSHA256HashInBase64Form(preimage)
	currentTimeSecs := uint64(time.Now().Unix())
	chaincodeStub.GetCreatorReturns([]byte(getCreator()), nil)

	assetAgreement := &common.FungibleAssetExchangeAgreement{
		AssetType: assetType,
		NumUnits:  numUnits,
		Locker:    locker,
		Recipient: recipient,
	}
	contractId := assetexchange.GenerateFungibleAssetLockContractId(ctx, localCCId, assetAgreement)

	// Test failure with GetState(contractId) fail to read the world state
	chaincodeStub.GetStateReturnsOnCall(0, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(1, nil, fmt.Errorf("unable to retrieve contractId %s", contractId))
	err := interopcc.UnlockFungibleAsset(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "failed to retrieve from the world state: unable to retrieve contractId "+contractId)
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure under the scenario that the contractId is not valid and there is no fungible asset locked with it
	chaincodeStub.GetStateReturnsOnCall(2, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(3, nil, nil)
	err = interopcc.UnlockFungibleAsset(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "contractId "+contractId+" is not associated with any currently locked fungible asset")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure for fungible asset unlock exercised with expiry time not yet elapsed
	hashLock := assetexchange.HashLock{HashMechanism: common.HashMechanism_SHA256, HashBase64: hashBase64}
	var lockInfo interface{}
	lockInfo = hashLock
	assetLockVal := assetexchange.FungibleAssetLockValue{Type: assetType, NumUnits: numUnits, Locker: locker, Recipient: recipient,
		LockInfo: lockInfo, ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs}
	assetLockValBytes, _ := json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(4, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(5, assetLockValBytes, nil)
	err = interopcc.UnlockFungibleAsset(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "cannot unlock fungible asset associated with the contractId "+contractId+" as the expiry time is not yet elapsed")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test failure with DelState failing on contractId
	assetLockVal = assetexchange.FungibleAssetLockValue{Type: assetType, NumUnits: numUnits, Locker: locker, Recipient: recipient,
		LockInfo: lockInfo, ExpiryTimeSecs: currentTimeSecs - defaultTimeLockSecs}
	assetLockValBytes, _ = json.Marshal(assetLockVal)
	chaincodeStub.GetStateReturnsOnCall(6, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(7, assetLockValBytes, nil)
	chaincodeStub.DelStateReturnsOnCall(0, fmt.Errorf("unable to delete contractId from world state"))
	err = interopcc.UnlockFungibleAsset(ctx, contractId)
	require.Error(t, err)
	require.EqualError(t, err, "failed to delete the contractId "+
		contractId+" as part of fungible asset unlock: unable to delete contractId from world state")
	fmt.Printf("Test failed as expected with error: %s\n", err)

	// Test success with fungible asset being unlocked using contractId
	chaincodeStub.GetStateReturnsOnCall(8, []byte(localCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(9, assetLockValBytes, nil)
	chaincodeStub.DelStateReturnsOnCall(1, nil)
	err = interopcc.UnlockFungibleAsset(ctx, contractId)
	require.NoError(t, err)
	fmt.Printf("Test success as expected since a valid contractId is specified.\n")
}
