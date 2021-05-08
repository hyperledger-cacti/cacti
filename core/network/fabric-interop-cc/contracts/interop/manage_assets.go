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
	"crypto/sha1"
	"encoding/base64"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	"github.com/golang/protobuf/proto"
	log "github.com/sirupsen/logrus"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/contracts/interop/protos-go/common"
)

type AssetLockValue struct {
	Locker	string	`json:"locker"`
	Recipient	string	`json:"recipient"`
	Hash	string	`json:"hash"`
	ExpiryTimeSecs	uint64	`json:"expiryTimeSecs"`
}

// LockAsset cc is used to record locking of an asset on the ledger
func (s *SmartContract) LockAsset(ctx contractapi.TransactionContextInterface, assetAgreementBytes string, lockInfoBytes string) error {

	assetAgreement := &common.AssetExchangeAgreement{}
	err := proto.Unmarshal([]byte(assetAgreementBytes), assetAgreement)
	if err != nil {
		log.Error(err.Error())
		return err
	}
	//display the requested asset agreement
	fmt.Printf("assetExchangeAgreement: %+v\n", assetAgreement)

	lockInfoHTLC := &common.AssetLockHTLC{}
	err = proto.Unmarshal([]byte(lockInfoBytes), lockInfoHTLC)
	if err != nil {
		log.Error(err.Error())
		return err
	}
	//display the requested asset agreement
	fmt.Printf("lockInfoHTLC: %+v\n", lockInfoHTLC)

	if lockInfoHTLC.TimeSpec != common.AssetLockHTLC_EPOCH {
		errorMsg := "only EPOCH time is supported at present"
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	assetLockKey := assetAgreement.Type + ":" + assetAgreement.Id
	assetLockVal := AssetLockValue{Locker: assetAgreement.Locker, Recipient: assetAgreement.Recipient, Hash: string(lockInfoHTLC.Hash), ExpiryTimeSecs: lockInfoHTLC.ExpiryTimeSecs}

	assetLockValBytes, err := ctx.GetStub().GetState(assetLockKey)
	if err != nil {
		log.Error(err.Error())
		return err
	}

        if assetLockValBytes != nil {
		errorMsg := fmt.Sprintf("Asset of type %s and ID %s is already locked", assetAgreement.Type, assetAgreement.Id)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	assetLockValBytes, err = json.Marshal(assetLockVal)
	if err != nil {
		errorMsg := fmt.Sprintf("Marshal error: %s", err)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}
	return ctx.GetStub().PutState(assetLockKey, assetLockValBytes)
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
	fmt.Printf("assetExchangeAgreement: %+v\n", assetAgreement)

	assetLockKey := assetAgreement.Type + ":" + assetAgreement.Id

	assetLockValBytes, err := ctx.GetStub().GetState(assetLockKey)
	if err != nil {
		log.Error(err.Error())
		return err
	}

        if assetLockValBytes == nil {
		errorMsg := fmt.Sprintf("No asset of type %s and ID %s is locked", assetAgreement.Type, assetAgreement.Id)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	assetLockVal := AssetLockValue{}
	err = json.Unmarshal(assetLockValBytes, &assetLockVal)
	if err != nil {
		errorMsg := fmt.Sprintf("Unmarshal error: %s", err)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	if assetLockVal.Locker != assetAgreement.Locker || assetLockVal.Recipient != assetAgreement.Recipient {
		errorMsg := fmt.Sprintf("Cannot unlock asset of type %s and ID %s as it is locked by %s for %s", assetAgreement.Type, assetAgreement.Id, assetLockVal.Locker, assetLockVal.Recipient)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	// Check if expiry time is elapsed
	currentTimeSecs := time.Now().UnixNano() / int64(time.Second)
	if uint64(currentTimeSecs) < assetLockVal.ExpiryTimeSecs {
		errorMsg := fmt.Sprintf("Cannot unlock asset of type %s and ID %s as the expiry time is not yet elapsed", assetAgreement.Type, assetAgreement.Id)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	err = ctx.GetStub().DelState(assetLockKey)
	if err != nil {
		errorMessage := fmt.Sprintf("Failed to delete lock for asset of type %s and ID %s: %v", assetAgreement.Type, assetAgreement.Id, err)
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
	fmt.Printf("assetExchangeAgreement: %+v\n", assetAgreement)

	assetLockKey := assetAgreement.Type + ":" + assetAgreement.Id

	assetLockValBytes, err := ctx.GetStub().GetState(assetLockKey)
	if err != nil {
		log.Error(err.Error())
		return false, err
	}

        if assetLockValBytes == nil {
		errorMsg := fmt.Sprintf("No asset of type %s and ID %s is locked", assetAgreement.Type, assetAgreement.Id)
		log.Error(errorMsg)
		return false, errors.New(errorMsg)
	}

	assetLockVal := AssetLockValue{}
	err = json.Unmarshal(assetLockValBytes, &assetLockVal)
	if err != nil {
		errorMsg := fmt.Sprintf("Unmarshal error: %s", err)
		log.Error(errorMsg)
		return false, errors.New(errorMsg)
	}
	fmt.Printf("assetLockVal: %+v\n", assetLockVal)

	// '*' for recipient or locker in the query implies that the seeks status for an arbitrary recipient or locker respectively
	if assetAgreement.Locker == "*" && assetAgreement.Recipient == "*" {
		return true, nil
	} else if assetAgreement.Locker == "*" && assetLockVal.Recipient == assetAgreement.Recipient {
		return true, nil
	} else if assetAgreement.Locker == "*" && assetLockVal.Recipient != assetAgreement.Recipient {
		errorMsg := fmt.Sprintf("Asset of type %s and ID %s is not locked for %s", assetAgreement.Type, assetAgreement.Id, assetAgreement.Recipient)
		log.Error(errorMsg)
		return false, errors.New(errorMsg)
	} else if assetAgreement.Recipient == "*" && assetLockVal.Locker == assetAgreement.Locker {
		return true, nil
	} else if assetAgreement.Recipient == "*" && assetLockVal.Locker != assetAgreement.Locker {
		errorMsg := fmt.Sprintf("Asset of type %s and ID %s is not locked by %s", assetAgreement.Type, assetAgreement.Id, assetAgreement.Locker)
		log.Error(errorMsg)
		return false, errors.New(errorMsg)
	} else if assetLockVal.Locker != assetAgreement.Locker || assetLockVal.Recipient != assetAgreement.Recipient {
		errorMsg := fmt.Sprintf("Asset of type %s and ID %s is not locked by %s for %s", assetAgreement.Type, assetAgreement.Id, assetAgreement.Locker, assetAgreement.Recipient)
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
		errorMsg := fmt.Sprintf("Base64 decode preimage error: %s", err)
		log.Error(errorMsg)
		return false, errors.New(errorMsg)
	}

	hasher := sha1.New()
	hasher.Write([]byte(preimage))
	shaHash := hasher.Sum(nil)
	//shaHashBase64 := base64.URLEncoding.EncodeToString(shaHash)
	shaHashBase64 := base64.StdEncoding.EncodeToString(shaHash)

	if shaHashBase64 == hashBase64 {
		fmt.Printf("checkIfCorrectPreimage: preimage %s is passed correctly.\n", preimage)
	} else {
		fmt.Printf("checkIfCorrectPreimage: preimage %s is not passed correctly.\n", preimage)
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
	fmt.Printf("assetExchangeAgreement: %+v\n", assetAgreement)

	claimInfo := &common.AssetClaimHTLC{}
	err = proto.Unmarshal([]byte(claimInfoBytes), claimInfo)
	if err != nil {
		//log.Error(err.Error())
		return err
		errorMsg := fmt.Sprintf("Unmarshal error: %s", err)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	// display the claim information
	fmt.Printf("claimInfo: %+v\n", claimInfo)

	assetLockKey := assetAgreement.Type + ":" + assetAgreement.Id

	assetLockValBytes, err := ctx.GetStub().GetState(assetLockKey)
	if err != nil {
		log.Error(err.Error())
		return err
	}

        if assetLockValBytes == nil {
		errorMsg := fmt.Sprintf("No asset of type %s and ID %s is locked", assetAgreement.Type, assetAgreement.Id)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	assetLockVal := AssetLockValue{}
	err = json.Unmarshal(assetLockValBytes, &assetLockVal)
	if err != nil {
		errorMsg := fmt.Sprintf("Unmarshal error: %s", err)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	if assetLockVal.Locker != assetAgreement.Locker || assetLockVal.Recipient != assetAgreement.Recipient {
		errorMsg := fmt.Sprintf("Can not claim asset of type %s and ID %s as it is locked by %s for %s", assetAgreement.Type, assetAgreement.Id, assetLockVal.Locker, assetLockVal.Recipient)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	// compute the hash from the preimage
	isCorrectPreimage, err := checkIfCorrectPreimage(string(claimInfo.HashPreimage), string(assetLockVal.Hash))
	if err != nil {
		errorMsg := fmt.Sprintf("Claim asset of type %s and ID %s error: %v", assetAgreement.Type, assetAgreement.Id, err)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	if isCorrectPreimage == false {
		errorMsg := fmt.Sprintf("Can not claim asset of type %s and ID %s as the hash preimage is not matching", assetAgreement.Type, assetAgreement.Id)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	// Check if expiry time is elapsed
	currentTimeSecs := time.Now().UnixNano() / int64(time.Second)
	if uint64(currentTimeSecs) >= assetLockVal.ExpiryTimeSecs {
		errorMsg := fmt.Sprintf("Can not claim asset of type %s and ID %s as the expiry time is already elapsed", assetAgreement.Type, assetAgreement.Id)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	err = ctx.GetStub().DelState(assetLockKey)
	if err != nil {
		errorMsg := fmt.Sprintf("Failed to delete lock for asset of type %s and ID %s: %v", assetAgreement.Type, assetAgreement.Id, err)
		log.Error(errorMsg)
		return errors.New(errorMsg)
	}

	return nil
}
