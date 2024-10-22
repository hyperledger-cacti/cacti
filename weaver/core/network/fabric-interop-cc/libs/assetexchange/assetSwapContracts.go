/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// manage_assets is a chaincode that contains all the code related to asset management operations (e.g., Lock, Unlock, Claim)
// and any related utility functions
package assetexchange

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"time"

	"github.com/golang/protobuf/proto"
	"github.com/hyperledger-cacti/cacti/weaver/common/protos-go/v2/common"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	log "github.com/sirupsen/logrus"
)

// Lock Functions
// LockAsset cc is used to record locking of an asset on the ledger
func LockAsset(ctx contractapi.TransactionContextInterface, callerChaincodeID, assetAgreementBytesBase64, lockInfoBytesBase64 string) (string, error) {

	assetAgreementBytes, err := base64.StdEncoding.DecodeString(assetAgreementBytesBase64)
	if err != nil {
		return "", logThenErrorf("error in base64 decode of asset agreement: %+v", err)
	}

	assetAgreement := &common.AssetExchangeAgreement{}
	err = proto.Unmarshal([]byte(assetAgreementBytes), assetAgreement)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}
	//display the requested asset agreement
	log.Infof("assetExchangeAgreement: %+v", assetAgreement)

	err = validateAndSetLockerOfAssetAgreement(ctx, assetAgreement)
	if err != nil {
		return "", logThenErrorf("error in locker validation: %+v", err)
	}

	lockInfo, expiryTimeSecs, err := getLockInfoAndExpiryTimeSecs(lockInfoBytesBase64)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	assetLockKey, contractId, err := GenerateAssetLockKeyAndContractId(ctx, callerChaincodeID, assetAgreement)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	assetLockVal := AssetLockValue{ContractId: contractId, Locker: assetAgreement.Locker, Recipient: assetAgreement.Recipient, LockInfo: lockInfo, ExpiryTimeSecs: expiryTimeSecs}

	assetLockValBytes, err := ctx.GetStub().GetState(assetLockKey)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	if assetLockValBytes != nil {
		return "", logThenErrorf("asset of type %s and ID %s is already locked", assetAgreement.AssetType, assetAgreement.Id)
	}

	assetLockValBytes, err = json.Marshal(assetLockVal)
	if err != nil {
		return "", logThenErrorf("marshal error: %+v", err)
	}

	err = ctx.GetStub().PutState(assetLockKey, assetLockValBytes)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	assetLockKeyBytes, err := json.Marshal(assetLockKey)
	if err != nil {
		return "", logThenErrorf("marshal error: %+v", err)
	}

	err = ctx.GetStub().PutState(generateContractIdMapKey(contractId), assetLockKeyBytes)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}
	return contractId, nil
}

// LockFungibleAsset cc is used to record locking of a group of fungible assets of an asset-type on the ledger
func LockFungibleAsset(ctx contractapi.TransactionContextInterface, callerChaincodeID, fungibleAssetAgreementBytesBase64, lockInfoBytesBase64 string) (string, error) {

	fungibleAssetAgreementBytes, err := base64.StdEncoding.DecodeString(fungibleAssetAgreementBytesBase64)
	if err != nil {
		return "", logThenErrorf("error in base64 decode of asset agreement: %+v", err)
	}

	assetAgreement := &common.FungibleAssetExchangeAgreement{}
	err = proto.Unmarshal([]byte(fungibleAssetAgreementBytes), assetAgreement)
	if err != nil {
		return "", logThenErrorf("unmarshal error: %s", err)
	}

	//display the requested fungible asset agreement
	log.Infof("fungibleAssetExchangeAgreement: %+v", assetAgreement)

	err = validateAndSetLockerOfFungibleAssetAgreement(ctx, assetAgreement)
	if err != nil {
		return "", logThenErrorf("error in locker validation: %+v", err)
	}

	lockInfo, expiryTimeSecs, err := getLockInfoAndExpiryTimeSecs(lockInfoBytesBase64)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	// generate the contractId for the fungible asset lock agreement
	contractId := GenerateFungibleAssetLockContractId(ctx, callerChaincodeID, assetAgreement)

	assetLockVal := FungibleAssetLockValue{Type: assetAgreement.AssetType, NumUnits: assetAgreement.NumUnits, Locker: assetAgreement.Locker,
		Recipient: assetAgreement.Recipient, LockInfo: lockInfo, ExpiryTimeSecs: expiryTimeSecs}

	assetLockValBytes, err := ctx.GetStub().GetState(contractId)
	if err != nil {
		return "", logThenErrorf("failed to retrieve from the world state: %+v", err)
	}

	if assetLockValBytes != nil {
		return "", logThenErrorf("contractId %s already exists for the requested fungible asset agreement", contractId)
	}

	assetLockValBytes, err = json.Marshal(assetLockVal)
	if err != nil {
		return "", logThenErrorf("marshal error: %s", err)
	}

	err = ctx.GetStub().PutState(generateContractIdMapKey(contractId), assetLockValBytes)
	if err != nil {
		return "", logThenErrorf("failed to write to the world state: %+v", err)
	}

	return contractId, nil
}

