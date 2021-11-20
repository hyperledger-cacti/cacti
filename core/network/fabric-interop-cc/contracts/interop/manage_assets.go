/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// manage_assets is a chaincode that contains all the code related to asset management operations (e.g., Lock, Unlock, Claim)
// and any related utility functions
package main

import (
	"fmt"
	"errors"

	"github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/assetexchange"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	log "github.com/sirupsen/logrus"
	wutils "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/utils"
)

const (
	callerCCIdPrefix  = "CallerCCId_" // prefix for the caller CC ID map, contractId --> caller-cc-id
)

// helper functions to log and return errors
func logThenErrorf(format string, args ...interface{}) error {
	errorMsg := fmt.Sprintf(format, args...)
	log.Error(errorMsg)
	return errors.New(errorMsg)
}

// function to return the key to fetch a calling chaincode ID from the map using contractId
func generateContractIdMapCCKey(contractId string) string {
	return callerCCIdPrefix + contractId
}

// LockAsset cc is used to record locking of an asset on the ledger
func (s *SmartContract) LockAsset(ctx contractapi.TransactionContextInterface, assetAgreementBytesBase64 string, lockInfoBytesBase64 string) (string, error) {
	// First, verify that this call is legal
	callerChaincodeID, err := wutils.GetLocalChaincodeID(ctx.GetStub())
	if err != nil {
		return "", logThenErrorf(err.Error())
	}
	interopChaincodeID, err := ctx.GetStub().GetState(wutils.GetInteropChaincodeIDKey())
	if err != nil {
		return "", logThenErrorf(err.Error())
	}
	if callerChaincodeID == string(interopChaincodeID) {
		return "", logThenErrorf("Illegal access: LockAsset being called directly by client")
	}

	// Start the locking process now
    contractId, err := assetexchange.LockAsset(ctx, callerChaincodeID, assetAgreementBytesBase64, lockInfoBytesBase64)
	if err != nil {
		return "", err
	}

	// Associate lock with chaincode ID of caller.
	err = ctx.GetStub().PutState(generateContractIdMapCCKey(contractId), []byte(callerChaincodeID))
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	return contractId, nil
}

// UnlockAsset cc is used to record unlocking of an asset on the ledger
func (s *SmartContract) UnlockAsset(ctx contractapi.TransactionContextInterface, assetAgreementBytesBase64 string) error {
	callerChaincodeID, err := wutils.GetLocalChaincodeID(ctx.GetStub())
	if err != nil {
		return logThenErrorf(err.Error())
	}

	contractId, err := assetexchange.UnlockAsset(ctx, callerChaincodeID, assetAgreementBytesBase64)
	if err != nil {
		return err
	}

	err = ctx.GetStub().DelState(generateContractIdMapCCKey(contractId))
	if err != nil {
		return logThenErrorf("failed to delete the calling chaincode Id associated with the contract Id %s: %+v", contractId, err.Error())
	}

	return nil
}

// IsAssetLocked cc is used to query the ledger and findout if an asset is locked or not
func (s *SmartContract) IsAssetLocked(ctx contractapi.TransactionContextInterface, assetAgreementBytesBase64 string) (bool, error) {
	callerChaincodeID, err := wutils.GetLocalChaincodeID(ctx.GetStub())
	if err != nil {
		return false, logThenErrorf(err.Error())
	}

	return assetexchange.IsAssetLocked(ctx, callerChaincodeID, assetAgreementBytesBase64)
}

// ClaimAsset cc is used to record claim of an asset on the ledger
func (s *SmartContract) ClaimAsset(ctx contractapi.TransactionContextInterface, assetAgreementBytesBase64 string, claimInfoBytesBase64 string) error {
	callerChaincodeID, err := wutils.GetLocalChaincodeID(ctx.GetStub())
	if err != nil {
		return logThenErrorf(err.Error())
	}

	contractId, err := assetexchange.ClaimAsset(ctx, callerChaincodeID, assetAgreementBytesBase64, claimInfoBytesBase64)
	if err != nil {
		return err
	}

	err = ctx.GetStub().DelState(generateContractIdMapCCKey(contractId))
	if err != nil {
		return logThenErrorf("failed to delete the calling chaincode Id associated with the contract Id %s: %+v", contractId, err.Error())
	}

	return nil
}

