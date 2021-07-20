/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package assetmgmt

import (
    "encoding/base64"
    "encoding/json"

    "github.com/golang/protobuf/proto"
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
    log "github.com/sirupsen/logrus"
    "github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
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

// Object used in the map, contractId --> contracted-asset
type ContractedAsset struct {
    Type	string	`json:"type"`
    Id		string	`json:"id"`
}

// Object used in the map, contractId --> contracted-fungible-asset
type ContractedFungibleAsset struct {
    Type	string	`json:"type"`
    NumUnits	uint64	`json:"id"`
}

func getAssetLockLookupMapKey(ctx contractapi.TransactionContextInterface, Type, Id string) (string, error) {
    assetLockKey, err := ctx.GetStub().CreateCompositeKey("AssetExchangeContract", []string{Type, Id})
    if err != nil {
        return "", logThenErrorf("error while creating composite key: %+v", err)
    }

    return assetLockKey, nil
}

func getAssetContractIdMapKey(contractId string) string {
    return "AssetContract_" + contractId
}

func getFungibleAssetContractIdMapKey(contractId string) string {
    return "FungibleAssetContract_" + contractId
}

// write to the ledger the details needed at the time of unlock/claim
func (amc *AssetManagementContract) ContractIdFungibleAssetsLookupMap(ctx contractapi.TransactionContextInterface, assetType string, numUnits uint64, contractId string) error {
    contractedFungibleAsset := &ContractedFungibleAsset {
        Type: assetType,
        NumUnits: numUnits,
    }
    contractedFungibleAssetBytes, err := json.Marshal(contractedFungibleAsset)
    if err != nil {
        return logThenErrorf("marshal error: %+v", err)
    }
    err = ctx.GetStub().PutState(getFungibleAssetContractIdMapKey(contractId), contractedFungibleAssetBytes)
    if err != nil {
        return logThenErrorf("failed to write to the fungible asset ledger: %+v", err)
    }

    return nil
}
// write to the ledger the details needed at the time of unlock/claim
func (amc *AssetManagementContract) ContractIdAssetsLookupMap(ctx contractapi.TransactionContextInterface, assetType, assetId, contractId string) error {
    contractedAsset := &ContractedAsset {
        Type: assetType,
        Id: assetId,
    }
    contractedAssetBytes, err := json.Marshal(contractedAsset)
    if err != nil {
        return logThenErrorf("marshal error: %+v", err)
    }
    assetLockKey, err := getAssetLockLookupMapKey(ctx, assetType, assetId)
    if err != nil {
        return logThenErrorf(err.Error())
    }
    err = ctx.GetStub().PutState(assetLockKey, []byte(contractId))
    if err != nil {
        return logThenErrorf("failed to write to the asset ledger: %+v", err)
    }
    err = ctx.GetStub().PutState(getAssetContractIdMapKey(contractId), contractedAssetBytes)
    if err != nil {
        return logThenErrorf("failed to write to the asset ledger: %+v", err)
    }

    return nil
}

func (amc *AssetManagementContract) DeleteAssetLookupMapsUsingContractId(ctx contractapi.TransactionContextInterface, assetType, assetId, contractId string) error {
    // delete the lookup maps
    assetLockKey, err := getAssetLockLookupMapKey(ctx, assetType, assetId)
    if err != nil {
        return logThenErrorf(err.Error())
    }
    err = ctx.GetStub().DelState(assetLockKey)
    if err != nil {
        return logThenErrorf("failed to delete entry associated with contractId %s from bond asset ledger: %+v", contractId, err)
    }
    err = ctx.GetStub().DelState(getAssetContractIdMapKey(contractId))
    if err != nil {
        return logThenErrorf("failed to delete contractId %s from bond asset network ledger: %+v", contractId, err)
    }

    return nil
}

func (amc *AssetManagementContract) DeleteAssetLookupMapsOnlyUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) error {
    // delete the lookup maps
    contractedAssetBytes, err := ctx.GetStub().GetState(getAssetContractIdMapKey(contractId))
    if err != nil {
        return logThenErrorf("failed to read from asset ledger: %+v", err)
    }
    contractedAsset := ContractedAsset{}
    err = json.Unmarshal(contractedAssetBytes, &contractedAsset)
    if err != nil {
        return logThenErrorf("unmarshal error: %+v", err)
    }
    assetLockKey, err := getAssetLockLookupMapKey(ctx, contractedAsset.Type, contractedAsset.Id)
    if err != nil {
        return logThenErrorf(err.Error())
    }
    err = ctx.GetStub().DelState(assetLockKey)
    if err != nil {
        return logThenErrorf("failed to delete entry associated with contractId %s from asset ledger: %+v", contractId, err)
    }
    err = ctx.GetStub().DelState(getAssetContractIdMapKey(contractId))
    if err != nil {
        return logThenErrorf("failed to delete contractId %s from asset ledger: %+v", contractId, err)
    }

    return nil
}

