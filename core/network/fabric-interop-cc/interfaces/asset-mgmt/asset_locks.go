/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package assetmgmt

import (
    "fmt"
    "errors"
    "time"
    "strconv"
    "encoding/base64"
    "encoding/json"

    "github.com/golang/protobuf/proto"
    "github.com/hyperledger/fabric-chaincode-go/shim"
    log "github.com/sirupsen/logrus"
    "github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
)


// AssetManagement provides functions to manage asset locks by calling suitable functions in the interop contract
type AssetManagement struct {
    shim.Chaincode
    interopChaincodeId string
}


// Utility functions
func (am *AssetManagement) Configure(interopChaincodeId string) {
    am.interopChaincodeId = interopChaincodeId
}

// helper functions to log and return errors
func logThenErrorf(format string, args ...interface{}) error {
	errorMsg := fmt.Sprintf(format, args...)
	log.Error(errorMsg)
	return errors.New(errorMsg)
}

func (am *AssetManagement) validateInteropccAssetTypeAssetId(assetAgreement *common.AssetExchangeAgreement) (bool, error) {
    if len(am.interopChaincodeId) == 0 {
        return false, logThenErrorf("interoperation chaincode ID not set. Run the 'Configure(...)' function first.")
    }
    if len(assetAgreement.AssetType) == 0 {
        return false, logThenErrorf("empty asset type")
    }
    if len(assetAgreement.Id) == 0 {
	return false, logThenErrorf("empty asset ID")
    }

    return true, nil
}

func (am *AssetManagement) validateInteropccContractId(contractId string) (bool, error) {
    if len(am.interopChaincodeId) == 0 {
        return false, logThenErrorf("interoperation chaincode ID not set. Run the 'Configure(...)' function first.")
    }
    if len(contractId) == 0 {
        return false, logThenErrorf("contractId cannot be empty")
    }

    return true, nil
}

func (am *AssetManagement) validateLockInfo(lockInfo *common.AssetLock) error {
    if len(lockInfo.LockInfo) == 0 {
        return logThenErrorf("empty lock info")
    }
    if (lockInfo.LockMechanism == common.LockMechanism_HTLC) {
        lockInfoHTLC := &common.AssetLockHTLC{}
        err := proto.Unmarshal(lockInfo.LockInfo, lockInfoHTLC)
        if err != nil {
            return logThenErrorf(err.Error())
        }
        if len(lockInfoHTLC.HashBase64) == 0 {
            return logThenErrorf("empty lock hash value")
        }
        if lockInfoHTLC.TimeSpec != common.TimeSpec_EPOCH {
            return logThenErrorf("only EPOCH time is supported at present")
        }
    } else {
        return logThenErrorf("unsupported lock mechanism: %+v", lockInfo.LockMechanism)
    }

    return nil
}

func (am *AssetManagement) validateClaimInfo(claimInfo *common.AssetClaim) error {
    if len(claimInfo.ClaimInfo) == 0 {
        return logThenErrorf("empty claim info")
    }
    if (claimInfo.LockMechanism == common.LockMechanism_HTLC) {
        claimInfoHTLC := &common.AssetClaimHTLC{}
        err := proto.Unmarshal(claimInfo.ClaimInfo, claimInfoHTLC)
        if err != nil {
            return logThenErrorf(err.Error())
        }
        if len(claimInfoHTLC.HashPreimageBase64) == 0 {
            return logThenErrorf("empty lock hash preimage")
        }
    } else {
        return logThenErrorf("unsupported lock mechanism: %+v", claimInfo.LockMechanism)
    }

    return nil
}

// Ledger transaction (invocation) functions

