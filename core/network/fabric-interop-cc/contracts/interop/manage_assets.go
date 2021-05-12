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

const(
	assetKeyPrefix		= "AssetKey_"	// prefix for the map, asset-key --> asset-object
	assetKeyDelimiter	= "_"		// delimiter for the asset-key
	contractIdPrefix	= "ContractId_"	// prefix for the map, contractId --> asset-key
)

// function to generate a "SHA256" hash in base64 format for a given the preimage
func generateSHA256HashInBase64Form(preimage string) string {
	hasher := sha256.New()
	hasher.Write([]byte(preimage))
	shaHash := hasher.Sum(nil)
	shaHashBase64 := base64.StdEncoding.EncodeToString(shaHash)
	return shaHashBase64
}

/*
 * Function to generate asset-lock key (which is combination of asset-type and asset-id)
 * and contract-id (which is a hash on asset-lock key)
 */
func generateAssetLockKeyAndContractId(assetAgreement *common.AssetExchangeAgreement) (string, string) {
	assetLockKey := assetKeyPrefix + assetAgreement.Type + assetKeyDelimiter + assetAgreement.Id
	contractId := generateSHA256HashInBase64Form(assetLockKey)
	return assetLockKey, contractId
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

	err = ctx.GetStub().PutState("ContractId_" + string(contractId), assetLockKeyBytes)
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
 * Function to check if hashBase64 is the hash for the preimage preimageBase64.
 * Both the preimage and hash are passed in base64 form.
 */
func checkIfCorrectPreimage(preimageBase64 string, hashBase64 string) (bool, error) {
	funName := "checkIfCorrectPreimage"
	preimage, err := base64.StdEncoding.DecodeString(preimageBase64)
	if err != nil {
		errorMsg := fmt.Sprintf("base64 decode preimage error: %s", err)
		log.Error(errorMsg)
		return false, errors.New(errorMsg)
	}

	shaHashBase64 := generateSHA256HashInBase64Form(string(preimage))
	if shaHashBase64 == hashBase64 {
		log.Info(fmt.Sprintf("%s: preimage %s is passed correctly.\n", funName, preimage))
	} else {
		log.Info(fmt.Sprintf("%s: preimage %s is not passed correctly.\n", funName, preimage))
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

// UnLockAsset cc is used to record unlocking of an asset on the ledger (this uses the contractId)
func (s *SmartContract) UnLockAssetUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) error {

	assetLockKeyBytes, err := ctx.GetStub().GetState("ContractId_" + contractId)
	if err != nil {
		log.Error(err.Error())
		return err
	}

        if assetLockKeyBytes == nil {
		errorMsg := fmt.Sprintf("no contractId %s exists on the ledger", contractId)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	assetLockKey := string(assetLockKeyBytes)
	log.Infof("contractId: %s and assetLockKey: %s\n", contractId, assetLockKey)

	assetLockValBytes, err := ctx.GetStub().GetState(assetLockKey)
	if err != nil {
		return fmt.Errorf("failed to retrieve from the world state: %v", err)
		//log.Error(err.Error())
		//return err
	}

        if assetLockValBytes == nil {
		errorMsg := fmt.Sprintf("contractId %s is not associated with any currently locked asset", contractId)
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

	// Check if expiry time is elapsed
	currentTimeSecs := uint64(time.Now().Unix())
	if uint64(currentTimeSecs) < assetLockVal.ExpiryTimeSecs {
		errorMsg := fmt.Sprintf("cannot unlock asset associated with the contractId %s as the expiry time is not yet elapsed", contractId)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	err = ctx.GetStub().DelState(assetLockKey)
	if err != nil {
		errorMessage := fmt.Sprintf("failed to delete lock for the asset associated with the contractId %s: %v", contractId, err)
		log.Error(errorMessage)
		return errors.New(errorMessage)
	}

	err = ctx.GetStub().DelState("ContractId_" + contractId)
	if err != nil {
		errorMessage := fmt.Sprintf("failed to delete the contractId %s as part of asset unlock: %v", contractId, err)
		log.Error(errorMessage)
		return errors.New(errorMessage)
	}

	return nil
}
