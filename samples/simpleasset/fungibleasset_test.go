package main

import (
	"encoding/json"
	"fmt"
	"testing"

	"github.com/hyperledger-labs/weaver/samples/simpleasset/mocks"
	"github.com/stretchr/testify/require"
)

func TestInitFungibleAssetLedger(t *testing.T) {
	chaincodeStub := &mocks.ChaincodeStub{}
	transactionContext := &mocks.TransactionContext{}
	transactionContext.GetStubReturns(chaincodeStub)

	simpleToken := SmartContract{}
	err := simpleToken.InitFungibleAssetLedger(transactionContext)
	require.NoError(t, err)

	chaincodeStub.PutStateReturns(fmt.Errorf("failed inserting key"))
	err = simpleToken.InitFungibleAssetLedger(transactionContext)
	require.EqualError(t, err, "failed to create fungible asset type token1. failed inserting key")
}

func TestCreateFungibleAssetType(t *testing.T) {
	chaincodeStub := &mocks.ChaincodeStub{}
	transactionContext := &mocks.TransactionContext{}
	transactionContext.GetStubReturns(chaincodeStub)

	simpleToken := SmartContract{}

	// Successful Case
	res, err := simpleToken.CreateFungibleAssetType(transactionContext, "", "", 0)
	require.NoError(t, err)
	require.Equal(t, res, true)

	// Check if fungibleAssetType already exists
	chaincodeStub.GetStateReturns([]byte{}, nil)
	res, err = simpleToken.CreateFungibleAssetType(transactionContext, "token1", "", 0)
	require.EqualError(t, err, "the fungible asset type token1 already exists.")
	require.Equal(t, res, false)

	// Check if PutState fails
	chaincodeStub.GetStateReturns(nil, nil)
	chaincodeStub.PutStateReturns(fmt.Errorf("failed to put state"))
	res, err = simpleToken.CreateFungibleAssetType(transactionContext, "token1", "", 0)
	require.EqualError(t, err, "failed to create fungible asset type token1. failed to put state")
	require.Equal(t, res, false)

	// Check if GetState fails
	chaincodeStub.GetStateReturns(nil, fmt.Errorf("unable to retrieve asset"))
	res, err = simpleToken.CreateFungibleAssetType(transactionContext, "token1", "", 0)
	require.EqualError(t, err, "failed to read from world state: unable to retrieve asset")
	require.Equal(t, res, false)
}

func TestReadFungibleAssetType(t *testing.T) {
	chaincodeStub := &mocks.ChaincodeStub{}
	transactionContext := &mocks.TransactionContext{}
	transactionContext.GetStubReturns(chaincodeStub)

	expectedAsset := &FungibleAssetType{Issuer: "CentralBank", FaceValue: 10}
	bytes, err := json.Marshal(expectedAsset)
	require.NoError(t, err)

	// Successful Read
	chaincodeStub.GetStateReturns(bytes, nil)
	simpleToken := SmartContract{}
	asset, err := simpleToken.ReadFungibleAssetType(transactionContext, "")
	require.NoError(t, err)
	require.Equal(t, expectedAsset, asset)

	// GetState Fail case
	chaincodeStub.GetStateReturns(nil, fmt.Errorf("unable to retrieve asset"))
	_, err = simpleToken.ReadFungibleAssetType(transactionContext, "")
	require.EqualError(t, err, "failed to read fungible asset type : unable to retrieve asset")

	// fungible asset type does not exist
	chaincodeStub.GetStateReturns(nil, nil)
	asset, err = simpleToken.ReadFungibleAssetType(transactionContext, "token1")
	require.EqualError(t, err, "the fungible asset type token1 does not exist.")
	require.Nil(t, asset)
}