func (am *AssetManagement) LockAsset(stub shim.ChaincodeStubInterface, assetAgreement *common.AssetExchangeAgreement, lockInfo *common.AssetLock) (string, error) {
    _, err := am.validateInteropccAssetTypeAssetId(assetAgreement)
    if err != nil {
	return "", err
    }
    if len(assetAgreement.Recipient) == 0 {
        return "", logThenErrorf("empty lock recipient")
    }

    assetAgreementBytes, err := proto.Marshal(assetAgreement)
    if err != nil {
        return "", logThenErrorf(err.Error())
    }

    err = am.validateLockInfo(lockInfo)
    if err != nil {
	return "", err
    }
    lockInfoBytes, err := proto.Marshal(lockInfo)
    if err != nil {
        return "", logThenErrorf(err.Error())
    }
    assetAgreementBytes64 := base64.StdEncoding.EncodeToString(assetAgreementBytes)
    lockInfoBytes64 := base64.StdEncoding.EncodeToString(lockInfoBytes)

    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("LockAsset"), []byte(assetAgreementBytes64), []byte(lockInfoBytes64)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return "", logThenErrorf(string(iccResp.GetMessage()))
    }
    contractId := string(iccResp.GetPayload())
    fmt.Printf("Asset %s of type %s locked for %s using contractId %s\n", assetAgreement.Id, assetAgreement.AssetType, assetAgreement.Recipient, contractId)
    return contractId, nil
}

func (am *AssetManagement) LockFungibleAsset(stub shim.ChaincodeStubInterface, assetAgreement *common.FungibleAssetExchangeAgreement, lockInfo *common.AssetLock) (string, error) {
    if len(am.interopChaincodeId) == 0 {
        return "", logThenErrorf("interoperation chaincode ID not set. Run the 'Configure(...)' function first.")
    }

    if len(assetAgreement.AssetType) == 0 {
        return "", logThenErrorf("empty asset type")
    }
    if assetAgreement.NumUnits <= 0 {
        return "", logThenErrorf("invalid number of asset units")
    }
    if len(assetAgreement.Recipient) == 0 {
        return "", logThenErrorf("empty lock recipient")
    }

    assetAgreementBytes, err := proto.Marshal(assetAgreement)
    if err != nil {
        return "", logThenErrorf(err.Error())
    }
    err = am.validateLockInfo(lockInfo)
    if err != nil {
        return "", err
    }
    lockInfoBytes, err := proto.Marshal(lockInfo)
    if err != nil {
        return "", logThenErrorf(err.Error())
    }
    assetAgreementBytes64 := base64.StdEncoding.EncodeToString(assetAgreementBytes)
    lockInfoBytes64 := base64.StdEncoding.EncodeToString(lockInfoBytes)

    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("LockFungibleAsset"), []byte(assetAgreementBytes64), []byte(lockInfoBytes64)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return "", errors.New(string(iccResp.GetMessage()))
    }
    contractId := string(iccResp.GetPayload())
    fmt.Printf("%d units of asset type %s locked for %s using contractId %s\n", assetAgreement.NumUnits, assetAgreement.AssetType, assetAgreement.Recipient, contractId)
    return contractId, nil
}

// If 'assetAgreement.Locker' or 'assetAgreement.Recipient' is blank, assume it's the caller
func (am *AssetManagement) IsAssetLocked(stub shim.ChaincodeStubInterface, assetAgreement *common.AssetExchangeAgreement) (bool, error) {
    _, err := am.validateInteropccAssetTypeAssetId(assetAgreement)
    if err != nil {
	return false, err
    }

    myselfBytes, err := stub.GetCreator()
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    myself := string(myselfBytes)
    if len(assetAgreement.Recipient) == 0 {
        log.Info("empty lock recipient; assuming caller")
        assetAgreement.Recipient = myself
    }
    if len(assetAgreement.Locker) == 0 {
        log.Info("empty locker; assuming caller")
        assetAgreement.Locker = myself
    }
    if assetAgreement.Recipient == assetAgreement.Locker {
        return false, logThenErrorf("invalid query: locker identical to recipient")
    }
    assetAgreementBytes, err := proto.Marshal(assetAgreement)
    if err != nil {
        return false, logThenErrorf(err.Error())
    }
    assetAgreementBytes64 := base64.StdEncoding.EncodeToString(assetAgreementBytes)
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("IsAssetLocked"), []byte(assetAgreementBytes64)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, errors.New(string(iccResp.GetMessage()))
    }
    isLocked := (string(iccResp.Payload) == fmt.Sprintf("%t", true))
    if isLocked {
        fmt.Printf("Asset %s of type %s locked by %s for %s\n", assetAgreement.Id, assetAgreement.AssetType, assetAgreement.Locker, assetAgreement.Recipient)
    } else {
        fmt.Printf("Asset %s of type %s not locked by %s for %s\n", assetAgreement.Id, assetAgreement.AssetType, assetAgreement.Locker, assetAgreement.Recipient)
    }
    return isLocked, nil
}