func (amc *AssetManagementContract) DeleteFungibleAssetLookupMap(ctx contractapi.TransactionContextInterface, contractId string) error {
    err := ctx.GetStub().DelState(getFungibleAssetContractIdMapKey(contractId))
    if err != nil {
        return logThenErrorf("failed to delete contractId %s from fungible asset ledger: %+v", contractId, err)
    }

    return nil
}

func (amc *AssetManagementContract) DeleteAssetLookupMaps(ctx contractapi.TransactionContextInterface, assetType, assetId string) error {
    // delete the lookup details
    assetLockKey, err := getAssetLockLookupMapKey(ctx, assetType, assetId)
    if err != nil {
        return logThenErrorf(err.Error())
    }
    contractIdBytes, err := ctx.GetStub().GetState(assetLockKey)
    if err != nil {
        return logThenErrorf("unable to fetch from bond asset network ledger: %+v", err.Error())
    }
    if contractIdBytes == nil {
        return logThenErrorf("contractId not found on bond asset network ledger")
    }
    err = ctx.GetStub().DelState(getAssetContractIdMapKey(string(contractIdBytes)))
    if err != nil {
        return logThenErrorf("failed to delete entry contractId %s from bond asset network ledger: %+v", string(contractIdBytes), err)
    }
    err = ctx.GetStub().DelState(assetLockKey)
    if err != nil {
        return logThenErrorf("failed to delete entry associated with contractId %s from bond asset ledger: %+v", string(contractIdBytes), err)
    }

    return nil
}

// Fetch the contracted fungible asset type and numUnits from the ledger
func (amc *AssetManagementContract) FetchFromContractIdFungibleAssetLookupMap(ctx contractapi.TransactionContextInterface, contractId string) (string, uint64, error) {
    contractedFungibleAssetBytes, err := ctx.GetStub().GetState(getFungibleAssetContractIdMapKey(contractId))
    if err != nil {
        return "", 0, logThenErrorf("failed to read from fungible asset network ledger: %+v", err)
    }
    contractedFungibleAsset := ContractedFungibleAsset{}
    err = json.Unmarshal(contractedFungibleAssetBytes, &contractedFungibleAsset)
    if err != nil {
            return "", 0, logThenErrorf("unmarshal error: %+v", err)
    }

    return contractedFungibleAsset.Type, contractedFungibleAsset.NumUnits, nil
}

// Fetch the contracted bond asset type and id from the ledger
func (amc *AssetManagementContract) FetchFromContractIdAssetLookupMap(ctx contractapi.TransactionContextInterface, contractId string) (string, string, error) {
    contractedAssetBytes, err := ctx.GetStub().GetState(getAssetContractIdMapKey(contractId))
    if err != nil {
        return "", "", logThenErrorf("failed to read from asset network ledger: %+v", err)
    }
    contractedAsset := ContractedAsset{}
    err = json.Unmarshal(contractedAssetBytes, &contractedAsset)
    if err != nil {
        return "", "", logThenErrorf("unmarshal error: %+v", err)
    }

    return contractedAsset.Type, contractedAsset.Id, nil
}

