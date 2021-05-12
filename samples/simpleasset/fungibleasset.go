package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type FungibleAssetType struct {
	Issuer                string            `json:"issuer"`
	FaceValue             int               `json:"facevalue"`
}
type Wallet struct {
	WalletMap            map[string]int    `json:"walletlist"`
}


// InitLedger adds a base set of assets to the ledger
func (s *SmartContract) InitFungibleAssetLedger(ctx contractapi.TransactionContextInterface) error {
	_, err := s.CreateFungibleAssetType(ctx, "token1", "CentralBank", 1)
	if err != nil {
		return err
	}
	return err
}

// CreateFungibleAssetType issues a new fungible asset type to the world state with given details.
func (s *SmartContract) CreateFungibleAssetType(ctx contractapi.TransactionContextInterface, fungibleAssetType string, issuer string, faceValue int) (bool, error) {
	exists, err := s.FungibleAssetTypeExists(ctx, fungibleAssetType)
	if err != nil {
		return false, err
	}
	if exists {
		return false, fmt.Errorf("the fungible asset type %s already exists.", fungibleAssetType)
	}

	asset := FungibleAssetType{
		Issuer: issuer,
		FaceValue: faceValue,
	}
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return false, err
	}
	id := getFungibleAssetTypeId(fungibleAssetType)
	err = ctx.GetStub().PutState(id, assetJSON)

	if err != nil {
		return false, fmt.Errorf("failed to create fungible asset type %s. %v", fungibleAssetType, err)
	}
	return true, nil
}

// ReadFungibleAssetType returns the fungible asset type stored in the world state with given type.
func (s *SmartContract) ReadFungibleAssetType(ctx contractapi.TransactionContextInterface, fungibleAssetType string) (*FungibleAssetType, error) {
	id := getFungibleAssetTypeId(fungibleAssetType)
	assetJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read fungible asset type %s: %v", fungibleAssetType, err)
	}
	if assetJSON == nil {
		return nil, fmt.Errorf("the fungible asset type %s does not exist.", fungibleAssetType)
	}

	var fat FungibleAssetType
	err = json.Unmarshal(assetJSON, &fat)
	if err != nil {
		return nil, err
	}

	return &fat, nil
}

// DeleteFungibleAssetType deletes an given fungible asset type from the world state.
func (s *SmartContract) DeleteFungibleAssetType(ctx contractapi.TransactionContextInterface, fungibleAssetType string) error {
	exists, err := s.FungibleAssetTypeExists(ctx, fungibleAssetType)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("the fungible asset type %s does not exist.", fungibleAssetType)
	}

	id := getFungibleAssetTypeId(fungibleAssetType)
	err = ctx.GetStub().DelState(id)
	if err != nil {
		return fmt.Errorf("failed to delete fungible asset type %s: %v", fungibleAssetType, err)
	}
	return nil
}

// FungibleAssetTypeExists returns true when fungible asset type with given ID exists in world state
func (s *SmartContract) FungibleAssetTypeExists(ctx contractapi.TransactionContextInterface, fungibleAssetType string) (bool, error) {
	id := getFungibleAssetTypeId(fungibleAssetType)
	assetJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return assetJSON != nil, nil
}

// IssueFungibleAssets issues new fungible assets to an owner.
func (s *SmartContract) IssueFungibleAssets(ctx contractapi.TransactionContextInterface, fungibleAssetType string, numUnits int, owner string) error {
	exists, err := s.FungibleAssetTypeExists(ctx, fungibleAssetType)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("cannot issue: the fungible asset type %s does not exist.", fungibleAssetType)
	}

	id := getWalletId(owner)
	return addFungibleAssetsHelper(ctx, id, fungibleAssetType, numUnits)
}

// DeleteFungibleAssets burns the fungible assets from an owner.
func (s *SmartContract) DeleteFungibleAssets(ctx contractapi.TransactionContextInterface, fungibleAssetType string, numUnits int, owner string) error {
	exists, err := s.FungibleAssetTypeExists(ctx, fungibleAssetType)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("the fungible asset type %s does not exist.", fungibleAssetType)
	}

	id := getWalletId(owner)
	return subFungibleAssetsHelper(ctx, id, fungibleAssetType, numUnits)
}

