/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// manage_assets is a chaincode that contains all the code related to asset management operations (e.g., Lock, Unlock, Claim)
// and any related utility functions
package assetexchange

import (
	"crypto/sha256"
	"crypto/sha512"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/golang/protobuf/proto"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	mspProtobuf "github.com/hyperledger/fabric-protos-go/msp"
	log "github.com/sirupsen/logrus"
)

// Object used to capture the HashLock details used in Asset Locking
type HashLock struct {
	HashMechanism common.HashMechanism `json:"hashMechanism"`
	HashBase64 string `json:"hashBase64"`
}

// Object used in the map, <asset-type, asset-id> --> <contractId, locker, recipient, ...> (for non-fungible assets)
type AssetLockValue struct {
	Locker         string      `json:"locker"`
	Recipient      string      `json:"recipient"`
	LockInfo       interface{} `json:"lockInfo"`
	ExpiryTimeSecs uint64      `json:"expiryTimeSecs"`
}

// Object used in the map, contractId --> <asset-type, num-units, locker, ...> (for fungible assets)
type FungibleAssetLockValue struct {
	Type           string      `json:"type"`
	NumUnits       uint64      `json:"numUnits"`
	Locker         string      `json:"locker"`
	Recipient      string      `json:"recipient"`
	LockInfo       interface{} `json:"lockInfo"`
	ExpiryTimeSecs uint64      `json:"expiryTimeSecs"`
}

const (
	assetKeyPrefix    = "AssetKey_"   // prefix for the map, asset-key --> asset-object
	assetKeyDelimiter = "_"           // delimiter for the asset-key
	contractIdPrefix  = "ContractId_" // prefix for the map, contractId --> asset-key
	claimAssetKeyPrefix = "ClaimAssetKey_"
	claimContractIdPrefix = "ClaimContractId_"
)

// helper functions to log and return errors
func logThenErrorf(format string, args ...interface{}) error {
	errorMsg := fmt.Sprintf(format, args...)
	log.Error(errorMsg)
	return errors.New(errorMsg)
}

// function to generate a "SHA256" hash in base64 format for a given preimage
func GenerateSHA256HashInBase64Form(preimage string) string {
	hasher := sha256.New()
	hasher.Write([]byte(preimage))
	shaHash := hasher.Sum(nil)
	shaHashBase64 := base64.StdEncoding.EncodeToString(shaHash)
	return shaHashBase64
}

// function to generate a "SHA512" hash in base64 format for a given preimage
func GenerateSHA512HashInBase64Form(preimage string) string {
	hasher := sha512.New()
	hasher.Write([]byte(preimage))
	shaHash := hasher.Sum(nil)
	shaHashBase64 := base64.StdEncoding.EncodeToString(shaHash)
	return shaHashBase64
}

// function to return the key to fetch an element from the map using contractId
func generateContractIdMapKey(contractId string) string {
	return contractIdPrefix + contractId
}
// function to return the key to fetch an element from the map using contractId
func generateClaimContractIdMapKey(contractId string) string {
	return claimContractIdPrefix + contractId
}

/*
 * Function to generate asset-lock key (which is combination of asset-type and asset-id)
 * and contract-id (which is a hash on asset-lock key) for the non-fungible asset locking on the ledger
 */
func GenerateAssetLockKeyAndContractId(ctx contractapi.TransactionContextInterface, chaincodeId string, assetAgreement *common.AssetExchangeAgreement) (string, string, error) {
	assetLockKey, err := ctx.GetStub().CreateCompositeKey("AssetExchangeContract", []string{chaincodeId, assetAgreement.AssetType, assetAgreement.Id})
	if err != nil {
		return "", "", logThenErrorf("error while creating composite key: %+v", err)
	}

	contractId := GenerateSHA256HashInBase64Form(assetLockKey + ctx.GetStub().GetTxID())
	return assetLockKey, contractId, nil
}
/*
 * Function to generate asset-lock key (which is combination of asset-type and asset-id)
 * and contract-id (which is a hash on asset-lock key) for the non-fungible asset locking on the ledger
 */
