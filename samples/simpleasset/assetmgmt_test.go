package main

import (
	"encoding/json"
	"encoding/base64"
	"crypto/sha256"
	"fmt"
	"testing"
	"time"

	mspProtobuf "github.com/hyperledger/fabric-protos-go/msp"
	"github.com/golang/protobuf/proto"
	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/stretchr/testify/require"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/interfaces/asset-mgmt/protos-go/common"
)

// function that supplies value that is to be returned by ctx.GetStub().GetCreator() in locker/recipient context
func getCreatorInContext(creator string) string {
	serializedIdentity := &mspProtobuf.SerializedIdentity{}
	var eCertBytes []byte
	if creator == "locker" {
		eCertBytes, _ = base64.StdEncoding.DecodeString(getLockerECertBase64())
	} else {
		eCertBytes, _ = base64.StdEncoding.DecodeString(getRecipientECertBase64())
	}
	serializedIdentity.IdBytes = eCertBytes
	serializedIdentity.Mspid = "ca.org1.example.com"
	serializedIdentityBytes, _ := proto.Marshal(serializedIdentity)

	return string(serializedIdentityBytes)
}

// function that supplies the ECert in base64 for locker (e.g., Alice)
func getLockerECertBase64() string {
	eCertBase64 := "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNVVENDQWZpZ0F3SUJBZ0lSQU5qaWdnVHRhSERGRmtIaUI3VnhPN013Q2dZSUtvWkl6ajBFQXdJd2N6RUxNQWtHQTFVRUJoTUNWVk14RXpBUkJnTlZCQWdUQ2tOaGJHbG1iM0p1YVdFeEZqQVVCZ05WQkFjVERWTmhiaUJHY21GdVkybHpZMjh4R1RBWEJnTlZCQW9URUc5eVp6RXVaWGhoYlhCc1pTNWpiMjB4SERBYUJnTlZCQU1URTJOaExtOXlaekV1WlhoaGJYQnNaUzVqYjIwd0hoY05NVGt3TkRBeE1EZzBOVEF3V2hjTk1qa3dNekk1TURnME5UQXdXakJ6TVFzd0NRWURWUVFHRXdKVlV6RVRNQkVHQTFVRUNCTUtRMkZzYVdadmNtNXBZVEVXTUJRR0ExVUVCeE1OVTJGdUlFWnlZVzVqYVhOamJ6RVpNQmNHQTFVRUNoTVFiM0puTVM1bGVHRnRjR3hsTG1OdmJURWNNQm9HQTFVRUF4TVRZMkV1YjNKbk1TNWxlR0Z0Y0d4bExtTnZiVEJaTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEEwSUFCT2VlYTRCNlM5ZTlyLzZUWGZFZUFmZ3FrNVdpcHZZaEdveGg1ZEZuK1g0bTN2UXZTQlhuVFdLVzczZVNnS0lzUHc5dExDVytwZW9yVnMxMWdieXdiY0dqYlRCck1BNEdBMVVkRHdFQi93UUVBd0lCcGpBZEJnTlZIU1VFRmpBVUJnZ3JCZ0VGQlFjREFnWUlLd1lCQlFVSEF3RXdEd1lEVlIwVEFRSC9CQVV3QXdFQi96QXBCZ05WSFE0RUlnUWcxYzJHZmJTa3hUWkxIM2VzUFd3c2llVkU1QWhZNHNPQjVGOGEvaHM5WjhVd0NnWUlLb1pJemowRUF3SURSd0F3UkFJZ1JkZ1krNW9iMDNqVjJLSzFWdjZiZE5xM2NLWHc0cHhNVXY5MFZOc0tHdTBDSUE4Q0lMa3ZEZWg3NEFCRDB6QUNkbitBTkMyVVQ2Sk5UNnd6VHNLN3BYdUwKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQ=="

	return eCertBase64
}