func TestDeleteFungibleAssetType(t *testing.T) {
	chaincodeStub := &mocks.ChaincodeStub{}
	transactionContext := &mocks.TransactionContext{}
	transactionContext.GetStubReturns(chaincodeStub)

	chaincodeStub.DelStateReturns(nil)
	simpleToken := SmartContract{}
	err := simpleToken.DeleteFungibleAssetType(transactionContext, "")
	require.EqualError(t, err, "the fungible asset type  does not exist.")

	bytes, err := json.Marshal(true)
	chaincodeStub.GetStateReturns(bytes, nil)
	chaincodeStub.DelStateReturns(fmt.Errorf("unable to retrieve asset"))
	err = simpleToken.DeleteFungibleAssetType(transactionContext, "token1")
	require.EqualError(t, err, "failed to delete fungible asset type token1: unable to retrieve asset")

	chaincodeStub.GetStateReturns(bytes, nil)
	chaincodeStub.DelStateReturns(nil)
	err = simpleToken.DeleteFungibleAssetType(transactionContext, "token1")
	require.NoError(t, err)
}

func TestIssueFungibleAssets(t *testing.T) {
	chaincodeStub := &mocks.ChaincodeStub{}
	transactionContext := &mocks.TransactionContext{}
	transactionContext.GetStubReturns(chaincodeStub)

	walletMap := make(map[string]int)
	expectedAsset := &Wallet{WalletMap: walletMap}
	bytes, err := json.Marshal(expectedAsset)
	require.NoError(t, err)

	// Checking succesful case
	simpleToken := SmartContract{}
	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleToken.IssueFungibleAssets(transactionContext, "", 0, "")
	require.NoError(t, err)

	// Check if writing state after issuing fails
	chaincodeStub.GetStateReturns(bytes, nil)
	chaincodeStub.PutStateReturns(fmt.Errorf("failed to put state"))
	err = simpleToken.IssueFungibleAssets(transactionContext, "", 0, "")
	require.EqualError(t, err, "failed to put state")

	// Error check
	chaincodeStub.GetStateReturns(nil, fmt.Errorf("failed to read state"))
	err = simpleToken.IssueFungibleAssets(transactionContext, "", 0, "")
	require.EqualError(t, err, "failed to read from world state: failed to read state")

	// Check if given fungible asset type doesn't exist
	chaincodeStub.GetStateReturns(nil, nil)
	err = simpleToken.IssueFungibleAssets(transactionContext, "token1", 0, "")
	require.EqualError(t, err, "cannot issue: the fungible asset type token1 does not exist.")
}