func GenerateClaimAssetLockKey(ctx contractapi.TransactionContextInterface, chaincodeId string, assetAgreement *common.AssetExchangeAgreement) (string, error) {
	assetLockKey, err := ctx.GetStub().CreateCompositeKey("AssetExchangeContract", []string{chaincodeId, assetAgreement.AssetType, assetAgreement.Id})
	if err != nil {
		return "", logThenErrorf("error while creating composite key: %+v", err)
	}
	return claimAssetKeyPrefix + assetLockKey, nil
}

/*
 * Function to generate contract-id for fungible asset-locking on the ledger (which is
 * a hash on the attributes of the fungible asset exchange agreement)
 */
func GenerateFungibleAssetLockContractId(ctx contractapi.TransactionContextInterface, chaincodeId string, assetAgreement *common.FungibleAssetExchangeAgreement) string {
	preimage := chaincodeId + assetAgreement.AssetType + strconv.Itoa(int(assetAgreement.NumUnits)) +
		assetAgreement.Locker + assetAgreement.Recipient + ctx.GetStub().GetTxID()
	contractId := GenerateSHA256HashInBase64Form(preimage + ctx.GetStub().GetTxID())
	return contractId
}

// function to get the caller identity from the transaction context
func getECertOfTxCreatorBase64(ctx contractapi.TransactionContextInterface) (string, error) {

	txCreatorBytes, err := ctx.GetStub().GetCreator()
	if err != nil {
		return "", logThenErrorf("unable to get the transaction creator information: %+v", err)
	}
	log.Infof("getECertOfTxCreatorBase64: TxCreator: %s", string(txCreatorBytes))

	serializedIdentity := &mspProtobuf.SerializedIdentity{}
	err = proto.Unmarshal(txCreatorBytes, serializedIdentity)
	if err != nil {
		return "", logThenErrorf("getECertOfTxCreatorBase64: unmarshal error: %+v", err)
	}
	log.Infof("getECertOfTxCreatorBase64: TxCreator ECert: %s", string(serializedIdentity.IdBytes))

	eCertBytesBase64 := base64.StdEncoding.EncodeToString(serializedIdentity.IdBytes)

	return eCertBytesBase64, nil
}

/*
 * Function to validate the locker in asset agreement.
 * If locker is not set, it will be set to the caller.
 * If the locker is set already, it ensures that the locker is same as the creator of the transaction.
 */
func validateAndSetLockerOfAssetAgreement(ctx contractapi.TransactionContextInterface, assetAgreement *common.AssetExchangeAgreement) error {
	txCreatorECertBase64, err := getECertOfTxCreatorBase64(ctx)
	if err != nil {
		return logThenErrorf(err.Error())
	}
	if len(assetAgreement.Locker) == 0 {
		assetAgreement.Locker = txCreatorECertBase64
	} else if assetAgreement.Locker != txCreatorECertBase64 {
		return logThenErrorf("locker %s in the asset agreement is not same as the transaction creator %s", assetAgreement.Locker, txCreatorECertBase64)
	}

	return nil
}

/*
 * Function to validate the locker in fungible asset agreement.
 * If locker is not set, it will be set to the caller.
 * If the locker is set already, it ensures that the locker is same as the creator of the transaction.
 */
func validateAndSetLockerOfFungibleAssetAgreement(ctx contractapi.TransactionContextInterface, assetAgreement *common.FungibleAssetExchangeAgreement) error {
	txCreatorECertBase64, err := getECertOfTxCreatorBase64(ctx)
	if err != nil {
		return logThenErrorf(err.Error())
	}
	if len(assetAgreement.Locker) == 0 {
		assetAgreement.Locker = txCreatorECertBase64
	} else if assetAgreement.Locker != txCreatorECertBase64 {
		return logThenErrorf("locker %s in the fungible asset agreement is not same as the transaction creator %s", assetAgreement.Locker, txCreatorECertBase64)
	}

	return nil
}

