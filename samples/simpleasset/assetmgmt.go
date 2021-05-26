/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package main

import (
    "fmt"
    "errors"
    "encoding/json"

    "github.com/golang/protobuf/proto"
    log "github.com/sirupsen/logrus"
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
    "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/interfaces/asset-mgmt/protos-go/common"
)

// Object used in the map, contractId --> contracted-bond-asset
type ContractedBondAsset struct {
        Type		string  `json:"type"`
        Id		string  `json:"id"`
}

// Object used in the map, contractId --> contracted-bond-asset
type ContractedTokenAsset struct {
        Type            string  `json:"type"`
        NumUnits        uint64  `json:"id"`
}

// helper functions

// functions to log and return errors
func logThenErrorf(format string, args ...interface{}) error {
    errorMsg := fmt.Sprintf(format, args...)
    log.Error(errorMsg)
    return errors.New(errorMsg)
}

// function to return the asset claim information using HTLC
func getClaimInfoProtoBytesHTLC(hashPreimage []byte) ([]byte, error) {
    claimInfoHTLC := &common.AssetClaimHTLC {
        HashPreimageBase64: hashPreimage,
    }
    claimInfoBytes, _ := proto.Marshal(claimInfoHTLC)
    claimInfo := &common.AssetClaim {
        LockMechanism: common.LockMechanism_HTLC,
        ClaimInfo: claimInfoBytes,
    }
    claimInfoProtoBytes, err := proto.Marshal(claimInfo)
    if err != nil {
        return []byte(""), logThenErrorf(err.Error())
    }

    return claimInfoProtoBytes, nil
}

func getLockInfoProtoBytesHTLC(hashBase64 []byte, expiryTimeSecs uint64) ([]byte, error) {
    lockInfoHTLC := &common.AssetLockHTLC {
        HashBase64: hashBase64,
        ExpiryTimeSecs: expiryTimeSecs,
    }
    lockInfoBytes, err := proto.Marshal(lockInfoHTLC)
    if err != nil {
        return []byte(""), logThenErrorf(err.Error())
    }
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }
    lockInfoProtoBytes, err := proto.Marshal(lockInfo)
    if err != nil {
        return []byte(""), logThenErrorf(err.Error())
    }

    return lockInfoProtoBytes, nil
}

func getAssetLockMapKey(ctx contractapi.TransactionContextInterface, Type, Id string) (string, error) {
    assetLockKey, err := ctx.GetStub().CreateCompositeKey("AssetExchangeContract", []string{Type, Id})
    if err != nil {
        return "", logThenErrorf("error while creating composite key: %+v", err)
    }

    return assetLockKey, nil
}

func getBondAssetContractIdMapKey(contractId string) string {
    return "BondContract_" + contractId
}

func getTokenAssetContractIdMapKey(contractId string) string {
    return "TokenContract_" + contractId
}

func deleteBondAssetLookupMaps(ctx contractapi.TransactionContextInterface, assetAgreement *common.AssetExchangeAgreement) error {
    // delete the lookup details
    assetLockKey, err := getAssetLockMapKey(ctx, assetAgreement.Type, assetAgreement.Id)
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
    err = ctx.GetStub().DelState(getBondAssetContractIdMapKey(string(contractIdBytes)))
    if err != nil {
        return logThenErrorf("failed to delete entry contractId %s from bond asset network ledger: %+v", string(contractIdBytes), err)
    }
    err = ctx.GetStub().DelState(assetLockKey)
    if err != nil {
        return logThenErrorf("failed to delete entry associated with contractId %s from bond asset ledger: %+v", string(contractIdBytes), err)
    }

    return nil
}

// Ledger transaction (invocation) functions

