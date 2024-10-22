/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// manage_assets is a chaincode that contains all the code related to asset management operations (e.g., Lock, Unlock, Claim)
// and any related utility functions
package assetexchange

import (
    "strconv"

    "github.com/hyperledger-cacti/cacti/weaver/common/protos-go/v2/common"
    "github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// function to return the key to fetch an element from the map using contractId
func generateContractIdMapKey(contractId string) string {
    return contractIdPrefix + contractId
}
// function to return the key to fetch an element from the map using contractId
func generateClaimContractIdMapKey(contractId string) string {
    return claimContractIdPrefix + contractId
}
func generateAssetLockMapKey(assetLockKey string) string {
    return claimAssetKeyPrefix + assetLockKey
}

/*
 * Function to generate asset-lock key (which is combination of asset-type and asset-id)
 * and contract-id (which is a hash on asset-lock key) for the non-fungible asset locking on the ledger
 */
func GenerateAssetLockKeyAndContractId(ctx contractapi.TransactionContextInterface, chaincodeId string, assetAgreement *common.AssetExchangeAgreement) (string, string, error) {
    assetLockKey, err := ctx.GetStub().CreateCompositeKey("AssetExchangeContract", []string{chaincodeId, assetAgreement.AssetType, assetAgreement.Id})
    if err != nil {
        return "", "", logThenErrorf("error while creating composite key: %+v", err)
    }

    contractId := GenerateSHA256HashInBase64Form(assetLockKey + ctx.GetStub().GetTxID())
    return assetLockKey, contractId, nil
}

/*
 * Function to generate asset-lock key (which is combination of asset-type and asset-id)
 * and contract-id (which is a hash on asset-lock key) for the non-fungible asset locking on the ledger
 */
func GenerateClaimAssetLockKey(ctx contractapi.TransactionContextInterface, chaincodeId string, assetAgreement *common.AssetExchangeAgreement) (string, error) {
    assetLockKey, err := ctx.GetStub().CreateCompositeKey("AssetExchangeContract", []string{chaincodeId, assetAgreement.AssetType, assetAgreement.Id})
    if err != nil {
        return "", logThenErrorf("error while creating composite key: %+v", err)
    }
    return claimAssetKeyPrefix + assetLockKey, nil
}

/*
 * Function to generate contract-id for fungible asset-locking on the ledger (which is
 * a hash on the attributes of the fungible asset exchange agreement)
 */
func GenerateFungibleAssetLockContractId(ctx contractapi.TransactionContextInterface, chaincodeId string, assetAgreement *common.FungibleAssetExchangeAgreement) string {
    preimage := "FungibleAssetExchangeContract" + chaincodeId + assetAgreement.AssetType + strconv.Itoa(int(assetAgreement.NumUnits)) + assetAgreement.Locker + assetAgreement.Recipient
    contractId := GenerateSHA256HashInBase64Form(preimage + ctx.GetStub().GetTxID())
    return contractId
}
