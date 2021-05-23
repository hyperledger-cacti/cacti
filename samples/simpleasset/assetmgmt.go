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

    "github.com/golang/protobuf/proto"
    log "github.com/sirupsen/logrus"
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
    "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/interfaces/asset-mgmt/protos-go/common"
)

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

// Ledger transaction (invocation) functions

func (s *SmartContract) LockBondAsset(ctx contractapi.TransactionContextInterface, bond *BondAsset, bondType, recipient string, hashBase64 []byte, expiryTimeSecs uint64) (string, error) {
    // Check if asset doesn't mature before locking period
    if uint64(bond.MaturityDate.Unix()) < (uint64(time.Now().Unix()) + expiryTimeSecs) {
        return "", logThenErrorf("cannot lock bond asset as it will mature before locking period")
    }
    // Check if asset is already locked
    locked, err := s.IsBondAssetLocked(ctx, bond, bondType)
    if err != nil {
        return "", logThenErrorf(err.Error())
    }
    // If asset is locked, simply return success (effectively a noop)
    if locked {
        log.Info("asset already in locked state")
        return "", nil
    }
    assetAgreement := &common.AssetExchangeAgreement {
        Type: bondType,
        Id: bond.ID,
        Recipient: recipient,
    }
    assetAgreementBytes, err := proto.Marshal(assetAgreement)
    if err != nil {
        return "", logThenErrorf(err.Error())
    }
    lockInfoProtoBytes, err := getLockInfoProtoBytesHTLC(hashBase64, expiryTimeSecs)
    if err != nil {
        return "", logThenErrorf(err.Error())
    }
    return s.LockAsset(ctx, string(assetAgreementBytes), string(lockInfoProtoBytes))
}

func (s *SmartContract) LockTokenAsset(ctx contractapi.TransactionContextInterface, tokenType string, numUnits uint64, recipient string, hashBase64 []byte, expiryTimeSecs uint64) (string, error) {

    // Check if locker/transaction-creator has enough quantity of token assets to lock
    locker, err := getECertOfTxCreatorBase64(ctx)
    if err != nil {
        return "", logThenErrorf(err.Error())
    }
    lockerHasEnoughTokens, err := s.TokenAssetsExist(ctx, tokenType, numUnits, locker)
    if err != nil {
        return "", logThenErrorf(err.Error())
    }
    if lockerHasEnoughTokens == false {
        return "", logThenErrorf("cannot lock token asset of type %s as there are not enough tokens", tokenType)
    }

    assetAgreement := &common.FungibleAssetExchangeAgreement {
        Type: tokenType,
        NumUnits: numUnits,
        Recipient: recipient,
    }
    assetAgreementBytes, err := proto.Marshal(assetAgreement)
    if err != nil {
        return "", logThenErrorf(err.Error())
    }
    lockInfoProtoBytes, err := getLockInfoProtoBytesHTLC(hashBase64, expiryTimeSecs)
    if err != nil {
        return "", logThenErrorf(err.Error())
    }

    contractId, err := s.LockFungibleAsset(ctx, string(assetAgreementBytes), string(lockInfoProtoBytes))
    if err != nil {
        return "", logThenErrorf(err.Error())
    }

    _, err = s.SubtractTokenAssetsFromWallet(ctx, tokenType, numUnits, locker)
    if err != nil {
	// not performing the operation UnlockFungibleAsset and let the TxCreator take care of it
        return contractId, logThenErrorf(err.Error())
    }

    return contractId, nil
}

// Check whether this asset has been locked by anyone (not just by caller)
func (s *SmartContract) IsBondAssetLocked(ctx contractapi.TransactionContextInterface, bond *BondAsset, bondType string) (bool, error) {
    assetAgreement := &common.AssetExchangeAgreement {
        Type: bondType,
        Id: bond.ID,
        Recipient: "*",
        Locker: "*",
    }
    assetAgreementBytes, err := proto.Marshal(assetAgreement)
    if err != nil {
        return false, logThenErrorf(err.Error())
    }
    return s.IsAssetLocked(ctx, string(assetAgreementBytes))
}

// Check whether a bond asset has been locked using contractId by anyone (not just by caller)
func (s *SmartContract) IsBondAssetLockedQueryUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
    return s.IsAssetLockedQueryUsingContractId(ctx, contractId)
}

// Check whether a token asset has been locked using contractId by anyone (not just by caller)
func (s *SmartContract) IsTokenAssetLocked(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
    return s.IsFungibleAssetLocked(ctx, contractId)
}