// function that supplies the ECert in base64 for recipient (e.g., Bob)
func getRecipientECertBase64() string {
	eCertBase64 := "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNVVENDQWZpZ0F3SUJBZ0lSQU5qaWdnVHRhSERGRmtIaUI3VnhPN013Q2dZSUtvWkl6ajBFQXdJd2N6RUxNQWtHQTFVRUJoTUNWVk14RXpBUkJnTlZCQWdUQ2tOaGJHbG1iM0p1YVdFeEZqQVVCZ05WQkFjVERWTmhiaUJHY21GdVkybHpZMjh4R1RBWEJnTlZCQW9URUc5eVp6RXVaWGhoYlhCc1pTNWpiMjB4SERBYUJnTlZCQU1URTJOaExtOXlaekV1WlhoaGJYQnNaUzVqYjIwd0hoY05NVGt3TkRBeE1EZzBOVEF3V2hjTk1qa3dNekk1TURnME5UQXdXakJ6TVFzd0NRWURWUVFHRXdKVlV6RVRNQkVHQTFVRUNCTUtRMkZzYVdadmNtNXBZVEVXTUJRR0ExVUVCeE1OVTJGdUlFWnlZVzVqYVhOamJ6RVpNQmNHQTFVRUNoTVFiM0puTVM1bGVHRnRjR3hsTG1OdmJURWNNQm9HQTFVRUF4TVRZMkV1YjNKbk1TNWxlR0Z0Y0d4bExtTnZiVEJaTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEEwSUFCT2VlYTRCNlM5ZTlyLzZUWGZFZUFmZ3FrNVdpcHZZaEdveGg1ZEZuK1g0bTN2UXZTQlhuVFdLVzczZVNnS0lzUHc5dExDVytwZW9yVnMxMWdieXdiY0dqYlRCck1BNEdBMVVkRHdFQi93UUVBd0lCcGpBZEJnTlZIU1VFRmpBVUJnZ3JCZ0VGQlFjREFnWUlLd1lCQlFVSEF3RXdEd1lEVlIwVEFRSC9CQVV3QXdFQi96QXBCZ05WSFE0RUlnUWcxYzJHZmJTa3hUWkxIM2VzUFd3c2llVkU1QWhZNHNPQjVGOGEvaHM5WjhVd0NnWUlLb1pJemowRUF3SURSd0F3UkFJZ1JkZ1krNW9iMDNqVjJLSzFWdjZiZE5xM2NLWHc0cHhNVXY5MFZOc0tHdTBDSUE4Q0lMa3ZEZWg3NEFCRDB6QUNkbitBTkMyVVQ2Sk5UNnd6VHNLN3BYdUwKLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQ="

	return eCertBase64
}

// function to generate a "SHA256" hash in base64 format for a given preimage
func generateSHA256HashInBase64Form(preimage string) string {
	hasher := sha256.New()
	hasher.Write([]byte(preimage))
	shaHash := hasher.Sum(nil)
	shaHashBase64 := base64.StdEncoding.EncodeToString(shaHash)
	return shaHashBase64
}

type ContractedFungibleAsset struct {
	Type		string	`json:"type"`
	NumUnits	uint64	`json:"id"`
}

