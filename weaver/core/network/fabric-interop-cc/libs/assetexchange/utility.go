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

    "github.com/golang/protobuf/proto"
    "github.com/hyperledger-cacti/cacti/weaver/common/protos-go/v2/common"
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
    log "github.com/sirupsen/logrus"
)

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
    _, assetLockVal, err := fetchLockStateUsingContractId(ctx, contractId)
    if err != nil {
        return "", logThenErrorf(err.Error())
    }

    return getHTLCHashHelper(ctx, assetLockVal.GetLockInfo())
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
    
    contractIdBytes, err := ctx.GetStub().GetState(claimAssetLockKey)
    if err != nil {
        return "", logThenErrorf(err.Error())
    }
    if contractIdBytes == nil {
        return "", logThenErrorf("key %s is not associated with any claimed asset", claimAssetLockKey)
    }

    return getHashPreImageHelper(ctx, generateClaimContractIdMapKey(string(contractIdBytes)))
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
