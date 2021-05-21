/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package assetmgmt

import (
    "fmt"
    "encoding/base64"

    "github.com/golang/protobuf/proto"
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
    log "github.com/sirupsen/logrus"
    "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/interfaces/asset-mgmt/protos-go/common"
)


// AssetManagementContract implements asset locking and claiming chaincode operations that can be inherited by another contract
type AssetManagementContract struct {
    contractapi.Contract
    assetManagement AssetManagement
}

// Utility functions
func (amc *AssetManagementContract) Configure(interopChaincodeId string) {
    amc.assetManagement.Configure(interopChaincodeId)
}


// Ledger transaction (invocation) functions

func (amc *AssetManagementContract) LockAsset(ctx contractapi.TransactionContextInterface, assetAgreementSerializedProto64 string, lockInfoSerializedProto64 string) (string, error) {

    // Decoding from base64
    assetAgreementSerializedProto, err64 := base64.StdEncoding.DecodeString(assetAgreementSerializedProto64)
    if err64 != nil {
      log.Error(err64.Error())
      return "", err64
    }
    lockInfoSerializedProto, err64 := base64.StdEncoding.DecodeString(lockInfoSerializedProto64)
    if err64 != nil {
      log.Error(err64.Error())
      return "", err64
    }

    assetAgreement := &common.AssetExchangeAgreement{}
    if len(assetAgreementSerializedProto) == 0 {
        log.Error("empty asset agreement")
        return "", fmt.Errorf("empty asset agreement")
    }
    err := proto.Unmarshal([]byte(assetAgreementSerializedProto), assetAgreement)
    if err != nil {
        log.Error(err.Error())
        return "", err
    }
    lockInfo := &common.AssetLock{}
    if len(lockInfoSerializedProto) == 0 {
        log.Error("empty lock info")
        return "", fmt.Errorf("empty lock info")
    }
    err = proto.Unmarshal([]byte(lockInfoSerializedProto), lockInfo)
    if err != nil {
        log.Error(err.Error())
        return "", err
    }

    // The below 'SetEvent' should be the last in a given transaction (if this function is being called by another), otherwise it will be overridden
    contractId, err := amc.assetManagement.LockAsset(ctx.GetStub(), assetAgreement, lockInfo)
    if err == nil {
        lockInfoHTLC := &common.AssetLockHTLC{}
        err = proto.Unmarshal(lockInfo.LockInfo, lockInfoHTLC)
        if err == nil {
            contractInfo := &common.AssetContractHTLC{
                ContractId: contractId,
                Agreement: assetAgreement,
                Lock: lockInfoHTLC,
            }
            contractInfoBytes, err := proto.Marshal(contractInfo)
            if err == nil {
                err = ctx.GetStub().SetEvent("LockAsset", contractInfoBytes)
            }
        }
        if err != nil {
            log.Warn("Unable to set 'LockAsset' event")
            log.Warn(err.Error())
        }
    }
    return contractId, err
}

func (amc *AssetManagementContract) LockFungibleAsset(ctx contractapi.TransactionContextInterface, fungibleAssetExchangeAgreementSerializedProto64 string, lockInfoSerializedProto64 string) (string, error) {

    // Decoding from base64
    fungibleAssetExchangeAgreementSerializedProto, err64 := base64.StdEncoding.DecodeString(fungibleAssetExchangeAgreementSerializedProto64)
    if err64 != nil {
      log.Error(err64.Error())
      return "", err64
    }
    lockInfoSerializedProto, err64 := base64.StdEncoding.DecodeString(lockInfoSerializedProto64)
    if err64 != nil {
      log.Error(err64.Error())
      return "", err64
    }

    assetAgreement := &common.FungibleAssetExchangeAgreement{}
    if len(fungibleAssetExchangeAgreementSerializedProto) == 0 {
        log.Error("empty asset agreement")
        return "", fmt.Errorf("empty asset agreement")
    }
    err := proto.Unmarshal([]byte(fungibleAssetExchangeAgreementSerializedProto), assetAgreement)
    if err != nil {
        log.Error(err.Error())
        return "", err
    }
    lockInfo := &common.AssetLock{}
    if len(lockInfoSerializedProto) == 0 {
        log.Error("empty lock info")
        return "", fmt.Errorf("empty lock info")
    }
    err = proto.Unmarshal([]byte(lockInfoSerializedProto), lockInfo)
    if err != nil {
        log.Error(err.Error())
        return "", err
    }

    // The below 'SetEvent' should be the last in a given transaction (if this function is being called by another), otherwise it will be overridden
    contractId, err := amc.assetManagement.LockFungibleAsset(ctx.GetStub(), assetAgreement, lockInfo)
    if err == nil {
        lockInfoHTLC := &common.AssetLockHTLC{}
        err = proto.Unmarshal(lockInfo.LockInfo, lockInfoHTLC)
        if err == nil {
            contractInfo := &common.FungibleAssetContractHTLC{
                ContractId: contractId,
                Agreement: assetAgreement,
                Lock: lockInfoHTLC,
            }
            contractInfoBytes, err := proto.Marshal(contractInfo)
            if err == nil {
                err = ctx.GetStub().SetEvent("LockFungibleAsset", contractInfoBytes)
            }
        }
        if err != nil {
            log.Warn("Unable to set 'LockFungibleAsset' event")
            log.Warn(err.Error())
        }
    }
    return contractId, err
}

