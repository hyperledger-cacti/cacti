/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package main

import (
	"encoding/base64"
	"encoding/json"

	"github.com/golang/protobuf/proto"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/assetexchange"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	log "github.com/sirupsen/logrus"
)

// asset specific checks (ideally an asset in a different application might implement checks specific to that asset)
func (s *SmartContract) BondAssetSpecificChecks(ctx contractapi.TransactionContextInterface, assetType, id string, lockInfoSerializedProto64 string) error {

	lockInfo := &common.AssetLock{}
	// Decoding from base64
	lockInfoSerializedProto, err := base64.StdEncoding.DecodeString(lockInfoSerializedProto64)
	if err != nil {
		return logThenErrorf(err.Error())
	}
	if len(lockInfoSerializedProto) == 0 {
		return logThenErrorf("empty lock info")
	}
	err = proto.Unmarshal([]byte(lockInfoSerializedProto), lockInfo)
	if err != nil {
		return logThenErrorf(err.Error())
	}

	lockInfoHTLC := &common.AssetLockHTLC{}
	err = proto.Unmarshal(lockInfo.LockInfo, lockInfoHTLC)
	if err != nil {
		return logThenErrorf("unmarshal error: %+v", err)
	}
	// ReadAsset should check both the existence and ownership of the asset for the locker
	bond, err := s.ReadAsset(ctx, assetType, id, false)
	if err != nil {
		return logThenErrorf("failed reading the bond asset: %+v", err)
	}
	log.Infof("bond: %+v", *bond)
	log.Infof("lockInfoHTLC: %+v", *lockInfoHTLC)

	// Check if asset doesn't mature before locking period
	if uint64(bond.MaturityDate.Unix()) < lockInfoHTLC.ExpiryTimeSecs {
		return logThenErrorf("cannot lock bond asset as it will mature before locking period")
	}

	return nil
}

// Ledger transaction (invocation) functions

func (s *SmartContract) LockAsset(ctx contractapi.TransactionContextInterface, assetExchangeAgreementSerializedProto64 string, lockInfoSerializedProto64 string) (string, error) {

	assetAgreement, err := s.ValidateAndExtractAssetAgreement(assetExchangeAgreementSerializedProto64)
	if err != nil {
		return "", err
	}
	err = s.BondAssetSpecificChecks(ctx, assetAgreement.AssetType, assetAgreement.Id, lockInfoSerializedProto64)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	contractId, err := assetexchange.LockAsset(ctx, "", assetExchangeAgreementSerializedProto64, lockInfoSerializedProto64)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	// write to the ledger the details needed at the time of unlock/claim
	err = s.ContractIdAssetsLookupMap(ctx, assetAgreement.AssetType, assetAgreement.Id, contractId)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	return contractId, nil
}

func (s *SmartContract) LockFungibleAsset(ctx contractapi.TransactionContextInterface, fungibleAssetExchangeAgreementSerializedProto64 string, lockInfoSerializedProto64 string) (string, error) {

	assetAgreement, err := s.ValidateAndExtractFungibleAssetAgreement(fungibleAssetExchangeAgreementSerializedProto64)
	if err != nil {
		return "", err
	}

	lockInfo := &common.AssetLock{}
	// Decoding from base64
	lockInfoSerializedProto, err := base64.StdEncoding.DecodeString(lockInfoSerializedProto64)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}
	if len(lockInfoSerializedProto) == 0 {
		return "", logThenErrorf("empty lock info")
	}
	err = proto.Unmarshal([]byte(lockInfoSerializedProto), lockInfo)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	lockInfoHTLC := &common.AssetLockHTLC{}
	err = proto.Unmarshal(lockInfo.LockInfo, lockInfoHTLC)
	if err != nil {
		return "", logThenErrorf("unmarshal error: %+v", err)
	}

	// Check if locker/transaction-creator has enough quantity of token assets to lock
	lockerHasEnoughTokens, err := s.TokenAssetsExist(ctx, assetAgreement.AssetType, assetAgreement.NumUnits)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}
	if !lockerHasEnoughTokens {
		return "", logThenErrorf("cannot lock token asset of type %s as there are not enough tokens", assetAgreement.AssetType)
	}

	contractId, err := assetexchange.LockFungibleAsset(ctx, "", fungibleAssetExchangeAgreementSerializedProto64, lockInfoSerializedProto64)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	err = s.DeleteTokenAssets(ctx, assetAgreement.AssetType, assetAgreement.NumUnits)
	if err != nil {
		// not performing the operation UnlockFungibleAsset and let the TxCreator take care of it
		return contractId, logThenErrorf(err.Error())
	}

	err = s.ContractIdFungibleAssetsLookupMap(ctx, assetAgreement.AssetType, assetAgreement.NumUnits, contractId)
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	return contractId, nil
}