// test case for "asset exchange" happy path
func TestExchangeBondAssetWithTokenAsset(t *testing.T) {
	ctx, chaincodeStub, sc := prepMockStub()

	bondLocker := getLockerECertBase64()
	bondRecipient := getRecipientECertBase64()
	bondType := "bond"
	bondId := "b01"
	bondIssuer := "network1"
	bondFaceValue := 1
	currentTime := time.Now()
	bondMaturityDate := currentTime.Add(time.Hour * 24)  // maturity date is 1 day after current time

	tokenType := "cbdc"
	tokenIssuer := "network2"
	tokenValue := 1
	numTokens := uint64(10)
	tokensLocker := getRecipientECertBase64()
	tokensRecipient := getLockerECertBase64()


	// Create bond asset
	// let ctx.GetStub().GetState() return that the bond asset didn't exist before
	chaincodeStub.GetStateReturnsOnCall(0, nil, nil)
	err := sc.CreateAsset(ctx, bondType, bondId, bondLocker, bondIssuer, bondFaceValue, bondMaturityDate.Format(time.RFC822))
	require.NoError(t, err)


	// Create token asset type
	chaincodeStub.GetStateReturnsOnCall(1, nil, nil)
	res, err := sc.CreateTokenAssetType(ctx, tokenType, tokenIssuer, tokenValue)
	require.NoError(t, err)
	require.Equal(t, res, true)


	// Issue token assets for Bob
	tokenAssetType := TokenAssetType {
		Issuer: tokenIssuer,
		Value: tokenValue,
	}
        tokenAssetTypeBytes, _ := json.Marshal(tokenAssetType)
	chaincodeStub.GetStateReturnsOnCall(2, tokenAssetTypeBytes, nil)
	walletMap := make(map[string]uint64)
	tokensWallet := &TokenWallet{WalletMap: walletMap}
	tokensWalletBytes, _ := json.Marshal(tokensWallet)
	chaincodeStub.GetStateReturnsOnCall(3, tokensWalletBytes, nil)
	err = sc.IssueTokenAssets(ctx, tokenType, numTokens, getRecipientECertBase64())
	require.NoError(t, err)


	// Lock bond asset in network1 by Alice for Bob
	fmt.Println("*** Lock bond asset in network1 by Alice ***")
	preimage := "abcd"
	hashBase64 := generateSHA256HashInBase64Form(preimage)
	defaultTimeLockSecs := uint64(300)   // set default locking period as 5 minutes
	currentTimeSecs := uint64(time.Now().Unix())
	bondContractId := "bond-contract"
	lockInfoHTLC := &common.AssetLockHTLC {
		HashBase64: []byte(hashBase64),
		ExpiryTimeSecs: currentTimeSecs + defaultTimeLockSecs,
		TimeSpec: common.AssetLockHTLC_EPOCH,
	}
	lockInfoHTLCBytes, _ := proto.Marshal(lockInfoHTLC)
	lockInfo := &common.AssetLock{
		LockInfo: lockInfoHTLCBytes,
	}
	lockInfoBytes, _ := proto.Marshal(lockInfo)
	bondAgreement := &common.AssetExchangeAgreement {
		Type: bondType,
		Id: bondId,
		Locker: bondLocker,
		Recipient: bondRecipient,
	}
	bondAgreementBytes, _ := proto.Marshal(bondAgreement)
	bondAsset := BondAsset {
		Type: bondType,
		ID: bondId,
		Owner: bondLocker,
		Issuer: bondIssuer,
		FaceValue: bondFaceValue,
		MaturityDate: bondMaturityDate,
	}
	bondAssetBytes, err := json.Marshal(bondAsset)
	chaincodeStub.GetCreatorReturnsOnCall(0, []byte(getCreatorInContext("locker")), nil)
	chaincodeStub.GetStateReturnsOnCall(4, bondAssetBytes, nil)
	chaincodeStub.InvokeChaincodeReturns(shim.Success([]byte(bondContractId)))
	bondContractId, err = sc.LockAsset(ctx, base64.StdEncoding.EncodeToString(bondAgreementBytes), base64.StdEncoding.EncodeToString(lockInfoBytes))
        require.NoError(t, err)
	require.NotEmpty(t, bondContractId)


	// Lock token asset in network2 by Bob for Alice
	fmt.Println("*** Lock token asset in network2 by Bob ***")
	tokensContractId := "tokens-contract"
	tokensAgreement := &common.FungibleAssetExchangeAgreement {
		Type: tokenType,
		NumUnits: numTokens,
		Locker: tokensLocker,
		Recipient: tokensRecipient,
	}
	tokensAgreementBytes, _ := proto.Marshal(tokensAgreement)
	chaincodeStub.GetCreatorReturnsOnCall(1, []byte(getCreatorInContext("recipient")), nil)
	tokenAssetType = TokenAssetType {
		Issuer: tokenIssuer,
		Value: tokenValue,
	}
        tokenAssetTypeBytes, _ = json.Marshal(tokenAssetType)
	chaincodeStub.GetStateReturnsOnCall(5, tokenAssetTypeBytes, nil)
	walletMap = make(map[string]uint64)
	walletMap[tokenType] = numTokens
	tokensWallet = &TokenWallet{WalletMap: walletMap}
	tokensWalletBytes, _ = json.Marshal(tokensWallet)
	chaincodeStub.GetStateReturnsOnCall(6, tokensWalletBytes, nil)
	chaincodeStub.InvokeChaincodeReturns(shim.Success([]byte(tokensContractId)))
	chaincodeStub.GetCreatorReturnsOnCall(2, []byte(getCreatorInContext("recipient")), nil)
	chaincodeStub.GetStateReturnsOnCall(7, tokenAssetTypeBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(8, tokensWalletBytes, nil)
	tokensContractId, err = sc.LockFungibleAsset(ctx, base64.StdEncoding.EncodeToString(tokensAgreementBytes), base64.StdEncoding.EncodeToString(lockInfoBytes))
	require.NoError(t, err)
	require.NotEmpty(t, tokensContractId)


	// Claim token asset in network2 by Alice
	fmt.Println("*** Claim token asset in network2 by Alice ***")
	preimageBase64 := base64.StdEncoding.EncodeToString([]byte(preimage))
	claimInfoHTLC := &common.AssetClaimHTLC {
		HashPreimageBase64: []byte(preimageBase64),
	}
	claimInfoHTLCBytes, _ := proto.Marshal(claimInfoHTLC)
	claimInfo := &common.AssetClaim{
		ClaimInfo: claimInfoHTLCBytes,
		LockMechanism: common.LockMechanism_HTLC,
	}
	claimInfoBytes, _ := proto.Marshal(claimInfo)
	chaincodeStub.InvokeChaincodeReturns(shim.Success(nil))
	chaincodeStub.GetCreatorReturnsOnCall(3, []byte(getCreatorInContext("locker")), nil)
	tokenAssetType = TokenAssetType {
		Issuer: tokenIssuer,
		Value: tokenValue,
	}
        tokenAssetTypeBytes, _ = json.Marshal(tokenAssetType)
	contractedTokenAsset := ContractedFungibleAsset{
		Type: tokenType,
		NumUnits: numTokens,
	}

	contractedTokenAssetBytes, _ := json.Marshal(contractedTokenAsset)
	chaincodeStub.GetStateReturnsOnCall(9, tokenAssetTypeBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(10, contractedTokenAssetBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(11, nil, nil)
	_, err = sc.ClaimFungibleAsset(ctx, base64.StdEncoding.EncodeToString(tokensAgreementBytes), base64.StdEncoding.EncodeToString(claimInfoBytes))
        require.NoError(t, err)


	// Claim bond asset in network1 by Bob
	fmt.Println("*** Claim bond asset in network1 by Bob ***")
	chaincodeStub.InvokeChaincodeReturns(shim.Success(nil))
	chaincodeStub.GetCreatorReturnsOnCall(4, []byte(getCreatorInContext("recipient")), nil)
	chaincodeStub.GetStateReturnsOnCall(12, bondAssetBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(13, []byte(bondContractId), nil)
	_, err = sc.ClaimAsset(ctx, base64.StdEncoding.EncodeToString(bondAgreementBytes), base64.StdEncoding.EncodeToString(claimInfoBytes))
        require.NoError(t, err)

}