func (s *SmartContract) LockAsset(ctx contractapi.TransactionContextInterface, assetExchangeAgreementSerializedProto64 string, lockInfoSerializedProto64 string) (string, error) {

    assetAgreement, err := s.amc.ValidateAndExtractAssetAgreement(assetExchangeAgreementSerializedProto64)
    if err != nil {
        return "", err
    }
    lockInfo, err := s.amc.ValidateAndExtractLockInfo(lockInfoSerializedProto64)
    if err != nil {
        return "", err
    }
    lockInfoHTLC := &common.AssetLockHTLC{}
    err = proto.Unmarshal(lockInfo.LockInfo, lockInfoHTLC)
    if err != nil {
	    return "", logThenErrorf("unmarshal error: %+v", err)
    }
    bond, err := s.ReadAsset(ctx, assetAgreement.Type, assetAgreement.Id)
    if err != nil {
	    return "", logThenErrorf("failed reading the bond asset: %+v", err)
    }
    log.Infof("bond: %+v", *bond)
    log.Infof("lockInfoHTLC: %+v", *lockInfoHTLC)

    // Check if asset doesn't mature before locking period
    if uint64(bond.MaturityDate.Unix()) < lockInfoHTLC.ExpiryTimeSecs {
        return "", logThenErrorf("cannot lock bond asset as it will mature before locking period")
    }
    // Check if asset is already locked
    locked, err := s.IsAssetLocked(ctx, assetExchangeAgreementSerializedProto64)
    if err != nil {
        return "", logThenErrorf(err.Error())
    }
    // If asset is locked, simply return success (effectively a noop)
    if locked {
        log.Info("asset already in locked state")
        return "", nil
    }
    contractId, err := s.amc.LockAsset(ctx, assetExchangeAgreementSerializedProto64, lockInfoSerializedProto64)
    if err != nil {
        return "", logThenErrorf(err.Error())
    }

    // write to the ledger the details needed at the time of unlock/claim
    contractedBondAsset := &ContractedBondAsset {
	Type: assetAgreement.Type,
	Id: assetAgreement.Id,
    }
    contractedBondAssetBytes, err := json.Marshal(contractedBondAsset)
    if err != nil {
        return "", logThenErrorf("marshal error: %+v", err)
    }
    assetLockKey, err := getAssetLockMapKey(ctx, assetAgreement.Type, assetAgreement.Id)
    if err != nil {
	return "", logThenErrorf(err.Error())
    }
    err = ctx.GetStub().PutState(assetLockKey, []byte(contractId))
    if err != nil {
	return "", logThenErrorf("failed to write to the bond asset network ledger: %+v", err)
    }
    err = ctx.GetStub().PutState(getBondAssetContractIdMapKey(contractId), contractedBondAssetBytes)
    if err != nil {
	return "", logThenErrorf("failed to write to the bond asset network ledger: %+v", err)
    }

    return contractId, nil
}

func (s *SmartContract) LockFungibleAsset(ctx contractapi.TransactionContextInterface, fungibleAssetExchangeAgreementSerializedProto64 string, lockInfoSerializedProto64 string) (string, error) {

    assetAgreement, err := s.amc.ValidateAndExtractFungibleAssetAgreement(fungibleAssetExchangeAgreementSerializedProto64)
    if err != nil {
        return "", err
    }
    lockInfo, err := s.amc.ValidateAndExtractLockInfo(lockInfoSerializedProto64)
    if err != nil {
        return "", err
    }
    lockInfoHTLC := &common.AssetLockHTLC{}
    err = proto.Unmarshal(lockInfo.LockInfo, lockInfoHTLC)
    if err != nil {
	    return "", logThenErrorf("unmarshal error: %+v", err)
    }

    // Check if locker/transaction-creator has enough quantity of token assets to lock
    locker, err := getECertOfTxCreatorBase64(ctx)
    if err != nil {
        return "", logThenErrorf(err.Error())
    }
    lockerHasEnoughTokens, err := s.TokenAssetsExist(ctx, assetAgreement.Type, assetAgreement.NumUnits, locker)
    if err != nil {
        return "", logThenErrorf(err.Error())
    }
    if lockerHasEnoughTokens == false {
        return "", logThenErrorf("cannot lock token asset of type %s as there are not enough tokens", assetAgreement.Type)
    }

    contractId, err := s.amc.LockFungibleAsset(ctx, fungibleAssetExchangeAgreementSerializedProto64, lockInfoSerializedProto64)
    if err != nil {
        return "", logThenErrorf(err.Error())
    }

    _, err = s.SubtractTokenAssetsFromWallet(ctx, assetAgreement.Type, assetAgreement.NumUnits, locker)
    if err != nil {
	// not performing the operation UnlockFungibleAsset and let the TxCreator take care of it
        return contractId, logThenErrorf(err.Error())
    }

    contractedTokenAsset := &ContractedTokenAsset {
	Type: assetAgreement.Type,
	NumUnits: assetAgreement.NumUnits,
    }
    contractedTokenAssetBytes, err := json.Marshal(contractedTokenAsset)
    if err != nil {
        return "", logThenErrorf("marshal error: %+v", err)
    }
    err = ctx.GetStub().PutState(getTokenAssetContractIdMapKey(contractId), contractedTokenAssetBytes)
    if err != nil {
	return "", logThenErrorf("failed to write to the token asset network ledger: %+v", err)
    }

    return contractId, nil
}

// Check whether this asset has been locked by anyone (not just by caller)
func (s *SmartContract) IsAssetLocked(ctx contractapi.TransactionContextInterface, assetAgreementSerializedProto64 string) (bool, error) {
    return s.amc.IsAssetLocked(ctx, assetAgreementSerializedProto64)
}

