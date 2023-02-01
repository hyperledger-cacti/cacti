package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type TokenAssetType struct {
	Issuer          string              `json:"issuer"`
	Value           int                 `json:"value"`
}
type TokenWallet struct {
	WalletMap       map[string]uint64   `json:"walletlist"`
}


// InitTokenAssetLedger adds a base set of assets to the ledger
func (s *SmartContract) InitTokenAssetLedger(ctx contractapi.TransactionContextInterface) error {
	_, err := s.CreateTokenAssetType(ctx, "token1", "CentralBank", 1)
	if err != nil {
		return err
	}
	return err
}

// CreateTokenAssetType issues a new token asset type to the world state with given details.
func (s *SmartContract) CreateTokenAssetType(ctx contractapi.TransactionContextInterface, tokenAssetType string, issuer string, value int) (bool, error) {
	if tokenAssetType == "" {
		return false, fmt.Errorf("Token asset type cannot be blank")
	}
	exists, err := s.TokenAssetTypeExists(ctx, tokenAssetType)
	if err != nil {
		return false, err
	}
	if exists {
		return false, fmt.Errorf("the token asset type %s already exists.", tokenAssetType)
	}

	asset := TokenAssetType{
		Issuer: issuer,
		Value: value,
	}
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return false, err
	}
	id := getTokenAssetTypeId(tokenAssetType)
	err = ctx.GetStub().PutState(id, assetJSON)

	if err != nil {
		return false, fmt.Errorf("failed to create token asset type %s. %v", tokenAssetType, err)
	}
	return true, nil
}

// ReadTokenAssetType returns the token asset type stored in the world state with given type.
func (s *SmartContract) ReadTokenAssetType(ctx contractapi.TransactionContextInterface, tokenAssetType string) (*TokenAssetType, error) {
	id := getTokenAssetTypeId(tokenAssetType)
	assetJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read token asset type %s: %v", tokenAssetType, err)
	}
	if assetJSON == nil {
		return nil, fmt.Errorf("the token asset type %s does not exist.", tokenAssetType)
	}

	var fat TokenAssetType
	err = json.Unmarshal(assetJSON, &fat)
	if err != nil {
		return nil, err
	}

	return &fat, nil
}

// DeleteTokenAssetType deletes an given token asset type from the world state.
func (s *SmartContract) DeleteTokenAssetType(ctx contractapi.TransactionContextInterface, tokenAssetType string) error {
	exists, err := s.TokenAssetTypeExists(ctx, tokenAssetType)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("the token asset type %s does not exist.", tokenAssetType)
	}

	id := getTokenAssetTypeId(tokenAssetType)
	err = ctx.GetStub().DelState(id)
	if err != nil {
		return fmt.Errorf("failed to delete token asset type %s: %v", tokenAssetType, err)
	}
	return nil
}

// TokenAssetTypeExists returns true when token asset type with given ID exists in world state
func (s *SmartContract) TokenAssetTypeExists(ctx contractapi.TransactionContextInterface, tokenAssetType string) (bool, error) {
	id := getTokenAssetTypeId(tokenAssetType)
	assetJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return assetJSON != nil, nil
}

// IssueTokenAssets issues new token assets to an owner.
func (s *SmartContract) IssueTokenAssets(ctx contractapi.TransactionContextInterface, tokenAssetType string, numUnits uint64, owner string) error {
	if owner == "" {
		return fmt.Errorf("Owner cannot be blank")
	}

	exists, err := s.TokenAssetTypeExists(ctx, tokenAssetType)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("cannot issue: the token asset type %s does not exist", tokenAssetType)
	}

	id := getWalletId(owner)
	return addTokenAssetsHelper(ctx, tokenAssetType, numUnits, id)
}

// DeleteTokenAssets burns the token assets from an owner.
func (s *SmartContract) DeleteTokenAssets(ctx contractapi.TransactionContextInterface, tokenAssetType string, numUnits uint64) error {
	owner, err := getECertOfTxCreatorBase64(ctx)
	if err != nil {
		return err
	}
	exists, err := s.TokenAssetTypeExists(ctx, tokenAssetType)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("the token asset type %s does not exist", tokenAssetType)
	}

	id := getWalletId(owner)
	return subTokenAssetsHelper(ctx, tokenAssetType, numUnits, id)
}

// TransferTokenAssets transfers the token assets from client's account to newOwner
func (s *SmartContract) TransferTokenAssets(ctx contractapi.TransactionContextInterface, tokenAssetType string, numUnits uint64, newOwner string) error {
	exists, err := s.TokenAssetTypeExists(ctx, tokenAssetType)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("the token asset type %s does not exist", tokenAssetType)
	}

	if newOwner == "" {
		return fmt.Errorf("New owner cannot be blank")
	}

	owner, err := getECertOfTxCreatorBase64(ctx)
	if err != nil {
		return err
	}

	ownerId := getWalletId(owner)
	newOwnerId := getWalletId(newOwner)

	err = subTokenAssetsHelper(ctx, tokenAssetType, numUnits, ownerId)
	if err != nil {
		return err
	}
	return addTokenAssetsHelper(ctx, tokenAssetType, numUnits, newOwnerId)
}