/*
 * Function to validate the recipient in asset agreement.
 * If recipient is not set, it will be set to the caller.
 * If the recipient is set already, it ensures that the recipient is same as the creator of the transaction.
 */
func validateAndSetRecipientOfAssetAgreement(ctx contractapi.TransactionContextInterface, assetAgreement *common.AssetExchangeAgreement) error {
	txCreatorECertBase64, err := getECertOfTxCreatorBase64(ctx)
	if err != nil {
		return logThenErrorf(err.Error())
	}
	if len(assetAgreement.Recipient) == 0 {
		assetAgreement.Recipient = txCreatorECertBase64
	} else if assetAgreement.Recipient != txCreatorECertBase64 {
		return logThenErrorf("recipient %s in the asset agreement is not same as the transaction creator %s", assetAgreement.Recipient, txCreatorECertBase64)
	}

	return nil
}

func getLockInfoAndExpiryTimeSecs(lockInfoBytesBase64 string) (interface{}, uint64, error) {
	var lockInfoVal interface{}
	var expiryTimeSecs uint64

	lockInfoBytes, err := base64.StdEncoding.DecodeString(lockInfoBytesBase64)
	if err != nil {
		return lockInfoVal, 0, fmt.Errorf("error in base64 decode of lock information: %+v", err)
	}
	lockInfo := &common.AssetLock{}
	err = proto.Unmarshal([]byte(lockInfoBytes), lockInfo)
	if err != nil {
		return lockInfoVal, 0, logThenErrorf(err.Error())
	}

	// process lock details here (lockInfo.LockInfo contains value based on the lock mechanism used)
	if lockInfo.LockMechanism == common.LockMechanism_HTLC {
		lockInfoHTLC := &common.AssetLockHTLC{}
		err := proto.Unmarshal(lockInfo.LockInfo, lockInfoHTLC)
		if err != nil {
			return lockInfoVal, 0, logThenErrorf("unmarshal error: %s", err)
		}
		//display the passed hash lock information
		log.Infof("lockInfoHTLC: %+v", lockInfoHTLC)
		lockInfoVal = HashLock{HashMechanism: lockInfoHTLC.HashMechanism, HashBase64: string(lockInfoHTLC.HashBase64)}
		// process time lock details here
		if lockInfoHTLC.TimeSpec != common.TimeSpec_EPOCH {
			return lockInfoVal, 0, logThenErrorf("only EPOCH time is supported at present")
		}
		expiryTimeSecs = lockInfoHTLC.ExpiryTimeSecs
	} else {
		return lockInfoVal, 0, logThenErrorf("lock mechanism is not supported")
	}
	return lockInfoVal, expiryTimeSecs, nil
}

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

	assetLockVal := AssetLockValue{Locker: assetAgreement.Locker, Recipient: assetAgreement.Recipient, LockInfo: lockInfo, ExpiryTimeSecs: expiryTimeSecs}

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

	assetLockKey, contractId, err := GenerateAssetLockKeyAndContractId(ctx, callerChaincodeID, assetAgreement)
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
	currentTimeSecs := uint64(time.Now().Unix())
	if currentTimeSecs < assetLockVal.ExpiryTimeSecs {
		return "", logThenErrorf("cannot unlock asset of type %s and ID %s as the expiry time is not yet elapsed", assetAgreement.AssetType, assetAgreement.Id)
	}

	err = ctx.GetStub().DelState(assetLockKey)
	if err != nil {
		return "", logThenErrorf("failed to delete lock for asset of type %s and ID %s: %v", assetAgreement.AssetType, assetAgreement.Id, err)
	}
	err = ctx.GetStub().DelState(generateContractIdMapKey(contractId))
	if err != nil {
		return "", logThenErrorf("failed to delete the contractId %s as part of asset unlock: %v", contractId, err)
	}

	return contractId, nil
}

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
		return false, logThenErrorf("no asset of type %s and ID %s is locked", assetAgreement.AssetType, assetAgreement.Id)
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
		return false, logThenErrorf("expiry time for asset of type %s and ID %s is already elapsed", assetAgreement.AssetType, assetAgreement.Id)
	}

	// '*' for recipient or locker in the query implies that the query seeks status for an arbitrary recipient or locker respectively
	if (assetAgreement.Locker == "*" || assetLockVal.Locker == assetAgreement.Locker) && (assetAgreement.Recipient == "*" || assetLockVal.Recipient == assetAgreement.Recipient) {
		return true, nil
	} else if assetAgreement.Locker == "*" && assetLockVal.Recipient != assetAgreement.Recipient {
		return false, logThenErrorf("asset of type %s and ID %s is not locked for %s", assetAgreement.AssetType, assetAgreement.Id, assetAgreement.Recipient)
	} else if assetAgreement.Recipient == "*" && assetLockVal.Locker != assetAgreement.Locker {
		return false, logThenErrorf("asset of type %s and ID %s is not locked by %s", assetAgreement.AssetType, assetAgreement.Id, assetAgreement.Locker)
	} else if assetLockVal.Locker != assetAgreement.Locker || assetLockVal.Recipient != assetAgreement.Recipient {
		return false, logThenErrorf("asset of type %s and ID %s is not locked by %s for %s", assetAgreement.AssetType, assetAgreement.Id, assetAgreement.Locker, assetAgreement.Recipient)
	}

	return true, nil
}

