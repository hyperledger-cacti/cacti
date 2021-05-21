/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package assetmgmt

import (
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

func logWarnings(warnMsgs ...string) {
    for _, warnMsg := range warnMsgs {
      log.Warn(warnMsg)
    }
}

func (amc *AssetManagementContract) validateAndExtractAssetAgreement(assetAgreementSerializedProto64 string) (*common.AssetExchangeAgreement, error) {
    assetAgreement := &common.AssetExchangeAgreement{}
    // Decoding from base64
    assetAgreementSerializedProto, err := base64.StdEncoding.DecodeString(assetAgreementSerializedProto64)
    if err != nil {
      return assetAgreement, logThenErrorf(err.Error())
    }
    if len(assetAgreementSerializedProto) == 0 {
        return assetAgreement, logThenErrorf("empty asset agreement")
    }
    err = proto.Unmarshal([]byte(assetAgreementSerializedProto), assetAgreement)
    if err != nil {
        return assetAgreement, logThenErrorf(err.Error())
    }

    return assetAgreement, nil
}

func validateAndExtractFungibleAssetAgreement(fungibleAssetExchangeAgreementSerializedProto64 string) (*common.FungibleAssetExchangeAgreement, error) {
    assetAgreement := &common.FungibleAssetExchangeAgreement{}
    // Decoding from base64
    fungibleAssetExchangeAgreementSerializedProto, err := base64.StdEncoding.DecodeString(fungibleAssetExchangeAgreementSerializedProto64)
    if err != nil {
      return assetAgreement, logThenErrorf(err.Error())
    }
    if len(fungibleAssetExchangeAgreementSerializedProto) == 0 {
        return assetAgreement, logThenErrorf("empty asset agreement")
    }
    err = proto.Unmarshal([]byte(fungibleAssetExchangeAgreementSerializedProto), assetAgreement)
    if err != nil {
        return assetAgreement, logThenErrorf(err.Error())
    }

    return assetAgreement, nil
}

func (amc *AssetManagementContract) validateAndExtractLockInfo(lockInfoSerializedProto64 string) (*common.AssetLock, error) {
    lockInfo := &common.AssetLock{}
    // Decoding from base64
    lockInfoSerializedProto, err := base64.StdEncoding.DecodeString(lockInfoSerializedProto64)
    if err != nil {
      return lockInfo, logThenErrorf(err.Error())
    }
    if len(lockInfoSerializedProto) == 0 {
        return lockInfo, logThenErrorf("empty lock info")
    }
    err = proto.Unmarshal([]byte(lockInfoSerializedProto), lockInfo)
    if err != nil {
        return lockInfo, logThenErrorf(err.Error())
    }

    return lockInfo, nil
}

func (amc *AssetManagementContract) validateAndExtractClaimInfo(claimInfoSerializedProto64 string) (*common.AssetClaim, error) {
    claimInfo := &common.AssetClaim{}
    // Decode from base64
    claimInfoSerializedProto, err := base64.StdEncoding.DecodeString(claimInfoSerializedProto64)
    if err != nil {
      return claimInfo, logThenErrorf(err.Error())
    }
    if len(claimInfoSerializedProto) == 0 {
        return claimInfo, logThenErrorf("empty claim info")
    }
    err = proto.Unmarshal([]byte(claimInfoSerializedProto), claimInfo)
    if err != nil {
        return claimInfo, logThenErrorf(err.Error())
    }

    return claimInfo, nil
}

// Ledger transaction (invocation) functions

func (amc *AssetManagementContract) LockAsset(ctx contractapi.TransactionContextInterface, assetAgreementSerializedProto64 string, lockInfoSerializedProto64 string) (string, error) {
    assetAgreement, err := amc.validateAndExtractAssetAgreement(assetAgreementSerializedProto64)
    if err != nil {
        return "", err
    }
    lockInfo, err := amc.validateAndExtractLockInfo(lockInfoSerializedProto64)
    if err != nil {
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
	    logWarnings("Unable to set 'LockAsset' event", err.Error())
        }
    }
    return contractId, err
}

