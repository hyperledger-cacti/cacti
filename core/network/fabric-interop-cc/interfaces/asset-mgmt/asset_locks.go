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

func (am *AssetManagement) LockAsset(stub shim.ChaincodeStubInterface, assetType string, assetId string, lockInfo *common.AssetLock) (bool, error) {
    if (lockInfo.LockMechanism == common.LockMechanism_HTLC) {
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
        return am.LockAssetHTLC(stub, assetType, assetId, lockInfoHTLC.Recipient, lockInfoHTLC.Hash, int64(lockInfoHTLC.ExpiryTimeMillis))
    } else {
        log.Errorf("Unsupported lock mechanism: %+v", lockInfo.LockMechanism)
        return false, fmt.Errorf("Unsupported lock mechanism: %+v", lockInfo.LockMechanism)
    }
}

func (am *AssetManagement) LockAssetHTLC(stub shim.ChaincodeStubInterface, assetType string, assetId string, lockRecipient string, lockHash []byte, lockExpiryTimeMillis int64) (bool, error) {
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
    if len(lockRecipient) == 0 {
        errorMsg = "Empty lock recipient"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(lockHash) == 0 {
        errorMsg = "Empty lock hash value"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    currEpochMillis := time.Now().UnixNano() / (1000 * 1000)
    if (lockExpiryTimeMillis <= currEpochMillis) {
        lockExpiryTimeMillis = currEpochMillis + defaultTimeLockMillis
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("LockAssetHTLC"), []byte(assetType), []byte(assetId), []byte(lockRecipient), lockHash, []byte(strconv.FormatInt(lockExpiryTimeMillis, 10))}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, fmt.Errorf(string(iccResp.GetPayload()))
    }
    lockExpiryTimeSec := lockExpiryTimeMillis/1000
    lockExpiryTimeNano := (lockExpiryTimeMillis - (lockExpiryTimeSec * 1000)) * (1000 * 1000)     // Convert milliseconds to nanoseconds
    fmt.Printf("Asset %s of type %s locked for %s until %+v\n", assetId, assetType, lockRecipient, time.Unix(lockExpiryTimeSec, lockExpiryTimeNano))
    return true, nil
}

func (am *AssetManagement) LockFungibleAsset(stub shim.ChaincodeStubInterface, assetType string, numUnits int, lockInfo *common.AssetLock) (bool, error) {
    if (lockInfo.LockMechanism == common.LockMechanism_HTLC) {
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
        return am.LockFungibleAssetHTLC(stub, assetType, numUnits, lockInfoHTLC.Recipient, lockInfoHTLC.Hash, int64(lockInfoHTLC.ExpiryTimeMillis))
    } else {
        log.Errorf("Unsupported lock mechanism: %+v", lockInfo.LockMechanism)
        return false, fmt.Errorf("Unsupported lock mechanism: %+v", lockInfo.LockMechanism)
    }
}

func (am *AssetManagement) LockFungibleAssetHTLC(stub shim.ChaincodeStubInterface, assetType string, numUnits int, lockRecipient string, lockHash []byte, lockExpiryTimeMillis int64) (bool, error) {
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
    if len(lockRecipient) == 0 {
        errorMsg = "Empty lock recipient"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    if len(lockHash) == 0 {
        errorMsg = "Empty lock hash value"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    currEpochMillis := time.Now().UnixNano() / (1000 * 1000)
    if (lockExpiryTimeMillis <= currEpochMillis) {
        lockExpiryTimeMillis = currEpochMillis + defaultTimeLockMillis
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("LockFungibleAssetHTLC"), []byte(assetType), []byte(strconv.Itoa(numUnits)), []byte(lockRecipient), lockHash, []byte(strconv.FormatInt(lockExpiryTimeMillis, 10))}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, fmt.Errorf(string(iccResp.GetPayload()))
    }
    lockExpiryTimeSec := lockExpiryTimeMillis/1000
    lockExpiryTimeNano := (lockExpiryTimeMillis - (lockExpiryTimeSec * 1000)) * (1000 * 1000)     // Convert milliseconds to nanoseconds
    fmt.Printf("%d units of asset type %s locked for %s until %+v\n", numUnits, assetType, lockRecipient, time.Unix(lockExpiryTimeSec, lockExpiryTimeNano))
    return true, nil
}

// 'lockRecipient': if blank, assume caller
// 'locker': if blank, assume caller
func (am *AssetManagement) IsAssetLocked(stub shim.ChaincodeStubInterface, assetType string, assetId string, lockRecipient string, locker string) (bool, error) {
    var infoMsg, errorMsg string

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
    myselfBytes, err := stub.GetCreator()
    if err != nil {
        log.Error(err.Error())
        return false, err
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
        return false, errors.New(errorMsg)
    }
    if lockRecipient != myself && locker != myself {
        errorMsg = "Query not permitted, as caller is neither locker nor recipient"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("IsAssetLocked"), []byte(assetType), []byte(assetId), []byte(lockRecipient), []byte(locker)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, fmt.Errorf(string(iccResp.GetPayload()))
    }
    isLocked := (string(iccResp.Payload) == fmt.Sprintf("%t", true))
    if isLocked {
        fmt.Printf("Asset %s of type %s locked by %s for %s\n", assetId, assetType, locker, lockRecipient)
    } else {
        fmt.Printf("Asset %s of type %s not locked by %s for %s\n", assetId, assetType, locker, lockRecipient)
    }
    return isLocked, nil
}

// 'lockRecipient': if blank, assume caller
// 'locker': if blank, assume caller
func (am *AssetManagement) IsFungibleAssetLocked(stub shim.ChaincodeStubInterface, assetType string, numUnits int, lockRecipient string, locker string) (bool, error) {
    var infoMsg, errorMsg string

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
    myselfBytes, err := stub.GetCreator()
    if err != nil {
        log.Error(err.Error())
        return false, err
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
        return false, errors.New(errorMsg)
    }
    if lockRecipient != myself && locker != myself {
        errorMsg = "Query not permitted, as caller is neither locker nor recipient"
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("IsAssetLocked"), []byte(assetType), []byte(strconv.Itoa(numUnits)), []byte(lockRecipient), []byte(locker)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, fmt.Errorf(string(iccResp.GetPayload()))
    }
    isLocked := (string(iccResp.Payload) == fmt.Sprintf("%t", true))
    if isLocked {
        fmt.Printf("%d units of asset type %s locked by %s for %s\n", numUnits, assetType, locker, lockRecipient)
    } else {
        fmt.Printf("%d units of asset type %s locked by %s for %s\n", numUnits, assetType, locker, lockRecipient)
    }
    return isLocked, nil
}

func (am *AssetManagement) ClaimAsset(stub shim.ChaincodeStubInterface, assetType string, assetId string, claimInfo *common.AssetClaim) (bool, error) {
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
        return am.ClaimAssetHTLC(stub, assetType, assetId, claimInfoHTLC.Locker, claimInfoHTLC.HashPreimage)
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

func (am *AssetManagement) ClaimFungibleAsset(stub shim.ChaincodeStubInterface, assetType string, numUnits int, claimInfo *common.AssetClaim) (bool, error) {
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
        return am.ClaimFungibleAssetHTLC(stub, assetType, numUnits, claimInfoHTLC.Locker, claimInfoHTLC.HashPreimage)
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

func (am *AssetManagement) UnlockAsset(stub shim.ChaincodeStubInterface, assetType string, assetId string) (bool, error) {
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
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("UnlockAsset"), []byte(assetType), []byte(assetId)}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, fmt.Errorf(string(iccResp.GetPayload()))
    }
    fmt.Printf("Asset %s of type %s unlocked\n", assetId, assetType)
    return true, nil
}

func (am *AssetManagement) UnlockFungibleAsset(stub shim.ChaincodeStubInterface, assetType string, numUnits int) (bool, error) {
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
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("UnlockFungibleAsset"), []byte(assetType), []byte(strconv.Itoa(numUnits))}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, fmt.Errorf(string(iccResp.GetPayload()))
    }
    fmt.Printf("%d units of asset type %s unlocked\n", numUnits, assetType)
    return true, nil
}


