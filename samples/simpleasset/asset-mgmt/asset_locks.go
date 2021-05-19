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
    "crypto/sha256"
    "encoding/base64"
    "encoding/json"

    "github.com/golang/protobuf/proto"
    "github.com/hyperledger/fabric-chaincode-go/shim"
    log "github.com/sirupsen/logrus"
    "github.com/hyperledger-labs/weaver/samples/simpleasset/asset-mgmt/protos-go/common"
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

// function to generate a "SHA256" hash in base64 format for a given preimage
func generateSHA256HashInBase64Form(preimage string) string {
	hasher := sha256.New()
	hasher.Write([]byte(preimage))
	shaHash := hasher.Sum(nil)
	shaHashBase64 := base64.StdEncoding.EncodeToString(shaHash)
	return shaHashBase64
}

// Ledger transaction (invocation) functions

func (am *AssetManagement) LockAsset(stub shim.ChaincodeStubInterface, assetAgreement *common.AssetExchangeAgreement, lockInfo *common.AssetLock) (bool, error) {
    var errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "interoperation chaincode ID not set. Run the 'Configure(...)' function first."
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }

    if len(assetAgreement.Type) == 0 {
        errorMsg = "empty asset type"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(assetAgreement.Id) == 0 {
        errorMsg = "empty asset ID"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(assetAgreement.Recipient) == 0 {
        errorMsg = "empty lock recipient"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }

    if (lockInfo.LockMechanism != common.LockMechanism_HTLC) {
        errorMsg = fmt.Sprintf("unsupported lock mechanism: %+v", lockInfo.LockMechanism)
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    lockInfoHTLC := &common.AssetLockHTLC{}
    if len(lockInfo.LockInfo) == 0 {
        errorMsg = "empty lock info"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    err := proto.Unmarshal(lockInfo.LockInfo, lockInfoHTLC)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    if lockInfoHTLC.TimeSpec != common.AssetLockHTLC_EPOCH {
        errorMsg = "only EPOCH time is supported at present"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(lockInfoHTLC.HashBase64) == 0 {
        errorMsg = "empty lock hash value"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    assetAgreementBytes, err := proto.Marshal(assetAgreement)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    lockInfoBytes, err := proto.Marshal(lockInfoHTLC)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("LockAsset"), assetAgreementBytes, lockInfoBytes}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, errors.New(string(iccResp.GetPayload()))
    }
    fmt.Printf("Asset %s of type %s locked for %s until %+v\n", assetAgreement.Id, assetAgreement.Type, assetAgreement.Recipient, time.Unix(int64(lockInfoHTLC.ExpiryTimeSecs), 0))
    return true, nil
}

func (am *AssetManagement) LockFungibleAsset(stub shim.ChaincodeStubInterface, assetAgreement *common.FungibleAssetExchangeAgreement, lockInfo *common.AssetLock) (string, error) {
    var errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "interoperation chaincode ID not set. Run the 'Configure(...)' function first."
        log.Error(errorMsg)
        return "", errors.New(errorMsg)
    }

    if len(assetAgreement.Type) == 0 {
        errorMsg = "empty asset type"
        log.Error(errorMsg)
        return "", errors.New(errorMsg)
    }
    if assetAgreement.NumUnits <= 0 {
        errorMsg = "invalid number of asset units"
        log.Error(errorMsg)
        return "", errors.New(errorMsg)
    }
    if len(assetAgreement.Recipient) == 0 {
        errorMsg = "empty lock recipient"
        log.Error(errorMsg)
        return "", errors.New(errorMsg)
    }

    if (lockInfo.LockMechanism != common.LockMechanism_HTLC) {
        errorMsg = fmt.Sprintf("unsupported lock mechanism: %+v", lockInfo.LockMechanism)
        log.Error(errorMsg)
        return "", errors.New(errorMsg)
    }
    lockInfoHTLC := &common.AssetLockHTLC{}
    if len(lockInfo.LockInfo) == 0 {
        errorMsg = "empty lock info"
        log.Error(errorMsg)
        return "", errors.New(errorMsg)
    }
    err := proto.Unmarshal(lockInfo.LockInfo, lockInfoHTLC)
    if err != nil {
        log.Error(err.Error())
        return "", err
    }
    if lockInfoHTLC.TimeSpec != common.AssetLockHTLC_EPOCH {
        errorMsg = "only EPOCH time is supported at present"
        log.Error(errorMsg)
        return "", errors.New(errorMsg)
    }
    if len(lockInfoHTLC.HashBase64) == 0 {
        errorMsg = "empty lock hash value"
        log.Error(errorMsg)
        return "", errors.New(errorMsg)
    }
    assetAgreementBytes, err := proto.Marshal(assetAgreement)
    if err != nil {
        log.Error(err.Error())
        return "", err
    }
    lockInfoBytes, err := proto.Marshal(lockInfoHTLC)
    if err != nil {
        log.Error(err.Error())
        return "", err
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("LockFungibleAsset"), assetAgreementBytes, lockInfoBytes}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return "", errors.New(string(iccResp.GetPayload()))
    }
    contractId := string(iccResp.GetPayload())
    fmt.Printf("%d units of asset type %s locked for %s until %+v using contractId %s\n", assetAgreement.NumUnits, assetAgreement.Type, assetAgreement.Recipient, time.Unix(int64(lockInfoHTLC.ExpiryTimeSecs), 0), contractId)
    return contractId, nil
}

// If 'assetAgreement.Locker' or 'assetAgreement.Recipient' is blank, assume it's the caller
func (am *AssetManagement) IsAssetLocked(stub shim.ChaincodeStubInterface, assetAgreement *common.AssetExchangeAgreement) (bool, error) {
    var infoMsg, errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "interoperation chaincode ID not set. Run the 'Configure(...)' function first."
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }

    if len(assetAgreement.Type) == 0 {
        errorMsg = "empty asset type"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(assetAgreement.Id) == 0 {
        errorMsg = "empty asset ID"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    myselfBytes, err := stub.GetCreator()
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    myself := string(myselfBytes)
    if len(assetAgreement.Recipient) == 0 {
        infoMsg = "empty lock recipient; assuming caller"
        log.Info(infoMsg)
        assetAgreement.Recipient = myself
    }
    if len(assetAgreement.Locker) == 0 {
        infoMsg = "empty locker; assuming caller"
        log.Info(infoMsg)
        assetAgreement.Locker = myself
    }
    if assetAgreement.Recipient == assetAgreement.Locker {
        errorMsg = "invalid query: locker identical to recipient"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    assetAgreementBytes, err := proto.Marshal(assetAgreement)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("IsAssetLocked"), assetAgreementBytes}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, errors.New(string(iccResp.GetPayload()))
    }
    isLocked := (string(iccResp.Payload) == fmt.Sprintf("%t", true))
    if isLocked {
        fmt.Printf("Asset %s of type %s locked by %s for %s\n", assetAgreement.Id, assetAgreement.Type, assetAgreement.Locker, assetAgreement.Recipient)
    } else {
        fmt.Printf("Asset %s of type %s not locked by %s for %s\n", assetAgreement.Id, assetAgreement.Type, assetAgreement.Locker, assetAgreement.Recipient)
    }
    return isLocked, nil
}

// If 'assetAgreement.Locker' or 'assetAgreement.Recipient' is blank, assume it's the caller
func (am *AssetManagement) IsFungibleAssetLocked(stub shim.ChaincodeStubInterface, contractId string) (bool, error) {
    var errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "interoperation chaincode ID not set. Run the 'Configure(...)' function first."
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }

    if len(contractId) == 0 {
        errorMsg = "contractId cannot be empty"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }

    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("IsFungibleAssetLocked"), []byte(contractId)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, errors.New(string(iccResp.GetPayload()))
    }
    isLocked := (string(iccResp.Payload) == fmt.Sprintf("%t", true))
    if isLocked {
        fmt.Printf("contractId %s is associated with a locked fungible asset\n", contractId)
    } else {
        fmt.Printf("contractId %s is not associated with a locked fungible asset\n", contractId)
    }
    return isLocked, nil
}

