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
func (am *AssetManagement) LockAsset(stub shim.ChaincodeStubInterface, assetType string, assetId string, lockInfo *common.AssetLock) (bool, error) {
    if (lockInfo.LockMechanism == common.AssetLock_HTLC) {
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

func (am *AssetManagement) LockAssetHTLC(stub shim.ChaincodeStubInterface, assetType string, assetId string, lockTarget string, lockHash []byte, lockExpiryTimeMillis int64) (bool, error) {
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
    if len(lockTarget) == 0 {
        errorMsg = "Empty lock target/claimant"
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
    iccResp := stub.InvokeChaincode(am.interopChaincodeId, [][]byte{[]byte("LockAssetHTLC"), []byte(assetType), []byte(assetId), []byte(lockTarget), lockHash, []byte(strconv.FormatInt(lockExpiryTimeMillis, 10))}, "")
    fmt.Printf("Response from Interop CC: %+v\n", iccResp)
    if iccResp.GetStatus() != shim.OK {
        return false, fmt.Errorf(string(iccResp.GetPayload()))
    }
    lockExpiryTimeSec := lockExpiryTimeMillis/1000
    lockExpiryTimeNano := (lockExpiryTimeMillis - (lockExpiryTimeSec * 1000)) * (1000 * 1000)     // Convert milliseconds to nanoseconds
    fmt.Printf("Asset %s of type %s locked for %s until %+v\n", assetId, assetType, lockTarget, time.Unix(lockExpiryTimeSec, lockExpiryTimeNano))
    return true, nil
}

func (am *AssetManagement) LockFungibleAsset(stub shim.ChaincodeStubInterface, assetType string, numUnits int, lockInfo string, lockMechanism int) (bool, error) {
    return true, nil
}

func (am *AssetManagement) LockFungibleAssetHTLC(stub shim.ChaincodeStubInterface, assetType string, numUnits int, lockTarget string, lockHash []byte, lockExpiryTimeMillis int64) (bool, error) {
    return true, nil
}

func (am *AssetManagement) IsAssetLocked(stub shim.ChaincodeStubInterface, assetType string, assetId string, lockedForAddress string, lockedByAddress string) (bool, error) {
    return true, nil
}

func (am *AssetManagement) IsFungibleAssetLocked(stub shim.ChaincodeStubInterface, assetType string, numUnits int, lockedForAddress string, lockedByAddress string) (bool, error) {
    return true, nil
}

func (am *AssetManagement) ClaimAsset(stub shim.ChaincodeStubInterface, lockedByAddress string, hashPreimage string, assetType string, assetId string) (bool, error) {
    return true, nil
}

func (am *AssetManagement) ClaimFungibleAsset(stub shim.ChaincodeStubInterface, lockedByAddress string, hashPreimage string, assetType string, numUnits int) (bool, error) {
    return true, nil
}

func (am *AssetManagement) UnlockAsset(stub shim.ChaincodeStubInterface, assetType string, assetId string) (bool, error) {
    return true, nil
}

func (am *AssetManagement) UnlockFungibleAsset(stub shim.ChaincodeStubInterface, assetType string, numUnits int) (bool, error) {
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
