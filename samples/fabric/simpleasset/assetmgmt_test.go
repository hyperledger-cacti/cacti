package main_test

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
	sa "github.com/hyperledger-labs/weaver-dlt-interoperability/samples/fabric/simpleasset"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	wtest "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils"
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
	eCertBase64 := "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNyVENDQWxTZ0F3SUJBZ0lVSENXLzBtV0xhc2hISG9zd0xxVWhpK1FwREc4d0NnWUlLb1pJemowRUF3SXcKY2pFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1ROHdEUVlEVlFRSApFd1pFZFhKb1lXMHhHakFZQmdOVkJBb1RFVzl5WnpFdWJtVjBkMjl5YXpFdVkyOXRNUjB3R3dZRFZRUURFeFJqCllTNXZjbWN4TG01bGRIZHZjbXN4TG1OdmJUQWVGdzB5TURBM01qa3dORE0yTURCYUZ3MHlNVEEzTWprd05EUXgKTURCYU1GMHhDekFKQmdOVkJBWVRBbFZUTVJjd0ZRWURWUVFJRXc1T2IzSjBhQ0JEWVhKdmJHbHVZVEVVTUJJRwpBMVVFQ2hNTFNIbHdaWEpzWldSblpYSXhEekFOQmdOVkJBc1RCbU5zYVdWdWRERU9NQXdHQTFVRUF4TUZkWE5sCmNqRXdXVEFUQmdjcWhrak9QUUlCQmdncWhrak9QUU1CQndOQ0FBU3VoL3JWQ2Y4T0R1dzBJaG5yTTJpaWYyYTcKc0dUOEJJVjFQRURVM1NucUNsbWgrUlYvM0p5S2wvVHl0aHpOL1pWbktFL3R2NWQzZ1ZXYk5zdGM5NytTbzRIYwpNSUhaTUE0R0ExVWREd0VCL3dRRUF3SUhnREFNQmdOVkhSTUJBZjhFQWpBQU1CMEdBMVVkRGdRV0JCUXgvaExZCkNORzRlekNxdmdUS0MvV3d1U1ZubURBZkJnTlZIU01FR0RBV2dCVFdENjArZUNIYkR5RDMzUFdiQ3hWdVFxTUEKcVRBZkJnTlZIUkVFR0RBV2doUnZZelV4TURNM05EY3pPREF1YVdKdExtTnZiVEJZQmdncUF3UUZCZ2NJQVFSTQpleUpoZEhSeWN5STZleUpvWmk1QlptWnBiR2xoZEdsdmJpSTZJaUlzSW1obUxrVnVjbTlzYkcxbGJuUkpSQ0k2CkluVnpaWEl4SWl3aWFHWXVWSGx3WlNJNkltTnNhV1Z1ZENKOWZUQUtCZ2dxaGtqT1BRUURBZ05IQURCRUFpQUYKbnNMNlV1eFRtSks5bmhkTU1QNWxWN3hueVlsMVd5RGl6RVFzZnd1T1p3SWdYY3duSE9hVURXWWpmWHRGU0k1eQp6WjltcjZQRWtSNER0VEhJUkZhTVYxOD0KLS0tLS1FTkQgQ0VSVElGSUNBVEUtLS0tLQ=="

	return eCertBase64
}