func (am *AssetManagement) ClaimAsset(stub shim.ChaincodeStubInterface, assetAgreement *common.AssetExchangeAgreement, claimInfo *common.AssetClaim) (bool, error) {
    var errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "interoperation chaincode ID not set. Run the 'Configure(...)' function first."
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }

    if len(assetAgreement.Type) == 0 {
        errorMsg = "empty asset type"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(assetAgreement.Id) == 0 {
        errorMsg = "empty asset ID"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(assetAgreement.Locker) == 0 {
        errorMsg = "empty locker"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }

    if (claimInfo.LockMechanism != common.LockMechanism_HTLC) {
        errorMsg = fmt.Sprintf("unsupported lock mechanism: %+v", claimInfo.LockMechanism)
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    claimInfoHTLC := &common.AssetClaimHTLC{}
    if len(claimInfo.ClaimInfo) == 0 {
        errorMsg = "empty claim info"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    err := proto.Unmarshal(claimInfo.ClaimInfo, claimInfoHTLC)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    if len(claimInfoHTLC.HashPreimageBase64) == 0 {
        errorMsg = "empty lock hash preimage"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    assetAgreementBytes, err := proto.Marshal(assetAgreement)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    claimInfoBytes, err := proto.Marshal(claimInfoHTLC)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("ClaimAsset"), assetAgreementBytes, claimInfoBytes}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, errors.New(string(iccResp.GetPayload()))
    }
    fmt.Printf("Claimed asset %s of type %s locked by %s\n", assetAgreement.Id, assetAgreement.Type, assetAgreement.Locker)
    return true, nil
}

func (am *AssetManagement) ClaimFungibleAsset(stub shim.ChaincodeStubInterface, contractId string, claimInfo *common.AssetClaim) (bool, error) {
    var errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "interoperation chaincode ID not set. Run the 'Configure(...)' function first."
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }

    if len(contractId) == 0 {
        errorMsg = "contractId cannot be empty"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }

    if (claimInfo.LockMechanism != common.LockMechanism_HTLC) {
        errorMsg = fmt.Sprintf("unsupported lock mechanism: %+v", claimInfo.LockMechanism)
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    claimInfoHTLC := &common.AssetClaimHTLC{}
    if len(claimInfo.ClaimInfo) == 0 {
        errorMsg = "empty claim info"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    err := proto.Unmarshal(claimInfo.ClaimInfo, claimInfoHTLC)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    if len(claimInfoHTLC.HashPreimageBase64) == 0 {
        errorMsg = "empty lock hash preimage"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    claimInfoBytes, err := proto.Marshal(claimInfoHTLC)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("ClaimFungibleAsset"), []byte(contractId), claimInfoBytes}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, errors.New(string(iccResp.GetPayload()))
    }
    fmt.Printf("Fungible asset locked using contractId %s is claimed\n", contractId)
    return true, nil
}

func (am *AssetManagement) UnlockAsset(stub shim.ChaincodeStubInterface, assetAgreement *common.AssetExchangeAgreement) (bool, error) {
    var errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "interoperation chaincode ID not set. Run the 'Configure(...)' function first."
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }

    if len(assetAgreement.Type) == 0 {
        errorMsg = "empty asset type"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(assetAgreement.Id) == 0 {
        errorMsg = "empty asset ID"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(assetAgreement.Recipient) == 0 {
        errorMsg = "empty lock recipient"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    assetAgreementBytes, err := proto.Marshal(assetAgreement)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("UnlockAsset"), assetAgreementBytes}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, errors.New(string(iccResp.GetPayload()))
    }
    fmt.Printf("Asset %s of type %s unlocked\n", assetAgreement.Id, assetAgreement.Type)
    return true, nil
}

func (am *AssetManagement) UnlockFungibleAsset(stub shim.ChaincodeStubInterface, contractId string) (bool, error) {
    var errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "interoperation chaincode ID not set. Run the 'Configure(...)' function first."
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }

    if len(contractId) == 0 {
        errorMsg = "contractId cannot be empty"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }

    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("UnlockFungibleAsset"), []byte(contractId)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, errors.New(string(iccResp.GetPayload()))
    }
    fmt.Printf("Fungible asset locked using contractId %s is unlocked\n", contractId)
    return true, nil
}


