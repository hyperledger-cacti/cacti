/*
Copyright 2020 IBM All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
*/

package assetmanager

import (
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	log "github.com/sirupsen/logrus"

	"github.com/golang/protobuf/proto"
)

type GatewayContract interface {
	SubmitTransaction(string, ...string) ([]byte, error)
	EvaluateTransaction(string, ...string) ([]byte, error)
}

// helper functions to log and return errors
func logThenErrorf(format string, args ...interface{}) error {
	errorMsg := fmt.Sprintf(format, args...)
	log.Error(errorMsg)
	return errors.New(errorMsg)
}

// Create an asset exchange agreement structure
func createAssetExchangeAgreementSerializedBase64(assetType string, assetId string, recipientECertBase64 string, lockerECertBase64 string) (string, error) {
	assetAgreement := &common.AssetExchangeAgreement{
		AssetType: assetType,
		Id:        assetId,
		Recipient: recipientECertBase64,
		Locker:    lockerECertBase64,
	}
	assetAgreementBytes, err := proto.Marshal(assetAgreement)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	return base64.StdEncoding.EncodeToString(assetAgreementBytes), nil
}

// Create a fungible asset exchange agreement structure
func createFungibleAssetExchangeAgreementSerializedBase64(assetType string, numUnits uint64, recipientECertBase64 string, lockerECertBase64 string) (string, error) {
	assetAgreement := &common.FungibleAssetExchangeAgreement{
		AssetType: assetType,
		NumUnits:  numUnits,
		Recipient: recipientECertBase64,
		Locker:    lockerECertBase64,
	}
	assetAgreementBytes, err := proto.Marshal(assetAgreement)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	return base64.StdEncoding.EncodeToString(assetAgreementBytes), nil
}

// Create an asset lock structure
func createAssetLockInfoSerializedBase64(hashBase64 string, expiryTimeSecs uint64) (string, error) {
	lockInfoHTLC := &common.AssetLockHTLC{
		HashBase64:     []byte(hashBase64),
		ExpiryTimeSecs: expiryTimeSecs,
		TimeSpec:       common.TimeSpec_EPOCH,
	}
	lockInfoHTLCBytes, err := proto.Marshal(lockInfoHTLC)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	lockInfo := &common.AssetLock{
		LockMechanism: common.LockMechanism_HTLC,
		LockInfo:      lockInfoHTLCBytes,
	}
	lockInfoBytes, err := proto.Marshal(lockInfo)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	return base64.StdEncoding.EncodeToString(lockInfoBytes), nil
}

// Create an asset claim structure
func createAssetClaimInfoSerializedBase64(hashPreimageBase64 string) (string, error) {
	claimInfoHTLC := &common.AssetClaimHTLC{
		HashPreimageBase64: []byte(hashPreimageBase64),
	}
	claimInfoHTLCBytes, err := proto.Marshal(claimInfoHTLC)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	claimInfo := &common.AssetClaim{
		LockMechanism: common.LockMechanism_HTLC,
		ClaimInfo:     claimInfoHTLCBytes,
	}
	claimInfoBytes, err := proto.Marshal(claimInfo)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	return base64.StdEncoding.EncodeToString(claimInfoBytes), nil
}

// function to generate a "SHA256" hash in base64 format for a given preimage
func GenerateSHA256HashInBase64Form(hashPreimage string) string {
	hasher := sha256.New()
	hasher.Write([]byte(hashPreimage))
	shaHash := hasher.Sum(nil)
	shaHashBase64 := base64.StdEncoding.EncodeToString(shaHash)

	return shaHashBase64
}

func CreateHTLC(contract GatewayContract, assetType string, assetId string, recipientECertBase64 string,
	hashBase64 string, expiryTimeSecs uint64) (string, error) {
	if contract == nil {
		return "", logThenErrorf("contract handle not supplied")
	}
	if assetType == "" {
		return "", logThenErrorf("asset type not supplied")
	}
	if assetId == "" {
		return "", logThenErrorf("asset id not supplied")
	}
	if recipientECertBase64 == "" {
		return "", logThenErrorf("recipientECertBase64 id not supplied")
	}
	if hashBase64 == "" {
		return "", logThenErrorf("hashBase64 is not supplied")
	}
	currentTimeSecs := uint64(time.Now().Unix())
	if expiryTimeSecs <= currentTimeSecs {
		return "", logThenErrorf("supplied expirty time in the past")
	}

	assetExchangeAgreementStr, err := createAssetExchangeAgreementSerializedBase64(assetType, assetId, recipientECertBase64, "")
	if err != nil {
		return "", logThenErrorf(err.Error())
	}
	lockInfoStr, err := createAssetLockInfoSerializedBase64(hashBase64, expiryTimeSecs)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	// Normal invoke function
	result, err := contract.SubmitTransaction("LockAsset", assetExchangeAgreementStr, lockInfoStr)
	if err != nil {
		return "", logThenErrorf("error in contract.SubmitTransaction LockAsset: %+v", err.Error())
	}

	return string(result), nil
}