// GetBalance returns the amount of given token asset type owned by an owner.
func (s *SmartContract) GetBalance(ctx contractapi.TransactionContextInterface, tokenAssetType string, owner string) (uint64, error) {
	exists, err := s.TokenAssetTypeExists(ctx, tokenAssetType)
	if err != nil {
		return 0, err
	}
	if !exists {
		return 0, fmt.Errorf("the token asset type %s does not exist", tokenAssetType)
	}

	id := getWalletId(owner)
	walletJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return 0, fmt.Errorf("failed to read owner's wallet from world state: %v", err)
	}
	if walletJSON == nil {
		return 0, fmt.Errorf("owner does not have a wallet")
	}

	var wallet TokenWallet
	err = json.Unmarshal(walletJSON, &wallet)
	if err != nil {
		return 0, err
	}
	balance := wallet.WalletMap[tokenAssetType]
	return balance, nil
}

// GetMyWallet returns the available amount for each token asset type owned by an owner.
func (s *SmartContract) GetMyWallet(ctx contractapi.TransactionContextInterface) (string, error) {
	owner, err := getECertOfTxCreatorBase64(ctx)
	if err != nil {
		return "", err
	}

	id := getWalletId(owner)
	walletJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return "", fmt.Errorf("failed to read owner's wallet from world state: %v", err)
	}
	if walletJSON == nil {
		return "", fmt.Errorf("owner does not have a wallet")
	}

	var wallet TokenWallet
	err = json.Unmarshal(walletJSON, &wallet)
	if err != nil {
		return "", err
	}
	return createKeyValuePairs(wallet.WalletMap), nil
}

// Checks if owner has some given amount of token asset
func (s *SmartContract) TokenAssetsExist(ctx contractapi.TransactionContextInterface, tokenAssetType string, numUnits uint64) (bool, error) {
	owner, err := getECertOfTxCreatorBase64(ctx)
	if err != nil {
		return false, err
	}
	balance, err := s.GetBalance(ctx, tokenAssetType, owner)
	if err != nil {
		return false, err
	}
	return balance >= numUnits, nil
}

// Helper Functions for token asset
func addTokenAssetsHelper(ctx contractapi.TransactionContextInterface, tokenAssetType string, numUnits uint64, id string) error {
	walletJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return logThenErrorf("failed to retrieve entry from ledger: %+v", err)
	}
	var wallet TokenWallet
	if walletJSON != nil {
		err = json.Unmarshal(walletJSON, &wallet)
		if err != nil {
			return err
		}
		balance := wallet.WalletMap[tokenAssetType]
		wallet.WalletMap[tokenAssetType] = balance + numUnits
	} else {
		walletMap := make(map[string]uint64)
		walletMap[tokenAssetType] = numUnits
		wallet = TokenWallet{
			WalletMap: walletMap,
		}
	}

	walletNewJSON, err := json.Marshal(wallet)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState(id, walletNewJSON)
}

func subTokenAssetsHelper(ctx contractapi.TransactionContextInterface, tokenAssetType string, numUnits uint64, id string) error {
	walletJSON, err := ctx.GetStub().GetState(id)
	var wallet TokenWallet
	if err != nil {
		return err
	}
	if walletJSON == nil {
		return fmt.Errorf("owner does not have a wallet")
	}

	err = json.Unmarshal(walletJSON, &wallet)
	if err != nil {
		return err
	}

	// Check if owner has sufficient amount of given type to delete
	_, exists := wallet.WalletMap[tokenAssetType]
	if !exists {
		return fmt.Errorf("the owner does not possess any units of the token asset type %s", tokenAssetType)
	}
	if wallet.WalletMap[tokenAssetType] < numUnits {
		return fmt.Errorf("the owner does not possess enough units of the token asset type %s", tokenAssetType)
	}

	// Subtract after all checks
	wallet.WalletMap[tokenAssetType] -= numUnits

	// Delete token asset type from map if num of units becomes zero
	if wallet.WalletMap[tokenAssetType] == 0 {
		delete(wallet.WalletMap, tokenAssetType)
	}

	if len(wallet.WalletMap) == 0 {
		// Delete the entry from State if wallet becomes empty
		return ctx.GetStub().DelState(id)
	} else {
		// Update the new wallet object otherwise
		walletNewJSON, err := json.Marshal(wallet)
		if err != nil {
			return err
		}
		return ctx.GetStub().PutState(id, walletNewJSON)
	}
}

func getTokenAssetTypeId(tokenAssetType string) string {
	return "FAT_" + tokenAssetType
}
func getWalletId(owner string) string {
	return "W_" + owner
}