// Check whether a bond asset has been locked using contractId by anyone (not just by caller)
func (s *SmartContract) IsAssetLockedQueryUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
    return s.amc.IsAssetLockedQueryUsingContractId(ctx, contractId)
}

// Check whether a token asset has been locked using contractId by anyone (not just by caller)
func (s *SmartContract) IsFungibleAssetLocked(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
    return s.amc.IsFungibleAssetLocked(ctx, contractId)
}

func (s *SmartContract) ClaimAsset(ctx contractapi.TransactionContextInterface, assetAgreementSerializedProto64 string, claimInfoSerializedProto64 string) (bool, error) {
    assetAgreement, err := s.amc.ValidateAndExtractAssetAgreement(assetAgreementSerializedProto64)
    if err != nil {
        return false, err
    }
    claimed, err := s.amc.ClaimAsset(ctx, assetAgreementSerializedProto64, claimInfoSerializedProto64)
    if err != nil {
        return false, logThenErrorf(err.Error())
    }
    if claimed {
        // Change asset ownership to claimant
        recipientECertBase64, err := getECertOfTxCreatorBase64(ctx)
        if err != nil {
            return false, logThenErrorf(err.Error())
        }
        err = s.UpdateOwner(ctx, assetAgreement.Type, assetAgreement.Id, string(recipientECertBase64))
        if err != nil {
            return false, logThenErrorf(err.Error())
        }

	err = deleteBondAssetLookupMaps(ctx, assetAgreement)
	if err != nil {
		return false, logThenErrorf("failed to delete bond asset lookup maps: %+v", err)
	}

        return true, nil
    } else {
        return false, logThenErrorf("claim on bond asset type %s with asset id %s failed", assetAgreement.Type, assetAgreement.Id)
    }
}

func (s *SmartContract) ClaimAssetUsingContractId(ctx contractapi.TransactionContextInterface, contractId, claimInfoSerializedProto64 string) (bool, error) {
    claimed, err := s.amc.ClaimAsset(ctx, contractId, claimInfoSerializedProto64)
    if err != nil {
        return false, logThenErrorf(err.Error())
    }
    if claimed {
        // Change asset ownership to claimant
        recipientECertBase64, err := getECertOfTxCreatorBase64(ctx)
        if err != nil {
            return false, logThenErrorf(err.Error())
        }

	// Fetch the contracted bond asset type and id from the ledger
	contractedBondAssetBytes, err := ctx.GetStub().GetState(getBondAssetContractIdMapKey(contractId))
	if err != nil {
	    return false, logThenErrorf("failed to read from bond asset network ledger: %+v", err)
        }
	contractedBondAsset := ContractedBondAsset{}
	err = json.Unmarshal(contractedBondAssetBytes, &contractedBondAsset)
        if err != nil {
		return false, logThenErrorf("unmarshal error: %+v", err)
        }

        err = s.UpdateOwner(ctx, contractedBondAsset.Type, contractedBondAsset.Id, recipientECertBase64)
        if err != nil {
            return false, logThenErrorf(err.Error())
        }
	// delete the lookup maps
	assetLockKey, err := getAssetLockMapKey(ctx, contractedBondAsset.Type, contractedBondAsset.Id)
	if err != nil {
            return false, logThenErrorf(err.Error())
	}
	err = ctx.GetStub().DelState(assetLockKey)
	if err != nil {
            return false, logThenErrorf("failed to delete entry associated with contractId %s from bond asset ledger: %+v", contractId, err)
	}
	err = ctx.GetStub().DelState(contractId)
	if err != nil {
            return false, logThenErrorf("failed to delete contractId %s from bond asset network ledger: %+v", contractId, err)
	}

        return true, nil
    } else {
        return false, logThenErrorf("claim on bond asset using contractId %s failed", contractId)
    }
}

func (s *SmartContract) ClaimFungibleAsset(ctx contractapi.TransactionContextInterface, contractId, claimInfoSerializedProto64 string) (bool, error) {
    claimed, err := s.amc.ClaimFungibleAsset(ctx, contractId, claimInfoSerializedProto64)
    if err != nil {
        return false, logThenErrorf(err.Error())
    }
    if claimed {
        // Add the claimed tokens into the wallet of the claimant
        recipientECertBase64, err := getECertOfTxCreatorBase64(ctx)
        if err != nil {
            return false, logThenErrorf(err.Error())
        }

	// Fetch the contracted token asset type and numUnits from the ledger
	contractedTokenAssetBytes, err := ctx.GetStub().GetState(getTokenAssetContractIdMapKey(contractId))
	if err != nil {
	    return false, logThenErrorf("failed to read from token asset network ledger: %+v", err)
        }
	contractedTokenAsset := ContractedTokenAsset{}
	err = json.Unmarshal(contractedTokenAssetBytes, &contractedTokenAsset)
        if err != nil {
		return false, logThenErrorf("unmarshal error: %+v", err)
        }

        _, err = s.AddTokenAssetsIntoWallet(ctx, contractedTokenAsset.Type, contractedTokenAsset.NumUnits, recipientECertBase64)
        if err != nil {
            return false, logThenErrorf(err.Error())
        }
	err = ctx.GetStub().DelState(contractId)
	if err != nil {
            return false, logThenErrorf("failed to delete contractId %s from token asset network ledger: %+v", contractId, err)
	}
        return true, nil
    } else {
        return false, logThenErrorf("claim on token asset using contractId %s failed", contractId)
    }
}