// Ledger query functions
func (am *AssetManagement) GetTotalFungibleLockedAssets(stub shim.ChaincodeStubInterface, assetType string) (int, error) {
    return 0, nil
}

func (am *AssetManagement) GetAllLockedAssets(stub shim.ChaincodeStubInterface, lockedForAddress string, lockedByAddress string) ([]string, error) {
    return []string{}, nil
}

func (am *AssetManagement) GetAllFungibleLockedAssets(stub shim.ChaincodeStubInterface, lockedForAddress string, lockedByAddress string) ([]string, error) {
    return []string{}, nil
}

func (am *AssetManagement) GetAllNonFungibleLockedAssets(stub shim.ChaincodeStubInterface, lockedForAddress string, lockedByAddress string) ([]string, error) {
    return []string{}, nil
}

func (am *AssetManagement) GetAssetTimeToRelease(stub shim.ChaincodeStubInterface, assetType string, assetId string, lockedForAddress string, lockedByAddress string) (int64, error) {
    return 0, nil
}

func (am *AssetManagement) GetFungibleAssetTimeToRelease(stub shim.ChaincodeStubInterface, assetType string, numUnits int, lockedForAddress string, lockedByAddress string) (int64, error) {
    return 0, nil
}

func (am *AssetManagement) GetAllAssetsLockedUntil(stub shim.ChaincodeStubInterface, lockExpiryTimeMillis int64) ([]string, error) {
    return []string{}, nil
}
