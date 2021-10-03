package main_test

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"testing"

	"github.com/golang/protobuf/proto"
	sa "github.com/hyperledger-labs/weaver-dlt-interoperability/samples/fabric/simpleassetandinterop"
	mspProtobuf "github.com/hyperledger/fabric-protos-go/msp"
	"github.com/stretchr/testify/require"
	wtest "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils"
)

func TestInitTokenAssetLedger(t *testing.T) {
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleToken := sa.SmartContract{}

	err := simpleToken.InitTokenAssetLedger(transactionContext)
	require.NoError(t, err)

	chaincodeStub.PutStateReturns(fmt.Errorf("failed inserting key"))
	err = simpleToken.InitTokenAssetLedger(transactionContext)
	require.EqualError(t, err, "failed to create token asset type token1. failed inserting key")
}

func TestCreateTokenAssetType(t *testing.T) {
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleToken := sa.SmartContract{}

	// Should fail if token asset type is empty
	res, err := simpleToken.CreateTokenAssetType(transactionContext, "", "", 0)
	require.Error(t, err)

	// Successful Case
	res, err = simpleToken.CreateTokenAssetType(transactionContext, "sometokentype", "", 0)
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
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleToken := sa.SmartContract{}

	expectedAsset := &sa.TokenAssetType{Issuer: "CentralBank", Value: 10}
	bytes, err := json.Marshal(expectedAsset)
	require.NoError(t, err)

	// Successful Read
	chaincodeStub.GetStateReturns(bytes, nil)
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
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleToken := sa.SmartContract{}

	chaincodeStub.DelStateReturns(nil)
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
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleToken := sa.SmartContract{}

	walletMap := make(map[string]uint64)
	expectedAsset := &sa.TokenWallet{WalletMap: walletMap}
	bytes, err := json.Marshal(expectedAsset)
	require.NoError(t, err)

	// Should fail of owner is blank
	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleToken.IssueTokenAssets(transactionContext, "", 0, "")
	require.Error(t, err)

	// Checking succesful case
	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleToken.IssueTokenAssets(transactionContext, "", 0, "someowner")
	require.NoError(t, err)

	// Check if writing state after issuing fails
	chaincodeStub.GetStateReturns(bytes, nil)
	chaincodeStub.PutStateReturns(fmt.Errorf("failed to put state"))
	err = simpleToken.IssueTokenAssets(transactionContext, "", 0, "someowner")
	require.EqualError(t, err, "failed to put state")

	// Error check
	chaincodeStub.GetStateReturns(nil, fmt.Errorf("failed to read state"))
	err = simpleToken.IssueTokenAssets(transactionContext, "", 0, "someowner")
	require.EqualError(t, err, "failed to read from world state: failed to read state")

	// Check if given token asset type doesn't exist
	chaincodeStub.GetStateReturns(nil, nil)
	err = simpleToken.IssueTokenAssets(transactionContext, "token1", 0, "someowner")
	require.EqualError(t, err, "cannot issue: the token asset type token1 does not exist")
}

