/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// manage_assets is a chaincode that contains all the code related to asset management operations (e.g., Lock, Unlock, Claim)
// and any related utility functions
package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"crypto/sha256"
	"encoding/base64"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/golang/protobuf/proto"
	log "github.com/sirupsen/logrus"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/contracts/interop/protos-go/common"
)

type AssetLockValue struct {
	ContractId	string	`json:"contractId"`
	Locker		string	`json:"locker"`
	Recipient	string	`json:"recipient"`
	Hash		string	`json:"hash"`
	ExpiryTimeSecs	uint64	`json:"expiryTimeSecs"`
}

// function to generate contract id as "SHA256" hash based on the asset lock key (which is combination of asset type and asset it)
func generateAssetLockKeyAndContractId(assetAgreement *common.AssetExchangeAgreement) (string, string) {
	hasher := sha256.New()
	assetLockKey := assetAgreement.Type + assetAgreement.Id
	hasher.Write([]byte(assetLockKey))
	shaHash := hasher.Sum(nil)
	shaBase64 := base64.StdEncoding.EncodeToString(shaHash)
	return assetLockKey, shaBase64
}
// LockAsset cc is used to record locking of an asset on the ledger
func (s *SmartContract) LockAsset(ctx contractapi.TransactionContextInterface, assetAgreementBytes string, lockInfoBytes string) (string, error) {

	assetAgreement := &common.AssetExchangeAgreement{}
	err := proto.Unmarshal([]byte(assetAgreementBytes), assetAgreement)
	if err != nil {
		log.Error(err.Error())
		return "", err
	}
	//display the requested asset agreement
	log.Info(fmt.Sprintf("assetExchangeAgreement: %+v\n", assetAgreement))

	lockInfoHTLC := &common.AssetLockHTLC{}
	err = proto.Unmarshal([]byte(lockInfoBytes), lockInfoHTLC)
	if err != nil {
		log.Error(err.Error())
		return "", err
	}
	//display the requested asset agreement
	log.Info(fmt.Sprintf("lockInfoHTLC: %+v\n", lockInfoHTLC))

	if lockInfoHTLC.TimeSpec != common.AssetLockHTLC_EPOCH {
		errorMsg := "only EPOCH time is supported at present"
		log.Error(errorMsg)
		return "", errors.New(errorMsg)
	}

	assetLockKey, contractId := generateAssetLockKeyAndContractId(assetAgreement)
	assetLockVal := AssetLockValue{ContractId: contractId, Locker: assetAgreement.Locker, Recipient: assetAgreement.Recipient, Hash: string(lockInfoHTLC.Hash), ExpiryTimeSecs: lockInfoHTLC.ExpiryTimeSecs}

	assetLockValBytes, err := ctx.GetStub().GetState(assetLockKey)
	if err != nil {
		log.Error(err.Error())
		return "", err
	}

	if assetLockValBytes != nil {
		errorMsg := fmt.Sprintf("asset of type %s and ID %s is already locked", assetAgreement.Type, assetAgreement.Id)
		log.Error(errorMsg)
		return "", errors.New(errorMsg)
	}

	assetLockValBytes, err = json.Marshal(assetLockVal)
	if err != nil {
		errorMsg := fmt.Sprintf("marshal error: %s", err)
		log.Error(errorMsg)
		return "", errors.New(errorMsg)
	}

	err = ctx.GetStub().PutState(assetLockKey, assetLockValBytes)
	if err != nil {
		log.Error(err.Error())
		return "", err
	}

	assetLockKeyBytes, err := json.Marshal(assetLockKey)
	if err != nil {
		errorMsg := fmt.Sprintf("marshal error: %s", err)
		log.Error(errorMsg)
		return "", errors.New(errorMsg)
	}

	err = ctx.GetStub().PutState(string(contractId), assetLockKeyBytes)
	if err != nil {
		log.Error(err.Error())
		return "", err
	}
	return contractId, nil
}