func (amc *AssetManagementContract) IsAssetLocked(ctx contractapi.TransactionContextInterface, assetAgreementSerializedProto64 string) (bool, error) {

    // Decoding from base64
    assetAgreementSerializedProto, err64 := base64.StdEncoding.DecodeString(assetAgreementSerializedProto64)
    if err64 != nil {
      log.Error(err64.Error())
      return false, err64
    }

    assetAgreement := &common.AssetExchangeAgreement{}
    if len(assetAgreementSerializedProto) == 0 {
        log.Error("empty asset agreement")
        return false, fmt.Errorf("empty asset agreement")
    }
    err := proto.Unmarshal([]byte(assetAgreementSerializedProto), assetAgreement)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    return amc.assetManagement.IsAssetLocked(ctx.GetStub(), assetAgreement)
}

func (amc *AssetManagementContract) IsFungibleAssetLocked(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
    if len(contractId) == 0 {
        return false, logThenErrorf("empty contract id")
    }
    return amc.assetManagement.IsFungibleAssetLocked(ctx.GetStub(), contractId)
}

func (amc *AssetManagementContract) IsAssetLockedQueryUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
    if len(contractId) == 0 {
        return false, logThenErrorf("empty contract id")
    }
    return amc.assetManagement.IsAssetLockedQueryUsingContractId(ctx.GetStub(), contractId)
}

func (amc *AssetManagementContract) ClaimAsset(ctx contractapi.TransactionContextInterface, assetAgreementSerializedProto64 string, claimInfoSerializedProto64 string) (bool, error) {

    // Decoding from base64
    assetAgreementSerializedProto, err64 := base64.StdEncoding.DecodeString(assetAgreementSerializedProto64)
    if err64 != nil {
      log.Error(err64.Error())
      return false, err64
    }
    claimInfoSerializedProto, err64 := base64.StdEncoding.DecodeString(claimInfoSerializedProto64)
    if err64 != nil {
      log.Error(err64.Error())
      return false, err64
    }

    assetAgreement := &common.AssetExchangeAgreement{}
    if len(assetAgreementSerializedProto) == 0 {
        log.Error("empty asset agreement")
        return false, fmt.Errorf("empty asset agreement")
    }
    err := proto.Unmarshal([]byte(assetAgreementSerializedProto), assetAgreement)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    claimInfo := &common.AssetClaim{}
    if len(claimInfoSerializedProto) == 0 {
        log.Error("empty claim info")
        return false, fmt.Errorf("empty claim info")
    }
    err = proto.Unmarshal([]byte(claimInfoSerializedProto), claimInfo)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }

    // The below 'SetEvent' should be the last in a given transaction (if this function is being called by another), otherwise it will be overridden
    retVal, err := amc.assetManagement.ClaimAsset(ctx.GetStub(), assetAgreement, claimInfo)
    if retVal && err == nil {
        claimInfoHTLC := &common.AssetClaimHTLC{}
        err = proto.Unmarshal(claimInfo.ClaimInfo, claimInfoHTLC)
        if err == nil {
            contractInfo := &common.AssetContractHTLC{
                Agreement: assetAgreement,
                Claim: claimInfoHTLC,
            }
            contractInfoBytes, err := proto.Marshal(contractInfo)
            if err == nil {
                err = ctx.GetStub().SetEvent("ClaimAsset", contractInfoBytes)
            }
        }
        if err != nil {
            log.Warn("Unable to set 'ClaimAsset' event")
            log.Warn(err.Error())
        }
    }
    return retVal, err
}