// Claim Functions
// ClaimAsset cc is used to record claim of an asset on the ledger
func ClaimAsset(ctx contractapi.TransactionContextInterface, callerChaincodeID, assetAgreementBytesBase64, claimInfoBytesBase64 string) (string, error) {

	assetAgreementBytes, err := base64.StdEncoding.DecodeString(assetAgreementBytesBase64)
	if err != nil {
		return "", logThenErrorf("error in base64 decode of asset agreement: %+v", err)
	}

	assetAgreement := &common.AssetExchangeAgreement{}
	err = proto.Unmarshal([]byte(assetAgreementBytes), assetAgreement)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}
	// display the requested asset agreement
	log.Infof("assetExchangeAgreement: %+v\n", assetAgreement)

	err = validateAndSetRecipientOfAssetAgreement(ctx, assetAgreement)
	if err != nil {
		return "", logThenErrorf("error in recipient validation: %+v", err)
	}

	assetLockKey, _, err := GenerateAssetLockKeyAndContractId(ctx, callerChaincodeID, assetAgreement)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	assetLockValBytes, err := ctx.GetStub().GetState(assetLockKey)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	if assetLockValBytes == nil {
		return "", logThenErrorf("no asset of type %s and ID %s is locked", assetAgreement.AssetType, assetAgreement.Id)
	}

	assetLockVal := AssetLockValue{}
	err = json.Unmarshal(assetLockValBytes, &assetLockVal)
	if err != nil {
		return "", logThenErrorf("unmarshal error: %s", err)
	}

	if assetLockVal.Locker != assetAgreement.Locker || assetLockVal.Recipient != assetAgreement.Recipient {
		return "", logThenErrorf("cannot claim asset of type %s and ID %s as it is locked by %s for %s", assetAgreement.AssetType, assetAgreement.Id, assetLockVal.Locker, assetLockVal.Recipient)
	}

	return assetLockVal.ContractId, claimAssetCommon(ctx, assetLockVal.LockInfo, assetLockVal.ExpiryTimeSecs, assetLockVal.Recipient, assetLockKey, assetLockVal.ContractId, claimInfoBytesBase64)
}

// ClaimFungibleAsset cc is used to record claim of a fungible asset on the ledger
func ClaimFungibleAsset(ctx contractapi.TransactionContextInterface, contractId, claimInfoBytesBase64 string) error {

	assetLockVal, err := fetchFungibleAssetLocked(ctx, contractId)
	if err != nil {
		return logThenErrorf(err.Error())
	}
	
	return claimAssetCommon(ctx, assetLockVal.LockInfo, assetLockVal.ExpiryTimeSecs, assetLockVal.Recipient, "", contractId, claimInfoBytesBase64)
}

