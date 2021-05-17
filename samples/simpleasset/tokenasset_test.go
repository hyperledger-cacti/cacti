package main

import (
	"encoding/json"
	"fmt"
	"testing"

	"github.com/hyperledger-labs/weaver/samples/simpleasset/mocks"
	"github.com/stretchr/testify/require"
)

func TestInitTokenAssetLedger(t *testing.T) {
	chaincodeStub := &mocks.ChaincodeStub{}
	transactionContext := &mocks.TransactionContext{}
	transactionContext.GetStubReturns(chaincodeStub)

	simpleToken := SmartContract{}
	err := simpleToken.InitTokenAssetLedger(transactionContext)
	require.NoError(t, err)

	chaincodeStub.PutStateReturns(fmt.Errorf("failed inserting key"))
	err = simpleToken.InitTokenAssetLedger(transactionContext)
	require.EqualError(t, err, "failed to create token asset type token1. failed inserting key")
}

func TestCreateTokenAssetType(t *testing.T) {
	chaincodeStub := &mocks.ChaincodeStub{}
	transactionContext := &mocks.TransactionContext{}
	transactionContext.GetStubReturns(chaincodeStub)

	simpleToken := SmartContract{}

	// Successful Case
	res, err := simpleToken.CreateTokenAssetType(transactionContext, "", "", 0)
	require.NoError(t, err)
	require.Equal(t, res, true)

	// Check if tokenAssetType already exists
	chaincodeStub.GetStateReturns([]byte{}, nil)
	res, err = simpleToken.CreateTokenAssetType(transactionContext, "token1", "", 0)
	require.EqualError(t, err, "the token asset type token1 already exists.")
	require.Equal(t, res, false)

	// Check if PutState fails
	chaincodeStub.GetStateReturns(nil, nil)
	chaincodeStub.PutStateReturns(fmt.Errorf("failed to put state"))
	res, err = simpleToken.CreateTokenAssetType(transactionContext, "token1", "", 0)
	require.EqualError(t, err, "failed to create token asset type token1. failed to put state")
	require.Equal(t, res, false)

	// Check if GetState fails
	chaincodeStub.GetStateReturns(nil, fmt.Errorf("unable to retrieve asset"))
	res, err = simpleToken.CreateTokenAssetType(transactionContext, "token1", "", 0)
	require.EqualError(t, err, "failed to read from world state: unable to retrieve asset")
	require.Equal(t, res, false)
}

func TestReadTokenAssetType(t *testing.T) {
	chaincodeStub := &mocks.ChaincodeStub{}
	transactionContext := &mocks.TransactionContext{}
	transactionContext.GetStubReturns(chaincodeStub)

	expectedAsset := &TokenAssetType{Issuer: "CentralBank", Value: 10}
	bytes, err := json.Marshal(expectedAsset)
	require.NoError(t, err)

	// Successful Read
	chaincodeStub.GetStateReturns(bytes, nil)
	simpleToken := SmartContract{}
	asset, err := simpleToken.ReadTokenAssetType(transactionContext, "")
	require.NoError(t, err)
	require.Equal(t, expectedAsset, asset)

	// GetState Fail case
	chaincodeStub.GetStateReturns(nil, fmt.Errorf("unable to retrieve asset"))
	_, err = simpleToken.ReadTokenAssetType(transactionContext, "")
	require.EqualError(t, err, "failed to read token asset type : unable to retrieve asset")

	// token asset type does not exist
	chaincodeStub.GetStateReturns(nil, nil)
	asset, err = simpleToken.ReadTokenAssetType(transactionContext, "token1")
	require.EqualError(t, err, "the token asset type token1 does not exist.")
	require.Nil(t, asset)
}

func TestDeleteTokenAssetType(t *testing.T) {
	chaincodeStub := &mocks.ChaincodeStub{}
	transactionContext := &mocks.TransactionContext{}
	transactionContext.GetStubReturns(chaincodeStub)

	chaincodeStub.DelStateReturns(nil)
	simpleToken := SmartContract{}
	err := simpleToken.DeleteTokenAssetType(transactionContext, "")
	require.EqualError(t, err, "the token asset type  does not exist.")

	bytes, err := json.Marshal(true)
	chaincodeStub.GetStateReturns(bytes, nil)
	chaincodeStub.DelStateReturns(fmt.Errorf("unable to retrieve asset"))
	err = simpleToken.DeleteTokenAssetType(transactionContext, "token1")
	require.EqualError(t, err, "failed to delete token asset type token1: unable to retrieve asset")

	chaincodeStub.GetStateReturns(bytes, nil)
	chaincodeStub.DelStateReturns(nil)
	err = simpleToken.DeleteTokenAssetType(transactionContext, "token1")
	require.NoError(t, err)
}

