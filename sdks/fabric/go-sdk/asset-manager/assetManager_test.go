/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package assetmanager

import (
	"errors"
	"testing"
	"time"

	"github.com/hyperledger/fabric-sdk-go/pkg/gateway"
	"github.com/stretchr/testify/require"
)

var submitTransactionMock func() ([]byte, error)
var evaluateTransactionMock func() ([]byte, error)

type fabricGatewayContractMock struct{}

func (fMock fabricGatewayContractMock) SubmitTransaction(contract *gateway.Contract, ccFunc string, args ...string) ([]byte, error) {
	return submitTransactionMock()
}

func (fMock fabricGatewayContractMock) EvaluateTransaction(contract *gateway.Contract, ccFunc string, args ...string) ([]byte, error) {
	return evaluateTransactionMock()
}

func TestCreateHTLC(t *testing.T) {

	gci := fabricGatewayContractMock{}
	submitTransactionMock = func() ([]byte, error) {
		return []byte("contract-id"), nil
	}

	contract := &gateway.Contract{}
	assetType := "asset-type"
	assetId := "asset-id"
	recipientECertBase64 := "recipientECertBase64"
	hashBase64 := "hashBase64"
	expiryTimeSecs := uint64(time.Now().Unix()) - 10

	expectedError := "contract handle not supplied"
	_, err := CreateHTLC(gci, nil, assetType, assetId, recipientECertBase64, hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "asset type not supplied"
	_, err = CreateHTLC(gci, contract, "", assetId, recipientECertBase64, hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "asset id not supplied"
	_, err = CreateHTLC(gci, contract, assetType, "", recipientECertBase64, hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "recipientECertBase64 id not supplied"
	_, err = CreateHTLC(gci, contract, assetType, assetId, "", hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "hashBase64 is not supplied"
	_, err = CreateHTLC(gci, contract, assetType, assetId, recipientECertBase64, "", expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "supplied expirty time in the past"
	_, err = CreateHTLC(gci, contract, assetType, assetId, recipientECertBase64, hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expiryTimeSecs = uint64(time.Now().Unix()) + 10
	contractId, err := CreateHTLC(gci, contract, assetType, assetId, recipientECertBase64, hashBase64, expiryTimeSecs)
	if err != nil {
		t.Error("failed with error: ", err.Error())
	}
	require.Equal(t, contractId, "contract-id")

	submitTransactionMock = func() ([]byte, error) {
		return []byte(""), errors.New("failed submission")
	}
	expectedError = "error in contract.SubmitTransaction LockAsset: failed submission"
	_, err = CreateHTLC(gci, contract, assetType, assetId, recipientECertBase64, hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
}

func TestCreateFungibleHTLC(t *testing.T) {

	gci := fabricGatewayContractMock{}
	submitTransactionMock = func() ([]byte, error) {
		return []byte("contract-id"), nil
	}

	contract := &gateway.Contract{}
	assetType := "asset-type"
	numUnits := uint64(10)
	recipientECertBase64 := "recipientECertBase64"
	hashBase64 := "hashBase64"
	expiryTimeSecs := uint64(time.Now().Unix()) - 10

	expectedError := "contract handle not supplied"
	_, err := CreateFungibleHTLC(gci, nil, assetType, numUnits, recipientECertBase64, hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "asset type not supplied"
	_, err = CreateFungibleHTLC(gci, contract, "", numUnits, recipientECertBase64, hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "asset count must be a positive number"
	_, err = CreateFungibleHTLC(gci, contract, assetType, 0, recipientECertBase64, hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "recipientECertBase64 id not supplied"
	_, err = CreateFungibleHTLC(gci, contract, assetType, numUnits, "", hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "hashBase64 is not supplied"
	_, err = CreateFungibleHTLC(gci, contract, assetType, numUnits, recipientECertBase64, "", expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "supplied expirty time in the past"
	_, err = CreateFungibleHTLC(gci, contract, assetType, numUnits, recipientECertBase64, hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expiryTimeSecs = uint64(time.Now().Unix()) + 10
	contractId, err := CreateFungibleHTLC(gci, contract, assetType, numUnits, recipientECertBase64, hashBase64, expiryTimeSecs)
	if err != nil {
		t.Error("failed with error: ", err.Error())
	}
	require.Equal(t, contractId, "contract-id")

	submitTransactionMock = func() ([]byte, error) {
		return []byte(""), errors.New("failed submission")
	}
	expectedError = "error in contract.SubmitTransaction LockFungibleAsset: failed submission"
	_, err = CreateFungibleHTLC(gci, contract, assetType, numUnits, recipientECertBase64, hashBase64, expiryTimeSecs)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
}

func TestIsAssetLockedInHTLC(t *testing.T) {

	gci := fabricGatewayContractMock{}
	evaluateTransactionMock = func() ([]byte, error) {
		return []byte("true"), nil
	}

	contract := &gateway.Contract{}
	assetType := "asset-type"
	assetId := "asset-id"
	recipientECertBase64 := "recipientECertBase64"
	lockerECertBase64 := "lockerECertBase64"

	expectedError := "contract handle not supplied"
	_, err := IsAssetLockedInHTLC(gci, nil, assetType, assetId, recipientECertBase64, lockerECertBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "asset type not supplied"
	_, err = IsAssetLockedInHTLC(gci, contract, "", assetId, recipientECertBase64, lockerECertBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "asset id not supplied"
	_, err = IsAssetLockedInHTLC(gci, contract, assetType, "", recipientECertBase64, lockerECertBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "recipientECertBase64 id not supplied"
	_, err = IsAssetLockedInHTLC(gci, contract, assetType, assetId, "", lockerECertBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "lockerECertBase64 id not supplied"
	_, err = IsAssetLockedInHTLC(gci, contract, assetType, assetId, recipientECertBase64, "")
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	isLocked, err := IsAssetLockedInHTLC(gci, contract, assetType, assetId, recipientECertBase64, lockerECertBase64)
	if err != nil {
		t.Error("failed with error: ", err.Error())
	}
	require.Equal(t, isLocked, "true")

	evaluateTransactionMock = func() ([]byte, error) {
		return []byte(""), errors.New("failed evaluation")
	}
	expectedError = "error in contract.EvaluateTransaction IsAssetLocked: failed evaluation"
	_, err = IsAssetLockedInHTLC(gci, contract, assetType, assetId, recipientECertBase64, lockerECertBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
}

func TestIsFungibleAssetLockedInHTLC(t *testing.T) {

	gci := fabricGatewayContractMock{}
	evaluateTransactionMock = func() ([]byte, error) {
		return []byte("true"), nil
	}

	contract := &gateway.Contract{}
	contractId := "contract-id"

	expectedError := "contract handle not supplied"
	_, err := IsFungibleAssetLockedInHTLC(gci, nil, contractId)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "contractId not supplied"
	_, err = IsFungibleAssetLockedInHTLC(gci, contract, "")
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	isLocked, err := IsFungibleAssetLockedInHTLC(gci, contract, contractId)
	if err != nil {
		t.Error("failed with error: ", err.Error())
	}
	require.Equal(t, isLocked, "true")

	evaluateTransactionMock = func() ([]byte, error) {
		return []byte(""), errors.New("failed evaluation")
	}
	expectedError = "error in contract.EvaluateTransaction IsFungibleAssetLocked: failed evaluation"
	_, err = IsFungibleAssetLockedInHTLC(gci, contract, contractId)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
}

func TestIsAssetLockedInHTLCqueryUsingContractId(t *testing.T) {

	gci := fabricGatewayContractMock{}
	evaluateTransactionMock = func() ([]byte, error) {
		return []byte("true"), nil
	}

	contract := &gateway.Contract{}
	contractId := "contract-id"

	expectedError := "contract handle not supplied"
	_, err := IsAssetLockedInHTLCqueryUsingContractId(gci, nil, contractId)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "contractId not supplied"
	_, err = IsAssetLockedInHTLCqueryUsingContractId(gci, contract, "")
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	isLocked, err := IsAssetLockedInHTLCqueryUsingContractId(gci, contract, contractId)
	if err != nil {
		t.Error("failed with error: ", err.Error())
	}
	require.Equal(t, isLocked, "true")

	evaluateTransactionMock = func() ([]byte, error) {
		return []byte(""), errors.New("failed evaluation")
	}
	expectedError = "error in contract.EvaluateTransaction IsAssetLockedQueryUsingContractId: failed evaluation"
	_, err = IsAssetLockedInHTLCqueryUsingContractId(gci, contract, contractId)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
}

func TestClaimAssetInHTLC(t *testing.T) {

	gci := fabricGatewayContractMock{}
	submitTransactionMock = func() ([]byte, error) {
		return []byte("true"), nil
	}

	contract := &gateway.Contract{}
	assetType := "asset-type"
	assetId := "asset-id"
	lockerECertBase64 := "lockerECertBase64"
	hashPreimageBase64 := "hashPreimageBase64"

	expectedError := "contract handle not supplied"
	_, err := ClaimAssetInHTLC(gci, nil, assetType, assetId, lockerECertBase64, hashPreimageBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "asset type not supplied"
	_, err = ClaimAssetInHTLC(gci, contract, "", assetId, lockerECertBase64, hashPreimageBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "lockerECertBase64 id not supplied"
	_, err = ClaimAssetInHTLC(gci, contract, assetType, assetId, "", hashPreimageBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "hashPreimageBase64 is not supplied"
	_, err = ClaimAssetInHTLC(gci, contract, assetType, assetId, lockerECertBase64, "")
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	isClaimed, err := ClaimAssetInHTLC(gci, contract, assetType, assetId, lockerECertBase64, hashPreimageBase64)
	if err != nil {
		t.Error("failed with error: ", err.Error())
	}
	require.Equal(t, isClaimed, "true")

	submitTransactionMock = func() ([]byte, error) {
		return []byte(""), errors.New("failed submission")
	}
	expectedError = "error in contract.SubmitTransaction ClaimAsset: failed submission"
	_, err = ClaimAssetInHTLC(gci, contract, assetType, assetId, lockerECertBase64, hashPreimageBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
}

func TestClaimFungibleAssetInHTLC(t *testing.T) {

	gci := fabricGatewayContractMock{}
	submitTransactionMock = func() ([]byte, error) {
		return []byte("true"), nil
	}

	contract := &gateway.Contract{}
	contractId := "contract-id"
	hashPreimageBase64 := "hashPreimageBase64"

	expectedError := "contract handle not supplied"
	_, err := ClaimFungibleAssetInHTLC(gci, nil, contractId, hashPreimageBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "contractId not supplied"
	_, err = ClaimFungibleAssetInHTLC(gci, contract, "", hashPreimageBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "hashPreimageBase64 is not supplied"
	_, err = ClaimFungibleAssetInHTLC(gci, contract, contractId, "")
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	isClaimed, err := ClaimFungibleAssetInHTLC(gci, contract, contractId, hashPreimageBase64)
	if err != nil {
		t.Error("failed with error: ", err.Error())
	}
	require.Equal(t, isClaimed, "true")

	submitTransactionMock = func() ([]byte, error) {
		return []byte(""), errors.New("failed submission")
	}
	expectedError = "error in contract.SubmitTransaction ClaimFungibleAsset: failed submission"
	_, err = ClaimFungibleAssetInHTLC(gci, contract, contractId, hashPreimageBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
}

func TestReclaimAssetInHTLC(t *testing.T) {

	gci := fabricGatewayContractMock{}
	submitTransactionMock = func() ([]byte, error) {
		return []byte("true"), nil
	}

	contract := &gateway.Contract{}
	assetType := "asset-type"
	assetId := "asset-id"
	recipientECertBase64 := "recipientECertBase64"

	expectedError := "contract handle not supplied"
	_, err := ReclaimAssetInHTLC(gci, nil, assetType, assetId, recipientECertBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "asset type not supplied"
	_, err = ReclaimAssetInHTLC(gci, contract, "", assetId, recipientECertBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "asset id not supplied"
	_, err = ReclaimAssetInHTLC(gci, contract, assetType, "", recipientECertBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "recipientECertBase64 id not supplied"
	_, err = ReclaimAssetInHTLC(gci, contract, assetType, assetId, "")
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	isClaimed, err := ReclaimAssetInHTLC(gci, contract, assetType, assetId, recipientECertBase64)
	if err != nil {
		t.Error("failed with error: ", err.Error())
	}
	require.Equal(t, isClaimed, "true")

	submitTransactionMock = func() ([]byte, error) {
		return []byte(""), errors.New("failed submission")
	}
	expectedError = "error in contract.SubmitTransaction UnlockAsset: failed submission"
	_, err = ReclaimAssetInHTLC(gci, contract, assetType, assetId, recipientECertBase64)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
}

func TestReclaimFungibleAssetInHTLC(t *testing.T) {

	gci := fabricGatewayContractMock{}
	submitTransactionMock = func() ([]byte, error) {
		return []byte("true"), nil
	}

	contract := &gateway.Contract{}
	contractId := "contract-id"

	expectedError := "contract handle not supplied"
	_, err := ReclaimFungibleAssetInHTLC(gci, nil, contractId)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "contractId not supplied"
	_, err = ReclaimFungibleAssetInHTLC(gci, contract, "")
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	isClaimed, err := ReclaimFungibleAssetInHTLC(gci, contract, contractId)
	if err != nil {
		t.Error("failed with error: ", err.Error())
	}
	require.Equal(t, isClaimed, "true")

	submitTransactionMock = func() ([]byte, error) {
		return []byte(""), errors.New("failed submission")
	}
	expectedError = "error in contract.SubmitTransaction UnlockFungibleAsset: failed submission"
	_, err = ReclaimFungibleAssetInHTLC(gci, contract, contractId)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
}

func TestReclaimAssetInHTLCusingContractId(t *testing.T) {

	gci := fabricGatewayContractMock{}
	submitTransactionMock = func() ([]byte, error) {
		return []byte("true"), nil
	}

	contract := &gateway.Contract{}
	contractId := "contract-id"

	expectedError := "contract handle not supplied"
	_, err := ReclaimAssetInHTLCusingContractId(gci, nil, contractId)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	expectedError = "contractId not supplied"
	_, err = ReclaimAssetInHTLCusingContractId(gci, contract, "")
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)

	isClaimed, err := ReclaimAssetInHTLCusingContractId(gci, contract, contractId)
	if err != nil {
		t.Error("failed with error: ", err.Error())
	}
	require.Equal(t, isClaimed, "true")

	submitTransactionMock = func() ([]byte, error) {
		return []byte(""), errors.New("failed submission")
	}
	expectedError = "error in contract.SubmitTransaction UnlockAssetUsingContractId: failed submission"
	_, err = ReclaimAssetInHTLCusingContractId(gci, contract, contractId)
	if err == nil {
		t.Error("expected to fail with error " + expectedError + " but didn't")
	}
	require.EqualError(t, err, expectedError)
}