func TestDeleteTokenAssets(t *testing.T) {
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleToken := sa.SmartContract{}

	walletMap := make(map[string]uint64)
	walletMap["token1"] = 5
	expectedAsset := &sa.TokenWallet{WalletMap: walletMap}
	bytes, err := json.Marshal(expectedAsset)
	require.NoError(t, err)

	// Successful delete case
	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleToken.DeleteTokenAssets(transactionContext, "token1", 2)
	require.NoError(t, err)

	// Trying to delete more than owner hass
	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleToken.DeleteTokenAssets(transactionContext, "token1", 10)
	require.EqualError(t, err, "the owner does not possess enough units of the token asset type token1")

	// Trying to delete token that owner doesn't possess
	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleToken.DeleteTokenAssets(transactionContext, "token2", 2)
	require.EqualError(t, err, "the owner does not possess any units of the token asset type token2")

	// Error Check
	chaincodeStub.GetStateReturns(nil, fmt.Errorf("Failed to read state"))
	err = simpleToken.DeleteTokenAssets(transactionContext, "", 0)
	require.EqualError(t, err, "failed to read from world state: Failed to read state")

	// check if it tries to delete wallet entry when wallet list is empty
	chaincodeStub.GetStateReturns(bytes, nil)
	chaincodeStub.DelStateReturns(fmt.Errorf("Failed to delete state"))
	err = simpleToken.DeleteTokenAssets(transactionContext, "token1", 5)
	require.EqualError(t, err, "Failed to delete state")

}
func TestTransferTokenAssets(t *testing.T) {
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleToken := sa.SmartContract{}

	walletMap := make(map[string]uint64)
	walletMap["token1"] = 5
	expectedAsset := &sa.TokenWallet{WalletMap: walletMap}
	bytes, err := json.Marshal(expectedAsset)
	require.NoError(t, err)

	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleToken.TransferTokenAssets(transactionContext, "token1", 2, "")
	require.Error(t, err)

	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleToken.TransferTokenAssets(transactionContext, "token1", 2, "newowner")
	require.NoError(t, err)

	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleToken.TransferTokenAssets(transactionContext, "token1", 10, "newowner")
	require.EqualError(t, err, "the owner does not possess enough units of the token asset type token1")

	chaincodeStub.GetStateReturns(nil, fmt.Errorf("Failed to read state"))
	err = simpleToken.DeleteTokenAssets(transactionContext, "", 0)
	require.EqualError(t, err, "failed to read from world state: Failed to read state")
}
func TestGetBalance(t *testing.T) {
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleToken := sa.SmartContract{}

	walletMap := make(map[string]uint64)
	walletMap["token1"] = 5
	expectedAsset := &sa.TokenWallet{WalletMap: walletMap}
	bytes, err := json.Marshal(expectedAsset)
	require.NoError(t, err)

	// Successful GetBalance case
	chaincodeStub.GetStateReturnsOnCall(0, bytes, nil)
	chaincodeStub.GetStateReturnsOnCall(1, bytes, nil)
	bal, err := simpleToken.GetBalance(transactionContext, "token1", "")
	require.NoError(t, err)
	require.Equal(t, bal, uint64(5))

	// GetState Fails
	chaincodeStub.GetStateReturnsOnCall(2, nil, fmt.Errorf("Failed to read state"))
	bal, err = simpleToken.GetBalance(transactionContext, "", "")
	require.EqualError(t, err, "failed to read from world state: Failed to read state")

	chaincodeStub.GetStateReturnsOnCall(3, bytes, nil)
	chaincodeStub.GetStateReturnsOnCall(4, nil, fmt.Errorf("Failed to read state"))
	bal, err = simpleToken.GetBalance(transactionContext, "", "")
	require.EqualError(t, err, "failed to read owner's wallet from world state: Failed to read state")
}

func TestGetMyWallet(t *testing.T) {
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleToken := sa.SmartContract{}

	walletMap := make(map[string]uint64)
	walletMap["token1"] = 5
	expectedRes := createKeyValuePairs(walletMap)
	expectedAsset := &sa.TokenWallet{WalletMap: walletMap}
	bytes, err := json.Marshal(expectedAsset)
	require.NoError(t, err)

	chaincodeStub.GetCreatorReturns([]byte(getCreator()), nil)

	// Successful GetBalance case
	chaincodeStub.GetStateReturnsOnCall(0, bytes, nil)
	bal, err := simpleToken.GetMyWallet(transactionContext)
	require.NoError(t, err)
	require.Equal(t, bal, expectedRes)

	chaincodeStub.GetStateReturnsOnCall(1, nil, fmt.Errorf("Failed to read state"))
	bal, err = simpleToken.GetMyWallet(transactionContext)
	require.EqualError(t, err, "failed to read owner's wallet from world state: Failed to read state")

	// Owner doesn't have a wallet
	chaincodeStub.GetStateReturnsOnCall(2, nil, nil)
	bal, err = simpleToken.GetMyWallet(transactionContext)
	require.EqualError(t, err, "owner does not have a wallet")
}

