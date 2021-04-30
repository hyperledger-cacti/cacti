/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package main

import (
    "fmt"
    "errors"
    "time"
    "strconv"
    "encoding/json"

    "github.com/golang/protobuf/proto"
    "github.com/hyperledger/fabric-chaincode-go/shim"
    log "github.com/sirupsen/logrus"
    "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/interfaces/asset-mgmt/protos-go/common"
)


const(
    defaultTimeLockMillis = 5 * 60 * 1000      // 5 minutes
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


// Ledger transaction (invocation) functions

func (am *AssetManagement) AddFungibleAssetCount(stub shim.ChaincodeStubInterface, assetType string, numUnits int) (bool, error) {
    var errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "Interoperation chaincode ID not set. Run the 'Configure(...) function first."
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }

    if len(assetType) == 0 {
        errorMsg = "Empty asset type"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if numUnits <= 0 {
        errorMsg = "Invalid number of asset units"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("AddFungibleAssetCount"), []byte(assetType), []byte(strconv.Itoa(numUnits))}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, fmt.Errorf(string(iccResp.GetPayload()))
    }
    fmt.Printf("%d units of asset type %s added to the record\n", numUnits, assetType)
    return true, nil
}

func (am *AssetManagement) LockAsset(stub shim.ChaincodeStubInterface, assetAgreement *common.AssetAgreement, lockInfo *common.AssetLock) (bool, error) {
    var errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "Interoperation chaincode ID not set. Run the 'Configure(...) function first."
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }

    if (lockInfo.LockMechanism != common.LockMechanism_HTLC) {
        log.Errorf("Unsupported lock mechanism: %+v", lockInfo.LockMechanism)
        return false, fmt.Errorf("Unsupported lock mechanism: %+v", lockInfo.LockMechanism)
    }
    lockInfoHTLC := &common.AssetLockHTLC{}
    if len(lockInfo.LockInfo) == 0 {
        log.Error("Empty lock info")
        return false, fmt.Errorf("Empty lock info")
    }
    err := proto.Unmarshal(lockInfo.LockInfo, lockInfoHTLC)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    if lockInfoHTLC.TimeSpec != common.AssetLockHTLC_EPOCH {
        log.Error("Only EPOCH time is supported at present")
        return false, fmt.Errorf("Only EPOCH time is supported at present")
    }

    if len(assetAgreement.Type) == 0 {
        errorMsg = "Empty asset type"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(assetAgreement.Id) == 0 {
        errorMsg = "Empty asset ID"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(assetAgreement.Recipient) == 0 {
        errorMsg = "Empty lock recipient"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(lockInfoHTLC.Hash) == 0 {
        errorMsg = "Empty lock hash value"
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
        return false, fmt.Errorf(string(iccResp.GetPayload()))
    }
    lockExpiryTimeSec := int64(lockInfoHTLC.ExpiryTimeMillis)/1000
    lockExpiryTimeNano := (int64(lockInfoHTLC.ExpiryTimeMillis) - (lockExpiryTimeSec * 1000)) * (1000 * 1000)     // Convert milliseconds to nanoseconds
    fmt.Printf("Asset %s of type %s locked for %s until %+v\n", assetAgreement.Id, assetAgreement.Type, assetAgreement.Recipient, time.Unix(lockExpiryTimeSec, lockExpiryTimeNano))
    return true, nil
}

func (am *AssetManagement) LockFungibleAsset(stub shim.ChaincodeStubInterface, assetAgreement *common.FungibleAssetAgreement, lockInfo *common.AssetLock) (bool, error) {
    var errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "Interoperation chaincode ID not set. Run the 'Configure(...) function first."
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }

    if (lockInfo.LockMechanism != common.LockMechanism_HTLC) {
        log.Errorf("Unsupported lock mechanism: %+v", lockInfo.LockMechanism)
        return false, fmt.Errorf("Unsupported lock mechanism: %+v", lockInfo.LockMechanism)
    }
    lockInfoHTLC := &common.AssetLockHTLC{}
    if len(lockInfo.LockInfo) == 0 {
        log.Error("Empty lock info")
        return false, fmt.Errorf("Empty lock info")
    }
    err := proto.Unmarshal(lockInfo.LockInfo, lockInfoHTLC)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    if lockInfoHTLC.TimeSpec != common.AssetLockHTLC_EPOCH {
        log.Error("Only EPOCH time is supported at present")
        return false, fmt.Errorf("Only EPOCH time is supported at present")
    }

    if len(assetAgreement.Type) == 0 {
        errorMsg = "Empty asset type"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if assetAgreement.NumUnits <= 0 {
        errorMsg = "Invalid number of asset units"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(assetAgreement.Recipient) == 0 {
        errorMsg = "Empty lock recipient"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(lockInfoHTLC.Hash) == 0 {
        errorMsg = "Empty lock hash value"
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
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("LockFungibleAsset"), assetAgreementBytes, lockInfoBytes}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, fmt.Errorf(string(iccResp.GetPayload()))
    }
    lockExpiryTimeSec := int64(lockInfoHTLC.ExpiryTimeMillis)/1000
    lockExpiryTimeNano := (int64(lockInfoHTLC.ExpiryTimeMillis) - (lockExpiryTimeSec * 1000)) * (1000 * 1000)     // Convert milliseconds to nanoseconds
    fmt.Printf("%d units of asset type %s locked for %s until %+v\n", assetAgreement.NumUnits, assetAgreement.Type, assetAgreement.Recipient, time.Unix(lockExpiryTimeSec, lockExpiryTimeNano))
    return true, nil
}

// If 'assetAgreement.Locker' or 'assetAgreement.Recipient' is blank, assume it's the caller
func (am *AssetManagement) IsAssetLocked(stub shim.ChaincodeStubInterface, assetAgreement *common.AssetAgreement) (bool, error) {
    var infoMsg, errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "Interoperation chaincode ID not set. Run the 'Configure(...) function first."
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }

    if len(assetAgreement.Type) == 0 {
        errorMsg = "Empty asset type"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(assetAgreement.Id) == 0 {
        errorMsg = "Empty asset ID"
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
        infoMsg = "Empty lock recipient; assuming caller"
        log.Info(infoMsg)
        assetAgreement.Recipient = myself
    }
    if len(assetAgreement.Locker) == 0 {
        infoMsg = "Empty locker; assuming caller"
        log.Info(infoMsg)
        assetAgreement.Locker = myself
    }
    if assetAgreement.Recipient == assetAgreement.Locker {
        errorMsg = "Invalid query: locker identical to recipient"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if assetAgreement.Recipient != myself && assetAgreement.Locker != myself {
        errorMsg = "Query not permitted, as caller is neither locker nor recipient"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("IsAssetLocked"), []byte(assetAgreement.Type), []byte(assetAgreement.Id), []byte(assetAgreement.Recipient), []byte(assetAgreement.Locker)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, fmt.Errorf(string(iccResp.GetPayload()))
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
func (am *AssetManagement) IsFungibleAssetLocked(stub shim.ChaincodeStubInterface, assetAgreement *common.FungibleAssetAgreement) (bool, error) {
    var infoMsg, errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "Interoperation chaincode ID not set. Run the 'Configure(...) function first."
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }

    if len(assetAgreement.Type) == 0 {
        errorMsg = "Empty asset type"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if assetAgreement.NumUnits <= 0 {
        errorMsg = "Invalid number of asset units"
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
        infoMsg = "Empty lock recipient; assuming caller"
        log.Info(infoMsg)
        assetAgreement.Recipient = myself
    }
    if len(assetAgreement.Locker) == 0 {
        infoMsg = "Empty locker; assuming caller"
        log.Info(infoMsg)
        assetAgreement.Locker = myself
    }
    if assetAgreement.Recipient == assetAgreement.Locker {
        errorMsg = "Invalid query: locker identical to recipient"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if assetAgreement.Recipient != myself && assetAgreement.Locker != myself {
        errorMsg = "Query not permitted, as caller is neither locker nor recipient"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("IsFungibleAssetLocked"), []byte(assetAgreement.Type), []byte(strconv.Itoa(int(assetAgreement.NumUnits))), []byte(assetAgreement.Recipient), []byte(assetAgreement.Locker)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, fmt.Errorf(string(iccResp.GetPayload()))
    }
    isLocked := (string(iccResp.Payload) == fmt.Sprintf("%t", true))
    if isLocked {
        fmt.Printf("%d units of asset type %s locked by %s for %s\n", assetAgreement.NumUnits, assetAgreement.Type, assetAgreement.Locker, assetAgreement.Recipient)
    } else {
        fmt.Printf("%d units of asset type %s locked by %s for %s\n", assetAgreement.NumUnits, assetAgreement.Type, assetAgreement.Locker, assetAgreement.Recipient)
    }
    return isLocked, nil
}

func (am *AssetManagement) ClaimAsset(stub shim.ChaincodeStubInterface, assetAgreement *common.AssetAgreement, claimInfo *common.AssetClaim) (bool, error) {
    if (claimInfo.LockMechanism == common.LockMechanism_HTLC) {
        claimInfoHTLC := &common.AssetClaimHTLC{}
        if len(claimInfo.ClaimInfo) == 0 {
            log.Error("Empty claim info")
            return false, fmt.Errorf("Empty claim info")
        }
        err := proto.Unmarshal(claimInfo.ClaimInfo, claimInfoHTLC)
        if err != nil {
            log.Error(err.Error())
            return false, err
        }
        return am.ClaimAssetHTLC(stub, assetAgreement.Type, assetAgreement.Id, assetAgreement.Locker, claimInfoHTLC.HashPreimage)
    } else {
        log.Errorf("Unsupported lock mechanism: %+v", claimInfo.LockMechanism)
        return false, fmt.Errorf("Unsupported lock mechanism: %+v", claimInfo.LockMechanism)
    }
}

func (am *AssetManagement) ClaimAssetHTLC(stub shim.ChaincodeStubInterface, assetType string, assetId string, locker string, lockHashPreimage []byte) (bool, error) {
    var errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "Interoperation chaincode ID not set. Run the 'Configure(...) function first."
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }

    if len(assetType) == 0 {
        errorMsg = "Empty asset type"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(assetId) == 0 {
        errorMsg = "Empty asset ID"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(locker) == 0 {
        errorMsg = "Empty locker"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(lockHashPreimage) == 0 {
        errorMsg = "Empty lock hash preimage"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("ClaimAssetHTLC"), []byte(assetType), []byte(assetId), []byte(locker), lockHashPreimage}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, fmt.Errorf(string(iccResp.GetPayload()))
    }
    fmt.Printf("Claimed asset %s of type %s locked by %s\n", assetId, assetType, locker)
    return true, nil
}

func (am *AssetManagement) ClaimFungibleAsset(stub shim.ChaincodeStubInterface, assetAgreement *common.FungibleAssetAgreement, claimInfo *common.AssetClaim) (bool, error) {
    if (claimInfo.LockMechanism == common.LockMechanism_HTLC) {
        claimInfoHTLC := &common.AssetClaimHTLC{}
        if len(claimInfo.ClaimInfo) == 0 {
            log.Error("Empty claim info")
            return false, fmt.Errorf("Empty claim info")
        }
        err := proto.Unmarshal(claimInfo.ClaimInfo, claimInfoHTLC)
        if err != nil {
            log.Error(err.Error())
            return false, err
        }
        return am.ClaimFungibleAssetHTLC(stub, assetAgreement.Type, int(assetAgreement.NumUnits), assetAgreement.Locker, claimInfoHTLC.HashPreimage)
    } else {
        log.Errorf("Unsupported lock mechanism: %+v", claimInfo.LockMechanism)
        return false, fmt.Errorf("Unsupported lock mechanism: %+v", claimInfo.LockMechanism)
    }
}

func (am *AssetManagement) ClaimFungibleAssetHTLC(stub shim.ChaincodeStubInterface, assetType string, numUnits int, locker string, lockHashPreimage []byte) (bool, error) {
    var errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "Interoperation chaincode ID not set. Run the 'Configure(...) function first."
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }

    if len(assetType) == 0 {
        errorMsg = "Empty asset type"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if numUnits <= 0 {
        errorMsg = "Invalid number of asset units"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(locker) == 0 {
        errorMsg = "Empty locker"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(lockHashPreimage) == 0 {
        errorMsg = "Empty lock hash preimage"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("ClaimFungibleAssetHTLC"), []byte(assetType), []byte(strconv.Itoa(numUnits)), []byte(locker), lockHashPreimage}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, fmt.Errorf(string(iccResp.GetPayload()))
    }
    fmt.Printf("Claimed %d units of asset of type %s locked by %s\n", numUnits, assetType, locker)
    return true, nil
}

func (am *AssetManagement) UnlockAsset(stub shim.ChaincodeStubInterface, assetAgreement *common.AssetAgreement) (bool, error) {
    var errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "Interoperation chaincode ID not set. Run the 'Configure(...) function first."
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }

    if len(assetAgreement.Type) == 0 {
        errorMsg = "Empty asset type"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(assetAgreement.Id) == 0 {
        errorMsg = "Empty asset ID"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(assetAgreement.Recipient) == 0 {
        errorMsg = "Empty lock recipient"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("UnlockAsset"), []byte(assetAgreement.Type), []byte(assetAgreement.Id), []byte(assetAgreement.Recipient)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, fmt.Errorf(string(iccResp.GetPayload()))
    }
    fmt.Printf("Asset %s of type %s unlocked\n", assetAgreement.Id, assetAgreement.Type)
    return true, nil
}

func (am *AssetManagement) UnlockFungibleAsset(stub shim.ChaincodeStubInterface, assetAgreement *common.FungibleAssetAgreement) (bool, error) {
    var errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "Interoperation chaincode ID not set. Run the 'Configure(...) function first."
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }

    if len(assetAgreement.Type) == 0 {
        errorMsg = "Empty asset type"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if assetAgreement.NumUnits <= 0 {
        errorMsg = "Invalid number of asset units"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(assetAgreement.Recipient) == 0 {
        errorMsg = "Empty lock recipient"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("UnlockFungibleAsset"), []byte(assetAgreement.Type), []byte(strconv.Itoa(int(assetAgreement.NumUnits))), []byte(assetAgreement.Recipient)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, fmt.Errorf(string(iccResp.GetPayload()))
    }
    fmt.Printf("%d units of asset type %s unlocked\n", assetAgreement.NumUnits, assetAgreement.Type)
    return true, nil
}


// Ledger query functions

func (am *AssetManagement) GetTotalFungibleAssetCount(stub shim.ChaincodeStubInterface, assetType string) (int, error) {
    var errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "Interoperation chaincode ID not set. Run the 'Configure(...) function first."
        log.Error(errorMsg)
        return -1, errors.New(errorMsg)
    }

    if len(assetType) == 0 {
        errorMsg = "Empty asset type"
        log.Error(errorMsg)
        return -1, errors.New(errorMsg)
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("GetTotalFungibleAssetCount"), []byte(assetType)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return -1, fmt.Errorf(string(iccResp.GetPayload()))
    }
    numUnits, err := strconv.Atoi(string(iccResp.Payload))
    if err != nil {
        log.Error(err.Error())
        return -1, err
    }
    fmt.Printf("%d units of asset type %s declared\n", numUnits, assetType)
    return numUnits, nil
}

func (am *AssetManagement) GetUnlockedFungibleAssetCount(stub shim.ChaincodeStubInterface, assetType string) (int, error) {
    var errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "Interoperation chaincode ID not set. Run the 'Configure(...) function first."
        log.Error(errorMsg)
        return -1, errors.New(errorMsg)
    }

    if len(assetType) == 0 {
        errorMsg = "Empty asset type"
        log.Error(errorMsg)
        return -1, errors.New(errorMsg)
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("GetUnlockedFungibleAssetCount"), []byte(assetType)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return -1, fmt.Errorf(string(iccResp.GetPayload()))
    }
    numUnits, err := strconv.Atoi(string(iccResp.Payload))
    if err != nil {
        log.Error(err.Error())
        return -1, err
    }
    fmt.Printf("%d units of asset type %s available\n", numUnits, assetType)
    return numUnits, nil
}

func (am *AssetManagement) GetTotalFungibleLockedAssets(stub shim.ChaincodeStubInterface, assetType string) (int, error) {
    var errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "Interoperation chaincode ID not set. Run the 'Configure(...) function first."
        log.Error(errorMsg)
        return -1, errors.New(errorMsg)
    }

    if len(assetType) == 0 {
        errorMsg = "Empty asset type"
        log.Error(errorMsg)
        return -1, errors.New(errorMsg)
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("GetTotalFungibleLockedAssets"), []byte(assetType)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return -1, fmt.Errorf(string(iccResp.GetPayload()))
    }
    numUnits, err := strconv.Atoi(string(iccResp.Payload))
    if err != nil {
        log.Error(err.Error())
        return -1, err
    }
    fmt.Printf("%d units of asset type %s are locked\n", numUnits, assetType)
    return numUnits, nil
}

// 'lockRecipient': if blank, assume caller
// 'locker': if blank, assume caller
func (am *AssetManagement) GetAllLockedAssetsFunc(stub shim.ChaincodeStubInterface, funcName string, lockRecipient string, locker string) ([]string, error) {
    var infoMsg, errorMsg string
    var assets []string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "Interoperation chaincode ID not set. Run the 'Configure(...) function first."
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
        infoMsg = "Empty lock recipient; assuming caller"
        log.Info(infoMsg)
        lockRecipient = myself
    }
    if len(locker) == 0 {
        infoMsg = "Empty locker; assuming caller"
        log.Info(infoMsg)
        locker = myself
    }
    if lockRecipient == locker {
        errorMsg = "Invalid query: locker identical to recipient"
        log.Error(errorMsg)
        return []string{}, errors.New(errorMsg)
    }
    if lockRecipient != myself && locker != myself {
        errorMsg = "Query not permitted, as caller is neither locker nor recipient"
        log.Error(errorMsg)
        return []string{}, errors.New(errorMsg)
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte(funcName), []byte(lockRecipient), []byte(locker)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return []string{}, fmt.Errorf(string(iccResp.GetPayload()))
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
func (am *AssetManagement) GetAssetTimeToRelease(stub shim.ChaincodeStubInterface, assetAgreement *common.AssetAgreement) (int64, error) {
    var infoMsg, errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "Interoperation chaincode ID not set. Run the 'Configure(...) function first."
        log.Error(errorMsg)
        return -1, errors.New(errorMsg)
    }

    if len(assetAgreement.Type) == 0 {
        errorMsg = "Empty asset type"
        log.Error(errorMsg)
        return -1, errors.New(errorMsg)
    }
    if len(assetAgreement.Id) == 0 {
        errorMsg = "Empty asset ID"
        log.Error(errorMsg)
        return -1, errors.New(errorMsg)
    }
    myselfBytes, err := stub.GetCreator()
    if err != nil {
        log.Error(err.Error())
        return -1, err
    }
    myself := string(myselfBytes)
    if len(assetAgreement.Recipient) == 0 {
        infoMsg = "Empty lock recipient; assuming caller"
        log.Info(infoMsg)
        assetAgreement.Recipient = myself
    }
    if len(assetAgreement.Locker) == 0 {
        infoMsg = "Empty locker; assuming caller"
        log.Info(infoMsg)
        assetAgreement.Locker = myself
    }
    if assetAgreement.Recipient == assetAgreement.Locker {
        errorMsg = "Invalid query: locker identical to recipient"
        log.Error(errorMsg)
        return -1, errors.New(errorMsg)
    }
    if assetAgreement.Recipient != myself && assetAgreement.Locker != myself {
        errorMsg = "Query not permitted, as caller is neither locker nor recipient"
        log.Error(errorMsg)
        return -1, errors.New(errorMsg)
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("GetAssetTimeToRelease"), []byte(assetAgreement.Type), []byte(assetAgreement.Id), []byte(assetAgreement.Recipient), []byte(assetAgreement.Locker)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return -1, fmt.Errorf(string(iccResp.GetPayload()))
    }
    timeToRelease, err := strconv.ParseInt(string(iccResp.Payload), 10, 64)
    if err != nil {
        log.Error(err.Error())
        return -1, err
    }
    lockExpiryTimeSec := timeToRelease/1000
    lockExpiryTimeNano := (timeToRelease - (lockExpiryTimeSec * 1000)) * (1000 * 1000)     // Convert milliseconds to nanoseconds
    fmt.Printf("Asset %s of type %s locked until %+v\n", assetAgreement.Id, assetAgreement.Type, time.Unix(lockExpiryTimeSec, lockExpiryTimeNano))
    return timeToRelease, nil
}

// 'lockRecipient': if blank, assume caller
// 'locker': if blank, assume caller
func (am *AssetManagement) GetFungibleAssetTimeToRelease(stub shim.ChaincodeStubInterface, assetAgreement *common.FungibleAssetAgreement) (int64, error) {
    var infoMsg, errorMsg string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "Interoperation chaincode ID not set. Run the 'Configure(...) function first."
        log.Error(errorMsg)
        return -1, errors.New(errorMsg)
    }

    if len(assetAgreement.Type) == 0 {
        errorMsg = "Empty asset type"
        log.Error(errorMsg)
        return -1, errors.New(errorMsg)
    }
    if assetAgreement.NumUnits <= 0 {
        errorMsg = "Invalid number of asset units"
        log.Error(errorMsg)
        return -1, errors.New(errorMsg)
    }
    myselfBytes, err := stub.GetCreator()
    if err != nil {
        log.Error(err.Error())
        return -1, err
    }
    myself := string(myselfBytes)
    if len(assetAgreement.Recipient) == 0 {
        infoMsg = "Empty lock recipient; assuming caller"
        log.Info(infoMsg)
        assetAgreement.Recipient = myself
    }
    if len(assetAgreement.Locker) == 0 {
        infoMsg = "Empty locker; assuming caller"
        log.Info(infoMsg)
        assetAgreement.Locker = myself
    }
    if assetAgreement.Recipient == assetAgreement.Locker {
        errorMsg = "Invalid query: locker identical to recipient"
        log.Error(errorMsg)
        return -1, errors.New(errorMsg)
    }
    if assetAgreement.Recipient != myself && assetAgreement.Locker != myself {
        errorMsg = "Query not permitted, as caller is neither locker nor recipient"
        log.Error(errorMsg)
        return -1, errors.New(errorMsg)
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("GetFungibleAssetTimeToRelease"), []byte(assetAgreement.Type), []byte(strconv.Itoa(int(assetAgreement.NumUnits))), []byte(assetAgreement.Recipient), []byte(assetAgreement.Locker)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return -1, fmt.Errorf(string(iccResp.GetPayload()))
    }
    timeToRelease, err := strconv.ParseInt(string(iccResp.Payload), 10, 64)
    if err != nil {
        log.Error(err.Error())
        return -1, err
    }
    lockExpiryTimeSec := timeToRelease/1000
    lockExpiryTimeNano := (timeToRelease - (lockExpiryTimeSec * 1000)) * (1000 * 1000)     // Convert milliseconds to nanoseconds
    fmt.Printf("%d units of asset type %s locked until %+v\n", assetAgreement.NumUnits, assetAgreement.Type, time.Unix(lockExpiryTimeSec, lockExpiryTimeNano))
    return timeToRelease, nil
}

// Assumption is that the caller is either the recipient or the locker in each element in the list, but we will let the interop CC take care of it
func (am *AssetManagement) GetAllAssetsLockedUntil(stub shim.ChaincodeStubInterface, lockExpiryTimeMillis int64) ([]string, error) {
    var errorMsg string
    var assets []string

    if len(am.interopChaincodeId) == 0 {
        errorMsg = "Interoperation chaincode ID not set. Run the 'Configure(...) function first."
        log.Error(errorMsg)
        return []string{}, errors.New(errorMsg)
    }

    if lockExpiryTimeMillis <= 0 {
        errorMsg = "Invalid expiry time"
        log.Error(errorMsg)
        return []string{}, errors.New(errorMsg)
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("GetAllAssetsLockedUntil"), []byte(strconv.FormatInt(lockExpiryTimeMillis, 10))}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return []string{}, fmt.Errorf(string(iccResp.GetPayload()))
    }
    err := json.Unmarshal(iccResp.Payload, &assets)
    if err != nil {
        log.Error(err.Error())
        return []string{}, err
    }
    lockExpiryTimeSec := lockExpiryTimeMillis/1000
    lockExpiryTimeNano := (lockExpiryTimeMillis - (lockExpiryTimeSec * 1000)) * (1000 * 1000)     // Convert milliseconds to nanoseconds
    fmt.Printf("Obtained info for %d assets locked until %+v\n", len(assets), time.Unix(lockExpiryTimeSec, lockExpiryTimeNano))
    return assets, nil
}