// ClaimAsset cc is used to record claim of an asset on the ledger (this uses the contractId)
func ClaimAssetUsingContractId(ctx contractapi.TransactionContextInterface, contractId, claimInfoBytesBase64 string) error {

	assetLockKey, assetLockVal, err := fetchLockStateUsingContractId(ctx, contractId)
	if err != nil {
		return logThenErrorf(err.Error())
	}
	
	return claimAssetCommon(ctx, assetLockVal.GetLockInfo(), assetLockVal.GetExpiryTimeSecs(), assetLockVal.GetRecipient(), assetLockKey, contractId, claimInfoBytesBase64)
}

// Common Claim function for both fungible and non-fungible assets, 
// with or without contractId
func claimAssetCommon(ctx contractapi.TransactionContextInterface, lockInfo interface{}, expiryTimeSecs uint64, recipient, assetLockKey, contractId, claimInfoBytesBase64 string) error {

	txCreatorECertBase64, err := getECertOfTxCreatorBase64(ctx)
	if err != nil {
		return logThenErrorf("unable to get the transaction creator information: %+v", err)
	}

	if recipient != string(txCreatorECertBase64) {
		return logThenErrorf("asset is not locked for %s to claim", string(txCreatorECertBase64))
	}

	claimInfo, err := getClaimInfo(claimInfoBytesBase64)
	if err != nil {
		return logThenErrorf(err.Error())
	}

	// Check if expiry time is elapsed
	currentTimeSecs := uint64(time.Now().Unix())
	if currentTimeSecs >= expiryTimeSecs {
		return logThenErrorf("cannot claim asset associated with contractId %s as the expiry time is already elapsed", contractId)
	}

	if claimInfo.LockMechanism == common.LockMechanism_HTLC {
		isCorrectPreimage, err := validateHashPreimage(claimInfo, lockInfo)
		if err != nil {
			return logThenErrorf("claim asset associated with contractId %s failed with error: %v", contractId, err)
		}
		if !isCorrectPreimage {
			return logThenErrorf("cannot claim asset associated with contractId %s as the hash preimage is not matching", contractId)
		}

		// Write HashPreimage to the ledger
		claimInfoHTLC := &common.AssetClaimHTLC{}
		err = proto.Unmarshal(claimInfo.ClaimInfo, claimInfoHTLC)
		if err != nil {
			return logThenErrorf("unmarshal claimInfo.ClaimInfo error: %s", err)
		}
		err = ctx.GetStub().PutState(generateClaimContractIdMapKey(contractId), []byte(claimInfoHTLC.HashPreimageBase64))
		if err != nil {
			return logThenErrorf("failed to write to the world state: %+v", err)
		}
	}

	if assetLockKey != "" {
		err = ctx.GetStub().DelState(assetLockKey)
		if err != nil {
			return logThenErrorf("failed to delete lock for the asset associated with the contractId %s: %+v", contractId, err)
		}
		
		err = ctx.GetStub().PutState(generateAssetLockMapKey(assetLockKey), []byte(contractId))
		if err != nil {
			return logThenErrorf("failed to write to the world state: %+v", err)
		}
	}

	err = ctx.GetStub().DelState(generateContractIdMapKey(contractId))
	if err != nil {
		return logThenErrorf("failed to delete the contractId %s as part of asset claim: %+v", contractId, err)
	}

	return nil
}