func (amc *AssetManagementContract) LockFungibleAsset(ctx contractapi.TransactionContextInterface, fungibleAssetExchangeAgreementSerializedProto64 string, lockInfoSerializedProto64 string) (string, error) {
    assetAgreement, err := validateAndExtractFungibleAssetAgreement(fungibleAssetExchangeAgreementSerializedProto64)
    if err != nil {
        return "", err
    }
    lockInfo, err := amc.validateAndExtractLockInfo(lockInfoSerializedProto64)
    if err != nil {
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
	    logWarnings("Unable to set 'LockFungibleAsset' event", err.Error())
        }
    }
    return contractId, err
}

func (amc *AssetManagementContract) IsAssetLocked(ctx contractapi.TransactionContextInterface, assetAgreementSerializedProto64 string) (bool, error) {
    assetAgreement, err := amc.validateAndExtractAssetAgreement(assetAgreementSerializedProto64)
    if err != nil {
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
    assetAgreement, err := amc.validateAndExtractAssetAgreement(assetAgreementSerializedProto64)
    if err != nil {
        return false, err
    }
    claimInfo, err := amc.validateAndExtractClaimInfo(claimInfoSerializedProto64)
    if err != nil {
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
	    logWarnings("Unable to set 'ClaimAsset' event", err.Error())
        }
    }
    return retVal, err
}

func (amc *AssetManagementContract) ClaimFungibleAsset(ctx contractapi.TransactionContextInterface, contractId, claimInfoSerializedProto64 string) (bool, error) {
    if len(contractId) == 0 {
        return false, logThenErrorf("empty contract id")
    }
    claimInfo, err := amc.validateAndExtractClaimInfo(claimInfoSerializedProto64)
    if err != nil {
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
	    logWarnings("Unable to set 'ClaimFungibleAsset' event", err.Error())
        }
    }
    return retVal, err
}

func (amc *AssetManagementContract) ClaimAssetUsingContractId(ctx contractapi.TransactionContextInterface, contractId, claimInfoSerializedProto64 string) (bool, error) {
    if len(contractId) == 0 {
        return false, logThenErrorf("empty contract id")
    }
    claimInfo, err := amc.validateAndExtractClaimInfo(claimInfoSerializedProto64)
    if err != nil {
        return false, err
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
	    logWarnings("Unable to set 'ClaimAssetUsingContractId' event", err.Error())
        }
    }
    return retVal, err
}

func (amc *AssetManagementContract) UnlockAsset(ctx contractapi.TransactionContextInterface, assetAgreementSerializedProto64 string) (bool, error) {
    assetAgreement, err := amc.validateAndExtractAssetAgreement(assetAgreementSerializedProto64)
    if err != nil {
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
	    logWarnings("Unable to set 'UnlockAsset' event", err.Error())
        }
    }
    return retVal, err
}

func (amc *AssetManagementContract) UnlockFungibleAsset(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
    if len(contractId) == 0 {
        return false, logThenErrorf("empty contract id")
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
	    logWarnings("Unable to set 'UnlockFungibleAsset' event", err.Error())
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
	    logWarnings("Unable to set 'UnlockAssetUsingContractId' event", err.Error())
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
    assetAgreement, err := amc.validateAndExtractAssetAgreement(assetAgreementSerializedProto64)
    if err != nil {
        return 0, err
    }

    return amc.assetManagement.GetAssetTimeToRelease(ctx.GetStub(), assetAgreement)
}

func (amc *AssetManagementContract) GetFungibleAssetTimeToRelease(ctx contractapi.TransactionContextInterface, fungibleAssetExchangeAgreementSerializedProto64 string) (uint64, error) {
    assetAgreement, err := validateAndExtractFungibleAssetAgreement(fungibleAssetExchangeAgreementSerializedProto64)
    if err != nil {
        return 0, err
    }

    return amc.assetManagement.GetFungibleAssetTimeToRelease(ctx.GetStub(), assetAgreement)
}

func (amc *AssetManagementContract) GetAllAssetsLockedUntil(ctx contractapi.TransactionContextInterface, lockExpiryTimeSecs uint64) ([]string, error) {
    return amc.assetManagement.GetAllAssetsLockedUntil(ctx.GetStub(), lockExpiryTimeSecs)
}