// UnlockAssetUsingContractId cc is used to record unlocking of an asset on the ledger (this uses the contractId)
func (s *SmartContract) UnlockAssetUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) error {
	callerChaincodeID, err := wutils.GetLocalChaincodeID(ctx.GetStub())
	if err != nil {
		return logThenErrorf(err.Error())
	}

	// Verify that this call comes from the same chaincode the lock instruction came from
	lockerChaincodeID, err := ctx.GetStub().GetState(generateContractIdMapCCKey(contractId))
	if err != nil {
		return logThenErrorf(err.Error())
	}
	if callerChaincodeID != string(lockerChaincodeID) {
		return logThenErrorf("Illegal access: UnlockAssetUsingContractId being called from chaincode Id %s; expected %s", callerChaincodeID, string(lockerChaincodeID))
	}

	// Start the asset unlocking process
	err = assetexchange.UnlockAssetUsingContractId(ctx, contractId)
	if err != nil {
		return err
	}

	err = ctx.GetStub().DelState(generateContractIdMapCCKey(contractId))
	if err != nil {
		return logThenErrorf("failed to delete the calling chaincode Id associated with the contract Id %s: %+v", contractId, err.Error())
	}

	return nil
}

// ClaimAsset cc is used to record claim of an asset on the ledger (this uses the contractId)
func (s *SmartContract) ClaimAssetUsingContractId(ctx contractapi.TransactionContextInterface, contractId string, claimInfoBytesBase64 string) error {
	callerChaincodeID, err := wutils.GetLocalChaincodeID(ctx.GetStub())
	if err != nil {
		return logThenErrorf(err.Error())
	}

	// Verify that this call comes from the same chaincode the lock instruction came from
	lockerChaincodeID, err := ctx.GetStub().GetState(generateContractIdMapCCKey(contractId))
	if err != nil {
		return logThenErrorf(err.Error())
	}
	if callerChaincodeID != string(lockerChaincodeID) {
		return logThenErrorf("Illegal access: ClaimAssetUsingContractId being called from chaincode Id %s; expected %s", callerChaincodeID, string(lockerChaincodeID))
	}

	// Start the asset claiming process
	err = assetexchange.ClaimAssetUsingContractId(ctx, contractId, claimInfoBytesBase64)
	if err != nil {
		return err
	}

	err = ctx.GetStub().DelState(generateContractIdMapCCKey(contractId))
	if err != nil {
		return logThenErrorf("failed to delete the calling chaincode Id associated with the contract Id %s: %+v", contractId, err.Error())
	}

	return nil
}

// IsAssetLocked cc is used to query the ledger and find out if an asset is locked or not (this uses the contractId)
func (s *SmartContract) IsAssetLockedQueryUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
	callerChaincodeID, err := wutils.GetLocalChaincodeID(ctx.GetStub())
	if err != nil {
		return false, logThenErrorf(err.Error())
	}

	// Verify that this call comes from the same chaincode the lock instruction came from
	lockerChaincodeID, err := ctx.GetStub().GetState(generateContractIdMapCCKey(contractId))
	if err != nil {
		return false, logThenErrorf(err.Error())
	}
	if callerChaincodeID != string(lockerChaincodeID) {
		return false, logThenErrorf("Illegal access: IsAssetLockedQueryUsingContractId being called from chaincode Id %s; expected %s", callerChaincodeID, string(lockerChaincodeID))
	}

	// Start the asset status checking process
	return assetexchange.IsAssetLockedQueryUsingContractId(ctx, contractId)
}

// LockFungibleAsset cc is used to record locking of a group of fungible assets of an asset-type on the ledger
func (s *SmartContract) LockFungibleAsset(ctx contractapi.TransactionContextInterface, fungibleAssetAgreementBytesBase64 string, lockInfoBytesBase64 string) (string, error) {
	// First, verify that this call comes from another chaincode rather than directly from the client
	callerChaincodeID, err := wutils.GetLocalChaincodeID(ctx.GetStub())
	if err != nil {
		return "", logThenErrorf(err.Error())
	}
	interopChaincodeID, err := ctx.GetStub().GetState(wutils.GetInteropChaincodeIDKey())
	if err != nil {
		return "", logThenErrorf(err.Error())
	}
	if callerChaincodeID == string(interopChaincodeID) {
		return "", logThenErrorf("Illegal access: LockFungibleAsset being called directly by client")
	}

	// Start the locking process now
	contractId, err := assetexchange.LockFungibleAsset(ctx, callerChaincodeID, fungibleAssetAgreementBytesBase64, lockInfoBytesBase64)
	if err != nil {
		return "", err
	}

	// Associate lock with chaincode ID of caller.
	err = ctx.GetStub().PutState(generateContractIdMapCCKey(contractId), []byte(callerChaincodeID))
	if err != nil {
		return "", logThenErrorf(err.Error())
	}

	return contractId, nil
}