func TestDeleteFungibleAssets(t *testing.T) {
	chaincodeStub := &mocks.ChaincodeStub{}
	transactionContext := &mocks.TransactionContext{}
	transactionContext.GetStubReturns(chaincodeStub)

	walletMap := make(map[string]int)
	walletMap["token1"] = 5
	expectedAsset := &Wallet{WalletMap: walletMap}
	bytes, err := json.Marshal(expectedAsset)
	require.NoError(t, err)

	simpleToken := SmartContract{}

	// Successful delete case
	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleToken.DeleteFungibleAssets(transactionContext, "token1", 2, "")
	require.NoError(t, err)

	// Trying to delete more than owner hass
	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleToken.DeleteFungibleAssets(transactionContext, "token1", 10, "")
	require.EqualError(t, err, "the owner does not possess enough units of the fungible asset type token1")

	// Trying to delete token that owner doesn't possess
	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleToken.DeleteFungibleAssets(transactionContext, "token2", 2, "")
	require.EqualError(t, err, "the owner does not possess any units of the fungible asset type token2")

	// Error Check
	chaincodeStub.GetStateReturns(nil, fmt.Errorf("Failed to read state"))
	err = simpleToken.DeleteFungibleAssets(transactionContext, "", 0, "")
	require.EqualError(t, err, "failed to read from world state: Failed to read state")

	// check if it tries to delete wallet entry when wallet list is empty
	chaincodeStub.GetStateReturns(bytes, nil)
	chaincodeStub.DelStateReturns(fmt.Errorf("Failed to delete state"))
	err = simpleToken.DeleteFungibleAssets(transactionContext, "token1", 5, "")
	require.EqualError(t, err, "Failed to delete state")

}
func TestTransferFungibleAssets(t *testing.T) {
	chaincodeStub := &mocks.ChaincodeStub{}
	transactionContext := &mocks.TransactionContext{}
	transactionContext.GetStubReturns(chaincodeStub)

	walletMap := make(map[string]int)
	walletMap["token1"] = 5
	expectedAsset := &Wallet{WalletMap: walletMap}
	bytes, err := json.Marshal(expectedAsset)
	require.NoError(t, err)

	simpleToken := SmartContract{}

	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleToken.TransferFungibleAssets(transactionContext, "token1", 2, "", "")
	require.NoError(t, err)

	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleToken.TransferFungibleAssets(transactionContext, "token1", 10, "", "")
	require.EqualError(t, err, "the owner does not possess enough units of the fungible asset type token1")

	chaincodeStub.GetStateReturns(nil, fmt.Errorf("Failed to read state"))
	err = simpleToken.DeleteFungibleAssets(transactionContext, "", 0, "")
	require.EqualError(t, err, "failed to read from world state: Failed to read state")
}
func TestGetBalance(t *testing.T) {
	chaincodeStub := &mocks.ChaincodeStub{}
	transactionContext := &mocks.TransactionContext{}
	transactionContext.GetStubReturns(chaincodeStub)

	walletMap := make(map[string]int)
	walletMap["token1"] = 5
	expectedAsset := &Wallet{WalletMap: walletMap}
	bytes, err := json.Marshal(expectedAsset)
	require.NoError(t, err)

	simpleToken := SmartContract{}

	// Successful GetBalance case
	chaincodeStub.GetStateReturnsOnCall(0, bytes, nil)
	chaincodeStub.GetStateReturnsOnCall(1, bytes, nil)
	bal, err := simpleToken.GetBalance(transactionContext, "token1", "")
	require.NoError(t, err)
	require.Equal(t, bal, 5)

	// GetState Fails
	chaincodeStub.GetStateReturnsOnCall(2, nil, fmt.Errorf("Failed to read state"))
	bal, err = simpleToken.GetBalance(transactionContext, "", "")
	require.EqualError(t, err, "failed to read from world state: Failed to read state")

	// Owner doesn't have a wallet
	chaincodeStub.GetStateReturnsOnCall(3, bytes, nil)
	chaincodeStub.GetStateReturnsOnCall(4, nil, fmt.Errorf("Failed to read state"))
	bal, err = simpleToken.GetBalance(transactionContext, "", "")
	require.EqualError(t, err, "failed to read owner's wallet from world state: Failed to read state")
}

func TestFungibleAssetsExist(t *testing.T) {
	chaincodeStub := &mocks.ChaincodeStub{}
	transactionContext := &mocks.TransactionContext{}
	transactionContext.GetStubReturns(chaincodeStub)

	walletMap := make(map[string]int)
	walletMap["token1"] = 5
	expectedAsset := &Wallet{WalletMap: walletMap}
	bytes, err := json.Marshal(expectedAsset)
	require.NoError(t, err)

	simpleToken := SmartContract{}

	// Fungible Assets exist case
	chaincodeStub.GetStateReturns(bytes, nil)
	res, err := simpleToken.FungibleAssetsExist(transactionContext, "token1", 4, "")
	require.NoError(t, err)
	require.Equal(t, res, true)

	// Fungible Assets doesn't exist case
	chaincodeStub.GetStateReturns(bytes, nil)
	res, err = simpleToken.FungibleAssetsExist(transactionContext, "token1", 6, "")
	require.NoError(t, err)
	require.Equal(t, res, false)

	chaincodeStub.GetStateReturns(nil, fmt.Errorf("Failed to read state"))
	res, err = simpleToken.FungibleAssetsExist(transactionContext, "", 0, "")
	require.EqualError(t, err, "failed to read from world state: Failed to read state")
	require.Equal(t, res, false)
}