func (am *AssetManagement) IsFungibleAssetLocked(stub shim.ChaincodeStubInterface, contractId string) (bool, error) {
    _, err := am.validateInteropccContractId(contractId)
    if err != nil {
	return false, err
    }

    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("IsFungibleAssetLocked"), []byte(contractId)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, errors.New(string(iccResp.GetMessage()))
    }
    isLocked := (string(iccResp.Payload) == fmt.Sprintf("%t", true))
    if isLocked {
        fmt.Printf("contractId %s is associated with a locked fungible asset\n", contractId)
    } else {
        fmt.Printf("contractId %s is not associated with a locked fungible asset\n", contractId)
    }
    return isLocked, nil
}

func (am *AssetManagement) IsAssetLockedQueryUsingContractId(stub shim.ChaincodeStubInterface, contractId string) (bool, error) {
    _, err := am.validateInteropccContractId(contractId)
    if err != nil {
	return false, err
    }

    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("IsAssetLockedQueryUsingContractId"), []byte(contractId)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, logThenErrorf(string(iccResp.GetMessage()))
    }
    isLocked := (string(iccResp.Payload) == fmt.Sprintf("%t", true))
    if isLocked {
        fmt.Printf("contractId %s is associated with a locked asset\n", contractId)
    } else {
        fmt.Printf("contractId %s is not associated with a locked asset\n", contractId)
    }
    return isLocked, nil
}

func (am *AssetManagement) ClaimAsset(stub shim.ChaincodeStubInterface, assetAgreement *common.AssetExchangeAgreement, claimInfo *common.AssetClaim) (bool, error) {
    _, err := am.validateInteropccAssetTypeAssetId(assetAgreement)
    if err != nil {
	return false, err
    }
    if len(assetAgreement.Locker) == 0 {
        return false, logThenErrorf("empty locker")
    }

    assetAgreementBytes, err := proto.Marshal(assetAgreement)
    if err != nil {
        return false, logThenErrorf(err.Error())
    }

    err = am.validateClaimInfo(claimInfo)
    if err != nil {
	return false, err
    }

    claimInfoBytes, err := proto.Marshal(claimInfo)
    if err != nil {
        return false, logThenErrorf(err.Error())
    }
    assetAgreementBytes64 := base64.StdEncoding.EncodeToString(assetAgreementBytes)
    claimInfoBytes64 := base64.StdEncoding.EncodeToString(claimInfoBytes)
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("ClaimAsset"), []byte(assetAgreementBytes64), []byte(claimInfoBytes64)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, logThenErrorf(string(iccResp.GetMessage()))
    }
    fmt.Printf("Claimed asset %s of type %s locked by %s\n", assetAgreement.Id, assetAgreement.AssetType, assetAgreement.Locker)
    return true, nil
}

func (am *AssetManagement) ClaimFungibleAsset(stub shim.ChaincodeStubInterface, contractId string, claimInfo *common.AssetClaim) (bool, error) {
    _, err := am.validateInteropccContractId(contractId)
    if err != nil {
	return false, err
    }

    err = am.validateClaimInfo(claimInfo)
    if err != nil {
	return false, err
    }

    claimInfoBytes, err := proto.Marshal(claimInfo)
    if err != nil {
        return false, logThenErrorf(err.Error())
    }
    claimInfoBytes64 := base64.StdEncoding.EncodeToString(claimInfoBytes)
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("ClaimFungibleAsset"), []byte(contractId), []byte(claimInfoBytes64)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, logThenErrorf(string(iccResp.GetMessage()))
    }
    fmt.Printf("Fungible asset locked using contractId %s is claimed\n", contractId)
    return true, nil
}