// IsFungibleAssetLocked cc is used to query the ledger and find out if a fungible asset is locked or not
func (s *SmartContract) IsFungibleAssetLocked(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
	callerChaincodeID, err := wutils.GetLocalChaincodeID(ctx.GetStub())
	if err != nil {
		return false, logThenErrorf(err.Error())
	}

	// Verify that this call comes from the same chaincode the lock instruction came from
	lockerChaincodeID, err := ctx.GetStub().GetState(generateContractIdMapCCKey(contractId))
	if err != nil {
		return false, logThenErrorf(err.Error())
	}
	if callerChaincodeID != string(lockerChaincodeID) {
		return false, logThenErrorf("Illegal access: IsFungibleAssetLocked being called from chaincode Id %s; expected %s", callerChaincodeID, string(lockerChaincodeID))
	}

	// Start the asset status checking process
	return assetexchange.IsFungibleAssetLocked(ctx, contractId)
}

// ClaimFungibleAsset cc is used to record claim of a fungible asset on the ledger
func (s *SmartContract) ClaimFungibleAsset(ctx contractapi.TransactionContextInterface, contractId string, claimInfoBytesBase64 string) error {
	callerChaincodeID, err := wutils.GetLocalChaincodeID(ctx.GetStub())
	if err != nil {
		return logThenErrorf(err.Error())
	}

	// Verify that this call comes from the same chaincode the lock instruction came from
	lockerChaincodeID, err := ctx.GetStub().GetState(generateContractIdMapCCKey(contractId))
	if err != nil {
		return logThenErrorf(err.Error())
	}
	if callerChaincodeID != string(lockerChaincodeID) {
		return logThenErrorf("Illegal access: ClaimFungibleAsset being called from chaincode Id %s; expected %s", callerChaincodeID, string(lockerChaincodeID))
	}

	// Start the asset claiming process
	err = assetexchange.ClaimFungibleAsset(ctx, contractId, claimInfoBytesBase64)
	if err != nil {
		return err
	}

	err = ctx.GetStub().DelState(generateContractIdMapCCKey(contractId))
	if err != nil {
		return logThenErrorf("failed to delete the calling chaincode Id associated with the contract Id %s: %+v", contractId, err.Error())
	}

	return nil
}

// UnlockFungibleAsset cc is used to record unlocking of a fungible asset on the ledger
func (s *SmartContract) UnlockFungibleAsset(ctx contractapi.TransactionContextInterface, contractId string) error {
	callerChaincodeID, err := wutils.GetLocalChaincodeID(ctx.GetStub())
	if err != nil {
		return logThenErrorf(err.Error())
	}

	// Verify that this call comes from the same chaincode the lock instruction came from
	lockerChaincodeID, err := ctx.GetStub().GetState(generateContractIdMapCCKey(contractId))
	if err != nil {
		return logThenErrorf(err.Error())
	}
	if callerChaincodeID != string(lockerChaincodeID) {
		return logThenErrorf("Illegal access: UnlockFungibleAsset being called from chaincode Id %s; expected %s", callerChaincodeID, string(lockerChaincodeID))
	}

	// Start the asset unlocking process
	err = assetexchange.UnlockFungibleAsset(ctx, contractId)
	if err != nil {
		return err
	}

	err = ctx.GetStub().DelState(generateContractIdMapCCKey(contractId))
	if err != nil {
		return logThenErrorf("failed to delete the calling chaincode Id associated with the contract Id %s: %+v", contractId, err.Error())
	}

	return nil
}

func (s *SmartContract) GetHTLCHash(ctx contractapi.TransactionContextInterface, callerChaincodeID, assetAgreementBytesBase64 string) (string, error) {
	return assetexchange.GetHTLCHash(ctx, callerChaincodeID, assetAgreementBytesBase64)
}
func (s *SmartContract) GetHTLCHashByContractId(ctx contractapi.TransactionContextInterface, contractId string) (string, error) {
	return assetexchange.GetHTLCHashByContractId(ctx, contractId)
}
func (s *SmartContract) GetHTLCHashPreImage(ctx contractapi.TransactionContextInterface, callerChaincodeID, assetAgreementBytesBase64 string) (string, error) {
	return assetexchange.GetHTLCHashPreImage(ctx, callerChaincodeID, assetAgreementBytesBase64)
}
func (s *SmartContract) GetHTLCHashPreImageByContractId(ctx contractapi.TransactionContextInterface, contractId string) (string, error) {
	return assetexchange.GetHTLCHashPreImageByContractId(ctx, contractId)
}