func TestTokenAssetsExist(t *testing.T) {
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleToken := sa.SmartContract{}

	walletMap := make(map[string]uint64)
	walletMap["token1"] = 5
	expectedAsset := &sa.TokenWallet{WalletMap: walletMap}
	bytes, err := json.Marshal(expectedAsset)
	require.NoError(t, err)

	// Token Assets exist case
	chaincodeStub.GetStateReturns(bytes, nil)
	res, err := simpleToken.TokenAssetsExist(transactionContext, "token1", 4)
	require.NoError(t, err)
	require.Equal(t, res, true)

	// Token Assets doesn't exist case
	chaincodeStub.GetStateReturns(bytes, nil)
	res, err = simpleToken.TokenAssetsExist(transactionContext, "token1", 6)
	require.NoError(t, err)
	require.Equal(t, res, false)

	chaincodeStub.GetStateReturns(nil, fmt.Errorf("Failed to read state"))
	res, err = simpleToken.TokenAssetsExist(transactionContext, "", 0)
	require.EqualError(t, err, "failed to read from world state: Failed to read state")
	require.Equal(t, res, false)
}

// function that supplies value that is to be returned by ctx.GetStub().GetCreator()
func getCreator() string {
	serializedIdentity := &mspProtobuf.SerializedIdentity{}
	eCertBytes, _ := base64.StdEncoding.DecodeString(getTestTxCreatorECertBase64())
	serializedIdentity.IdBytes = []byte(eCertBytes)
	serializedIdentity.Mspid = "ca.org1.example.com"
	serializedIdentityBytes, _ := proto.Marshal(serializedIdentity)

	return string(serializedIdentityBytes)
}

// function that supplies the ECert in base64 for the transaction creator
func getTestTxCreatorECertBase64() string {
	eCertBase64 := "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNVVENDQWZpZ0F3SUJBZ0lSQU5qaWdnVHRhSERGRmtIaUI3VnhPN013Q2dZSUtvWkl6ajBFQXdJd2N6RUxNQWtHQTFVRUJoTUNWVk14RXpBUkJnTlZCQWdUQ2tOaGJHbG1iM0p1YVdFeEZqQVVCZ05WQkFjVERWTmhiaUJHY21GdVkybHpZMjh4R1RBWEJnTlZCQW9URUc5eVp6RXVaWGhoYlhCc1pTNWpiMjB4SERBYUJnTlZCQU1URTJOaExtOXlaekV1WlhoaGJYQnNaUzVqYjIwd0hoY05NVGt3TkRBeE1EZzBOVEF3V2hjTk1qa3dNekk1TURnME5UQXdXakJ6TVFzd0NRWURWUVFHRXdKVlV6RVRNQkVHQTFVRUNCTUtRMkZzYVdadmNtNXBZVEVXTUJRR0ExVUVCeE1OVTJGdUlFWnlZVzVqYVhOamJ6RVpNQmNHQTFVRUNoTVFiM0puTVM1bGVHRnRjR3hsTG1OdmJURWNNQm9HQTFVRUF4TVRZMkV1YjNKbk1TNWxlR0Z0Y0d4bExtTnZiVEJaTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEEwSUFCT2VlYTRCNlM5ZTlyLzZUWGZFZUFmZ3FrNVdpcHZZaEdveGg1ZEZuK1g0bTN2UXZTQlhuVFdLVzczZVNnS0lzUHc5dExDVytwZW9yVnMxMWdieXdiY0dqYlRCck1BNEdBMVVkRHdFQi93UUVBd0lCcGpBZEJnTlZIU1VFRmpBVUJnZ3JCZ0VGQlFjREFnWUlLd1lCQlFVSEF3RXdEd1lEVlIwVEFRSC9CQVV3QXdFQi96QXBCZ05WSFE0RUlnUWcxYzJHZmJTa3hUWkxIM2VzUFd3c2llVkU1QWhZNHNPQjVGOGEvaHM5WjhVd0NnWUlLb1pJemowRUF3SURSd0F3UkFJZ1JkZ1krNW9iMDNqVjJLSzFWdjZiZE5xM2NLWHc0cHhNVXY5MFZOc0tHdTBDSUE4Q0lMa3ZEZWg3NEFCRDB6QUNkbitBTkMyVVQ2Sk5UNnd6VHNLN3BYdUwKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQ=="

	return eCertBase64
}
func createKeyValuePairs(m map[string]uint64) string {
	b := new(bytes.Buffer)
	for key, value := range m {
		fmt.Fprintf(b, "%s=\"%d\"\n", key, value)
	}
	return b.String()
}
