/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package main

import (
    "fmt"

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

func (amc *AssetManagementContract) LockAsset(ctx contractapi.TransactionContextInterface, assetAgreementSerializedProto, lockInfoSerializedProto string) (bool, error) {
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
    lockInfo := &common.AssetLock{}
    if len(lockInfoSerializedProto) == 0 {
        log.Error("empty lock info")
        return false, fmt.Errorf("empty lock info")
    }
    err = proto.Unmarshal([]byte(lockInfoSerializedProto), lockInfo)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    return amc.assetManagement.LockAsset(ctx.GetStub(), assetAgreement, lockInfo)
}

func (amc *AssetManagementContract) LockFungibleAsset(ctx contractapi.TransactionContextInterface, fungibleAssetExchangeAgreementSerializedProto, lockInfoSerializedProto string) (string, error) {
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
    return amc.assetManagement.LockFungibleAsset(ctx.GetStub(), assetAgreement, lockInfo)
}

func (amc *AssetManagementContract) IsAssetLocked(ctx contractapi.TransactionContextInterface, assetAgreementSerializedProto string) (bool, error) {
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
        log.Error("empty contract id")
        return false, fmt.Errorf("empty contract id")
    }
    return amc.assetManagement.IsFungibleAssetLocked(ctx.GetStub(), contractId)
}

func (amc *AssetManagementContract) ClaimAsset(ctx contractapi.TransactionContextInterface, assetAgreementSerializedProto, claimInfoSerializedProto string) (bool, error) {
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
    return amc.assetManagement.ClaimAsset(ctx.GetStub(), assetAgreement, claimInfo)
}

func (amc *AssetManagementContract) ClaimFungibleAsset(ctx contractapi.TransactionContextInterface, contractId, claimInfoSerializedProto string) (bool, error) {
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
    return amc.assetManagement.ClaimFungibleAsset(ctx.GetStub(), contractId, claimInfo)
}

func (amc *AssetManagementContract) UnlockAsset(ctx contractapi.TransactionContextInterface, assetAgreementSerializedProto string) (bool, error) {
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
    return amc.assetManagement.UnlockAsset(ctx.GetStub(), assetAgreement)
}

func (amc *AssetManagementContract) UnlockFungibleAsset(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
    if len(contractId) == 0 {
        log.Error("empty contract id")
        return false, fmt.Errorf("empty contract id")
    }
    return amc.assetManagement.UnlockFungibleAsset(ctx.GetStub(), contractId)
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

func (amc *AssetManagementContract) GetAssetTimeToRelease(ctx contractapi.TransactionContextInterface, assetAgreementSerializedProto string) (uint64, error) {
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

func (amc *AssetManagementContract) GetFungibleAssetTimeToRelease(ctx contractapi.TransactionContextInterface, fungibleAssetExchangeAgreementSerializedProto string) (uint64, error) {
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