func (am *AssetManagement) ClaimAssetUsingContractId(stub shim.ChaincodeStubInterface, contractId string, claimInfo *common.AssetClaim) (bool, error) {
    _, err := am.validateInteropccContractId(contractId)
    if err != nil {
	return false, err
    }

    err = am.validateClaimInfo(claimInfo)
    if err != nil {
	return false, err
    }

    claimInfoBytes, err := proto.Marshal(claimInfo)
    if err != nil {
        return false, logThenErrorf(err.Error())
    }
    claimInfoBytes64 := base64.StdEncoding.EncodeToString(claimInfoBytes)
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("ClaimAssetUsingContractId"), []byte(contractId), []byte(claimInfoBytes64)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, logThenErrorf(string(iccResp.GetMessage()))
    }
    fmt.Printf("asset locked using contractId %s is claimed\n", contractId)
    return true, nil
}

func (am *AssetManagement) UnlockAsset(stub shim.ChaincodeStubInterface, assetAgreement *common.AssetExchangeAgreement) (bool, error) {
    _, err := am.validateInteropccAssetTypeAssetId(assetAgreement)
    if err != nil {
	return false, err
    }
    if len(assetAgreement.Recipient) == 0 {
        return false, logThenErrorf("empty lock recipient")
    }

    assetAgreementBytes, err := proto.Marshal(assetAgreement)
    if err != nil {
        return false, logThenErrorf(err.Error())
    }
    assetAgreementBytes64 := base64.StdEncoding.EncodeToString(assetAgreementBytes)
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("UnlockAsset"), []byte(assetAgreementBytes64)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, logThenErrorf(string(iccResp.GetMessage()))
    }
    fmt.Printf("Asset %s of type %s unlocked\n", assetAgreement.Id, assetAgreement.AssetType)
    return true, nil
}

func (am *AssetManagement) UnlockFungibleAsset(stub shim.ChaincodeStubInterface, contractId string) (bool, error) {
    _, err := am.validateInteropccContractId(contractId)
    if err != nil {
	return false, err
    }

    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("UnlockFungibleAsset"), []byte(contractId)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, logThenErrorf(string(iccResp.GetMessage()))
    }
    fmt.Printf("Fungible asset locked using contractId %s is unlocked\n", contractId)
    return true, nil
}

func (am *AssetManagement) UnlockAssetUsingContractId(stub shim.ChaincodeStubInterface, contractId string) (bool, error) {
    _, err := am.validateInteropccContractId(contractId)
    if err != nil {
	return false, err
    }

    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("UnlockAssetUsingContractId"), []byte(contractId)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, logThenErrorf(string(iccResp.GetMessage()))
    }
    fmt.Printf("asset locked using contractId %s is unlocked\n", contractId)
    return true, nil
}


// Ledger query functions

func (am *AssetManagement) GetTotalFungibleLockedAssets(stub shim.ChaincodeStubInterface, assetType string) (uint64, error) {
    if len(am.interopChaincodeId) == 0 {
        return 0, logThenErrorf("interoperation chaincode ID not set. Run the 'Configure(...)' function first.")
    }

    if len(assetType) == 0 {
        return 0, logThenErrorf("empty asset type")
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("GetTotalFungibleLockedAssets"), []byte(assetType)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return 0, logThenErrorf(string(iccResp.GetMessage()))
    }
    numUnits, err := strconv.ParseInt(string(iccResp.Payload), 10, 64)
    if err != nil {
        return 0, logThenErrorf(err.Error())
    }
    if numUnits < 0 {
        return 0, logThenErrorf("number of asset units must be a positive integer; found " + string(iccResp.Payload) + " instead")
    }
    fmt.Printf("%d units of asset type %s are locked\n", numUnits, assetType)
    return uint64(numUnits), nil
}