// TransferFungibleAssets transfers the fungible assets from an owner to newOwner
func (s *SmartContract) TransferFungibleAssets(ctx contractapi.TransactionContextInterface, fungibleAssetType string, numUnits int, owner string, newOwner string) error {
	exists, err := s.FungibleAssetTypeExists(ctx, fungibleAssetType)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("the fungible asset type %s does not exist.", fungibleAssetType)
	}


	ownerId := getWalletId(owner)
	newOwnerId := getWalletId(newOwner)

	err = subFungibleAssetsHelper(ctx, ownerId, fungibleAssetType, numUnits)
	if err != nil {
		return err
	}
	err = addFungibleAssetsHelper(ctx, newOwnerId, fungibleAssetType, numUnits)
	if err != nil {
		// Revert subtraction from the original owner
		// Assuming following will succeed (not sure what to do if it does not)
		_ = addFungibleAssetsHelper(ctx, ownerId, fungibleAssetType, numUnits)
		return err
	}
	return nil
}

// GetBalance returns the amount of given fungible asset type owned by an owner.
func (s *SmartContract) GetBalance(ctx contractapi.TransactionContextInterface, fungibleAssetType string, owner string) (int, error) {
	exists, err := s.FungibleAssetTypeExists(ctx, fungibleAssetType)
	if err != nil {
		return -1, err
	}
	if !exists {
		return -1, fmt.Errorf("the fungible asset type %s does not exist.", fungibleAssetType)
	}

	id := getWalletId(owner)
	walletJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return -1, fmt.Errorf("failed to read owner's wallet from world state: %v", err)
	}

	var wallet Wallet
	err = json.Unmarshal(walletJSON, &wallet)
	if err != nil {
		return -1, err
	}
	balance := wallet.WalletMap[fungibleAssetType]
	return balance, nil
}

// Checks if owner has some given amount of fungible asset
func (s *SmartContract) FungibleAssetsExist(ctx contractapi.TransactionContextInterface, fungibleAssetType string, numUnits int, owner string) (bool, error) {
	balance, err := s.GetBalance(ctx, fungibleAssetType, owner)
	if err != nil {
		return false, err
	}
	return balance >= numUnits, nil
}

func addFungibleAssetsHelper(ctx contractapi.TransactionContextInterface, id string, fungibleAssetType string, numUnits int) error {
	walletJSON, err := ctx.GetStub().GetState(id)
	var wallet Wallet
	if err == nil {
		err = json.Unmarshal(walletJSON, &wallet)
		if err != nil {
			return err
		}
		balance := wallet.WalletMap[fungibleAssetType]
		wallet.WalletMap[fungibleAssetType] = balance + numUnits
	} else {
		walletMap := make(map[string]int)
		walletMap[fungibleAssetType] = numUnits
		wallet = Wallet{
			WalletMap: walletMap,
		}
	}

	walletNewJSON, err := json.Marshal(wallet)
	if err != nil {
		return err
	}
	return ctx.GetStub().PutState(id, walletNewJSON)
}

func subFungibleAssetsHelper(ctx contractapi.TransactionContextInterface, id string, fungibleAssetType string, numUnits int) error {
	walletJSON, err := ctx.GetStub().GetState(id)
	var wallet Wallet
	if err != nil {
		return err
	}

	err = json.Unmarshal(walletJSON, &wallet)
	if err != nil {
		return err
	}

	// Check if owner has sufficient amount of given type to delete
	_, exists := wallet.WalletMap[fungibleAssetType]
	if !exists {
		return fmt.Errorf("the owner does not possess any units of the fungible asset type %s", fungibleAssetType)
	}
	if wallet.WalletMap[fungibleAssetType] < numUnits {
		return fmt.Errorf("the owner does not possess enough units of the fungible asset type %s", fungibleAssetType)
	}

	// Subtract after all checks
	wallet.WalletMap[fungibleAssetType] -= numUnits

	// Delete fungible asset type from map if num of units becomes zero
	if wallet.WalletMap[fungibleAssetType] == 0 {
		delete(wallet.WalletMap, fungibleAssetType)
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

func getFungibleAssetTypeId(fungibleAssetType string) string {
	return "FAT_" + fungibleAssetType
}
func getWalletId(owner string) string {
	return "W_" + owner
}
