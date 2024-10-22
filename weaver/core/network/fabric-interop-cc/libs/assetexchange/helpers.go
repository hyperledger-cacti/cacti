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

    "github.com/golang/protobuf/proto"
    "github.com/hyperledger-cacti/cacti/weaver/common/protos-go/v2/common"
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
    mspProtobuf "github.com/hyperledger/fabric-protos-go/msp"
    log "github.com/sirupsen/logrus"
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
        return assetLockKey, assetLockVal, logThenErrorf("unexpected error: contractId %s is not associated with any currently locked asset", contractId)
    }

    err = json.Unmarshal(assetLockValBytes, &assetLockVal)
    if err != nil {
        return assetLockKey, assetLockVal, logThenErrorf("assetLockVal unmarshal error: %s", err)
    }
    return assetLockKey, assetLockVal, nil
}

// function to fetch the fungible asset-lock value from the ledger using contractId
func fetchFungibleAssetLocked(ctx contractapi.TransactionContextInterface, contractId string) (FungibleAssetLockValue, error) {
    var assetLockVal = FungibleAssetLockValue{}

    assetLockValBytes, err := ctx.GetStub().GetState(generateContractIdMapKey(contractId))
    if err != nil {
        return assetLockVal, logThenErrorf("failed to retrieve from the world state: %+v", err)
    }

    if assetLockValBytes == nil {
        return assetLockVal, logThenErrorf("contractId %s is not associated with any currently locked asset", contractId)
    }

    err = json.Unmarshal(assetLockValBytes, &assetLockVal)
    if err != nil {
        return assetLockVal, logThenErrorf("unmarshal error: %s", err)
    }
    log.Infof("contractId: %s and fungibleAssetLockVal: %+v", contractId, assetLockVal)

    return assetLockVal, nil
}

// function to fetch the AssetLockInterface from ledger using contractId, which can be
// either AssetLockValue or FungibleAssetLockValue
func fetchLockStateUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) (string, AssetLockInterface, error) {
    assetLockKey, assetLockVal, err := fetchAssetLockedUsingContractId(ctx, contractId)
    if err != nil {
        assetLockVal, err := fetchFungibleAssetLocked(ctx, contractId)
        if err != nil {
            return "", assetLockVal, logThenErrorf(err.Error())
        }
        return "", assetLockVal, nil
    }
    return assetLockKey, assetLockVal, nil
}
