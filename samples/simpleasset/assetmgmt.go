/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package main

import (
    "fmt"
    "errors"

    "github.com/golang/protobuf/proto"
    log "github.com/sirupsen/logrus"
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
    "github.com/hyperledger-labs/weaver/samples/simpleasset/protos-go/common"
)


// Ledger transaction (invocation) functions

func (s *SmartContract) LockBondAsset(ctx contractapi.TransactionContextInterface, bond *BondAsset, bondType, recipient string, hashBase64 []byte, expiryTimeSecs uint64) (bool, error) {
    // Check if asset is already locked
    locked, err := s.IsBondAssetLocked(ctx, bond, bondType)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    // If asset is locked, simply return success (effectively a noop)
    if locked {
        log.Info("asset already in locked state")
        return true, nil
    }
    assetAgreement := &common.AssetExchangeAgreement {
        Type: bondType,
        Id: bond.ID,
        Recipient: recipient,
    }
    assetAgreementBytes, err := proto.Marshal(assetAgreement)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    lockInfoHTLC := &common.AssetLockHTLC {
        HashBase64: hashBase64,
        ExpiryTimeSecs: expiryTimeSecs,
    }
    lockInfoBytes, _ := proto.Marshal(lockInfoHTLC)
    lockInfo := &common.AssetLock {
        LockMechanism: common.LockMechanism_HTLC,
        LockInfo: lockInfoBytes,
    }
    lockInfoProtoBytes, err := proto.Marshal(lockInfo)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    return s.LockAsset(ctx, string(assetAgreementBytes), string(lockInfoProtoBytes))
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
        log.Error(err.Error())
        return false, err
    }
    return s.IsAssetLocked(ctx, string(assetAgreementBytes))
}

func (s *SmartContract) ClaimBondAsset(ctx contractapi.TransactionContextInterface, bond *BondAsset, bondType, locker string, hashPreimage []byte) (bool, error) {
    assetAgreement := &common.AssetExchangeAgreement {
        Type: bondType,
        Id: bond.ID,
        Locker: locker,
    }
    assetAgreementBytes, err := proto.Marshal(assetAgreement)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
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
        log.Error(err.Error())
        return false, err
    }
    claimed, err := s.ClaimAsset(ctx, string(assetAgreementBytes), string(claimInfoProtoBytes))
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    if claimed {
        // Change asset ownership to claimant
        txCreator, err := ctx.GetStub().GetCreator()
        if err != nil {
            log.Error(err.Error())
            return false, err
        }
        err = s.UpdateOwner(ctx, bond.ID, string(txCreator))
        if err != nil {
            log.Error(err.Error())
            return false, err
        }
        return true, nil
    } else {
        errorMsg := fmt.Sprintf("claim on asset type %s, id %s, failed", bondType, bond.ID)
        log.Error(errorMsg)
        return false, errors.New(errorMsg)
    }
}

func (s *SmartContract) UnlockBondAsset(ctx contractapi.TransactionContextInterface, bond *BondAsset, bondType, recipient string) (bool, error) {
    txCreator, err := ctx.GetStub().GetCreator()
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    assetAgreement := &common.AssetExchangeAgreement {
        Type: bondType,
        Id: bond.ID,
        Recipient: recipient,
        Locker: string(txCreator),
    }
    assetAgreementBytes, err := proto.Marshal(assetAgreement)
    if err != nil {
        log.Error(err.Error())
        return false, err
    }
    return s.UnlockAsset(ctx, string(assetAgreementBytes))
}