func CreateFungibleHTLC(contract GatewayContract, assetType string, numUnits uint64, recipientECertBase64 string,
	hashBase64 string, expiryTimeSecs uint64) (string, error) {
	if contract == nil {
		return "", logThenErrorf("contract handle not supplied")
	}
	if assetType == "" {
		return "", logThenErrorf("asset type not supplied")
	}
	if numUnits <= 0 {
		return "", logThenErrorf("asset count must be a positive number")
	}
	if recipientECertBase64 == "" {
		return "", logThenErrorf("recipientECertBase64 id not supplied")
	}
	if hashBase64 == "" {
		return "", logThenErrorf("hashBase64 is not supplied")
	}
	currentTimeSecs := uint64(time.Now().Unix())
	if expiryTimeSecs <= currentTimeSecs {
		return "", logThenErrorf("supplied expirty time in the past")
	}

	assetExchangeAgreementStr, err := createFungibleAssetExchangeAgreementSerializedBase64(assetType, numUnits, recipientECertBase64, "")
	if err != nil {
		return "", logThenErrorf(err.Error())
	}
	lockInfoStr, err := createAssetLockInfoSerializedBase64(hashBase64, expiryTimeSecs)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	// Normal invoke function
	result, err := contract.SubmitTransaction("LockFungibleAsset", assetExchangeAgreementStr, lockInfoStr)
	if err != nil {
		return "", logThenErrorf("error in contract.SubmitTransaction LockFungibleAsset: %+v", err.Error())
	}

	return string(result), nil
}

func IsAssetLockedInHTLC(contract GatewayContract, assetType string, assetId string, recipientECertBase64 string, lockerECertBase64 string) (string, error) {

	if contract == nil {
		return "", logThenErrorf("contract handle not supplied")
	}
	if assetType == "" {
		return "", logThenErrorf("asset type not supplied")
	}
	if assetId == "" {
		return "", logThenErrorf("asset id not supplied")
	}
	if recipientECertBase64 == "" {
		return "", logThenErrorf("recipientECertBase64 id not supplied")
	}
	if lockerECertBase64 == "" {
		return "", logThenErrorf("lockerECertBase64 id not supplied")
	}

	assetExchangeAgreementStr, err := createAssetExchangeAgreementSerializedBase64(assetType, assetId, recipientECertBase64, lockerECertBase64)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	// Normal invoke function
	result, err := contract.EvaluateTransaction("IsAssetLocked", assetExchangeAgreementStr)
	if err != nil {
		return "", logThenErrorf("error in contract.EvaluateTransaction IsAssetLocked: %+v", err.Error())
	}

	return string(result), nil
}

func IsFungibleAssetLockedInHTLC(contract GatewayContract, contractId string) (string, error) {

	if contract == nil {
		return "", logThenErrorf("contract handle not supplied")
	}
	if contractId == "" {
		return "", logThenErrorf("contractId not supplied")
	}

	// Normal invoke function
	result, err := contract.EvaluateTransaction("IsFungibleAssetLocked", contractId)
	if err != nil {
		return "", logThenErrorf("error in contract.EvaluateTransaction IsFungibleAssetLocked: %+v", err.Error())
	}

	return string(result), nil
}

func IsAssetLockedInHTLCqueryUsingContractId(contract GatewayContract, contractId string) (string, error) {

	if contract == nil {
		return "", logThenErrorf("contract handle not supplied")
	}
	if contractId == "" {
		return "", logThenErrorf("contractId not supplied")
	}

	// Normal invoke function
	result, err := contract.EvaluateTransaction("IsAssetLockedQueryUsingContractId", contractId)
	if err != nil {
		return "", logThenErrorf("error in contract.EvaluateTransaction IsAssetLockedQueryUsingContractId: %+v", err.Error())
	}

	return string(result), nil
}