// 'lockRecipient': if blank, assume caller
// 'locker': if blank, assume caller
func (am *AssetManagement) GetAllLockedAssetsFunc(stub shim.ChaincodeStubInterface, funcName string, lockRecipient string, locker string) ([]string, error) {
    var assets []string

    if len(am.interopChaincodeId) == 0 {
        return []string{}, logThenErrorf("interoperation chaincode ID not set. Run the 'Configure(...)' function first.")
    }

    myselfBytes, err := stub.GetCreator()
    if err != nil {
        return []string{}, logThenErrorf(err.Error())
    }
    myself := string(myselfBytes)
    if len(lockRecipient) == 0 {
        log.Info("empty lock recipient; assuming caller")
        lockRecipient = myself
    }
    if len(locker) == 0 {
        log.Info("empty locker; assuming caller")
        locker = myself
    }
    if lockRecipient == locker {
        return []string{}, logThenErrorf("invalid query: locker identical to recipient")
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte(funcName), []byte(lockRecipient), []byte(locker)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return []string{}, errors.New(string(iccResp.GetMessage()))
    }
    err = json.Unmarshal(iccResp.Payload, &assets)
    if err != nil {
        return []string{}, logThenErrorf(err.Error())
    }
    fmt.Printf("Obtained info for %d assets locked by %s for %s\n", len(assets), locker, lockRecipient)
    return assets, nil
}

func (am *AssetManagement) GetAllLockedAssets(stub shim.ChaincodeStubInterface, lockRecipient string, locker string) ([]string, error) {
    return am.GetAllLockedAssetsFunc(stub, "GetAllLockedAssets", lockRecipient, locker)
}

func (am *AssetManagement) GetAllNonFungibleLockedAssets(stub shim.ChaincodeStubInterface, lockRecipient string, locker string) ([]string, error) {
    return am.GetAllLockedAssetsFunc(stub, "GetAllNonFungibleLockedAssets", lockRecipient, locker)
}

func (am *AssetManagement) GetAllFungibleLockedAssets(stub shim.ChaincodeStubInterface, lockRecipient string, locker string) ([]string, error) {
    return am.GetAllLockedAssetsFunc(stub, "GetAllFungibleLockedAssets", lockRecipient, locker)
}

// 'lockRecipient': if blank, assume caller
// 'locker': if blank, assume caller
func (am *AssetManagement) GetAssetTimeToRelease(stub shim.ChaincodeStubInterface, assetAgreement *common.AssetExchangeAgreement) (uint64, error) {
    if len(am.interopChaincodeId) == 0 {
        return 0, logThenErrorf("interoperation chaincode ID not set. Run the 'Configure(...)' function first.")
    }

    if len(assetAgreement.AssetType) == 0 {
        return 0, logThenErrorf("empty asset type")
    }
    if len(assetAgreement.Id) == 0 {
        return 0, logThenErrorf("empty asset ID")
    }
    myselfBytes, err := stub.GetCreator()
    if err != nil {
        return 0, logThenErrorf(err.Error())
    }
    myself := string(myselfBytes)
    if len(assetAgreement.Recipient) == 0 {
        log.Info("empty lock recipient; assuming caller")
        assetAgreement.Recipient = myself
    }
    if len(assetAgreement.Locker) == 0 {
        log.Info("empty locker; assuming caller")
        assetAgreement.Locker = myself
    }
    if assetAgreement.Recipient == assetAgreement.Locker {
        return 0, logThenErrorf("invalid query: locker identical to recipient")
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("GetAssetTimeToRelease"), []byte(assetAgreement.AssetType), []byte(assetAgreement.Id), []byte(assetAgreement.Recipient), []byte(assetAgreement.Locker)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return 0, errors.New(string(iccResp.GetMessage()))
    }
    timeToReleaseSecs, err := strconv.ParseInt(string(iccResp.Payload), 10, 64)
    if err != nil {
        return 0, logThenErrorf(err.Error())
    }
    if timeToReleaseSecs < 0 {
        return 0, logThenErrorf("asset time to release must be a positive integer; found " + string(iccResp.Payload) + " instead")
    }
    fmt.Printf("Asset %s of type %s locked until %+v\n", assetAgreement.Id, assetAgreement.AssetType, time.Unix(timeToReleaseSecs, 0))
    return uint64(timeToReleaseSecs), nil
}