// function that supplies the ECert in base64 for recipient (e.g., Bob)
func getRecipientECertBase64() string {
	eCertBase64 := "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNzekNDQWxxZ0F3SUJBZ0lVSjk3ZDJaWUNkRkNHbFo5L3hmZHRlcUdMc1Jvd0NnWUlLb1pJemowRUF3SXcKY2pFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1ROHdEUVlEVlFRSApFd1pFZFhKb1lXMHhHakFZQmdOVkJBb1RFVzl5WnpFdWJtVjBkMjl5YXpFdVkyOXRNUjB3R3dZRFZRUURFeFJqCllTNXZjbWN4TG01bGRIZHZjbXN4TG1OdmJUQWVGdzB5TURBM01qa3dORE0yTURCYUZ3MHlNVEEzTWprd05EUXgKTURCYU1HQXhDekFKQmdOVkJBWVRBbFZUTVJjd0ZRWURWUVFJRXc1T2IzSjBhQ0JEWVhKdmJHbHVZVEVVTUJJRwpBMVVFQ2hNTFNIbHdaWEpzWldSblpYSXhEakFNQmdOVkJBc1RCV0ZrYldsdU1SSXdFQVlEVlFRREV3bHZjbWN4CllXUnRhVzR3V1RBVEJnY3Foa2pPUFFJQkJnZ3Foa2pPUFFNQkJ3TkNBQVFmbjRmVHRDclQ3WVMrZVI1WWRFVU8KMHRKWmJGaEtyYUdqeWVNM2tBTzNNN1VHdVBsUCtXcFdjNkNYUEx3bTNETHgrcjFhMUx6eW1KUWdaOVJjdXErcgpvNEhmTUlIY01BNEdBMVVkRHdFQi93UUVBd0lIZ0RBTUJnTlZIUk1CQWY4RUFqQUFNQjBHQTFVZERnUVdCQlM2ClkxR1FCMXAwUlNBeWxjTTRxQTlZS0JkU2hEQWZCZ05WSFNNRUdEQVdnQlRXRDYwK2VDSGJEeUQzM1BXYkN4VnUKUXFNQXFUQWZCZ05WSFJFRUdEQVdnaFJ2WXpVeE1ETTNORGN6T0RBdWFXSnRMbU52YlRCYkJnZ3FBd1FGQmdjSQpBUVJQZXlKaGRIUnljeUk2ZXlKb1ppNUJabVpwYkdsaGRHbHZiaUk2SWlJc0ltaG1Ma1Z1Y205c2JHMWxiblJKClJDSTZJbTl5WnpGaFpHMXBiaUlzSW1obUxsUjVjR1VpT2lKaFpHMXBiaUo5ZlRBS0JnZ3Foa2pPUFFRREFnTkgKQURCRUFpQkwrSzAzVGFFeWJaRkdWMmMzSS81ZXlpMFBveGc2elZOWDJkajJWRlk5WWdJZ0w5ZlhzcWhaUEU0VApBSkU4ZVZqdWZaOVJnNERJWWloTVVTKzBPbGpWL3pBPQotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0t"
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
	ctx, chaincodeStub := wtest.PrepMockStub()
	sc := sa.SmartContract{}
	sc.ConfigureInterop("interopcc")

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
	tokenAssetType := sa.TokenAssetType {
		Issuer: tokenIssuer,
		Value: tokenValue,
	}
	tokenAssetTypeBytes, _ := json.Marshal(tokenAssetType)
	chaincodeStub.GetStateReturnsOnCall(2, tokenAssetTypeBytes, nil)
	walletMap := make(map[string]uint64)
	tokensWallet := &sa.TokenWallet{WalletMap: walletMap}
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
		TimeSpec: common.TimeSpec_EPOCH,
	}
	lockInfoHTLCBytes, _ := proto.Marshal(lockInfoHTLC)
	lockInfo := &common.AssetLock{
		LockInfo: lockInfoHTLCBytes,
	}
	lockInfoBytes, _ := proto.Marshal(lockInfo)
	bondAgreement := &common.AssetExchangeAgreement {
		AssetType: bondType,
		Id: bondId,
		Locker: bondLocker,
		Recipient: bondRecipient,
	}
	bondAgreementBytes, _ := proto.Marshal(bondAgreement)
	bondAsset := sa.BondAsset {
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
	chaincodeStub.InvokeChaincodeReturnsOnCall(0, shim.Success([]byte("false")))
	chaincodeStub.InvokeChaincodeReturnsOnCall(1, shim.Success([]byte(bondContractId)))
	bondContractId, err = sc.LockAsset(ctx, base64.StdEncoding.EncodeToString(bondAgreementBytes), base64.StdEncoding.EncodeToString(lockInfoBytes))
	require.NoError(t, err)
	require.NotEmpty(t, bondContractId)


	// Lock token asset in network2 by Bob for Alice
	fmt.Println("*** Lock token asset in network2 by Bob ***")
	tokensContractId := "tokens-contract"
	tokensAgreement := &common.FungibleAssetExchangeAgreement {
		AssetType: tokenType,
		NumUnits: numTokens,
		Locker: tokensLocker,
		Recipient: tokensRecipient,
	}
	tokensAgreementBytes, _ := proto.Marshal(tokensAgreement)
	chaincodeStub.GetCreatorReturnsOnCall(1, []byte(getCreatorInContext("recipient")), nil)
	tokenAssetType = sa.TokenAssetType {
		Issuer: tokenIssuer,
		Value: tokenValue,
	}
	tokenAssetTypeBytes, _ = json.Marshal(tokenAssetType)
	chaincodeStub.GetStateReturnsOnCall(5, tokenAssetTypeBytes, nil)
	walletMap = make(map[string]uint64)
	walletMap[tokenType] = numTokens
	tokensWallet = &sa.TokenWallet{WalletMap: walletMap}
	tokensWalletBytes, _ = json.Marshal(tokensWallet)
	chaincodeStub.GetStateReturnsOnCall(6, tokensWalletBytes, nil)
	chaincodeStub.InvokeChaincodeReturnsOnCall(2, shim.Success([]byte(tokensContractId)))
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
	chaincodeStub.InvokeChaincodeReturnsOnCall(3, shim.Success(nil))
	chaincodeStub.GetCreatorReturnsOnCall(3, []byte(getCreatorInContext("locker")), nil)
	chaincodeStub.GetCreatorReturnsOnCall(4, []byte(getCreatorInContext("locker")), nil)
	tokenAssetType = sa.TokenAssetType {
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
	chaincodeStub.InvokeChaincodeReturnsOnCall(4, shim.Success(nil))
	chaincodeStub.InvokeChaincodeReturnsOnCall(5, shim.Success([]byte("true")))
	chaincodeStub.InvokeChaincodeReturnsOnCall(6, shim.Success([]byte("true")))
	chaincodeStub.GetCreatorReturnsOnCall(5, []byte(getCreatorInContext("recipient")), nil)
	chaincodeStub.GetStateReturnsOnCall(12, bondAssetBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(13, []byte(bondContractId), nil)
	_, err = sc.ClaimAsset(ctx, base64.StdEncoding.EncodeToString(bondAgreementBytes), base64.StdEncoding.EncodeToString(claimInfoBytes))
	require.NoError(t, err)

}