// UnLockAsset cc is used to record unlocking of an asset on the ledger
func (s *SmartContract) UnLockAsset(ctx contractapi.TransactionContextInterface, assetAgreementBytes string) error {

	assetAgreement := &common.AssetExchangeAgreement{}
	err := proto.Unmarshal([]byte(assetAgreementBytes), assetAgreement)
	if err != nil {
		log.Error(err.Error())
		return err
	}
	//display the requested asset agreement
	log.Info(fmt.Sprintf("assetExchangeAgreement: %+v\n", assetAgreement))

	assetLockKey, _ := generateAssetLockKeyAndContractId(assetAgreement)

	assetLockValBytes, err := ctx.GetStub().GetState(assetLockKey)
	if err != nil {
		log.Error(err.Error())
		return err
	}

        if assetLockValBytes == nil {
		errorMsg := fmt.Sprintf("no asset of type %s and ID %s is locked", assetAgreement.Type, assetAgreement.Id)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	assetLockVal := AssetLockValue{}
	err = json.Unmarshal(assetLockValBytes, &assetLockVal)
	if err != nil {
		errorMsg := fmt.Sprintf("unmarshal error: %s", err)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	if assetLockVal.Locker != assetAgreement.Locker || assetLockVal.Recipient != assetAgreement.Recipient {
		errorMsg := fmt.Sprintf("cannot unlock asset of type %s and ID %s as it is locked by %s for %s", assetAgreement.Type, assetAgreement.Id, assetLockVal.Locker, assetLockVal.Recipient)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	// Check if expiry time is elapsed
	currentTimeSecs := uint64(time.Now().Unix())
	if uint64(currentTimeSecs) < assetLockVal.ExpiryTimeSecs {
		errorMsg := fmt.Sprintf("cannot unlock asset of type %s and ID %s as the expiry time is not yet elapsed", assetAgreement.Type, assetAgreement.Id)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	err = ctx.GetStub().DelState(assetLockKey)
	if err != nil {
		errorMessage := fmt.Sprintf("failed to delete lock for asset of type %s and ID %s: %v", assetAgreement.Type, assetAgreement.Id, err)
		log.Error(errorMessage)
		return errors.New(errorMessage)
	}

	return nil
}

// IsAssetLocked cc is used to query the ledger and findout if an asset is locked or not
func (s *SmartContract) IsAssetLocked(ctx contractapi.TransactionContextInterface, assetAgreementBytes string) (bool, error) {

	assetAgreement := &common.AssetExchangeAgreement{}
	err := proto.Unmarshal([]byte(assetAgreementBytes), assetAgreement)
	if err != nil {
		log.Error(err.Error())
		return false, err
	}
	//display the requested asset agreement
	log.Info(fmt.Sprintf("assetExchangeAgreement: %+v\n", assetAgreement))

	assetLockKey, _ := generateAssetLockKeyAndContractId(assetAgreement)

	assetLockValBytes, err := ctx.GetStub().GetState(assetLockKey)
	if err != nil {
		log.Error(err.Error())
		return false, err
	}

	if assetLockValBytes == nil {
		errorMsg := fmt.Sprintf("no asset of type %s and ID %s is locked", assetAgreement.Type, assetAgreement.Id)
		log.Error(errorMsg)
		return false, errors.New(errorMsg)
	}

	assetLockVal := AssetLockValue{}
	err = json.Unmarshal(assetLockValBytes, &assetLockVal)
	if err != nil {
		errorMsg := fmt.Sprintf("unmarshal error: %s", err)
		log.Error(errorMsg)
		return false, errors.New(errorMsg)
	}
	log.Info(fmt.Sprintf("assetLockVal: %+v\n", assetLockVal))

	// Check if expiry time is elapsed
	currentTimeSecs := uint64(time.Now().Unix())
	if uint64(currentTimeSecs) >= assetLockVal.ExpiryTimeSecs {
		errorMsg := fmt.Sprintf("expiry time for asset of type %s and ID %s is already elapsed", assetAgreement.Type, assetAgreement.Id)
		log.Error(errorMsg)
		return false, errors.New(errorMsg)
	}

	// '*' for recipient or locker in the query implies that the query seeks status for an arbitrary recipient or locker respectively
	if (assetAgreement.Locker == "*" || assetLockVal.Locker == assetAgreement.Locker) && (assetAgreement.Recipient == "*" || assetLockVal.Recipient == assetAgreement.Recipient) {
		return true, nil
	} else if assetAgreement.Locker == "*" && assetLockVal.Recipient != assetAgreement.Recipient {
		errorMsg := fmt.Sprintf("asset of type %s and ID %s is not locked for %s", assetAgreement.Type, assetAgreement.Id, assetAgreement.Recipient)
		log.Error(errorMsg)
		return false, errors.New(errorMsg)
	} else if assetAgreement.Recipient == "*" && assetLockVal.Locker != assetAgreement.Locker {
		errorMsg := fmt.Sprintf("asset of type %s and ID %s is not locked by %s", assetAgreement.Type, assetAgreement.Id, assetAgreement.Locker)
		log.Error(errorMsg)
		return false, errors.New(errorMsg)
	} else if assetLockVal.Locker != assetAgreement.Locker || assetLockVal.Recipient != assetAgreement.Recipient {
		errorMsg := fmt.Sprintf("asset of type %s and ID %s is not locked by %s for %s", assetAgreement.Type, assetAgreement.Id, assetAgreement.Locker, assetAgreement.Recipient)
		log.Error(errorMsg)
		return false, errors.New(errorMsg)
	}

	return true, nil
}

/*
 * Below function checks if hashBase64 is the hash for the preimage preimageBase64.
 * Both the preimage and hash are passed in base64 form.
 */
func checkIfCorrectPreimage(preimageBase64 string, hashBase64 string) (bool, error) {
	preimage, err := base64.StdEncoding.DecodeString(preimageBase64)
	if err != nil {
		errorMsg := fmt.Sprintf("base64 decode preimage error: %s", err)
		log.Error(errorMsg)
		return false, errors.New(errorMsg)
	}

	hasher := sha256.New()
	hasher.Write([]byte(preimage))
	shaHash := hasher.Sum(nil)
	shaHashBase64 := base64.StdEncoding.EncodeToString(shaHash)

	if shaHashBase64 == hashBase64 {
		log.Info(fmt.Sprintf("checkIfCorrectPreimage: preimage %s is passed correctly.\n", preimage))
	} else {
		log.Info(fmt.Sprintf("checkIfCorrectPreimage: preimage %s is not passed correctly.\n", preimage))
		return false, nil
	}
	return true, nil
}

// ClaimAsset cc is used to record claim of an asset on the ledger
func (s *SmartContract) ClaimAsset(ctx contractapi.TransactionContextInterface, assetAgreementBytes string, claimInfoBytes string) error {

	assetAgreement := &common.AssetExchangeAgreement{}
	err := proto.Unmarshal([]byte(assetAgreementBytes), assetAgreement)
	if err != nil {
		log.Error(err.Error())
		return err
	}
	// display the requested asset agreement
	log.Info(fmt.Sprintf("assetExchangeAgreement: %+v\n", assetAgreement))

	claimInfo := &common.AssetClaimHTLC{}
	err = proto.Unmarshal([]byte(claimInfoBytes), claimInfo)
	if err != nil {
		errorMsg := fmt.Sprintf("unmarshal error: %s", err)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	// display the claim information
	log.Info(fmt.Sprintf("claimInfo: %+v\n", claimInfo))

	assetLockKey, _ := generateAssetLockKeyAndContractId(assetAgreement)

	assetLockValBytes, err := ctx.GetStub().GetState(assetLockKey)
	if err != nil {
		log.Error(err.Error())
		return err
	}

        if assetLockValBytes == nil {
		errorMsg := fmt.Sprintf("no asset of type %s and ID %s is locked", assetAgreement.Type, assetAgreement.Id)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	assetLockVal := AssetLockValue{}
	err = json.Unmarshal(assetLockValBytes, &assetLockVal)
	if err != nil {
		errorMsg := fmt.Sprintf("unmarshal error: %s", err)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	if assetLockVal.Locker != assetAgreement.Locker || assetLockVal.Recipient != assetAgreement.Recipient {
		errorMsg := fmt.Sprintf("cannot claim asset of type %s and ID %s as it is locked by %s for %s", assetAgreement.Type, assetAgreement.Id, assetLockVal.Locker, assetLockVal.Recipient)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	// Check if expiry time is elapsed
	currentTimeSecs := uint64(time.Now().Unix())
	if uint64(currentTimeSecs) >= assetLockVal.ExpiryTimeSecs {
		errorMsg := fmt.Sprintf("cannot claim asset of type %s and ID %s as the expiry time is already elapsed", assetAgreement.Type, assetAgreement.Id)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	// compute the hash from the preimage
	isCorrectPreimage, err := checkIfCorrectPreimage(string(claimInfo.HashPreimage), string(assetLockVal.Hash))
	if err != nil {
		errorMsg := fmt.Sprintf("claim asset of type %s and ID %s error: %v", assetAgreement.Type, assetAgreement.Id, err)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	if isCorrectPreimage == false {
		errorMsg := fmt.Sprintf("cannot claim asset of type %s and ID %s as the hash preimage is not matching", assetAgreement.Type, assetAgreement.Id)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	err = ctx.GetStub().DelState(assetLockKey)
	if err != nil {
		errorMsg := fmt.Sprintf("failed to delete lock for asset of type %s and ID %s: %v", assetAgreement.Type, assetAgreement.Id, err)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	return nil
}