func (s *SmartContract) ClaimBondAsset(ctx contractapi.TransactionContextInterface, bond *BondAsset, bondType, locker string, hashPreimage []byte) (bool, error) {
    assetAgreement := &common.AssetExchangeAgreement {
        Type: bondType,
        Id: bond.ID,
        Locker: locker,
    }
    assetAgreementBytes, err := proto.Marshal(assetAgreement)
    if err != nil {
        return false, logThenErrorf(err.Error())
    }
    claimInfoProtoBytes, err := getClaimInfoProtoBytesHTLC(hashPreimage)
    if err != nil {
	return false, err
    }
    claimed, err := s.ClaimAsset(ctx, string(assetAgreementBytes), string(claimInfoProtoBytes))
    if err != nil {
        return false, logThenErrorf(err.Error())
    }
    if claimed {
        // Change asset ownership to claimant
        txCreatorECertBase64, err := getECertOfTxCreatorBase64(ctx)
        if err != nil {
            return false, logThenErrorf(err.Error())
        }
        err = s.UpdateOwner(ctx, bond.ID, string(txCreatorECertBase64))
        if err != nil {
            return false, logThenErrorf(err.Error())
        }
        return true, nil
    } else {
        return false, logThenErrorf("claim on bond asset type %s, id %s, failed", bondType, bond.ID)
    }
}

func (s *SmartContract) ClaimBondAssetUsingContractId(ctx contractapi.TransactionContextInterface, bondType, bondId, contractId string, hashPreimage []byte) (bool, error) {
    claimInfoProtoBytes, err := getClaimInfoProtoBytesHTLC(hashPreimage)
    if err != nil {
	return false, err
    }
    claimed, err := s.ClaimAsset(ctx, contractId, string(claimInfoProtoBytes))
    if err != nil {
        return false, logThenErrorf(err.Error())
    }
    if claimed {
        // Change asset ownership to claimant
        txCreatorECertBase64, err := getECertOfTxCreatorBase64(ctx)
        if err != nil {
            return false, logThenErrorf(err.Error())
        }
        err = s.UpdateOwner(ctx, bondId, txCreatorECertBase64)
        if err != nil {
            return false, logThenErrorf(err.Error())
        }
        return true, nil
    } else {
        return false, logThenErrorf("claim on bond asset type %s with id %s using contractId %s failed", bondType, bondId, contractId)
    }
}

func (s *SmartContract) ClaimTokenAsset(ctx contractapi.TransactionContextInterface, tokenType string, numUnits uint64, contractId string, hashPreimage []byte) (bool, error) {
    claimInfoProtoBytes, err := getClaimInfoProtoBytesHTLC(hashPreimage)
    if err != nil {
	return false, err
    }
    claimed, err := s.ClaimFungibleAsset(ctx, contractId, string(claimInfoProtoBytes))
    if err != nil {
        return false, logThenErrorf(err.Error())
    }
    if claimed {
        // Add the claimed tokens into the wallet of the claimant
        recipientECertBase64, err := getECertOfTxCreatorBase64(ctx)
        if err != nil {
            return false, logThenErrorf(err.Error())
        }
        _, err = s.AddTokenAssetsIntoWallet(ctx, tokenType, numUnits, recipientECertBase64)
        if err != nil {
            return false, logThenErrorf(err.Error())
        }
        return true, nil
    } else {
        return false, logThenErrorf("claim on token asset type %s using contractId %s failed", tokenType, contractId)
    }
}

func (s *SmartContract) UnlockBondAsset(ctx contractapi.TransactionContextInterface, bond *BondAsset, bondType, recipient string) (bool, error) {
    txCreator, err := ctx.GetStub().GetCreator()
    if err != nil {
        return false, logThenErrorf(err.Error())
    }
    assetAgreement := &common.AssetExchangeAgreement {
        Type: bondType,
        Id: bond.ID,
        Recipient: recipient,
        Locker: string(txCreator),
    }
    assetAgreementBytes, err := proto.Marshal(assetAgreement)
    if err != nil {
        return false, logThenErrorf(err.Error())
    }
    return s.UnlockAsset(ctx, string(assetAgreementBytes))
}

func (s *SmartContract) UnlockBondAssetUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
    return s.UnlockAssetUsingContractId(ctx, contractId)
}

func (s *SmartContract) UnlockTokenAsset(ctx contractapi.TransactionContextInterface, tokenType string, numUnits uint64, contractId string) (bool, error) {
    unlocked, err := s.UnlockFungibleAsset(ctx, contractId)
    if err != nil {
        return false, logThenErrorf(err.Error())
    }
    if unlocked {
        // Add the unlocked tokens into the wallet of the locker
        lockerECertBase64, err := getECertOfTxCreatorBase64(ctx)
        if err != nil {
            return false, logThenErrorf(err.Error())
        }
        _, err = s.AddTokenAssetsIntoWallet(ctx, tokenType, numUnits, lockerECertBase64)
        if err != nil {
            return false, logThenErrorf(err.Error())
        }
        return true, nil
    } else {
        return false, logThenErrorf("unlock on token asset type %s using contractId %s failed", tokenType, contractId)
    }
}