func TestIssueTokenAssets(t *testing.T) {
	chaincodeStub := &mocks.ChaincodeStub{}
	transactionContext := &mocks.TransactionContext{}
	transactionContext.GetStubReturns(chaincodeStub)

	walletMap := make(map[string]int)
	expectedAsset := &TokenWallet{WalletMap: walletMap}
	bytes, err := json.Marshal(expectedAsset)
	require.NoError(t, err)

	// Checking succesful case
	simpleToken := SmartContract{}
	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleToken.IssueTokenAssets(transactionContext, "", 0, "")
	require.NoError(t, err)

	// Check if writing state after issuing fails
	chaincodeStub.GetStateReturns(bytes, nil)
	chaincodeStub.PutStateReturns(fmt.Errorf("failed to put state"))
	err = simpleToken.IssueTokenAssets(transactionContext, "", 0, "")
	require.EqualError(t, err, "failed to put state")

	// Error check
	chaincodeStub.GetStateReturns(nil, fmt.Errorf("failed to read state"))
	err = simpleToken.IssueTokenAssets(transactionContext, "", 0, "")
	require.EqualError(t, err, "failed to read from world state: failed to read state")

	// Check if given token asset type doesn't exist
	chaincodeStub.GetStateReturns(nil, nil)
	err = simpleToken.IssueTokenAssets(transactionContext, "token1", 0, "")
	require.EqualError(t, err, "cannot issue: the token asset type token1 does not exist.")
}

func TestDeleteTokenAssets(t *testing.T) {
	chaincodeStub := &mocks.ChaincodeStub{}
	transactionContext := &mocks.TransactionContext{}
	transactionContext.GetStubReturns(chaincodeStub)

	walletMap := make(map[string]int)
	walletMap["token1"] = 5
	expectedAsset := &TokenWallet{WalletMap: walletMap}
	bytes, err := json.Marshal(expectedAsset)
	require.NoError(t, err)

	simpleToken := SmartContract{}

	// Successful delete case
	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleToken.DeleteTokenAssets(transactionContext, "token1", 2, "")
	require.NoError(t, err)

	// Trying to delete more than owner hass
	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleToken.DeleteTokenAssets(transactionContext, "token1", 10, "")
	require.EqualError(t, err, "the owner does not possess enough units of the token asset type token1")

	// Trying to delete token that owner doesn't possess
	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleToken.DeleteTokenAssets(transactionContext, "token2", 2, "")
	require.EqualError(t, err, "the owner does not possess any units of the token asset type token2")

	// Error Check
	chaincodeStub.GetStateReturns(nil, fmt.Errorf("Failed to read state"))
	err = simpleToken.DeleteTokenAssets(transactionContext, "", 0, "")
	require.EqualError(t, err, "failed to read from world state: Failed to read state")

	// check if it tries to delete wallet entry when wallet list is empty
	chaincodeStub.GetStateReturns(bytes, nil)
	chaincodeStub.DelStateReturns(fmt.Errorf("Failed to delete state"))
	err = simpleToken.DeleteTokenAssets(transactionContext, "token1", 5, "")
	require.EqualError(t, err, "Failed to delete state")

}
func TestTransferTokenAssets(t *testing.T) {
	chaincodeStub := &mocks.ChaincodeStub{}
	transactionContext := &mocks.TransactionContext{}
	transactionContext.GetStubReturns(chaincodeStub)

	walletMap := make(map[string]int)
	walletMap["token1"] = 5
	expectedAsset := &TokenWallet{WalletMap: walletMap}
	bytes, err := json.Marshal(expectedAsset)
	require.NoError(t, err)

	simpleToken := SmartContract{}

	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleToken.TransferTokenAssets(transactionContext, "token1", 2, "", "")
	require.NoError(t, err)

	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleToken.TransferTokenAssets(transactionContext, "token1", 10, "", "")
	require.EqualError(t, err, "the owner does not possess enough units of the token asset type token1")

	chaincodeStub.GetStateReturns(nil, fmt.Errorf("Failed to read state"))
	err = simpleToken.DeleteTokenAssets(transactionContext, "", 0, "")
	require.EqualError(t, err, "failed to read from world state: Failed to read state")
}
func TestGetBalance(t *testing.T) {
	chaincodeStub := &mocks.ChaincodeStub{}
	transactionContext := &mocks.TransactionContext{}
	transactionContext.GetStubReturns(chaincodeStub)

	walletMap := make(map[string]int)
	walletMap["token1"] = 5
	expectedAsset := &TokenWallet{WalletMap: walletMap}
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

func TestTokenAssetsExist(t *testing.T) {
	chaincodeStub := &mocks.ChaincodeStub{}
	transactionContext := &mocks.TransactionContext{}
	transactionContext.GetStubReturns(chaincodeStub)

	walletMap := make(map[string]int)
	walletMap["token1"] = 5
	expectedAsset := &TokenWallet{WalletMap: walletMap}
	bytes, err := json.Marshal(expectedAsset)
	require.NoError(t, err)

	simpleToken := SmartContract{}

	// Token Assets exist case
	chaincodeStub.GetStateReturns(bytes, nil)
	res, err := simpleToken.TokenAssetsExist(transactionContext, "token1", 4, "")
	require.NoError(t, err)
	require.Equal(t, res, true)

	// Token Assets doesn't exist case
	chaincodeStub.GetStateReturns(bytes, nil)
	res, err = simpleToken.TokenAssetsExist(transactionContext, "token1", 6, "")
	require.NoError(t, err)
	require.Equal(t, res, false)

	chaincodeStub.GetStateReturns(nil, fmt.Errorf("Failed to read state"))
	res, err = simpleToken.TokenAssetsExist(transactionContext, "", 0, "")
	require.EqualError(t, err, "failed to read from world state: Failed to read state")
	require.Equal(t, res, false)
}