func ClaimAssetInHTLC(contract GatewayContract, assetType string, assetId string, lockerECertBase64 string, hashPreimageBase64 string) (string, error) {
	if contract == nil {
		return "", logThenErrorf("contract handle not supplied")
	}
	if assetType == "" {
		return "", logThenErrorf("asset type not supplied")
	}
	if assetId == "" {
		return "", logThenErrorf("asset id not supplied")
	}
	if lockerECertBase64 == "" {
		return "", logThenErrorf("lockerECertBase64 id not supplied")
	}
	if hashPreimageBase64 == "" {
		return "", logThenErrorf("hashPreimageBase64 is not supplied")
	}

	claimInfoStr, err := createAssetClaimInfoSerializedBase64(hashPreimageBase64)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	assetExchangeAgreementStr, err := createAssetExchangeAgreementSerializedBase64(assetType, assetId, "", lockerECertBase64)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	// Normal invoke function
	result, err := contract.SubmitTransaction("ClaimAsset", assetExchangeAgreementStr, claimInfoStr)
	if err != nil {
		return "", logThenErrorf("error in contract.SubmitTransaction ClaimAsset: %+v", err.Error())
	}

	return string(result), nil
}

func ClaimFungibleAssetInHTLC(contract GatewayContract, contractId string, hashPreimageBase64 string) (string, error) {
	if contract == nil {
		return "", logThenErrorf("contract handle not supplied")
	}
	if contractId == "" {
		return "", logThenErrorf("contractId not supplied")
	}
	if hashPreimageBase64 == "" {
		return "", logThenErrorf("hashPreimageBase64 is not supplied")
	}

	claimInfoStr, err := createAssetClaimInfoSerializedBase64(hashPreimageBase64)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	// Normal invoke function
	result, err := contract.SubmitTransaction("ClaimFungibleAsset", contractId, claimInfoStr)
	if err != nil {
		return "", logThenErrorf("error in contract.SubmitTransaction ClaimFungibleAsset: %+v", err.Error())
	}

	return string(result), nil
}

func ClaimAssetInHTLCusingContractId(contract GatewayContract, contractId string, hashPreimageBase64 string) (string, error) {
	if contract == nil {
		return "", logThenErrorf("contract handle not supplied")
	}
	if contractId == "" {
		return "", logThenErrorf("contractId not supplied")
	}
	if hashPreimageBase64 == "" {
		return "", logThenErrorf("hashPreimageBase64 is not supplied")
	}

	claimInfoStr, err := createAssetClaimInfoSerializedBase64(hashPreimageBase64)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	// Normal invoke function
	result, err := contract.SubmitTransaction("ClaimAssetUsingContractId", contractId, claimInfoStr)
	if err != nil {
		return "", logThenErrorf("error in contract.SubmitTransaction ClaimAssetUsingContractId: %+v", err.Error())
	}

	return string(result), nil
}

func ReclaimAssetInHTLC(contract GatewayContract, assetType string, assetId string, recipientECertBase64 string) (string, error) {
	if contract == nil {
		return "", logThenErrorf("contract handle not supplied")
	}
	if assetType == "" {
		return "", logThenErrorf("asset type not supplied")
	}
	if assetId == "" {
		return "", logThenErrorf("asset id not supplied")
	}
	if recipientECertBase64 == "" {
		return "", logThenErrorf("recipientECertBase64 id not supplied")
	}

	assetExchangeAgreementStr, err := createAssetExchangeAgreementSerializedBase64(assetType, assetId, recipientECertBase64, "")
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	// Normal invoke function
	result, err := contract.SubmitTransaction("UnlockAsset", assetExchangeAgreementStr)
	if err != nil {
		return "", logThenErrorf("error in contract.SubmitTransaction UnlockAsset: %+v", err.Error())
	}

	return string(result), nil
}

func ReclaimFungibleAssetInHTLC(contract GatewayContract, contractId string) (string, error) {
	if contract == nil {
		return "", logThenErrorf("contract handle not supplied")
	}
	if contractId == "" {
		return "", logThenErrorf("contractId not supplied")
	}

	// Normal invoke function
	result, err := contract.SubmitTransaction("UnlockFungibleAsset", contractId)
	if err != nil {
		return "", logThenErrorf("error in contract.SubmitTransaction UnlockFungibleAsset: %+v", err.Error())
	}

	return string(result), nil
}

func ReclaimAssetInHTLCusingContractId(contract GatewayContract, contractId string) (string, error) {
	if contract == nil {
		return "", logThenErrorf("contract handle not supplied")
	}
	if contractId == "" {
		return "", logThenErrorf("contractId not supplied")
	}

	// Normal invoke function
	result, err := contract.SubmitTransaction("UnlockAssetUsingContractId", contractId)
	if err != nil {
		return "", logThenErrorf("error in contract.SubmitTransaction UnlockAssetUsingContractId: %+v", err.Error())
	}

	return string(result), nil
}
