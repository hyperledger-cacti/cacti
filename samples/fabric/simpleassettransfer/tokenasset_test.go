package main_test

import (
	"encoding/json"
	"fmt"
	"testing"
	"encoding/base64"
	"bytes"
	"time"
	
	"github.com/golang/protobuf/proto"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	mspProtobuf "github.com/hyperledger/fabric-protos-go/msp"
	sa "github.com/hyperledger-labs/weaver-dlt-interoperability/samples/fabric/simpleassettransfer"
	"github.com/stretchr/testify/require"
	wtest "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils"
	// wutils "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/utils"
)

const (
	defaultTokenAssetType   = "ERC20Token"
	defaultNumUnits         = 15
	defaultTokenAssetOwner  = "Alice"
	defaultAssetTypeIssuer  = "Treasury"
	defaultAssetTypeValue   = 10
)

func TestInitTokenAssetLedger(t *testing.T) {
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleToken := sa.SmartContract{}
	simpleToken.ConfigureInterop("interopcc")

	err := simpleToken.InitTokenAssetLedger(transactionContext)
	require.NoError(t, err)

	chaincodeStub.PutStateReturns(fmt.Errorf("failed inserting key"))
	err = simpleToken.InitTokenAssetLedger(transactionContext)
	require.EqualError(t, err, "failed to create token asset type token1. failed inserting key")
}