/*
 * Function to check if hashBase64 is the hash for the preimage preimageBase64.
 * Both the preimage and hash are passed in base64 form.
 */
func checkIfCorrectPreimage(preimageBase64 string, hashBase64 string, hashMechanism common.HashMechanism) (bool, error) {
	funName := "checkIfCorrectPreimage"
	preimage, err := base64.StdEncoding.DecodeString(preimageBase64)
	if err != nil {
		return false, logThenErrorf("base64 decode preimage error: %s", err)
	}

	shaHashBase64 := ""
	if hashMechanism == common.HashMechanism_SHA256 {
		shaHashBase64 = GenerateSHA256HashInBase64Form(string(preimage))
	} else if hashMechanism == common.HashMechanism_SHA512 {
		shaHashBase64 = GenerateSHA512HashInBase64Form(string(preimage))
	} else {
		log.Infof("hashMechanism %d is not supported currently", hashMechanism)
		return false, nil
	}
	if shaHashBase64 == hashBase64 {
		log.Infof("%s: preimage %s is passed correctly", funName, preimage)
	} else {
		log.Infof("%s: preimage %s is not passed correctly", funName, preimage)
		return false, nil
	}
	return true, nil
}

func validateHashPreimage(claimInfo *common.AssetClaim, lockInfo interface{}) (bool, error) {
	claimInfoHTLC := &common.AssetClaimHTLC{}
	err := proto.Unmarshal(claimInfo.ClaimInfo, claimInfoHTLC)
	if err != nil {
		return false, logThenErrorf("unmarshal claimInfo.ClaimInfo error: %s", err)
	}
	//display the claim information
	log.Infof("claimInfoHTLC: %+v\n", claimInfoHTLC)
	lockInfoVal := HashLock{}
	lockInfoBytes, err := json.Marshal(lockInfo)
	if err != nil {
		return false, logThenErrorf("marshal lockInfo error: %s", err)
	}
	err = json.Unmarshal(lockInfoBytes, &lockInfoVal)
	if err != nil {
		return false, logThenErrorf("unmarshal lockInfoBytes error: %s", err)
	}
	log.Infof("HashLock: %+v\n", lockInfoVal)

	if lockInfoVal.HashMechanism != claimInfoHTLC.HashMechanism {
		return false, logThenErrorf("hash mechanism used while locking is different from the one supplied: %d", claimInfoHTLC.HashMechanism)
	}

	// match the hash passed during claim with the hash stored during asset locking
	return checkIfCorrectPreimage(string(claimInfoHTLC.HashPreimageBase64), lockInfoVal.HashBase64, lockInfoVal.HashMechanism)
}