// Ledger query functions

func (am *AssetManagement) GetTotalFungibleLockedAssets(stub shim.ChaincodeStubInterface, assetType string) (uint64, error) {
    var errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "interoperation chaincode ID not set. Run the 'Configure(...)' function first."
        log.Error(errorMsg)
        return 0, errors.New(errorMsg)
    }

    if len(assetType) == 0 {
        errorMsg = "empty asset type"
        log.Error(errorMsg)
        return 0, errors.New(errorMsg)
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("GetTotalFungibleLockedAssets"), []byte(assetType)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return 0, errors.New(string(iccResp.GetPayload()))
    }
    numUnits, err := strconv.ParseInt(string(iccResp.Payload), 10, 64)
    if err != nil {
        log.Error(err.Error())
        return 0, err
    }
    if numUnits < 0 {
        errorMsg = "number of asset units must be a positive integer; found " + string(iccResp.Payload) + " instead"
        log.Error(errorMsg)
        return 0, errors.New(errorMsg)
    }
    fmt.Printf("%d units of asset type %s are locked\n", numUnits, assetType)
    return uint64(numUnits), nil
}

// 'lockRecipient': if blank, assume caller
// 'locker': if blank, assume caller
func (am *AssetManagement) GetAllLockedAssetsFunc(stub shim.ChaincodeStubInterface, funcName string, lockRecipient string, locker string) ([]string, error) {
    var infoMsg, errorMsg string
    var assets []string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "interoperation chaincode ID not set. Run the 'Configure(...)' function first."
        log.Error(errorMsg)
        return []string{}, errors.New(errorMsg)
    }

    myselfBytes, err := stub.GetCreator()
    if err != nil {
        log.Error(err.Error())
        return []string{}, err
    }
    myself := string(myselfBytes)
    if len(lockRecipient) == 0 {
        infoMsg = "empty lock recipient; assuming caller"
        log.Info(infoMsg)
        lockRecipient = myself
    }
    if len(locker) == 0 {
        infoMsg = "empty locker; assuming caller"
        log.Info(infoMsg)
        locker = myself
    }
    if lockRecipient == locker {
        errorMsg = "invalid query: locker identical to recipient"
        log.Error(errorMsg)
        return []string{}, errors.New(errorMsg)
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte(funcName), []byte(lockRecipient), []byte(locker)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return []string{}, errors.New(string(iccResp.GetPayload()))
    }
    err = json.Unmarshal(iccResp.Payload, &assets)
    if err != nil {
        log.Error(err.Error())
        return []string{}, err
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
    var infoMsg, errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "interoperation chaincode ID not set. Run the 'Configure(...)' function first."
        log.Error(errorMsg)
        return 0, errors.New(errorMsg)
    }

    if len(assetAgreement.Type) == 0 {
        errorMsg = "empty asset type"
        log.Error(errorMsg)
        return 0, errors.New(errorMsg)
    }
    if len(assetAgreement.Id) == 0 {
        errorMsg = "empty asset ID"
        log.Error(errorMsg)
        return 0, errors.New(errorMsg)
    }
    myselfBytes, err := stub.GetCreator()
    if err != nil {
        log.Error(err.Error())
        return 0, err
    }
    myself := string(myselfBytes)
    if len(assetAgreement.Recipient) == 0 {
        infoMsg = "empty lock recipient; assuming caller"
        log.Info(infoMsg)
        assetAgreement.Recipient = myself
    }
    if len(assetAgreement.Locker) == 0 {
        infoMsg = "empty locker; assuming caller"
        log.Info(infoMsg)
        assetAgreement.Locker = myself
    }
    if assetAgreement.Recipient == assetAgreement.Locker {
        errorMsg = "invalid query: locker identical to recipient"
        log.Error(errorMsg)
        return 0, errors.New(errorMsg)
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("GetAssetTimeToRelease"), []byte(assetAgreement.Type), []byte(assetAgreement.Id), []byte(assetAgreement.Recipient), []byte(assetAgreement.Locker)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return 0, errors.New(string(iccResp.GetPayload()))
    }
    timeToReleaseSecs, err := strconv.ParseInt(string(iccResp.Payload), 10, 64)
    if err != nil {
        log.Error(err.Error())
        return 0, err
    }
    if timeToReleaseSecs < 0 {
        errorMsg = "asset time to release must be a positive integer; found " + string(iccResp.Payload) + " instead"
        log.Error(errorMsg)
        return 0, errors.New(errorMsg)
    }
    fmt.Printf("Asset %s of type %s locked until %+v\n", assetAgreement.Id, assetAgreement.Type, time.Unix(timeToReleaseSecs, 0))
    return uint64(timeToReleaseSecs), nil
}