func TestCreateTokenAssetType(t *testing.T) {
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleToken := sa.SmartContract{}
	simpleToken.ConfigureInterop("interopcc")

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
	simpleToken.ConfigureInterop("interopcc")

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
	simpleToken.ConfigureInterop("interopcc")

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
	simpleToken.ConfigureInterop("interopcc")

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
	simpleToken.ConfigureInterop("interopcc")

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
	simpleToken.ConfigureInterop("interopcc")

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
	simpleToken.ConfigureInterop("interopcc")

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
	simpleToken.ConfigureInterop("interopcc")

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
	simpleToken.ConfigureInterop("interopcc")

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

func TestTokenPledgeAsset(t *testing.T) {
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleAsset := sa.SmartContract{}
	simpleAsset.ConfigureInterop("interopcc")

	// Pledge non-existent asset
	expiry := uint64(time.Now().Unix()) + (5 * 60)      // Expires 5 minutes from now
	pledgeId, err := simpleAsset.PledgeTokenAsset(transactionContext, defaultTokenAssetType, defaultNumUnits, destNetworkID, getRecipientECertBase64(), expiry)
	require.Error(t, err)
	require.Equal(t, pledgeId, "")

	createdType, err := simpleAsset.CreateTokenAssetType(transactionContext, defaultTokenAssetType, defaultAssetTypeIssuer, defaultAssetTypeValue)
	require.NoError(t, err)
	require.True(t, createdType)

	tokenTypeKey := "FAT_" + defaultTokenAssetType
	assetType := sa.TokenAssetType{
		Issuer: defaultAssetTypeIssuer,
		Value: defaultAssetTypeValue,
	}
	assetTypeJSON, _ := json.Marshal(assetType)
	chaincodeStub.GetStateReturnsForKey(tokenTypeKey, assetTypeJSON, nil)

	err = simpleAsset.IssueTokenAssets(transactionContext, defaultTokenAssetType, 2 * defaultNumUnits, getCreatorInContext("locker"))
	require.NoError(t, err)

	walletIdKey := "W_" + getLockerECertBase64()
	walletMap := make(map[string]uint64)
	walletMap[defaultTokenAssetType] = 2 * defaultNumUnits
	wallet := sa.TokenWallet{
		WalletMap: walletMap,
	}
	walletNewJSON, err := json.Marshal(wallet)
	chaincodeStub.GetStateReturnsForKey(walletIdKey, walletNewJSON, nil)

	// tokenAsset := sa.TokenAsset{
	// 	Type: defaultTokenAssetType,
	// 	Owner: getLockerECertBase64(),
	// 	NumUnits: defaultNumUnits,
	// }
	// tokenAssetJSON, _ := json.Marshal(tokenAsset)
	chaincodeStub.GetCreatorReturns([]byte(getCreatorInContext("recipient")), nil)
	pledgeId, err = simpleAsset.PledgeTokenAsset(transactionContext, defaultTokenAssetType, defaultNumUnits, destNetworkID, getRecipientECertBase64(), expiry)
	require.Error(t, err)       // Asset owner is not the pledger
	require.Equal(t, pledgeId, "")

	chaincodeStub.GetCreatorReturns([]byte(getCreatorInContext("locker")), nil)
	chaincodeStub.GetStateReturnsForKey(localNetworkIdKey, []byte(sourceNetworkID), nil)
	chaincodeStub.PutStateReturns(nil)
	chaincodeStub.DelStateReturns(nil)
	pledgeId, err = simpleAsset.PledgeTokenAsset(transactionContext, defaultTokenAssetType, defaultNumUnits, destNetworkID, getRecipientECertBase64(),
		expiry - (10 * 60))
	require.Error(t, err)       // Invalid pledge as its expiry time in the past
	require.Equal(t, pledgeId, "")

	pledgeId, err = simpleAsset.PledgeTokenAsset(transactionContext, defaultTokenAssetType, defaultNumUnits, destNetworkID, getRecipientECertBase64(), expiry)
	require.NoError(t, err)     // Asset pledge is recorded
	require.NotEqual(t, pledgeId, "")

	// tokenAssetPledgeKey := "Pledged_" + defaultTokenAssetType + pledgeId
	// tokenAssetPledge := &common.AssetPledge{
	// 	AssetDetails: tokenAssetJSON,
	// 	LocalNetworkID: sourceNetworkID,
	// 	RemoteNetworkID: destNetworkID,
	// 	Recipient: getRecipientECertBase64(),
	// 	ExpiryTimeSecs: expiry,
	// }
	// tokenAssetPledgeBytes, _ := proto.Marshal(tokenAssetPledge)

	// chaincodeStub.GetStateReturnsForKey(tokenAssetPledgeKey, tokenAssetPledgeBytes, nil)
	// newPledgeId, err := wutils.PledgeAsset(transactionContext, tokenAssetJSON, defaultTokenAssetType, pledgeId, 0, getLockerECertBase64(), destNetworkID,
	// 	getRecipientECertBase64(), expiry)
	// require.NoError(t, err)     // Asset is already pledged, so there is nothing more to be done
	// require.Equal(t, pledgeId, newPledgeId)
	// 
	// newPledgeId, err = wutils.PledgeAsset(transactionContext, tokenAssetJSON, defaultTokenAssetType, pledgeId, 0, getLockerECertBase64(), "someremoteNetwork",
	// 	getRecipientECertBase64(), expiry)
	// require.Error(t, err)       // Already pledged asset cannot be pledged if the pledge attributes don't match the recorded value
	// require.Equal(t, newPledgeId, "")
}

func TestClaimRemoteTokenAsset(t *testing.T) {
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleAsset := sa.SmartContract{}
	simpleAsset.ConfigureInterop("interopcc")

	expiry := uint64(time.Now().Unix()) + (5 * 60)      // Expires 5 minutes from now
	tokenTypeKey := "FAT_" + defaultTokenAssetType
	assetType := sa.TokenAssetType{
		Issuer: defaultAssetTypeIssuer,
		Value: defaultAssetTypeValue,
	}
	assetTypeJSON, _ := json.Marshal(assetType)
	chaincodeStub.GetStateReturnsForKey(tokenTypeKey, assetTypeJSON, nil)

	walletIdKey := "W_" + getLockerECertBase64()
	walletMap := make(map[string]uint64)
	walletMap[defaultTokenAssetType] = 2 * defaultNumUnits
	wallet := sa.TokenWallet{
		WalletMap: walletMap,
	}
	walletNewJSON, err := json.Marshal(wallet)
	chaincodeStub.GetStateReturnsForKey(walletIdKey, walletNewJSON, nil)

	tokenAsset := sa.TokenAsset{
		Type: defaultTokenAssetType,
		Owner: getLockerECertBase64(),
		NumUnits: defaultNumUnits,
	}
	tokenAssetJSON, _ := json.Marshal(tokenAsset)

	chaincodeStub.GetCreatorReturns([]byte(getCreatorInContext("locker")), nil)
	chaincodeStub.GetStateReturnsForKey(localNetworkIdKey, []byte(destNetworkID), nil)
	pledgeId, err := simpleAsset.PledgeTokenAsset(transactionContext, defaultTokenAssetType, defaultNumUnits, destNetworkID, getRecipientECertBase64(), expiry)
	require.NoError(t, err)
	require.NotEqual(t, pledgeId, "")

	tokenAssetPledge := &common.AssetPledge{
		AssetDetails: tokenAssetJSON,
		LocalNetworkID: sourceNetworkID,
		RemoteNetworkID: destNetworkID,
		Recipient: getRecipientECertBase64(),
		ExpiryTimeSecs: expiry - (10 * 60),
	}
	tokenAssetPledgeBytes, _ := marshalAssetPledge(tokenAssetPledge)

	chaincodeStub.GetCreatorReturns([]byte(getCreatorInContext("recipient")), nil)
	err = simpleAsset.ClaimRemoteTokenAsset(transactionContext, pledgeId, defaultTokenAssetType, defaultNumUnits, getLockerECertBase64(), sourceNetworkID,
		tokenAssetPledgeBytes)
	require.Error(t, err)       // Expired pledge

	tokenAssetPledge.ExpiryTimeSecs = tokenAssetPledge.ExpiryTimeSecs + (10 * 60)
	tokenAssetPledgeBytes, _ = marshalAssetPledge(tokenAssetPledge)
	err = simpleAsset.ClaimRemoteTokenAsset(transactionContext, pledgeId, defaultTokenAssetType, defaultNumUnits, getRecipientECertBase64(), sourceNetworkID,
		tokenAssetPledgeBytes)
	require.Error(t, err)       // Unexpected pledged asset owner

	tokenAssetPledge.Recipient = getLockerECertBase64()
	tokenAssetPledgeBytes, _ = marshalAssetPledge(tokenAssetPledge)
	err = simpleAsset.ClaimRemoteTokenAsset(transactionContext, pledgeId, defaultTokenAssetType, defaultNumUnits, getLockerECertBase64(), sourceNetworkID,
		tokenAssetPledgeBytes)
	require.Error(t, err)       // Claimer doesn't match pledge recipient

	tokenAssetPledge.Recipient = getRecipientECertBase64()
	tokenAssetPledgeBytes, _ = marshalAssetPledge(tokenAssetPledge)
	err = simpleAsset.ClaimRemoteTokenAsset(transactionContext, pledgeId, defaultTokenAssetType, defaultNumUnits, getLockerECertBase64(), destNetworkID,
		tokenAssetPledgeBytes)
	require.Error(t, err)       // Pledge not made for the claiming network

	chaincodeStub.GetStateReturnsForKey(localNetworkIdKey, []byte(sourceNetworkID), nil)
	err = simpleAsset.ClaimRemoteTokenAsset(transactionContext, pledgeId, defaultTokenAssetType, defaultNumUnits, getLockerECertBase64(), sourceNetworkID,
		tokenAssetPledgeBytes)
	require.Error(t, err)       // Pledge claimed from the wrong network

	chaincodeStub.GetStateReturnsForKey(localNetworkIdKey, []byte(destNetworkID), nil)
	chaincodeStub.GetStateReturnsForKey(defaultPledgeId, nil, fmt.Errorf("No record found"))
	chaincodeStub.PutStateReturns(nil)
	err = simpleAsset.ClaimRemoteTokenAsset(transactionContext, pledgeId, defaultTokenAssetType, defaultNumUnits, getLockerECertBase64(), sourceNetworkID,
		tokenAssetPledgeBytes)
	require.NoError(t, err)     // Asset claim is recorded
}

func TestReclaimTokenAsset(t *testing.T) {
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleAsset := sa.SmartContract{}
	simpleAsset.ConfigureInterop("interopcc")

	expiry := uint64(time.Now().Unix()) + (5 * 60)      // Expires 5 minutes from now
	tokenTypeKey := "FAT_" + defaultTokenAssetType
	assetType := sa.TokenAssetType{
		Issuer: defaultAssetTypeIssuer,
		Value: defaultAssetTypeValue,
	}
	assetTypeJSON, _ := json.Marshal(assetType)
	chaincodeStub.GetStateReturnsForKey(tokenTypeKey, assetTypeJSON, nil)

	walletIdKey := "W_" + getLockerECertBase64()
	walletMap := make(map[string]uint64)
	walletMap[defaultTokenAssetType] = 2 * defaultNumUnits
	wallet := sa.TokenWallet{
		WalletMap: walletMap,
	}
	walletNewJSON, err := json.Marshal(wallet)
	chaincodeStub.GetStateReturnsForKey(walletIdKey, walletNewJSON, nil)

	tokenAsset := sa.TokenAsset{
		Type: defaultTokenAssetType,
		Owner: getLockerECertBase64(),
		NumUnits: defaultNumUnits,
	}
	tokenAssetJSON, _ := json.Marshal(tokenAsset)

	tokenAssetPledge := &common.AssetPledge{
		AssetDetails: tokenAssetJSON,
		LocalNetworkID: sourceNetworkID,
		RemoteNetworkID: destNetworkID,
		Recipient: getRecipientECertBase64(),
		ExpiryTimeSecs: expiry,
	}
	tokenAssetPledgeBytes, _ := proto.Marshal(tokenAssetPledge)

	tokenClaimStatus := &common.AssetClaimStatus{
		AssetDetails: tokenAssetJSON,
		LocalNetworkID: destNetworkID,
		RemoteNetworkID: sourceNetworkID,
		Recipient: getRecipientECertBase64(),
		ClaimStatus: false,
		ExpiryTimeSecs: expiry,
		ExpirationStatus: false,
	}
	tokenClaimStatusBytes, _ := marshalAssetClaimStatus(tokenClaimStatus)

	chaincodeStub.GetCreatorReturns([]byte(getCreatorInContext("locker")), nil)
	chaincodeStub.GetStateReturnsForKey(localNetworkIdKey, []byte(sourceNetworkID), nil)
	pledgeId, err := simpleAsset.PledgeTokenAsset(transactionContext, defaultTokenAssetType, defaultNumUnits, destNetworkID, getRecipientECertBase64(), expiry)
	require.NoError(t, err)
	require.NotEqual(t, pledgeId, "")

	err = simpleAsset.ReclaimTokenAsset(transactionContext, pledgeId, getRecipientECertBase64(), destNetworkID, tokenClaimStatusBytes)
	require.EqualError(t, err, fmt.Sprintf("the asset with pledgeId %s has not been pledged", pledgeId))       // no pledge recorded

	tokenAssetPledgeKey := "Pledged_" + pledgeId
	chaincodeStub.GetStateReturnsForKey(tokenAssetPledgeKey, tokenAssetPledgeBytes, nil)
	err = simpleAsset.ReclaimTokenAsset(transactionContext, pledgeId, getRecipientECertBase64(), destNetworkID, tokenClaimStatusBytes)
	require.EqualError(t, err, fmt.Sprintf("cannot reclaim asset with pledgeId %s as the expiry time is not yet elapsed", pledgeId))       // pledge has not expired yet

	tokenAssetPledge.ExpiryTimeSecs = expiry - (10 * 60)
	tokenAssetPledgeBytes, _ = proto.Marshal(tokenAssetPledge)
	chaincodeStub.GetStateReturnsForKey(tokenAssetPledgeKey, tokenAssetPledgeBytes, nil)
	tokenClaimStatus.ExpiryTimeSecs = expiry - (10 * 60)
	tokenClaimStatus.ExpirationStatus = false
	tokenClaimStatusBytes, _ = marshalAssetClaimStatus(tokenClaimStatus)
	err = simpleAsset.ReclaimTokenAsset(transactionContext, pledgeId, getRecipientECertBase64(), destNetworkID, tokenClaimStatusBytes)
	require.EqualError(t, err, fmt.Sprintf("cannot reclaim asset with pledgeId %s as the pledge has not yet expired", pledgeId))       // claim probe time was before expiration time

	tokenClaimStatus.ExpirationStatus = true
	tokenClaimStatus.ClaimStatus = true
	tokenClaimStatusBytes, _ = marshalAssetClaimStatus(tokenClaimStatus)
	err = simpleAsset.ReclaimTokenAsset(transactionContext, pledgeId, getRecipientECertBase64(), destNetworkID, tokenClaimStatusBytes)
	require.EqualError(t, err, fmt.Sprintf("cannot reclaim asset with pledgeId %s as it has already been claimed", pledgeId))       // claim was successfully made

	tokenClaimStatus.ClaimStatus = false
	tokenClaimStatusBytes, _ = marshalAssetClaimStatus(tokenClaimStatus)
	err = simpleAsset.ReclaimTokenAsset(transactionContext, "someid", getRecipientECertBase64(), destNetworkID, tokenClaimStatusBytes)
	require.EqualError(t, err, "the asset with pledgeId someid has not been pledged")       // claim was for a different asset

	err = simpleAsset.ReclaimTokenAsset(transactionContext, pledgeId, getRecipientECertBase64(), "somenetworkid", tokenClaimStatusBytes)
	require.EqualError(t, err, fmt.Sprintf("cannot reclaim asset with pledgeId %s as it has not been pledged to the given network", pledgeId))       // claim was probed in a different network than expected

	err = simpleAsset.ReclaimTokenAsset(transactionContext, pledgeId, getLockerECertBase64(), destNetworkID, tokenClaimStatusBytes)
	require.EqualError(t, err, fmt.Sprintf("cannot reclaim asset with pledgeId %s as it has not been pledged to the given recipient", pledgeId))       // claim recipient was different than expected

	chaincodeStub.GetStateReturnsForKey(localNetworkIdKey, []byte(destNetworkID), nil)
	err = simpleAsset.ReclaimTokenAsset(transactionContext, pledgeId, getRecipientECertBase64(), destNetworkID, tokenClaimStatusBytes)
	require.EqualError(t, err, fmt.Sprintf("cannot reclaim asset with pledgeId %s as it has not been pledged by a claimer in this network", pledgeId))       // claim was not made for an asset in my network

	chaincodeStub.GetStateReturnsForKey(localNetworkIdKey, []byte(sourceNetworkID), nil)
	chaincodeStub.PutStateReturns(nil)
	chaincodeStub.DelStateReturns(nil)
	err = simpleAsset.ReclaimTokenAsset(transactionContext, pledgeId, getRecipientECertBase64(), destNetworkID, tokenClaimStatusBytes)
	require.NoError(t, err)     // Asset is reclaimed
}

func TestTokenAssetTransferQueries(t *testing.T) {
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleAsset := sa.SmartContract{}
	simpleAsset.ConfigureInterop("interopcc")

	expiry := uint64(time.Now().Unix()) + (5 * 60)      // Expires 5 minutes from now
	tokenTypeKey := "FAT_" + defaultTokenAssetType
	assetType := sa.TokenAssetType{
		Issuer: defaultAssetTypeIssuer,
		Value: defaultAssetTypeValue,
	}
	assetTypeJSON, _ := json.Marshal(assetType)
	chaincodeStub.GetStateReturnsForKey(tokenTypeKey, assetTypeJSON, nil)

	walletIdKey := "W_" + getLockerECertBase64()
	walletMap := make(map[string]uint64)
	walletMap[defaultTokenAssetType] = 2 * defaultNumUnits
	wallet := sa.TokenWallet{
		WalletMap: walletMap,
	}
	walletNewJSON, err := json.Marshal(wallet)
	chaincodeStub.GetStateReturnsForKey(walletIdKey, walletNewJSON, nil)

	tokenAsset := sa.TokenAsset{
		Type: defaultTokenAssetType,
		Owner: getLockerECertBase64(),
		NumUnits: defaultNumUnits,
	}
	tokenAssetJSON, _ := json.Marshal(tokenAsset)

	tokenAssetPledge := &common.AssetPledge{
		AssetDetails: tokenAssetJSON,
		LocalNetworkID: sourceNetworkID,
		RemoteNetworkID: destNetworkID,
		Recipient: getRecipientECertBase64(),
		ExpiryTimeSecs: expiry,
	}
	tokenAssetPledgeBytes, _ := proto.Marshal(tokenAssetPledge)

	tokenClaimStatus := &common.AssetClaimStatus{
		AssetDetails: tokenAssetJSON,
		LocalNetworkID: destNetworkID,
		RemoteNetworkID: sourceNetworkID,
		Recipient: getRecipientECertBase64(),
		ClaimStatus: true,
		ExpiryTimeSecs: expiry,
		ExpirationStatus: false,
	}
	tokenClaimStatusBytes, _ := proto.Marshal(tokenClaimStatus)

	chaincodeStub.GetCreatorReturns([]byte(getCreatorInContext("locker")), nil)
	chaincodeStub.GetStateReturnsForKey(localNetworkIdKey, []byte(destNetworkID), nil)
	pledgeId, err := simpleAsset.PledgeTokenAsset(transactionContext, defaultTokenAssetType, defaultNumUnits, destNetworkID, getRecipientECertBase64(), expiry)
	require.NoError(t, err)
	require.NotEqual(t, pledgeId, "")

	// Query for pledge when none exists
	pledgeStatus, err := simpleAsset.GetTokenAssetPledgeStatus(transactionContext, pledgeId, getLockerECertBase64(), destNetworkID,
		getRecipientECertBase64())
	require.NoError(t, err)
	lookupPledge, _ := unmarshalAssetPledge(pledgeStatus)
	var lookupPledgeAsset sa.TokenAsset
	json.Unmarshal([]byte(lookupPledge.AssetDetails), &lookupPledgeAsset)
	require.Equal(t, "", lookupPledgeAsset.Type)
	require.Equal(t, "", lookupPledgeAsset.Owner)
	require.Equal(t, uint64(0), lookupPledgeAsset.NumUnits)
	require.Equal(t, "", lookupPledge.LocalNetworkID)
	require.Equal(t, "", lookupPledge.RemoteNetworkID)
	require.Equal(t, "", lookupPledge.Recipient)

	// Query for pledge after recording one
	tokenAssetPledgeKey := "Pledged_" + pledgeId
	chaincodeStub.GetStateReturnsForKey(tokenAssetPledgeKey, tokenAssetPledgeBytes, nil)
	pledgeStatus, err = simpleAsset.GetTokenAssetPledgeStatus(transactionContext, pledgeId, getLockerECertBase64(), destNetworkID,
		getRecipientECertBase64())
	require.NoError(t, err)
	lookupPledge, _ =unmarshalAssetPledge(pledgeStatus)
	json.Unmarshal([]byte(lookupPledge.AssetDetails), &lookupPledgeAsset)
	var originalPledgeAsset sa.TokenAsset
	json.Unmarshal([]byte(tokenAssetPledge.AssetDetails), &originalPledgeAsset)
	require.Equal(t, originalPledgeAsset.Type, lookupPledgeAsset.Type)
	require.Equal(t, originalPledgeAsset.Owner, lookupPledgeAsset.Owner)
	require.Equal(t, originalPledgeAsset.NumUnits, lookupPledgeAsset.NumUnits)
	require.Equal(t, tokenAssetPledge.LocalNetworkID, lookupPledge.LocalNetworkID)
	require.Equal(t, tokenAssetPledge.RemoteNetworkID, lookupPledge.RemoteNetworkID)
	require.Equal(t, tokenAssetPledge.Recipient, lookupPledge.Recipient)

	// Query for claim when no asset or claim exists
	chaincodeStub.GetCreatorReturns([]byte(getCreatorInContext("recipient")), nil)
	claimStatusQueried, err := simpleAsset.GetTokenAssetClaimStatus(transactionContext, pledgeId, defaultTokenAssetType, defaultNumUnits, getRecipientECertBase64(),
		getLockerECertBase64(), sourceNetworkID, expiry)
	require.NoError(t, err)
	lookupClaim, _ :=unmarshalAssetClaimStatus(claimStatusQueried)
	var lookupClaimAsset sa.TokenAsset
	json.Unmarshal([]byte(lookupClaim.AssetDetails), &lookupClaimAsset)
	require.Equal(t, "", lookupClaimAsset.Type)
	require.Equal(t, "", lookupClaimAsset.Owner)
	require.Equal(t, uint64(0), lookupClaimAsset.NumUnits)
	require.Equal(t, "", lookupClaim.LocalNetworkID)
	require.Equal(t, "", lookupClaim.RemoteNetworkID)
	require.Equal(t, "", lookupClaim.Recipient)
	require.False(t, lookupClaim.ClaimStatus)

	// Query for claim when only asset but no claim exists
	chaincodeStub.GetCreatorReturns([]byte(getCreatorInContext("recipient")), nil)
	claimStatusQueried, err = simpleAsset.GetTokenAssetClaimStatus(transactionContext, pledgeId, defaultTokenAssetType, defaultNumUnits, getRecipientECertBase64(),
		getLockerECertBase64(), sourceNetworkID, expiry)
	require.NoError(t, err)
	lookupClaim, _ =unmarshalAssetClaimStatus(claimStatusQueried)
	json.Unmarshal([]byte(lookupClaim.AssetDetails), &lookupClaimAsset)
	require.Equal(t, "", lookupClaimAsset.Type)
	require.Equal(t, "", lookupClaimAsset.Owner)
	require.Equal(t, uint64(0), lookupClaimAsset.NumUnits)
	require.Equal(t, "", lookupClaim.LocalNetworkID)
	require.Equal(t, "", lookupClaim.RemoteNetworkID)
	require.Equal(t, "", lookupClaim.Recipient)
	require.False(t, lookupClaim.ClaimStatus)

	// Create wallet and tokens for recipient
	walletIdKey = "W_" + getRecipientECertBase64()
	walletMap = make(map[string]uint64)
	walletMap[defaultTokenAssetType] = 2 * defaultNumUnits
	wallet = sa.TokenWallet{
		WalletMap: walletMap,
	}
	walletNewJSON, err = json.Marshal(wallet)
	chaincodeStub.GetStateReturnsForKey(walletIdKey, walletNewJSON, nil)

	// Query for claim after recording both an asset and a claim
	tokenAssetClaimKey := "Claimed_" + pledgeId
	chaincodeStub.GetStateReturnsForKey(tokenAssetClaimKey, tokenClaimStatusBytes, nil)
	claimStatusQueried, err = simpleAsset.GetTokenAssetClaimStatus(transactionContext, pledgeId, defaultTokenAssetType, defaultNumUnits, getRecipientECertBase64(),
		getLockerECertBase64(), sourceNetworkID, expiry)
	require.NoError(t, err)
	lookupClaim, _ =unmarshalAssetClaimStatus(claimStatusQueried)
	json.Unmarshal([]byte(lookupClaim.AssetDetails), &lookupClaimAsset)
	var originalClaimAsset sa.TokenAsset
	json.Unmarshal([]byte(tokenClaimStatus.AssetDetails), &originalClaimAsset)
	require.Equal(t, originalClaimAsset.Type, lookupClaimAsset.Type)
	require.Equal(t, originalClaimAsset.Owner, lookupClaimAsset.Owner)
	require.Equal(t, originalClaimAsset.NumUnits, lookupClaimAsset.NumUnits)
	require.Equal(t, tokenClaimStatus.LocalNetworkID, lookupClaim.LocalNetworkID)
	require.Equal(t, tokenClaimStatus.RemoteNetworkID, lookupClaim.RemoteNetworkID)
	require.Equal(t, tokenClaimStatus.Recipient, lookupClaim.Recipient)
	require.Equal(t, tokenClaimStatus.ClaimStatus, lookupClaim.ClaimStatus)
}