// Check whether this asset has been locked by anyone (not just by caller)
func (s *SmartContract) IsAssetLocked(ctx contractapi.TransactionContextInterface, assetAgreementSerializedProto64 string) (bool, error) {
	return assetexchange.IsAssetLocked(ctx, "", assetAgreementSerializedProto64)
}

// Check whether a bond asset has been locked using contractId by anyone (not just by caller)
func (s *SmartContract) IsAssetLockedQueryUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
	return assetexchange.IsAssetLockedQueryUsingContractId(ctx, contractId)
}

// Check whether a token asset has been locked using contractId by anyone (not just by caller)
func (s *SmartContract) IsFungibleAssetLocked(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
	return assetexchange.IsFungibleAssetLocked(ctx, contractId)
}

func (s *SmartContract) ClaimAsset(ctx contractapi.TransactionContextInterface, assetAgreementSerializedProto64 string, claimInfoSerializedProto64 string) (bool, error) {
	assetAgreement, err := s.ValidateAndExtractAssetAgreement(assetAgreementSerializedProto64)
	if err != nil {
		return false, err
	}
	claimed := false
	_, err = assetexchange.ClaimAsset(ctx, "", assetAgreementSerializedProto64, claimInfoSerializedProto64)
	if err != nil {
		return false, logThenErrorf(err.Error())
	} else {
		claimed = true
	}
	if claimed {
		// Change asset ownership to claimant
		recipientECertBase64, err := getECertOfTxCreatorBase64(ctx)
		if err != nil {
			return false, logThenErrorf(err.Error())
		}
		asset, err := s.ReadAsset(ctx, assetAgreement.AssetType, assetAgreement.Id, true)
		if err != nil {
			return false, logThenErrorf(err.Error())
		}
		asset.Owner = string(recipientECertBase64)
		assetJSON, err := json.Marshal(asset)
		if err != nil {
			return false, logThenErrorf(err.Error())
		}
		err = ctx.GetStub().PutState(getBondAssetKey(assetAgreement.AssetType, assetAgreement.Id), assetJSON)
		if err != nil {
			return false, logThenErrorf(err.Error())
		}

		err = s.DeleteAssetLookupMaps(ctx, assetAgreement.AssetType, assetAgreement.Id)
		if err != nil {
			return false, logThenErrorf("failed to delete bond asset lookup maps: %+v", err)
		}

		return true, nil
	} else {
		return false, logThenErrorf("claim on bond asset type %s with asset id %s failed", assetAgreement.AssetType, assetAgreement.Id)
	}
}

func (s *SmartContract) ClaimAssetUsingContractId(ctx contractapi.TransactionContextInterface, contractId, claimInfoSerializedProto64 string) (bool, error) {
	claimed := false
	err := assetexchange.ClaimAssetUsingContractId(ctx, contractId, claimInfoSerializedProto64)
	if err != nil {
		return false, logThenErrorf(err.Error())
	} else {
		claimed = true
	}
	if claimed {
		// Change asset ownership to claimant
		recipientECertBase64, err := getECertOfTxCreatorBase64(ctx)
		if err != nil {
			return false, logThenErrorf(err.Error())
		}

		// Fetch the contracted bond asset type from the ledger
		assetType, err := s.FetchAssetTypeFromContractIdAssetLookupMap(ctx, contractId)
		if err != nil {
			return false, logThenErrorf(err.Error())
		}
		// Fetch the contracted bond asset id from the ledger
		assetId, err := s.FetchAssetIdFromContractIdAssetLookupMap(ctx, contractId)
		if err != nil {
			return false, logThenErrorf(err.Error())
		}

		asset, err := s.ReadAsset(ctx, assetType, assetId, true)
		if err != nil {
			return false, logThenErrorf(err.Error())
		}
		asset.Owner = recipientECertBase64
		assetJSON, err := json.Marshal(asset)
		if err != nil {
			return false, logThenErrorf(err.Error())
		}
		err = ctx.GetStub().PutState(getBondAssetKey(assetType, assetId), assetJSON)
		if err != nil {
			return false, logThenErrorf(err.Error())
		}
		// delete the lookup maps
		err = s.DeleteAssetLookupMapsUsingContractId(ctx, assetType, assetId, contractId)
		if err != nil {
			return false, logThenErrorf(err.Error())
		}

		return true, nil
	} else {
		return false, logThenErrorf("claim on bond asset using contractId %s failed", contractId)
	}
}

