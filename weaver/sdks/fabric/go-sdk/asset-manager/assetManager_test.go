/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package assetmanager

import (
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

var submitTransactionMock func() ([]byte, error)
var evaluateTransactionMock func() ([]byte, error)

type gatewayContractMock struct{}

func (gwMock gatewayContractMock) SubmitTransaction(ccFunc string, args ...string) ([]byte, error) {
	return submitTransactionMock()
}

func (gwMock gatewayContractMock) EvaluateTransaction(ccFunc string, args ...string) ([]byte, error) {
	return evaluateTransactionMock()
}

func TestCreateHTLC(t *testing.T) {

	contract := gatewayContractMock{}
	submitTransactionMock = func() ([]byte, error) {
		return []byte("contract-id"), nil
	}

	assetType := "asset-type"
	assetId := "asset-id"
	recipientECertBase64 := "recipientECertBase64"
	hashBase64 := GenerateSHA256HashInBase64Form("hashPreimage")
	expiryTimeSecs := uint64(time.Now().Unix()) - 10

	expectedError := "contract handle not supplied"
	_, err := CreateHTLC(nil, assetType, assetId, recipientECertBase64, hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "asset type not supplied"
	_, err = CreateHTLC(contract, "", assetId, recipientECertBase64, hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "asset id not supplied"
	_, err = CreateHTLC(contract, assetType, "", recipientECertBase64, hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "recipientECertBase64 id not supplied"
	_, err = CreateHTLC(contract, assetType, assetId, "", hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "hashBase64 is not supplied"
	_, err = CreateHTLC(contract, assetType, assetId, recipientECertBase64, "", expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "supplied expirty time in the past"
	_, err = CreateHTLC(contract, assetType, assetId, recipientECertBase64, hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expiryTimeSecs = uint64(time.Now().Unix()) + 10
	contractId, err := CreateHTLC(contract, assetType, assetId, recipientECertBase64, hashBase64, expiryTimeSecs)
	if err != nil {
		t.Error("failed with error: ", err.Error())
	}
	require.Equal(t, contractId, "contract-id")

	submitTransactionMock = func() ([]byte, error) {
		return []byte(""), errors.New("failed submission")
	}
	expectedError = "error in contract.SubmitTransaction LockAsset: failed submission"
	_, err = CreateHTLC(contract, assetType, assetId, recipientECertBase64, hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
}

func TestCreateFungibleHTLC(t *testing.T) {

	contract := gatewayContractMock{}
	submitTransactionMock = func() ([]byte, error) {
		return []byte("contract-id"), nil
	}

	assetType := "asset-type"
	numUnits := uint64(10)
	recipientECertBase64 := "recipientECertBase64"
	hashBase64 := "hashBase64"
	expiryTimeSecs := uint64(time.Now().Unix()) - 10

	expectedError := "contract handle not supplied"
	_, err := CreateFungibleHTLC(nil, assetType, numUnits, recipientECertBase64, hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "asset type not supplied"
	_, err = CreateFungibleHTLC(contract, "", numUnits, recipientECertBase64, hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "asset count must be a positive number"
	_, err = CreateFungibleHTLC(contract, assetType, 0, recipientECertBase64, hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "recipientECertBase64 id not supplied"
	_, err = CreateFungibleHTLC(contract, assetType, numUnits, "", hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "hashBase64 is not supplied"
	_, err = CreateFungibleHTLC(contract, assetType, numUnits, recipientECertBase64, "", expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "supplied expirty time in the past"
	_, err = CreateFungibleHTLC(contract, assetType, numUnits, recipientECertBase64, hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expiryTimeSecs = uint64(time.Now().Unix()) + 10
	contractId, err := CreateFungibleHTLC(contract, assetType, numUnits, recipientECertBase64, hashBase64, expiryTimeSecs)
	if err != nil {
		t.Error("failed with error: ", err.Error())
	}
	require.Equal(t, contractId, "contract-id")

	submitTransactionMock = func() ([]byte, error) {
		return []byte(""), errors.New("failed submission")
	}
	expectedError = "error in contract.SubmitTransaction LockFungibleAsset: failed submission"
	_, err = CreateFungibleHTLC(contract, assetType, numUnits, recipientECertBase64, hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
}

func TestIsAssetLockedInHTLC(t *testing.T) {

	contract := gatewayContractMock{}
	evaluateTransactionMock = func() ([]byte, error) {
		return []byte("true"), nil
	}

	assetType := "asset-type"
	assetId := "asset-id"
	recipientECertBase64 := "recipientECertBase64"
	lockerECertBase64 := "lockerECertBase64"

	expectedError := "contract handle not supplied"
	_, err := IsAssetLockedInHTLC(nil, assetType, assetId, recipientECertBase64, lockerECertBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "asset type not supplied"
	_, err = IsAssetLockedInHTLC(contract, "", assetId, recipientECertBase64, lockerECertBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "asset id not supplied"
	_, err = IsAssetLockedInHTLC(contract, assetType, "", recipientECertBase64, lockerECertBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "recipientECertBase64 id not supplied"
	_, err = IsAssetLockedInHTLC(contract, assetType, assetId, "", lockerECertBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "lockerECertBase64 id not supplied"
	_, err = IsAssetLockedInHTLC(contract, assetType, assetId, recipientECertBase64, "")
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	isLocked, err := IsAssetLockedInHTLC(contract, assetType, assetId, recipientECertBase64, lockerECertBase64)
	if err != nil {
		t.Error("failed with error: ", err.Error())
	}
	require.Equal(t, isLocked, "true")

	evaluateTransactionMock = func() ([]byte, error) {
		return []byte(""), errors.New("failed evaluation")
	}
	expectedError = "error in contract.EvaluateTransaction IsAssetLocked: failed evaluation"
	_, err = IsAssetLockedInHTLC(contract, assetType, assetId, recipientECertBase64, lockerECertBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
}

func TestIsFungibleAssetLockedInHTLC(t *testing.T) {

	contract := gatewayContractMock{}
	evaluateTransactionMock = func() ([]byte, error) {
		return []byte("true"), nil
	}

	contractId := "contract-id"

	expectedError := "contract handle not supplied"
	_, err := IsFungibleAssetLockedInHTLC(nil, contractId)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "contractId not supplied"
	_, err = IsFungibleAssetLockedInHTLC(contract, "")
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	isLocked, err := IsFungibleAssetLockedInHTLC(contract, contractId)
	if err != nil {
		t.Error("failed with error: ", err.Error())
	}
	require.Equal(t, isLocked, "true")

	evaluateTransactionMock = func() ([]byte, error) {
		return []byte(""), errors.New("failed evaluation")
	}
	expectedError = "error in contract.EvaluateTransaction IsFungibleAssetLocked: failed evaluation"
	_, err = IsFungibleAssetLockedInHTLC(contract, contractId)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
}

func TestIsAssetLockedInHTLCqueryUsingContractId(t *testing.T) {

	contract := gatewayContractMock{}
	evaluateTransactionMock = func() ([]byte, error) {
		return []byte("true"), nil
	}

	contractId := "contract-id"

	expectedError := "contract handle not supplied"
	_, err := IsAssetLockedInHTLCqueryUsingContractId(nil, contractId)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "contractId not supplied"
	_, err = IsAssetLockedInHTLCqueryUsingContractId(contract, "")
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	isLocked, err := IsAssetLockedInHTLCqueryUsingContractId(contract, contractId)
	if err != nil {
		t.Error("failed with error: ", err.Error())
	}
	require.Equal(t, isLocked, "true")

	evaluateTransactionMock = func() ([]byte, error) {
		return []byte(""), errors.New("failed evaluation")
	}
	expectedError = "error in contract.EvaluateTransaction IsAssetLockedQueryUsingContractId: failed evaluation"
	_, err = IsAssetLockedInHTLCqueryUsingContractId(contract, contractId)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
}

func TestClaimAssetInHTLC(t *testing.T) {

	contract := gatewayContractMock{}
	submitTransactionMock = func() ([]byte, error) {
		return []byte("true"), nil
	}

	assetType := "asset-type"
	assetId := "asset-id"
	lockerECertBase64 := "lockerECertBase64"
	hashPreimageBase64 := "hashPreimageBase64"

	expectedError := "contract handle not supplied"
	_, err := ClaimAssetInHTLC(nil, assetType, assetId, lockerECertBase64, hashPreimageBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "asset type not supplied"
	_, err = ClaimAssetInHTLC(contract, "", assetId, lockerECertBase64, hashPreimageBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "asset id not supplied"
	_, err = ClaimAssetInHTLC(contract, assetType, "", lockerECertBase64, hashPreimageBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "lockerECertBase64 id not supplied"
	_, err = ClaimAssetInHTLC(contract, assetType, assetId, "", hashPreimageBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "hashPreimageBase64 is not supplied"
	_, err = ClaimAssetInHTLC(contract, assetType, assetId, lockerECertBase64, "")
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	isClaimed, err := ClaimAssetInHTLC(contract, assetType, assetId, lockerECertBase64, hashPreimageBase64)
	if err != nil {
		t.Error("failed with error: ", err.Error())
	}
	require.Equal(t, isClaimed, "true")

	submitTransactionMock = func() ([]byte, error) {
		return []byte(""), errors.New("failed submission")
	}
	expectedError = "error in contract.SubmitTransaction ClaimAsset: failed submission"
	_, err = ClaimAssetInHTLC(contract, assetType, assetId, lockerECertBase64, hashPreimageBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
}

func TestClaimFungibleAssetInHTLC(t *testing.T) {

	contract := gatewayContractMock{}
	submitTransactionMock = func() ([]byte, error) {
		return []byte("true"), nil
	}

	contractId := "contract-id"
	hashPreimageBase64 := "hashPreimageBase64"

	expectedError := "contract handle not supplied"
	_, err := ClaimFungibleAssetInHTLC(nil, contractId, hashPreimageBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "contractId not supplied"
	_, err = ClaimFungibleAssetInHTLC(contract, "", hashPreimageBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "hashPreimageBase64 is not supplied"
	_, err = ClaimFungibleAssetInHTLC(contract, contractId, "")
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	isClaimed, err := ClaimFungibleAssetInHTLC(contract, contractId, hashPreimageBase64)
	if err != nil {
		t.Error("failed with error: ", err.Error())
	}
	require.Equal(t, isClaimed, "true")

	submitTransactionMock = func() ([]byte, error) {
		return []byte(""), errors.New("failed submission")
	}
	expectedError = "error in contract.SubmitTransaction ClaimFungibleAsset: failed submission"
	_, err = ClaimFungibleAssetInHTLC(contract, contractId, hashPreimageBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
}

func TestClaimAssetInHTLCusingContractId(t *testing.T) {

	contract := gatewayContractMock{}
	submitTransactionMock = func() ([]byte, error) {
		return []byte("true"), nil
	}

	contractId := "contract-id"
	hashPreimageBase64 := "hashPreimageBase64"

	expectedError := "contract handle not supplied"
	_, err := ClaimAssetInHTLCusingContractId(nil, contractId, hashPreimageBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "contractId not supplied"
	_, err = ClaimAssetInHTLCusingContractId(contract, "", hashPreimageBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "hashPreimageBase64 is not supplied"
	_, err = ClaimAssetInHTLCusingContractId(contract, contractId, "")
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	isClaimed, err := ClaimAssetInHTLCusingContractId(contract, contractId, hashPreimageBase64)
	if err != nil {
		t.Error("failed with error: ", err.Error())
	}
	require.Equal(t, isClaimed, "true")

	submitTransactionMock = func() ([]byte, error) {
		return []byte(""), errors.New("failed submission")
	}
	expectedError = "error in contract.SubmitTransaction ClaimAssetUsingContractId: failed submission"
	_, err = ClaimAssetInHTLCusingContractId(contract, contractId, hashPreimageBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
}

func TestReclaimAssetInHTLC(t *testing.T) {

	contract := gatewayContractMock{}
	submitTransactionMock = func() ([]byte, error) {
		return []byte("true"), nil
	}

	assetType := "asset-type"
	assetId := "asset-id"
	recipientECertBase64 := "recipientECertBase64"

	expectedError := "contract handle not supplied"
	_, err := ReclaimAssetInHTLC(nil, assetType, assetId, recipientECertBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "asset type not supplied"
	_, err = ReclaimAssetInHTLC(contract, "", assetId, recipientECertBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "asset id not supplied"
	_, err = ReclaimAssetInHTLC(contract, assetType, "", recipientECertBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "recipientECertBase64 id not supplied"
	_, err = ReclaimAssetInHTLC(contract, assetType, assetId, "")
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	isClaimed, err := ReclaimAssetInHTLC(contract, assetType, assetId, recipientECertBase64)
	if err != nil {
		t.Error("failed with error: ", err.Error())
	}
	require.Equal(t, isClaimed, "true")

	submitTransactionMock = func() ([]byte, error) {
		return []byte(""), errors.New("failed submission")
	}
	expectedError = "error in contract.SubmitTransaction UnlockAsset: failed submission"
	_, err = ReclaimAssetInHTLC(contract, assetType, assetId, recipientECertBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
}

func TestReclaimFungibleAssetInHTLC(t *testing.T) {

	contract := gatewayContractMock{}
	submitTransactionMock = func() ([]byte, error) {
		return []byte("true"), nil
	}

	contractId := "contract-id"

	expectedError := "contract handle not supplied"
	_, err := ReclaimFungibleAssetInHTLC(nil, contractId)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "contractId not supplied"
	_, err = ReclaimFungibleAssetInHTLC(contract, "")
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	isClaimed, err := ReclaimFungibleAssetInHTLC(contract, contractId)
	if err != nil {
		t.Error("failed with error: ", err.Error())
	}
	require.Equal(t, isClaimed, "true")

	submitTransactionMock = func() ([]byte, error) {
		return []byte(""), errors.New("failed submission")
	}
	expectedError = "error in contract.SubmitTransaction UnlockFungibleAsset: failed submission"
	_, err = ReclaimFungibleAssetInHTLC(contract, contractId)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
}

func TestReclaimAssetInHTLCusingContractId(t *testing.T) {

	contract := gatewayContractMock{}
	submitTransactionMock = func() ([]byte, error) {
		return []byte("true"), nil
	}

	contractId := "contract-id"

	expectedError := "contract handle not supplied"
	_, err := ReclaimAssetInHTLCusingContractId(nil, contractId)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "contractId not supplied"
	_, err = ReclaimAssetInHTLCusingContractId(contract, "")
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	isClaimed, err := ReclaimAssetInHTLCusingContractId(contract, contractId)
	if err != nil {
		t.Error("failed with error: ", err.Error())
	}
	require.Equal(t, isClaimed, "true")

	submitTransactionMock = func() ([]byte, error) {
		return []byte(""), errors.New("failed submission")
	}
	expectedError = "error in contract.SubmitTransaction UnlockAssetUsingContractId: failed submission"
	_, err = ReclaimAssetInHTLCusingContractId(contract, contractId)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
}