func (amc *AssetManagementContract) ValidateAndExtractAssetAgreement(assetAgreementSerializedProto64 string) (*common.AssetExchangeAgreement, error) {
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

func (amc *AssetManagementContract) ValidateAndExtractFungibleAssetAgreement(fungibleAssetExchangeAgreementSerializedProto64 string) (*common.FungibleAssetExchangeAgreement, error) {
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

func (amc *AssetManagementContract) ValidateAndExtractLockInfo(lockInfoSerializedProto64 string) (*common.AssetLock, error) {
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

func (amc *AssetManagementContract) ValidateAndExtractClaimInfo(claimInfoSerializedProto64 string) (*common.AssetClaim, error) {
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
    assetAgreement, err := amc.ValidateAndExtractAssetAgreement(assetAgreementSerializedProto64)
    if err != nil {
        return "", err
    }
    lockInfo, err := amc.ValidateAndExtractLockInfo(lockInfoSerializedProto64)
    if err != nil {
        return "", err
    }

    // The below 'SetEvent' should be the last in a given transaction (if this function is being called by another), otherwise it will be overridden
    contractId, err := amc.assetManagement.LockAsset(ctx.GetStub(), assetAgreement, lockInfo)
    if err == nil {
	var contractInfoBytes []byte
        if lockInfo.LockMechanism == common.LockMechanism_HTLC {
            lockInfoVal := &common.AssetLockHTLC{}
            err = proto.Unmarshal(lockInfo.LockInfo, lockInfoVal)
            if err == nil {
                contractInfo := &common.AssetContractHTLC {
                    ContractId: contractId,
                    Agreement: assetAgreement,
                    Lock: lockInfoVal,
                }
                contractInfoBytes, err = proto.Marshal(contractInfo)
            }
        } else {
            logWarnings("lock mechanism is not supported")
        }
        if err == nil {
            err = ctx.GetStub().SetEvent("LockAsset", contractInfoBytes)
        } else {
            logWarnings("Unable to set 'LockAsset' event", err.Error())
	}
    }

    return contractId, err
}

func (amc *AssetManagementContract) LockFungibleAsset(ctx contractapi.TransactionContextInterface, fungibleAssetExchangeAgreementSerializedProto64 string, lockInfoSerializedProto64 string) (string, error) {
    assetAgreement, err := amc.ValidateAndExtractFungibleAssetAgreement(fungibleAssetExchangeAgreementSerializedProto64)
    if err != nil {
        return "", err
    }
    lockInfo, err := amc.ValidateAndExtractLockInfo(lockInfoSerializedProto64)
    if err != nil {
        return "", err
    }

    // The below 'SetEvent' should be the last in a given transaction (if this function is being called by another), otherwise it will be overridden
    contractId, err := amc.assetManagement.LockFungibleAsset(ctx.GetStub(), assetAgreement, lockInfo)
    if err == nil {
	var contractInfoBytes []byte
        if lockInfo.LockMechanism == common.LockMechanism_HTLC {
            lockInfoVal := &common.AssetLockHTLC{}
            err = proto.Unmarshal(lockInfo.LockInfo, lockInfoVal)
            if err == nil {
                contractInfo := &common.FungibleAssetContractHTLC {
                    ContractId: contractId,
                    Agreement: assetAgreement,
                    Lock: lockInfoVal,
                }
                contractInfoBytes, err = proto.Marshal(contractInfo)
            }
        } else {
            logWarnings("lock mechanism is not supported")
        }
	if err == nil {
            err = ctx.GetStub().SetEvent("LockFungibleAsset", contractInfoBytes)
        } else {
            logWarnings("Unable to set 'LockFungibleAsset' event", err.Error())
        }
    }

    return contractId, err
}

func (amc *AssetManagementContract) IsAssetLocked(ctx contractapi.TransactionContextInterface, assetAgreementSerializedProto64 string) (bool, error) {
    assetAgreement, err := amc.ValidateAndExtractAssetAgreement(assetAgreementSerializedProto64)
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
    assetAgreement, err := amc.ValidateAndExtractAssetAgreement(assetAgreementSerializedProto64)
    if err != nil {
        return false, err
    }
    claimInfo, err := amc.ValidateAndExtractClaimInfo(claimInfoSerializedProto64)
    if err != nil {
        return false, err
    }

    // The below 'SetEvent' should be the last in a given transaction (if this function is being called by another), otherwise it will be overridden
    retVal, err := amc.assetManagement.ClaimAsset(ctx.GetStub(), assetAgreement, claimInfo)
    if retVal && err == nil {
	var contractInfoBytes []byte
        if claimInfo.LockMechanism == common.LockMechanism_HTLC {
            claimInfoVal := &common.AssetClaimHTLC{}
            err = proto.Unmarshal(claimInfo.ClaimInfo, claimInfoVal)
            if err == nil {
                contractInfo := &common.AssetContractHTLC {
                    Agreement: assetAgreement,
                    Claim: claimInfoVal,
                }
                contractInfoBytes, err = proto.Marshal(contractInfo)
            }
        } else {
            logWarnings("lock mechanism is not supported")
        }
        if err == nil {
           err = ctx.GetStub().SetEvent("ClaimAsset", contractInfoBytes)
        } else {
	    logWarnings("Unable to set 'ClaimAsset' event", err.Error())
        }
    }
    return retVal, err
}

func (amc *AssetManagementContract) ClaimFungibleAsset(ctx contractapi.TransactionContextInterface, contractId, claimInfoSerializedProto64 string) (bool, error) {
    if len(contractId) == 0 {
        return false, logThenErrorf("empty contract id")
    }
    claimInfo, err := amc.ValidateAndExtractClaimInfo(claimInfoSerializedProto64)
    if err != nil {
        return false, err
    }

    // The below 'SetEvent' should be the last in a given transaction (if this function is being called by another), otherwise it will be overridden
    retVal, err := amc.assetManagement.ClaimFungibleAsset(ctx.GetStub(), contractId, claimInfo)
    if retVal && err == nil {
	var contractInfoBytes []byte
        if claimInfo.LockMechanism == common.LockMechanism_HTLC {
            claimInfoVal := &common.AssetClaimHTLC{}
            err = proto.Unmarshal(claimInfo.ClaimInfo, claimInfoVal)
            if err == nil {
                contractInfo := &common.FungibleAssetContractHTLC {
                    ContractId: contractId,
                    Claim: claimInfoVal,
                }
                contractInfoBytes, err = proto.Marshal(contractInfo)
            }
        } else {
            logWarnings("lock mechanism is not supported")
        }
        if err == nil {
            err = ctx.GetStub().SetEvent("ClaimFungibleAsset", contractInfoBytes)
        } else {
	    logWarnings("Unable to set 'ClaimFungibleAsset' event", err.Error())
        }
    }
    return retVal, err
}

func (amc *AssetManagementContract) ClaimAssetUsingContractId(ctx contractapi.TransactionContextInterface, contractId, claimInfoSerializedProto64 string) (bool, error) {
    if len(contractId) == 0 {
        return false, logThenErrorf("empty contract id")
    }
    claimInfo, err := amc.ValidateAndExtractClaimInfo(claimInfoSerializedProto64)
    if err != nil {
        return false, err
    }

    // The below 'SetEvent' should be the last in a given transaction (if this function is being called by another), otherwise it will be overridden
    retVal, err := amc.assetManagement.ClaimAssetUsingContractId(ctx.GetStub(), contractId, claimInfo)
    if retVal && err == nil {
	var contractInfoBytes []byte
        if claimInfo.LockMechanism == common.LockMechanism_HTLC {
            claimInfoVal := &common.AssetClaimHTLC{}
            err = proto.Unmarshal(claimInfo.ClaimInfo, claimInfoVal)
            if err == nil {
                contractInfo := &common.AssetContractHTLC {
                    ContractId: contractId,
                    Claim: claimInfoVal,
                }
                contractInfoBytes, err = proto.Marshal(contractInfo)
            }
        } else {
            logWarnings("lock mechanism is not supported")
        }
        if err == nil {
            err = ctx.GetStub().SetEvent("ClaimAsset", contractInfoBytes)
        } else {
	    logWarnings("Unable to set 'ClaimAsset' event", err.Error())
	}
    }

    return retVal, err
}

func (amc *AssetManagementContract) UnlockAsset(ctx contractapi.TransactionContextInterface, assetAgreementSerializedProto64 string) (bool, error) {
    assetAgreement, err := amc.ValidateAndExtractAssetAgreement(assetAgreementSerializedProto64)
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
            err = ctx.GetStub().SetEvent("UnlockAsset", contractInfoBytes)
        }
        if err != nil {
	    logWarnings("Unable to set 'UnlockAsset' event", err.Error())
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
    assetAgreement, err := amc.ValidateAndExtractAssetAgreement(assetAgreementSerializedProto64)
    if err != nil {
        return 0, err
    }

    return amc.assetManagement.GetAssetTimeToRelease(ctx.GetStub(), assetAgreement)
}

func (amc *AssetManagementContract) GetFungibleAssetTimeToRelease(ctx contractapi.TransactionContextInterface, fungibleAssetExchangeAgreementSerializedProto64 string) (uint64, error) {
    assetAgreement, err := amc.ValidateAndExtractFungibleAssetAgreement(fungibleAssetExchangeAgreementSerializedProto64)
    if err != nil {
        return 0, err
    }

    return amc.assetManagement.GetFungibleAssetTimeToRelease(ctx.GetStub(), assetAgreement)
}

func (amc *AssetManagementContract) GetAllAssetsLockedUntil(ctx contractapi.TransactionContextInterface, lockExpiryTimeSecs uint64) ([]string, error) {
    return amc.assetManagement.GetAllAssetsLockedUntil(ctx.GetStub(), lockExpiryTimeSecs)
}