// Unlock Functions
// UnlockAsset cc is used to record unlocking of an asset on the ledger
func UnlockAsset(ctx contractapi.TransactionContextInterface, callerChaincodeID, assetAgreementBytesBase64 string) (string, error) {

	assetAgreementBytes, err := base64.StdEncoding.DecodeString(assetAgreementBytesBase64)
	if err != nil {
		return "", logThenErrorf("error in base64 decode of asset agreement: %+v", err)
	}

	assetAgreement := &common.AssetExchangeAgreement{}
	err = proto.Unmarshal([]byte(assetAgreementBytes), assetAgreement)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}
	//display the requested asset agreement
	log.Infof("assetExchangeAgreement: %+v", assetAgreement)

	err = validateAndSetLockerOfAssetAgreement(ctx, assetAgreement)
	if err != nil {
		return "", logThenErrorf("error in validation of asset agreement parties: %+v", err)
	}

	assetLockKey, _, err := GenerateAssetLockKeyAndContractId(ctx, callerChaincodeID, assetAgreement)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	assetLockValBytes, err := ctx.GetStub().GetState(assetLockKey)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	if assetLockValBytes == nil {
		return "", logThenErrorf("no asset of type %s and ID %s is locked", assetAgreement.AssetType, assetAgreement.Id)
	}

	assetLockVal := AssetLockValue{}
	err = json.Unmarshal(assetLockValBytes, &assetLockVal)
	if err != nil {
		return "", logThenErrorf("unmarshal error: %s", err)
	}

	if assetLockVal.Locker != assetAgreement.Locker || assetLockVal.Recipient != assetAgreement.Recipient {
		return "", logThenErrorf("cannot unlock asset of type %s and ID %s as it is locked by %s for %s", assetAgreement.AssetType, assetAgreement.Id, assetLockVal.Locker, assetLockVal.Recipient)
	}

	// Check if expiry time is elapsed
	return assetLockVal.ContractId, unlockAssetCommon(ctx, assetLockVal.ExpiryTimeSecs, assetLockVal.Locker, assetLockKey, assetLockVal.ContractId)
}

// UnlockFungibleAsset cc is used to record unlocking of a fungible asset on the ledger
func UnlockFungibleAsset(ctx contractapi.TransactionContextInterface, contractId string) error {

	assetLockVal, err := fetchFungibleAssetLocked(ctx, contractId)
	if err != nil {
		return logThenErrorf(err.Error())
	}
	
	return unlockAssetCommon(ctx, assetLockVal.ExpiryTimeSecs, assetLockVal.Locker, "", contractId)
}

// UnlockAssetUsingContractId cc is used to record unlocking of an asset on the ledger (this uses the contractId)
func UnlockAssetUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) error {

	assetLockKey, assetLockVal, err := fetchLockStateUsingContractId(ctx, contractId)
	if err != nil {
		return logThenErrorf(err.Error())
	}
	
	return unlockAssetCommon(ctx, assetLockVal.GetExpiryTimeSecs(), assetLockVal.GetLocker(), assetLockKey, contractId)
}

// Common unlock functions for both fungible and non-fungible assets,
// with or without contractId
func unlockAssetCommon(ctx contractapi.TransactionContextInterface, expiryTimeSecs uint64, locker, assetLockKey, contractId string) error {
	
	txCreatorECertBase64, err := getECertOfTxCreatorBase64(ctx)
	if err != nil {
		return logThenErrorf("unable to get the transaction creator information: %+v", err)
	}

	// transaction creator needs to be the locker of the locked fungible asset
	if locker != txCreatorECertBase64 {
		return logThenErrorf("asset is not locked for %s to unlock", txCreatorECertBase64)
	}

	// Check if expiry time is elapsed
	currentTimeSecs := uint64(time.Now().Unix())
	if currentTimeSecs < expiryTimeSecs {
		return logThenErrorf("cannot unlock asset associated with the contractId %s as the expiry time is not yet elapsed", contractId)
	}

	if assetLockKey != "" {
		err = ctx.GetStub().DelState(assetLockKey)
		if err != nil {
			return logThenErrorf("failed to delete lock for the asset associated with the contractId %s: %v", contractId, err)
		}
	}

	err = ctx.GetStub().DelState(generateContractIdMapKey(contractId))
	if err != nil {
		return logThenErrorf("failed to delete the contractId %s as part of asset unlock: %v", contractId, err)
	}

	return nil
}