func (amc *AssetManagementContract) ClaimFungibleAsset(ctx contractapi.TransactionContextInterface, contractId, claimInfoSerializedProto64 string) (bool, error) {

    // Decoding from base64
    claimInfoSerializedProto, err64 := base64.StdEncoding.DecodeString(claimInfoSerializedProto64)
    if err64 != nil {
      log.Error(err64.Error())
      return false, err64
    }

    if len(contractId) == 0 {
        log.Error("empty contract id")
        return false, fmt.Errorf("empty contract id")
    }
    claimInfo := &common.AssetClaim{}
    if len(claimInfoSerializedProto) == 0 {
        log.Error("empty claim info")
        return false, fmt.Errorf("empty claim info")
    }
    err := proto.Unmarshal([]byte(claimInfoSerializedProto), claimInfo)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }

    // The below 'SetEvent' should be the last in a given transaction (if this function is being called by another), otherwise it will be overridden
    retVal, err := amc.assetManagement.ClaimFungibleAsset(ctx.GetStub(), contractId, claimInfo)
    if retVal && err == nil {
        claimInfoHTLC := &common.AssetClaimHTLC{}
        err = proto.Unmarshal(claimInfo.ClaimInfo, claimInfoHTLC)
        if err == nil {
            contractInfo := &common.FungibleAssetContractHTLC{
                ContractId: contractId,
                Claim: claimInfoHTLC,
            }
            contractInfoBytes, err := proto.Marshal(contractInfo)
            if err == nil {
                err = ctx.GetStub().SetEvent("ClaimFungibleAsset", contractInfoBytes)
            }
        }
        if err != nil {
            log.Warn("Unable to set 'ClaimFungibleAsset' event")
            log.Warn(err.Error())
        }
    }
    return retVal, err
}

func (amc *AssetManagementContract) ClaimAssetUsingContractId(ctx contractapi.TransactionContextInterface, contractId, claimInfoSerializedProto64 string) (bool, error) {

    // Decoding from base64
    claimInfoSerializedProto, err := base64.StdEncoding.DecodeString(claimInfoSerializedProto64)
    if err != nil {
      return false, logThenErrorf(err.Error())
    }

    if len(contractId) == 0 {
        return false, logThenErrorf("empty contract id")
    }
    claimInfo := &common.AssetClaim{}
    if len(claimInfoSerializedProto) == 0 {
        return false, logThenErrorf("empty claim info")
    }
    err = proto.Unmarshal([]byte(claimInfoSerializedProto), claimInfo)
    if err != nil {
        return false, logThenErrorf(err.Error())
    }

    // The below 'SetEvent' should be the last in a given transaction (if this function is being called by another), otherwise it will be overridden
    retVal, err := amc.assetManagement.ClaimAssetUsingContractId(ctx.GetStub(), contractId, claimInfo)
    if retVal && err == nil {
        claimInfoHTLC := &common.AssetClaimHTLC{}
        err = proto.Unmarshal(claimInfo.ClaimInfo, claimInfoHTLC)
        if err == nil {
            contractInfo := &common.AssetContractHTLC{
                ContractId: contractId,
                Claim: claimInfoHTLC,
            }
            contractInfoBytes, err := proto.Marshal(contractInfo)
            if err == nil {
                err = ctx.GetStub().SetEvent("ClaimAssetUsingContractId", contractInfoBytes)
            }
        }
        if err != nil {
            log.Warn("Unable to set 'ClaimAssetUsingContractId' event")
            log.Warn(err.Error())
        }
    }
    return retVal, err
}

func (amc *AssetManagementContract) UnlockAsset(ctx contractapi.TransactionContextInterface, assetAgreementSerializedProto64 string) (bool, error) {

    // Decoding from base64
    assetAgreementSerializedProto, err64 := base64.StdEncoding.DecodeString(assetAgreementSerializedProto64)
    if err64 != nil {
      log.Error(err64.Error())
      return false, err64
    }

    assetAgreement := &common.AssetExchangeAgreement{}
    if len(assetAgreementSerializedProto) == 0 {
        log.Error("empty asset agreement")
        return false, fmt.Errorf("empty asset agreement")
    }
    err := proto.Unmarshal([]byte(assetAgreementSerializedProto), assetAgreement)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }

    // The below 'SetEvent' should be the last in a given transaction (if this function is being called by another), otherwise it will be overridden
    retVal, err := amc.assetManagement.UnlockAsset(ctx.GetStub(), assetAgreement)
    if retVal && err == nil {
        contractInfo := &common.AssetContractHTLC{
            Agreement: assetAgreement,
        }
        contractInfoBytes, err := proto.Marshal(contractInfo)
        if err == nil {
            err = ctx.GetStub().SetEvent("UnlockAsset", contractInfoBytes)
        }
        if err != nil {
            log.Warn("Unable to set 'UnlockAsset' event")
            log.Warn(err.Error())
        }
    }
    return retVal, err
}

