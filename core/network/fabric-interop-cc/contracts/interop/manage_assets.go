/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// manage_assets is a chaincode that contains all the code related to asset management operations (e.g., Lock, Unlock, Claim)
// and any related utility functions
package main

import (
	"github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/assetexchange"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// LockAsset cc is used to record locking of an asset on the ledger
func (s *SmartContract) LockAsset(ctx contractapi.TransactionContextInterface, assetAgreementBytesBase64 string, lockInfoBytesBase64 string) (string, error) {
	return assetexchange.LockAsset(ctx, assetAgreementBytesBase64, lockInfoBytesBase64)
}

// UnlockAsset cc is used to record unlocking of an asset on the ledger
func (s *SmartContract) UnlockAsset(ctx contractapi.TransactionContextInterface, assetAgreementBytesBase64 string) error {
	return assetexchange.UnlockAsset(ctx, assetAgreementBytesBase64)
}

// IsAssetLocked cc is used to query the ledger and findout if an asset is locked or not
func (s *SmartContract) IsAssetLocked(ctx contractapi.TransactionContextInterface, assetAgreementBytesBase64 string) (bool, error) {
	return assetexchange.IsAssetLocked(ctx, assetAgreementBytesBase64)
}

// ClaimAsset cc is used to record claim of an asset on the ledger
func (s *SmartContract) ClaimAsset(ctx contractapi.TransactionContextInterface, assetAgreementBytesBase64 string, claimInfoBytesBase64 string) error {
	return assetexchange.ClaimAsset(ctx, assetAgreementBytesBase64, claimInfoBytesBase64)
}

// UnlockAssetUsingContractId cc is used to record unlocking of an asset on the ledger (this uses the contractId)
func (s *SmartContract) UnlockAssetUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) error {
	return assetexchange.UnlockAssetUsingContractId(ctx, contractId)
}

// ClaimAsset cc is used to record claim of an asset on the ledger (this uses the contractId)
func (s *SmartContract) ClaimAssetUsingContractId(ctx contractapi.TransactionContextInterface, contractId string, claimInfoBytesBase64 string) error {
	return assetexchange.ClaimAssetUsingContractId(ctx, contractId, claimInfoBytesBase64)
}

// IsAssetLocked cc is used to query the ledger and find out if an asset is locked or not (this uses the contractId)
func (s *SmartContract) IsAssetLockedQueryUsingContractId(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
	return assetexchange.IsAssetLockedQueryUsingContractId(ctx, contractId)
}

// LockFungibleAsset cc is used to record locking of a group of fungible assets of an asset-type on the ledger
func (s *SmartContract) LockFungibleAsset(ctx contractapi.TransactionContextInterface, fungibleAssetAgreementBytesBase64 string, lockInfoBytesBase64 string) (string, error) {
	return assetexchange.LockFungibleAsset(ctx, fungibleAssetAgreementBytesBase64, lockInfoBytesBase64)
}

// IsFungibleAssetLocked cc is used to query the ledger and find out if a fungible asset is locked or not
func (s *SmartContract) IsFungibleAssetLocked(ctx contractapi.TransactionContextInterface, contractId string) (bool, error) {
	return assetexchange.IsFungibleAssetLocked(ctx, contractId)
}

// ClaimFungibleAsset cc is used to record claim of a fungible asset on the ledger
func (s *SmartContract) ClaimFungibleAsset(ctx contractapi.TransactionContextInterface, contractId string, claimInfoBytesBase64 string) error {
	return assetexchange.ClaimFungibleAsset(ctx, contractId, claimInfoBytesBase64)
}

// UnlockFungibleAsset cc is used to record unlocking of a fungible asset on the ledger
func (s *SmartContract) UnlockFungibleAsset(ctx contractapi.TransactionContextInterface, contractId string) error {
	return assetexchange.UnlockFungibleAsset(ctx, contractId)
}