// IsLocked Query Functions
// IsAssetLocked cc is used to query the ledger and findout if an asset is locked or not
func IsAssetLocked(ctx contractapi.TransactionContextInterface, callerChaincodeID, assetAgreementBytesBase64 string) (bool, error) {

	assetAgreementBytes, err := base64.StdEncoding.DecodeString(assetAgreementBytesBase64)
	if err != nil {
		return false, logThenErrorf("error in base64 decode of asset agreement: %+v", err)
	}

	assetAgreement := &common.AssetExchangeAgreement{}
	err = proto.Unmarshal([]byte(assetAgreementBytes), assetAgreement)
	if err != nil {
		return false, logThenErrorf(err.Error())
	}
	//display the requested asset agreement
	log.Infof("assetExchangeAgreement: %+v", assetAgreement)

	assetLockKey, _, err := GenerateAssetLockKeyAndContractId(ctx, callerChaincodeID, assetAgreement)
	if err != nil {
		return false, logThenErrorf(err.Error())
	}

	assetLockValBytes, err := ctx.GetStub().GetState(assetLockKey)
	if err != nil {
		return false, logThenErrorf(err.Error())
	}

	if assetLockValBytes == nil {
		return false, nil
	}

	assetLockVal := AssetLockValue{}
	err = json.Unmarshal(assetLockValBytes, &assetLockVal)
	if err != nil {
		return false, logThenErrorf("unmarshal error: %s", err)
	}
	log.Infof("assetLockVal: %+v", assetLockVal)

	// Check if expiry time is elapsed
	currentTimeSecs := uint64(time.Now().Unix())
	if currentTimeSecs >= assetLockVal.ExpiryTimeSecs {
		return false, nil
	}

	// '*' for recipient or locker in the query implies that the query seeks status for an arbitrary recipient or locker respectively
	if (assetAgreement.Locker == "*" || assetLockVal.Locker == assetAgreement.Locker) && (assetAgreement.Recipient == "*" || assetLockVal.Recipient == assetAgreement.Recipient) {
		return true, nil
	} else if assetAgreement.Locker == "*" && assetLockVal.Recipient != assetAgreement.Recipient {
		return false, nil
	} else if assetAgreement.Recipient == "*" && assetLockVal.Locker != assetAgreement.Locker {
		return false, nil
	} else if assetLockVal.Locker != assetAgreement.Locker || assetLockVal.Recipient != assetAgreement.Recipient {
		return false, nil
	}

	return true, nil
}

// IsFungibleAssetLocked cc is used to query the ledger and find out if a fungible asset is locked or not
func IsFungibleAssetLocked(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {

	assetLockVal, err := fetchFungibleAssetLocked(ctx, contractId)
	if err != nil {
		errStr := fmt.Sprintf("contractId %s is not associated with any currently locked asset", contractId)
		// Reporting no error only if the lock contract doesn't exist at all
		if err.Error() == errStr {
			return false, nil
		}
		return false, logThenErrorf(err.Error())
	}

	// Check if expiry time is elapsed
	currentTimeSecs := uint64(time.Now().Unix())
	if currentTimeSecs >= assetLockVal.ExpiryTimeSecs {
		return false, nil
	}

	return true, nil
}

// IsAssetLocked cc is used to query the ledger and find out if an asset is locked or not (this uses the contractId)
func IsAssetLockedQueryUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {

	_, assetLockVal, err := fetchLockStateUsingContractId(ctx, contractId)
	if err != nil {
		errStr := fmt.Sprintf("no contractId %s exists on the ledger", contractId)
		errStrFungible := fmt.Sprintf("contractId %s is not associated with any currently locked asset", contractId)
		
		// Reporting no error only if the lock contract doesn't exist at all
		if err.Error() == errStr || err.Error() == errStrFungible {
			return false, nil
		}
		return false, logThenErrorf(err.Error())
	}

	// Check if expiry time is elapsed
	currentTimeSecs := uint64(time.Now().Unix())
	if currentTimeSecs >= assetLockVal.GetExpiryTimeSecs() {
		return false, nil
	}

	return true, nil
}