func (amc *AssetManagementContract) UnlockFungibleAsset(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
    if len(contractId) == 0 {
        log.Error("empty contract id")
        return false, fmt.Errorf("empty contract id")
    }

    // The below 'SetEvent' should be the last in a given transaction (if this function is being called by another), otherwise it will be overridden
    retVal, err := amc.assetManagement.UnlockFungibleAsset(ctx.GetStub(), contractId)
    if retVal && err == nil {
        contractInfo := &common.FungibleAssetContractHTLC{
            ContractId: contractId,
        }
        contractInfoBytes, err := proto.Marshal(contractInfo)
        if err == nil {
            err = ctx.GetStub().SetEvent("UnlockFungibleAsset", contractInfoBytes)
        }
        if err != nil {
            log.Warn("Unable to set 'UnlockFungibleAsset' event")
            log.Warn(err.Error())
        }
    }
    return retVal, err
}

func (amc *AssetManagementContract) UnlockAssetUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
    if len(contractId) == 0 {
        return false, logThenErrorf("empty contract id")
    }

    // The below 'SetEvent' should be the last in a given transaction (if this function is being called by another), otherwise it will be overridden
    retVal, err := amc.assetManagement.UnlockAssetUsingContractId(ctx.GetStub(), contractId)
    if retVal && err == nil {
        contractInfo := &common.AssetContractHTLC{
            ContractId: contractId,
        }
        contractInfoBytes, err := proto.Marshal(contractInfo)
        if err == nil {
            err = ctx.GetStub().SetEvent("UnlockAssetUsingContractId", contractInfoBytes)
        }
        if err != nil {
            log.Warn("Unable to set 'UnlockAssetUsingContractId' event")
            log.Warn(err.Error())
        }
    }
    return retVal, err
}


// Ledger query functions

func (amc *AssetManagementContract) GetTotalFungibleLockedAssets(ctx contractapi.TransactionContextInterface, assetType string) (uint64, error) {
    return amc.assetManagement.GetTotalFungibleLockedAssets(ctx.GetStub(), assetType)
}

func (amc *AssetManagementContract) GetAllLockedAssets(ctx contractapi.TransactionContextInterface, lockRecipient string, locker string) ([]string, error) {
    return amc.assetManagement.GetAllLockedAssets(ctx.GetStub(), lockRecipient, locker)
}

func (amc *AssetManagementContract) GetAllNonFungibleLockedAssets(ctx contractapi.TransactionContextInterface, lockRecipient string, locker string) ([]string, error) {
    return amc.assetManagement.GetAllNonFungibleLockedAssets(ctx.GetStub(), lockRecipient, locker)
}

func (amc *AssetManagementContract) GetAllFungibleLockedAssets(ctx contractapi.TransactionContextInterface, lockRecipient string, locker string) ([]string, error) {
    return amc.assetManagement.GetAllFungibleLockedAssets(ctx.GetStub(), lockRecipient, locker)
}

func (amc *AssetManagementContract) GetAssetTimeToRelease(ctx contractapi.TransactionContextInterface, assetAgreementSerializedProto64 string) (uint64, error) {

    // Decoding from base64
    assetAgreementSerializedProto, err64 := base64.StdEncoding.DecodeString(assetAgreementSerializedProto64)
    if err64 != nil {
      log.Error(err64.Error())
      return 0, err64
    }

    assetAgreement := &common.AssetExchangeAgreement{}
    if len(assetAgreementSerializedProto) == 0 {
        log.Error("empty asset agreement")
        return 0, fmt.Errorf("empty asset agreement")
    }
    err := proto.Unmarshal([]byte(assetAgreementSerializedProto), assetAgreement)
    if err != nil {
        log.Error(err.Error())
        return 0, err
    }
    return amc.assetManagement.GetAssetTimeToRelease(ctx.GetStub(), assetAgreement)
}

func (amc *AssetManagementContract) GetFungibleAssetTimeToRelease(ctx contractapi.TransactionContextInterface, fungibleAssetExchangeAgreementSerializedProto64 string) (uint64, error) {

    // Decoding from base64
    fungibleAssetExchangeAgreementSerializedProto, err64 := base64.StdEncoding.DecodeString(fungibleAssetExchangeAgreementSerializedProto64)
    if err64 != nil {
      log.Error(err64.Error())
      return 0, err64
    }

    assetAgreement := &common.FungibleAssetExchangeAgreement{}
    if len(fungibleAssetExchangeAgreementSerializedProto) == 0 {
        log.Error("empty asset agreement")
        return 0, fmt.Errorf("empty asset agreement")
    }
    err := proto.Unmarshal([]byte(fungibleAssetExchangeAgreementSerializedProto), assetAgreement)
    if err != nil {
        log.Error(err.Error())
        return 0, err
    }
    return amc.assetManagement.GetFungibleAssetTimeToRelease(ctx.GetStub(), assetAgreement)
}

func (amc *AssetManagementContract) GetAllAssetsLockedUntil(ctx contractapi.TransactionContextInterface, lockExpiryTimeSecs uint64) ([]string, error) {
    return amc.assetManagement.GetAllAssetsLockedUntil(ctx.GetStub(), lockExpiryTimeSecs)
}