// fetches common.AssetClaim from the input parameter and checks if the lock mechanism is valid or not
func getClaimInfo(claimInfoBytesBase64 string) (*common.AssetClaim, error) {
	claimInfo := &common.AssetClaim{}

	claimInfoBytes, err := base64.StdEncoding.DecodeString(claimInfoBytesBase64)
	if err != nil {
		return claimInfo, logThenErrorf("error in base64 decode of claim information: %+v", err)
	}

	err = proto.Unmarshal([]byte(claimInfoBytes), claimInfo)
	if err != nil {
		return claimInfo, logThenErrorf("unmarshal error: %s", err)
	}
	// check if a valid lock mechanism is provided
	if claimInfo.LockMechanism != common.LockMechanism_HTLC {
		return claimInfo, logThenErrorf("lock mechanism is not supported")
	}

	return claimInfo, nil
}

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

	claimInfo, err := getClaimInfo(claimInfoBytesBase64)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	assetLockKey, contractId, err := GenerateAssetLockKeyAndContractId(ctx, callerChaincodeID, assetAgreement)
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

	// Check if expiry time is elapsed
	currentTimeSecs := uint64(time.Now().Unix())
	if currentTimeSecs >= assetLockVal.ExpiryTimeSecs {
		return "", logThenErrorf("cannot claim asset of type %s and ID %s as the expiry time is already elapsed", assetAgreement.AssetType, assetAgreement.Id)
	}

	if claimInfo.LockMechanism == common.LockMechanism_HTLC {
		isCorrectPreimage, err := validateHashPreimage(claimInfo, assetLockVal.LockInfo)
		if err != nil {
			return "", logThenErrorf("claim asset of type %s and ID %s error: %v", assetAgreement.AssetType, assetAgreement.Id, err)
		}
		if !isCorrectPreimage {
			return "", logThenErrorf("cannot claim asset of type %s and ID %s as the hash preimage is not matching", assetAgreement.AssetType, assetAgreement.Id)
		}

		// Record Hash Preimage into ledger
		claimInfoHTLC := &common.AssetClaimHTLC{}
		err = proto.Unmarshal(claimInfo.ClaimInfo, claimInfoHTLC)
		if err != nil {
			return "", logThenErrorf("unmarshal claimInfo.ClaimInfo error: %s", err)
		}
		claimAssetLockKey, err := GenerateClaimAssetLockKey(ctx, callerChaincodeID, assetAgreement)
		if err != nil {
			return "", logThenErrorf(err.Error())
		}
		err = ctx.GetStub().PutState(claimAssetLockKey, []byte(claimInfoHTLC.HashPreimageBase64))
		if err != nil {
			return "", logThenErrorf("failed to write to the world state: %+v", err)
		}
	}

	err = ctx.GetStub().DelState(assetLockKey)
	if err != nil {
		return "", logThenErrorf("failed to delete lock for asset of type %s and ID %s: %v", assetAgreement.AssetType, assetAgreement.Id, err)
	}
	err = ctx.GetStub().DelState(generateContractIdMapKey(contractId))
	if err != nil {
		return "", logThenErrorf("failed to delete the contractId %s as part of asset claim: %v", contractId, err)
	}

	return contractId, nil
}