func (s *SmartContract) ClaimFungibleAsset(ctx contractapi.TransactionContextInterface, contractId, claimInfoSerializedProto64 string) (bool, error) {
	claimed := false
	err := assetexchange.ClaimFungibleAsset(ctx, contractId, claimInfoSerializedProto64)
	if err != nil {
		return false, logThenErrorf(err.Error())
	} else {
		claimed = true
	}
	if claimed {
		// Add the claimed tokens into the wallet of the claimant
		recipientECertBase64, err := getECertOfTxCreatorBase64(ctx)
		if err != nil {
			return false, logThenErrorf(err.Error())
		}

		// Fetch the contracted token asset type from the ledger
		assetType, err := s.FetchAssetTypeFromContractIdFungibleAssetLookupMap(ctx, contractId)
		if err != nil {
			return false, logThenErrorf(err.Error())
		}
		// Fetch the contracted token asset numUnits from the ledger
		numUnits, err := s.FetchNumUnitsFromContractIdFungibleAssetLookupMap(ctx, contractId)
		if err != nil {
			return false, logThenErrorf(err.Error())
		}

		err = s.IssueTokenAssets(ctx, assetType, numUnits, recipientECertBase64)
		if err != nil {
			return false, logThenErrorf(err.Error())
		}
		err = s.DeleteFungibleAssetLookupMap(ctx, contractId)
		if err != nil {
			return false, logThenErrorf(err.Error())
		}
		return true, nil
	} else {
		return false, logThenErrorf("claim on token asset using contractId %s failed", contractId)
	}
}

func (s *SmartContract) UnlockAsset(ctx contractapi.TransactionContextInterface, assetAgreementSerializedProto64 string) (bool, error) {
	assetAgreement, err := s.ValidateAndExtractAssetAgreement(assetAgreementSerializedProto64)
	if err != nil {
		return false, err
	}

	unlocked := false
	_, err = assetexchange.UnlockAsset(ctx, "", assetAgreementSerializedProto64)
	if err != nil {
		return false, logThenErrorf(err.Error())
	} else {
		unlocked = true
	}
	if unlocked {
		err = s.DeleteAssetLookupMaps(ctx, assetAgreement.AssetType, assetAgreement.Id)
		if err != nil {
			return false, logThenErrorf("failed to delete bond asset lookup maps: %+v", err)
		}
	} else {
		return false, logThenErrorf("unlock on bond asset type %s with asset id %s failed", assetAgreement.AssetType, assetAgreement.Id)
	}

	return true, nil
}

func (s *SmartContract) UnlockAssetUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
	unlocked := false
	err := assetexchange.UnlockAssetUsingContractId(ctx, contractId)
	if err != nil {
		return false, logThenErrorf(err.Error())
	} else {
		unlocked = true
	}
	if unlocked {
		// delete the lookup maps
		err := s.DeleteAssetLookupMapsOnlyUsingContractId(ctx, contractId)
		if err != nil {
			return false, logThenErrorf(err.Error())
		}
		return true, nil
	} else {
		return false, logThenErrorf("unlock on bond asset using contractId %s failed", contractId)
	}
}

func (s *SmartContract) UnlockFungibleAsset(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {

	unlocked := false
	err := assetexchange.UnlockFungibleAsset(ctx, contractId)
	if err != nil {
		return false, logThenErrorf(err.Error())
	} else {
		unlocked = true
	}
	if unlocked {
		// Add the unlocked tokens into the wallet of the locker
		lockerECertBase64, err := getECertOfTxCreatorBase64(ctx)
		if err != nil {
			return false, logThenErrorf(err.Error())
		}

		// Fetch the contracted token asset type from the ledger
		assetType, err := s.FetchAssetTypeFromContractIdFungibleAssetLookupMap(ctx, contractId)
		if err != nil {
			return false, logThenErrorf(err.Error())
		}
		// Fetch the contracted token asset numUnits from the ledger
		numUnits, err := s.FetchNumUnitsFromContractIdFungibleAssetLookupMap(ctx, contractId)
		if err != nil {
			return false, logThenErrorf(err.Error())
		}

		err = s.IssueTokenAssets(ctx, assetType, numUnits, lockerECertBase64)
		if err != nil {
			return false, logThenErrorf(err.Error())
		}
		err = s.DeleteFungibleAssetLookupMap(ctx, contractId)
		if err != nil {
			return false, logThenErrorf(err.Error())
		}
		return true, nil
	} else {
		return false, logThenErrorf("unlock on token asset using contractId %s failed", contractId)
	}
}