// 'lockRecipient': if blank, assume caller
// 'locker': if blank, assume caller
func (am *AssetManagement) GetFungibleAssetTimeToRelease(stub shim.ChaincodeStubInterface, assetAgreement *common.FungibleAssetExchangeAgreement) (uint64, error) {
    var infoMsg, errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "interoperation chaincode ID not set. Run the 'Configure(...)' function first."
        log.Error(errorMsg)
        return 0, errors.New(errorMsg)
    }

    if len(assetAgreement.Type) == 0 {
        errorMsg = "empty asset type"
        log.Error(errorMsg)
        return 0, errors.New(errorMsg)
    }
    if assetAgreement.NumUnits <= 0 {
        errorMsg = "invalid number of asset units"
        log.Error(errorMsg)
        return 0, errors.New(errorMsg)
    }
    myselfBytes, err := stub.GetCreator()
    if err != nil {
        log.Error(err.Error())
        return 0, err
    }
    myself := string(myselfBytes)
    if len(assetAgreement.Recipient) == 0 {
        infoMsg = "empty lock recipient; assuming caller"
        log.Info(infoMsg)
        assetAgreement.Recipient = myself
    }
    if len(assetAgreement.Locker) == 0 {
        infoMsg = "empty locker; assuming caller"
        log.Info(infoMsg)
        assetAgreement.Locker = myself
    }
    if assetAgreement.Recipient == assetAgreement.Locker {
        errorMsg = "invalid query: locker identical to recipient"
        log.Error(errorMsg)
        return 0, errors.New(errorMsg)
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("GetFungibleAssetTimeToRelease"), []byte(assetAgreement.Type), []byte(strconv.FormatInt(int64(assetAgreement.NumUnits), 10)), []byte(assetAgreement.Recipient), []byte(assetAgreement.Locker)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return 0, errors.New(string(iccResp.GetPayload()))
    }
    timeToReleaseSecs, err := strconv.ParseInt(string(iccResp.Payload), 10, 64)
    if err != nil {
        log.Error(err.Error())
        return 0, err
    }
    if timeToReleaseSecs < 0 {
        errorMsg = "asset time to release must be a positive integer; found " + string(iccResp.Payload) + " instead"
        log.Error(errorMsg)
        return 0, errors.New(errorMsg)
    }
    fmt.Printf("%d units of asset type %s locked until %+v\n", assetAgreement.NumUnits, assetAgreement.Type, time.Unix(timeToReleaseSecs, 0))
    return uint64(timeToReleaseSecs), nil
}

// Assumption is that the caller is either the recipient or the locker in each element in the list, but we will let the interop CC take care of it
func (am *AssetManagement) GetAllAssetsLockedUntil(stub shim.ChaincodeStubInterface, lockExpiryTimeSecs uint64) ([]string, error) {
    var errorMsg string
    var assets []string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "interoperation chaincode ID not set. Run the 'Configure(...)' function first."
        log.Error(errorMsg)
        return []string{}, errors.New(errorMsg)
    }

    if lockExpiryTimeSecs <= 0 {
        errorMsg = "invalid expiry time"
        log.Error(errorMsg)
        return []string{}, errors.New(errorMsg)
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("GetAllAssetsLockedUntil"), []byte(strconv.FormatInt(int64(lockExpiryTimeSecs), 10))}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return []string{}, errors.New(string(iccResp.GetPayload()))
    }
    err := json.Unmarshal(iccResp.Payload, &assets)
    if err != nil {
        log.Error(err.Error())
        return []string{}, err
    }
    fmt.Printf("Obtained info for %d assets locked until %+v\n", len(assets), time.Unix(int64(lockExpiryTimeSecs), 0))
    return assets, nil
}