func (s *SmartContract) UnlockAsset(ctx contractapi.TransactionContextInterface, assetAgreementSerializedProto64 string) (bool, error) {
    assetAgreement, err := s.amc.ValidateAndExtractAssetAgreement(assetAgreementSerializedProto64)
    if err != nil {
        return false, err
    }

    unlocked, err := s.amc.UnlockAsset(ctx, assetAgreementSerializedProto64)
    if err != nil {
        return false, logThenErrorf(err.Error())
    }
    if unlocked {
	err = deleteBondAssetLookupMaps(ctx, assetAgreement)
	if err != nil {
            return false, logThenErrorf("failed to delete bond asset lookup maps: %+v", err)
        }
    } else {
        return false, logThenErrorf("unlock on bond asset type %s with asset id %s failed", assetAgreement.Type, assetAgreement.Id)
    }

    return true, nil
}

func (s *SmartContract) UnlockBondAssetUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
    unlocked, err := s.amc.UnlockAssetUsingContractId(ctx, contractId)
    if err != nil {
        return false, logThenErrorf(err.Error())
    }
    if unlocked {
        // delete the lookup maps
        contractedBondAssetBytes, err := ctx.GetStub().GetState(getBondAssetContractIdMapKey(contractId))
        if err != nil {
            return false, logThenErrorf("failed to read from bond asset network ledger: %+v", err)
        }
        contractedBondAsset := ContractedBondAsset{}
        err = json.Unmarshal(contractedBondAssetBytes, &contractedBondAsset)
        if err != nil {
            return false, logThenErrorf("unmarshal error: %+v", err)
        }
        assetLockKey, err := getAssetLockMapKey(ctx, contractedBondAsset.Type, contractedBondAsset.Id)
        if err != nil {
            return false, logThenErrorf(err.Error())
        }
        err = ctx.GetStub().DelState(assetLockKey)
        if err != nil {
            return false, logThenErrorf("failed to delete entry associated with contractId %s from bond asset ledger: %+v", contractId, err)
        }
        err = ctx.GetStub().DelState(contractId)
        if err != nil {
            return false, logThenErrorf("failed to delete contractId %s from bond asset network ledger: %+v", contractId, err)
        }
        return true, nil
    } else {
        return false, logThenErrorf("unlock on bond asset using contractId %s failed", contractId)
    }
}

func (s *SmartContract) UnlockFungibleAsset(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
    unlocked, err := s.amc.UnlockFungibleAsset(ctx, contractId)
    if err != nil {
        return false, logThenErrorf(err.Error())
    }
    if unlocked {
        // Add the unlocked tokens into the wallet of the locker
        lockerECertBase64, err := getECertOfTxCreatorBase64(ctx)
        if err != nil {
            return false, logThenErrorf(err.Error())
        }

	// Fetch the contracted token asset type and numUnits from the ledger
	contractedTokenAssetBytes, err := ctx.GetStub().GetState(getTokenAssetContractIdMapKey(contractId))
	if err != nil {
	    return false, logThenErrorf("failed to read from token asset network ledger: %+v", err)
        }
	contractedTokenAsset := ContractedTokenAsset{}
	err = json.Unmarshal(contractedTokenAssetBytes, &contractedTokenAsset)
        if err != nil {
		return false, logThenErrorf("unmarshal error: %+v", err)
        }

        _, err = s.AddTokenAssetsIntoWallet(ctx, contractedTokenAsset.Type, contractedTokenAsset.NumUnits, lockerECertBase64)
        if err != nil {
            return false, logThenErrorf(err.Error())
        }
	err = ctx.GetStub().DelState(contractId)
	if err != nil {
            return false, logThenErrorf("failed to delete contractId %s from token asset network ledger: %+v", contractId, err)
        }
        return true, nil
    } else {
        return false, logThenErrorf("unlock on token asset using contractId %s failed", contractId)
    }
}