// 'lockRecipient': if blank, assume caller
// 'locker': if blank, assume caller
func (am *AssetManagement) GetFungibleAssetTimeToRelease(stub shim.ChaincodeStubInterface, assetAgreement *common.FungibleAssetExchangeAgreement) (uint64, error) {
    if len(am.interopChaincodeId) == 0 {
        return 0, logThenErrorf("interoperation chaincode ID not set. Run the 'Configure(...)' function first.")
    }

    if len(assetAgreement.AssetType) == 0 {
        return 0, logThenErrorf("empty asset type")
    }
    if assetAgreement.NumUnits <= 0 {
        return 0, logThenErrorf("invalid number of asset units")
    }
    myselfBytes, err := stub.GetCreator()
    if err != nil {
        return 0, logThenErrorf(err.Error())
    }
    myself := string(myselfBytes)
    if len(assetAgreement.Recipient) == 0 {
        log.Info("empty lock recipient; assuming caller")
        assetAgreement.Recipient = myself
    }
    if len(assetAgreement.Locker) == 0 {
        log.Info("empty locker; assuming caller")
        assetAgreement.Locker = myself
    }
    if assetAgreement.Recipient == assetAgreement.Locker {
        return 0, logThenErrorf("invalid query: locker identical to recipient")
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("GetFungibleAssetTimeToRelease"), []byte(assetAgreement.AssetType), []byte(strconv.FormatInt(int64(assetAgreement.NumUnits), 10)), []byte(assetAgreement.Recipient), []byte(assetAgreement.Locker)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return 0, logThenErrorf(string(iccResp.GetMessage()))
    }
    timeToReleaseSecs, err := strconv.ParseInt(string(iccResp.Payload), 10, 64)
    if err != nil {
        return 0, logThenErrorf(err.Error())
    }
    if timeToReleaseSecs < 0 {
        return 0, logThenErrorf("asset time to release must be a positive integer; found " + string(iccResp.Payload) + " instead")
    }
    fmt.Printf("%d units of asset type %s locked until %+v\n", assetAgreement.NumUnits, assetAgreement.AssetType, time.Unix(timeToReleaseSecs, 0))
    return uint64(timeToReleaseSecs), nil
}

// Assumption is that the caller is either the recipient or the locker in each element in the list, but we will let the interop CC take care of it
func (am *AssetManagement) GetAllAssetsLockedUntil(stub shim.ChaincodeStubInterface, lockExpiryTimeSecs uint64) ([]string, error) {
    var assets []string

    if len(am.interopChaincodeId) == 0 {
        return []string{}, logThenErrorf("interoperation chaincode ID not set. Run the 'Configure(...)' function first.")
    }

    if lockExpiryTimeSecs <= 0 {
        return []string{}, logThenErrorf("invalid expiry time")
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("GetAllAssetsLockedUntil"), []byte(strconv.FormatInt(int64(lockExpiryTimeSecs), 10))}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return []string{}, logThenErrorf(string(iccResp.GetMessage()))
    }
    err := json.Unmarshal(iccResp.Payload, &assets)
    if err != nil {
        return []string{}, logThenErrorf(err.Error())
    }
    fmt.Printf("Obtained info for %d assets locked until %+v\n", len(assets), time.Unix(int64(lockExpiryTimeSecs), 0))
    return assets, nil
}