// function to fetch the asset-lock <key, value> from the ledger using contractId
func fetchAssetLockedUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) (string, AssetLockValue, error) {
	var assetLockVal = AssetLockValue{}
	var assetLockKey string = ""
	assetLockKeyBytes, err := ctx.GetStub().GetState(generateContractIdMapKey(contractId))
	if err != nil {
		return assetLockKey, assetLockVal, logThenErrorf(err.Error())
	}

	if assetLockKeyBytes == nil {
		return assetLockKey, assetLockVal, logThenErrorf("no contractId %s exists on the ledger", contractId)
	}

	err = json.Unmarshal(assetLockKeyBytes, &assetLockKey)
	if err != nil {
		return assetLockKey, assetLockVal, logThenErrorf("assetLockKey unmarshal error: %s", err)
	}
	log.Infof("contractId: %s and assetLockKey: %s", contractId, assetLockKey)

	assetLockValBytes, err := ctx.GetStub().GetState(assetLockKey)
	if err != nil {
		return assetLockKey, assetLockVal, logThenErrorf("failed to retrieve from the world state: %+v", err)
	}

	if assetLockValBytes == nil {
		return assetLockKey, assetLockVal, logThenErrorf("contractId %s is not associated with any currently locked asset", contractId)
	}

	err = json.Unmarshal(assetLockValBytes, &assetLockVal)
	if err != nil {
		return assetLockKey, assetLockVal, logThenErrorf("assetLockVal unmarshal error: %s", err)
	}
	return assetLockKey, assetLockVal, nil
}

// UnlockAssetUsingContractId cc is used to record unlocking of an asset on the ledger (this uses the contractId)
func UnlockAssetUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) error {

	assetLockKey, assetLockVal, err := fetchAssetLockedUsingContractId(ctx, contractId)
	if err != nil {
		return logThenErrorf(err.Error())
	}

	txCreatorECertBase64, err := getECertOfTxCreatorBase64(ctx)
	if err != nil {
		return logThenErrorf("unable to get the transaction creator information: %+v", err)
	}

	// transaction creator needs to be the locker of the locked fungible asset
	if assetLockVal.Locker != txCreatorECertBase64 {
		return logThenErrorf("asset is not locked for %s to unlock", txCreatorECertBase64)
	}

	// Check if expiry time is elapsed
	currentTimeSecs := uint64(time.Now().Unix())
	if currentTimeSecs < assetLockVal.ExpiryTimeSecs {
		return logThenErrorf("cannot unlock asset associated with the contractId %s as the expiry time is not yet elapsed", contractId)
	}

	err = ctx.GetStub().DelState(assetLockKey)
	if err != nil {
		return logThenErrorf("failed to delete lock for the asset associated with the contractId %s: %v", contractId, err)
	}

	err = ctx.GetStub().DelState(generateContractIdMapKey(contractId))
	if err != nil {
		return logThenErrorf("failed to delete the contractId %s as part of asset unlock: %v", contractId, err)
	}

	return nil
}

// ClaimAsset cc is used to record claim of an asset on the ledger (this uses the contractId)
func ClaimAssetUsingContractId(ctx contractapi.TransactionContextInterface, contractId, claimInfoBytesBase64 string) error {

	assetLockKey, assetLockVal, err := fetchAssetLockedUsingContractId(ctx, contractId)
	if err != nil {
		return logThenErrorf(err.Error())
	}

	txCreatorECertBase64, err := getECertOfTxCreatorBase64(ctx)
	if err != nil {
		return logThenErrorf("unable to get the transaction creator information: %+v", err)
	}

	if assetLockVal.Recipient != string(txCreatorECertBase64) {
		return logThenErrorf("asset is not locked for %s to claim", string(txCreatorECertBase64))
	}

	claimInfo, err := getClaimInfo(claimInfoBytesBase64)
	if err != nil {
		return logThenErrorf(err.Error())
	}

	// Check if expiry time is elapsed
	currentTimeSecs := uint64(time.Now().Unix())
	if currentTimeSecs >= assetLockVal.ExpiryTimeSecs {
		return logThenErrorf("cannot claim asset associated with contractId %s as the expiry time is already elapsed", contractId)
	}

	if claimInfo.LockMechanism == common.LockMechanism_HTLC {
		isCorrectPreimage, err := validateHashPreimage(claimInfo, assetLockVal.LockInfo)
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

	err = ctx.GetStub().DelState(assetLockKey)
	if err != nil {
		return logThenErrorf("failed to delete lock for the asset associated with the contractId %s: %+v", contractId, err)
	}

	err = ctx.GetStub().DelState(generateContractIdMapKey(contractId))
	if err != nil {
		return logThenErrorf("failed to delete the contractId %s as part of asset claim: %+v", contractId, err)
	}

	return nil
}

// IsAssetLocked cc is used to query the ledger and find out if an asset is locked or not (this uses the contractId)
func IsAssetLockedQueryUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {

	_, assetLockVal, err := fetchAssetLockedUsingContractId(ctx, contractId)
	if err != nil {
		return false, logThenErrorf(err.Error())
	}

	// Check if expiry time is elapsed
	currentTimeSecs := uint64(time.Now().Unix())
	if currentTimeSecs >= assetLockVal.ExpiryTimeSecs {
		return false, logThenErrorf("expiry time for asset associated with contractId %s is already elapsed", contractId)
	}

	return true, nil
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

// function to fetch the fungible asset-lock value from the ledger using contractId
func fetchFungibleAssetLocked(ctx contractapi.TransactionContextInterface, contractId string) (FungibleAssetLockValue, error) {
	var assetLockVal = FungibleAssetLockValue{}

	assetLockValBytes, err := ctx.GetStub().GetState(generateContractIdMapKey(contractId))
	if err != nil {
		return assetLockVal, logThenErrorf("failed to retrieve from the world state: %+v", err)
	}

	if assetLockValBytes == nil {
		return assetLockVal, logThenErrorf("contractId %s is not associated with any currently locked fungible asset", contractId)
	}

	err = json.Unmarshal(assetLockValBytes, &assetLockVal)
	if err != nil {
		return assetLockVal, logThenErrorf("unmarshal error: %s", err)
	}
	log.Infof("contractId: %s and fungibleAssetLockVal: %+v", contractId, assetLockVal)

	return assetLockVal, nil
}

// IsFungibleAssetLocked cc is used to query the ledger and find out if a fungible asset is locked or not
func IsFungibleAssetLocked(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {

	assetLockVal, err := fetchFungibleAssetLocked(ctx, contractId)
	if err != nil {
		return false, logThenErrorf(err.Error())
	}

	// Check if expiry time is elapsed
	currentTimeSecs := uint64(time.Now().Unix())
	if currentTimeSecs >= assetLockVal.ExpiryTimeSecs {
		return false, logThenErrorf("expiry time for fungible asset associated with contractId %s is already elapsed", contractId)
	}

	return true, nil
}

// ClaimFungibleAsset cc is used to record claim of a fungible asset on the ledger
func ClaimFungibleAsset(ctx contractapi.TransactionContextInterface, contractId, claimInfoBytesBase64 string) error {

	assetLockVal, err := fetchFungibleAssetLocked(ctx, contractId)
	if err != nil {
		return logThenErrorf(err.Error())
	}

	txCreatorECertBase64, err := getECertOfTxCreatorBase64(ctx)
	if err != nil {
		return logThenErrorf("unable to get the transaction creator information: %+v", err)
	}

	// transaction creator needs to be the recipient of the locked fungible asset
	if assetLockVal.Recipient != txCreatorECertBase64 {
		return logThenErrorf("asset is not locked for %s to claim", txCreatorECertBase64)
	}

	claimInfo, err := getClaimInfo(claimInfoBytesBase64)
	if err != nil {
		return logThenErrorf(err.Error())
	}

	// Check if expiry time is elapsed
	currentTimeSecs := uint64(time.Now().Unix())
	if currentTimeSecs >= assetLockVal.ExpiryTimeSecs {
		return logThenErrorf("cannot claim fungible asset associated with contractId %s as the expiry time is already elapsed", contractId)
	}

	if claimInfo.LockMechanism == common.LockMechanism_HTLC {
		isCorrectPreimage, err := validateHashPreimage(claimInfo, assetLockVal.LockInfo)
		if err != nil {
			return logThenErrorf("claim fungible asset associated with contractId %s failed with error: %v", contractId, err)
		}
		if !isCorrectPreimage {
			return logThenErrorf("cannot claim fungible asset associated with contractId %s as the hash preimage is not matching", contractId)
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

	err = ctx.GetStub().DelState(generateContractIdMapKey(contractId))
	if err != nil {
		return logThenErrorf("failed to delete the contractId %s as part of fungible asset claim: %+v", contractId, err)
	}

	return nil
}

// UnlockFungibleAsset cc is used to record unlocking of a fungible asset on the ledger
func UnlockFungibleAsset(ctx contractapi.TransactionContextInterface, contractId string) error {

	assetLockVal, err := fetchFungibleAssetLocked(ctx, contractId)
	if err != nil {
		return logThenErrorf(err.Error())
	}

	txCreatorECertBase64, err := getECertOfTxCreatorBase64(ctx)
	if err != nil {
		return logThenErrorf("unable to get the transaction creator information: %+v", err)
	}

	// transaction creator needs to be the locker of the locked fungible asset
	if assetLockVal.Locker != txCreatorECertBase64 {
		return logThenErrorf("asset is not locked for %s to unlock", txCreatorECertBase64)
	}

	// Check if expiry time is elapsed
	currentTimeSecs := uint64(time.Now().Unix())
	if currentTimeSecs < assetLockVal.ExpiryTimeSecs {
		return logThenErrorf("cannot unlock fungible asset associated with the contractId %s as the expiry time is not yet elapsed", contractId)
	}

	err = ctx.GetStub().DelState(generateContractIdMapKey(contractId))
	if err != nil {
		return logThenErrorf("failed to delete the contractId %s as part of fungible asset unlock: %v", contractId, err)
	}

	return nil
}

func GetHTLCHash(ctx contractapi.TransactionContextInterface, callerChaincodeID, assetAgreementBytesBase64 string) (string, error) {

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
	log.Infof("assetLockVal: %+v", assetLockVal)

	return getHTLCHashHelper(ctx, assetLockVal.LockInfo)
}

func GetHTLCHashByContractId(ctx contractapi.TransactionContextInterface, contractId string) (string, error) {
	assetLockVal, err := fetchFungibleAssetLocked(ctx, contractId)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	return getHTLCHashHelper(ctx, assetLockVal.LockInfo)
}

func GetHTLCHashPreImage(ctx contractapi.TransactionContextInterface, callerChaincodeID, assetAgreementBytesBase64 string) (string, error) {
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

	claimAssetLockKey, err := GenerateClaimAssetLockKey(ctx, callerChaincodeID, assetAgreement)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	return getHashPreImageHelper(ctx, claimAssetLockKey)
}

func GetHTLCHashPreImageByContractId(ctx contractapi.TransactionContextInterface, contractId string) (string, error) {
	return getHashPreImageHelper(ctx, generateClaimContractIdMapKey(contractId))
}

func getHTLCHashHelper(ctx contractapi.TransactionContextInterface, lockInfo interface{}) (string, error) {
	lockInfoVal := HashLock{}
	lockInfoBytes, err := json.Marshal(lockInfo)
	if err != nil {
		return "", logThenErrorf("marshal lockInfo error: %s", err)
	}
	err = json.Unmarshal(lockInfoBytes, &lockInfoVal)
	if err != nil {
		return "", logThenErrorf("unmarshal lockInfoBytes error: %s", err)
	}

	return string(lockInfoBytes), nil
}

func getHashPreImageHelper(ctx contractapi.TransactionContextInterface, key string) (string, error) {
	hashPreImageBase64Bytes, err := ctx.GetStub().GetState(key)
	if err != nil {
		return "", logThenErrorf("failed to retrieve from the world state: %+v", err)
	}

	if hashPreImageBase64Bytes == nil {
		return "", logThenErrorf("key %s is not associated with any claimed asset", key)
	}

	return string(hashPreImageBase64Bytes), nil
}
