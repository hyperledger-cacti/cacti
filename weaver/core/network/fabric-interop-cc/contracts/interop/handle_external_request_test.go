/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package main

import (
	"bytes"
	"crypto"
	"crypto/ecdsa"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"math/big"
	"testing"
	"time"

	"github.com/golang/protobuf/proto"
	"github.com/hyperledger-labs/weaver-dlt-interoperability/common/protos-go/common"
	wtest "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils"
	"github.com/hyperledger/fabric-chaincode-go/shim"
	mspProtobuf "github.com/hyperledger/fabric-protos-go/msp"
	pb "github.com/hyperledger/fabric-protos-go/peer"
	"github.com/stretchr/testify/require"
	protoV2 "google.golang.org/protobuf/proto"
)

// function that supplies value that is to be returned by ctx.GetStub().GetCreator()
func getRelayCreator() string {
	serializedIdentity := &mspProtobuf.SerializedIdentity{}
	eCertBytes, _ := base64.StdEncoding.DecodeString(getTxRelayCreatorECertBase64())
	serializedIdentity.IdBytes = []byte(eCertBytes)
	serializedIdentity.Mspid = "Org1MSP"
	serializedIdentityBytes, _ := proto.Marshal(serializedIdentity)

	return string(serializedIdentityBytes)
}

// function that supplies the ECert in base64 for the transaction creator
func getTxRelayCreatorECertBase64() string {
	eCertBase64 := "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNoekNDQWkyZ0F3SUJBZ0lVV0tOUmlmVStDRENTZ0pGRFB1RjhCQnpmOEtNd0NnWUlLb1pJemowRUF3SXcKYURFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVJrd0Z3WURWUVFERXhCbVlXSnlhV010ClkyRXRjMlZ5ZG1WeU1CNFhEVEl4TURjek1EQTFORGt3TUZvWERUSXlNRGN6TURBMU5UUXdNRm93UWpFd01BMEcKQTFVRUN4TUdZMnhwWlc1ME1Bc0dBMVVFQ3hNRWIzSm5NVEFTQmdOVkJBc1RDMlJsY0dGeWRHMWxiblF4TVE0dwpEQVlEVlFRREV3VnlaV3hoZVRCWk1CTUdCeXFHU000OUFnRUdDQ3FHU000OUF3RUhBMElBQkNvekYzTTFMMmlJCklSN1JhWWFQTnZWY2Z0R2x0b0tlZ085TUJQZE1oeEJ5aUJxU2lxSW53cjVlVU84M3FOd1VhWHZ3TVZtUzh2LzQKYmcvMGZlYnE4ZXlqZ2Rvd2dkY3dEZ1lEVlIwUEFRSC9CQVFEQWdlQU1Bd0dBMVVkRXdFQi93UUNNQUF3SFFZRApWUjBPQkJZRUZLZmtwOHR3cU9PMGp3K3Y5SDdlL3lGWmFOaENNQjhHQTFVZEl3UVlNQmFBRkhLRzlZTDZPQzg2Cnk1RklYcHF0ZTdiT1hTRDhNSGNHQ0NvREJBVUdCd2dCQkd0N0ltRjBkSEp6SWpwN0ltaG1Ma0ZtWm1sc2FXRjAKYVc5dUlqb2liM0puTVM1a1pYQmhjblJ0Wlc1ME1TSXNJbWhtTGtWdWNtOXNiRzFsYm5SSlJDSTZJbkpsYkdGNQpJaXdpYUdZdVZIbHdaU0k2SW1Oc2FXVnVkQ0lzSW5KbGJHRjVJam9pZEhKMVpTSjlmVEFLQmdncWhrak9QUVFECkFnTklBREJGQWlFQTJwaDMvbkZZOXF5MmhyKzBWMkFHdDlqRWhEeC9kNmxZVitPck5PWmN6NEFDSUFQZW9GTEcKeGJ4M0lBQUQ2T2xsUjBCTVhqTHIzcHRDc3ExWlNVR2xoSzBwCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K"
	return eCertBase64
}

func TestHandleExternalRequest(t *testing.T) {
	// create all mock data for tests
	query := common.Query{
		Policy:             []string{"Notary"},
		Address:            "localhost:9080/network1/mychannel:interop:Read:a",
		RequestingRelay:    "network1-relay",
		RequestingNetwork:  "network1",
		Certificate:        "-----BEGIN CERTIFICATE-----\nMIICKjCCAdGgAwIBAgIUBFTi56rmjunJiRESpyJW0q4sRL4wCgYIKoZIzj0EAwIw\ncjELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMQ8wDQYDVQQH\nEwZEdXJoYW0xGjAYBgNVBAoTEW9yZzEubmV0d29yazEuY29tMR0wGwYDVQQDExRj\nYS5vcmcxLm5ldHdvcmsxLmNvbTAeFw0yMDA3MjkwNDM1MDBaFw0zNTA3MjYwNDM1\nMDBaMHIxCzAJBgNVBAYTAlVTMRcwFQYDVQQIEw5Ob3J0aCBDYXJvbGluYTEPMA0G\nA1UEBxMGRHVyaGFtMRowGAYDVQQKExFvcmcxLm5ldHdvcmsxLmNvbTEdMBsGA1UE\nAxMUY2Eub3JnMS5uZXR3b3JrMS5jb20wWTATBgcqhkjOPQIBBggqhkjOPQMBBwNC\nAAQONsIOz5o+HhKgSdIOpqGrTcvJ3tADkFsyMg0vV3MSo6gyAq5V23c1grO4X5xU\nY71ZVTPQuokv6/WIQYIaumjDo0UwQzAOBgNVHQ8BAf8EBAMCAQYwEgYDVR0TAQH/\nBAgwBgEB/wIBATAdBgNVHQ4EFgQU1g+tPngh2w8g99z1mwsVbkKjAKkwCgYIKoZI\nzj0EAwIDRwAwRAIgGdSMyEzimoSwjTyF+NmOwOLn4xpeMOhev5idRWpy+ZsCIFKA\n0I8cCd5tw7zTukyjWMJi737K+4zPK6QDKIeql+R1\n-----END CERTIFICATE-----\n",
		RequestorSignature: "sig",
		Nonce:              "nonce",
		RequestId:          "1234",
		RequestingOrg:      "Org1MSP",
	}
	now := time.Now()
	threeDays := time.Hour * 24 * 3
	template := x509.Certificate{
		Subject: pkix.Name{
			CommonName: "example-a.com",
		},
		NotBefore:    now.Add(-threeDays),
		NotAfter:     now.Add(threeDays),
		SerialNumber: big.NewInt(1337),
	}

	certDERBytes, key, err := createECDSACertAndKeyFromTemplate(template)
	require.NoError(t, err)

	random := rand.Reader
	hashed, err := computeSHA2Hash([]byte(query.Address+query.Nonce), key.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signature, err := ecdsa.SignASN1(random, key, hashed)
	require.NoError(t, err)

	// Generate PEM cert from DER format
	// https://gist.github.com/samuel/8b500ddd3f6118d052b5e6bc16bc4c09
	out := &bytes.Buffer{}
	pem.Encode(out, &pem.Block{Type: "CERTIFICATE", Bytes: certDERBytes})

	validCertificate := string(out.Bytes())
	// Membership
	var membershipAsset = common.Membership{
		SecurityDomain: "2345",
		Members: map[string]*common.Member{"Org1MSP": {
			Value: validCertificate,
			Type:  "ca",
			Chain: []string{"chain"},
		}},
	}
	// Access Control
	var accessControlAsset = common.AccessControlPolicy{
		SecurityDomain: "2345",
		Rules: []*common.Rule{{
			Principal:     validCertificate,
			PrincipalType: "certificate",
			Read:          true,
			Resource:      "mychannel:interop:Read:a",
		}},
	}

	// Invoke Response
	var pbResp = pb.Response{
		Status:  shim.OK,
		Message: "",
		Payload: []byte("17.12"),
	}

	// Invalid JSON
	testHandleExternalRequestInvalidJSON(t)
	// Invalid Signature bad base64
	testHandleExternalRequestSignatureNotBase64(t, &query)
	// Signature certificate mismatch. Valid base64
	testHandleExternalRequestSignatureCertificateMismatch(t, &query)
	// Invalid Cert
	testHandleExternalRequestInvalidCert(t, &query)
	// No matching Access control policy for requesting network
	testHandleExternalRequestNoAccessControlPolicy(t, &query, validCertificate, signature, pbResp, &membershipAsset)
	// No matching Membership for requesting network
	testHandleExternalRequestNoMembership(t, &query, validCertificate, signature, pbResp)
	// Happy case. ECDSA Cert and Valid Signature
	testHandleExternalRequestECDSAHappyCase(t, &query, validCertificate, key, signature, pbResp, &accessControlAsset, &membershipAsset)
	// ed25519 Cert and Signature
	testHandleExternalRequestED25519Signature(t, &query, pbResp, &accessControlAsset, &membershipAsset, template)
	// Test event requests
	// Invalid Cert
	testHandleEventRequestInvalidDynamicQueryArgs(t, &query, validCertificate, signature)
	// Happy case. ECDSA Cert and Valid Signature
	testHandleEventRequestECDSAHappyCase(t, &query, validCertificate, key, signature, pbResp, &accessControlAsset, &membershipAsset)
}

func testHandleExternalRequestInvalidJSON(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}
	chaincodeStub.GetCreatorReturns([]byte(getRelayCreator()), nil)
	interopCCId := "interopcc"
	wtest.SetMockStubCCId(chaincodeStub, interopCCId)

	// Invalid Input
	_, err := interopcc.HandleExternalRequest(ctx, "Invalid Input")
	require.EqualError(t, err, fmt.Sprintf("Unable to base64 decode data: illegal base64 data at input byte 7"))
}

func testHandleExternalRequestSignatureNotBase64(t *testing.T, query *common.Query) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}
	chaincodeStub.GetCreatorReturns([]byte(getRelayCreator()), nil)
	interopCCId := "interopcc"
	wtest.SetMockStubCCId(chaincodeStub, interopCCId)

	queryBytes, err := protoV2.Marshal(query)
	require.NoError(t, err)
	b64QueryBytes := base64.StdEncoding.EncodeToString(queryBytes)

	_, err = interopcc.HandleExternalRequest(ctx, string(b64QueryBytes))
	require.EqualError(t, err, fmt.Sprintf("Signature base64 decoding failed: illegal base64 data at input byte 0"))
}

func testHandleExternalRequestSignatureCertificateMismatch(t *testing.T, query *common.Query) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}
	chaincodeStub.GetCreatorReturns([]byte(getRelayCreator()), nil)
	interopCCId := "interopcc"
	wtest.SetMockStubCCId(chaincodeStub, interopCCId)

	// set correct values for this test case
	query.RequestorSignature = "U2lnbmF0dXJl"
	queryBytes, err := protoV2.Marshal(query)
	require.NoError(t, err)
	b64QueryBytes := base64.StdEncoding.EncodeToString(queryBytes)

	_, err = interopcc.HandleExternalRequest(ctx, string(b64QueryBytes))
	require.EqualError(t, err, fmt.Sprintf("Invalid Signature: asn1: structure error: tags don't match (16 vs {class:1 tag:19 length:105 isCompound:false}) {optional:false explicit:false application:false private:false defaultValue:<nil> tag:<nil> stringType:0 timeType:0 set:false omitEmpty:false} ECDSASignature @2"))
	//require.EqualError(t, err, "Invalid Signature: Signature Verification failed. ECDSA VERIFY")
}

func testHandleExternalRequestInvalidCert(t *testing.T, query *common.Query) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}
	chaincodeStub.GetCreatorReturns([]byte(getRelayCreator()), nil)
	interopCCId := "interopcc"
	wtest.SetMockStubCCId(chaincodeStub, interopCCId)

	// set correct values for this test case
	query.Certificate = "cert"
	queryBytes, err := protoV2.Marshal(query)
	require.NoError(t, err)
	b64QueryBytes := base64.StdEncoding.EncodeToString(queryBytes)

	_, err = interopcc.HandleExternalRequest(ctx, string(b64QueryBytes))
	require.EqualError(t, err, fmt.Sprintf("Unable to parse certificate: Client cert not in a known PEM format"))
}

func testHandleEventRequestInvalidDynamicQueryArgs(t *testing.T, query *common.Query, validCertificate string, signature []byte) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}
	chaincodeStub.GetCreatorReturns([]byte(getRelayCreator()), nil)
	interopCCId := "interopcc"
	wtest.SetMockStubCCId(chaincodeStub, interopCCId)

	// set incorrect values for this test case
	queryAddress := query.Address
	query.Address = "localhost:9080/network1/mychannel:interop:Read:?:?"
	query.Certificate = validCertificate
	b64Signature := base64.StdEncoding.EncodeToString(signature)
	query.RequestorSignature = b64Signature
	queryBytes, err := protoV2.Marshal(query)
	require.NoError(t, err)
	b64QueryBytes := base64.StdEncoding.EncodeToString(queryBytes)

	_, err = interopcc.HandleEventRequest(ctx, string(b64QueryBytes), "a")
	require.EqualError(t, err, fmt.Sprintf("Expected 1 dynamic argument in the event query address, but found 2"))

	// restore the value of query.Address
	query.Address = queryAddress
}

func testHandleExternalRequestECDSAHappyCase(t *testing.T, query *common.Query, validCertificate string, validPrivateKey *ecdsa.PrivateKey, signature []byte, pbResp pb.Response, accessControl *common.AccessControlPolicy, membership *common.Membership) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}
	chaincodeStub.GetCreatorReturns([]byte(getRelayCreator()), nil)
	interopCCId := "interopcc"
	wtest.SetMockStubCCId(chaincodeStub, interopCCId)

	// set correct values for the success case
	query.Certificate = validCertificate
	b64Signature := base64.StdEncoding.EncodeToString(signature)
	query.RequestorSignature = b64Signature
	queryBytes, err := protoV2.Marshal(query)
	require.NoError(t, err)
	b64QueryBytes := base64.StdEncoding.EncodeToString(queryBytes)
	interopPayload := common.InteropPayload{
		Payload:              []byte("17.12"),
		Address:              "localhost:9080/network1/mychannel:interop:Read:a",
		Confidential:         false,
		RequestorCertificate: query.Certificate,
		Nonce:                query.Nonce,
	}
	interopPayloadBytes, err := protoV2.Marshal(&interopPayload)
	require.NoError(t, err)

	// mock all the calls to the chaincode stub
	membershipBytes, err := json.Marshal(membership)
	require.NoError(t, err)
	accessControlBytes, err := json.Marshal(accessControl)
	require.NoError(t, err)
	chaincodeStub.GetStateReturnsOnCall(0, membershipBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(1, accessControlBytes, nil)
	chaincodeStub.InvokeChaincodeReturns(pbResp)

	interopResponse, err := interopcc.HandleExternalRequest(ctx, string(b64QueryBytes))
	var interopPayloadResp common.InteropPayload
	err = protoV2.Unmarshal([]byte(interopResponse), &interopPayloadResp)
	require.NoError(t, err)
	require.False(t, interopPayloadResp.Confidential)
	require.Equal(t, interopPayloadBytes, []byte(interopResponse))
	require.NoError(t, err)

	// test the same request-response with encryption on
	query.Confidential = true
	queryBytes, err = protoV2.Marshal(query)
	require.NoError(t, err)
	b64QueryBytes = base64.StdEncoding.EncodeToString(queryBytes)
	chaincodeStub.GetStateReturnsOnCall(3, membershipBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(4, accessControlBytes, nil)
	chaincodeStub.InvokeChaincodeReturns(pbResp)
	interopResponse, err = interopcc.HandleExternalRequest(ctx, string(b64QueryBytes))
	err = protoV2.Unmarshal([]byte(interopResponse), &interopPayloadResp)
	require.NoError(t, err)
	require.NotEqual(t, interopPayload.Payload, interopPayloadResp.Payload)
	require.True(t, interopPayloadResp.Confidential)
	require.Equal(t, interopPayloadResp.RequestorCertificate, validCertificate)
	require.Equal(t, interopPayloadResp.Nonce, query.Nonce)
	var confPayload common.ConfidentialPayload
	err = protoV2.Unmarshal(interopPayloadResp.Payload, &confPayload)
	require.NoError(t, err)
	require.Equal(t, confPayload.HashType, common.ConfidentialPayload_HMAC)
	decConfPayload, err := decryptDataWithPrivKey(validPrivateKey, confPayload.EncryptedPayload)
	require.NoError(t, err)
	var confPayloadContents common.ConfidentialPayloadContents
	err = protoV2.Unmarshal(decConfPayload, &confPayloadContents)
	require.NoError(t, err)
	require.Equal(t, interopPayload.Payload, confPayloadContents.Payload)
	mac := hmac.New(sha256.New, confPayloadContents.Random)
	mac.Write(confPayloadContents.Payload)
	fmac := mac.Sum(nil)
	require.Equal(t, confPayload.Hash, fmac)
}

func testHandleEventRequestECDSAHappyCase(t *testing.T, query *common.Query, validCertificate string, validPrivateKey *ecdsa.PrivateKey, signature []byte, pbResp pb.Response, accessControl *common.AccessControlPolicy, membership *common.Membership) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}
	chaincodeStub.GetCreatorReturns([]byte(getRelayCreator()), nil)
	interopCCId := "interopcc"
	wtest.SetMockStubCCId(chaincodeStub, interopCCId)
	query.Confidential = false

	// set correct values for the success case
	query.Certificate = validCertificate
	// This tests the case of no dynamic arguments in the event query address (and signature is on query with no dynamic args)
	b64Signature := base64.StdEncoding.EncodeToString(signature)
	query.RequestorSignature = b64Signature
	queryBytes, err := protoV2.Marshal(query)
	require.NoError(t, err)
	b64QueryBytes := base64.StdEncoding.EncodeToString(queryBytes)
	interopPayload := common.InteropPayload{
		Payload:              []byte("17.12"),
		Address:              "localhost:9080/network1/mychannel:interop:Read:a",
		Confidential:         false,
		RequestorCertificate: query.Certificate,
		Nonce:                query.Nonce,
	}
	interopPayloadBytes, err := protoV2.Marshal(&interopPayload)
	require.NoError(t, err)

	// mock all the calls to the chaincode stub
	membershipBytes, err := json.Marshal(membership)
	require.NoError(t, err)
	accessControlBytes, err := json.Marshal(accessControl)
	require.NoError(t, err)
	chaincodeStub.GetStateReturnsOnCall(0, membershipBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(1, accessControlBytes, nil)
	chaincodeStub.InvokeChaincodeReturns(pbResp)

	interopResponse, err := interopcc.HandleEventRequest(ctx, string(b64QueryBytes), "a")
	require.NoError(t, err)
	var interopPayloadResp common.InteropPayload
	err = protoV2.Unmarshal([]byte(interopResponse), &interopPayloadResp)
	require.NoError(t, err)
	require.False(t, interopPayloadResp.Confidential)
	require.Equal(t, interopPayloadBytes, []byte(interopResponse))
	require.NoError(t, err)

	// This tests the case of one dynamic argument in the event query address (and signature is on query with one dynamic arg)
	query.Address = "localhost:9080/network1/mychannel:interop:Read:?"
	random := rand.Reader
	hashed, err := computeSHA2Hash([]byte(query.Address+query.Nonce), validPrivateKey.PublicKey.Params().BitSize)
	require.NoError(t, err)
	signatureDynamicArg, err := ecdsa.SignASN1(random, validPrivateKey, hashed)
	require.NoError(t, err)

	b64Signature = base64.StdEncoding.EncodeToString(signatureDynamicArg)
	query.RequestorSignature = b64Signature
	queryBytes, err = protoV2.Marshal(query)
	require.NoError(t, err)
	b64QueryBytes = base64.StdEncoding.EncodeToString(queryBytes)

	// mock all the calls to the chaincode stub
	chaincodeStub.GetStateReturnsOnCall(3, membershipBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(4, accessControlBytes, nil)
	chaincodeStub.InvokeChaincodeReturns(pbResp)

	interopResponse, err = interopcc.HandleEventRequest(ctx, string(b64QueryBytes), "a")
	require.NoError(t, err)
	err = protoV2.Unmarshal([]byte(interopResponse), &interopPayloadResp)
	require.NoError(t, err)
	require.False(t, interopPayloadResp.Confidential)
	require.Equal(t, interopPayloadBytes, []byte(interopResponse))
	require.NoError(t, err)

	// test the same request-response with encryption on
	query.Confidential = true
	queryBytes, err = protoV2.Marshal(query)
	require.NoError(t, err)
	b64QueryBytes = base64.StdEncoding.EncodeToString(queryBytes)
	chaincodeStub.GetStateReturnsOnCall(6, membershipBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(7, accessControlBytes, nil)
	chaincodeStub.InvokeChaincodeReturns(pbResp)
	interopResponse, err = interopcc.HandleEventRequest(ctx, string(b64QueryBytes), "a")
	require.NoError(t, err)
	err = protoV2.Unmarshal([]byte(interopResponse), &interopPayloadResp)
	require.NoError(t, err)
	require.NotEqual(t, interopPayload.Payload, interopPayloadResp.Payload)
	require.True(t, interopPayloadResp.Confidential)
	require.Equal(t, interopPayloadResp.RequestorCertificate, validCertificate)
	require.Equal(t, interopPayloadResp.Nonce, query.Nonce)
	var confPayload common.ConfidentialPayload
	err = protoV2.Unmarshal(interopPayloadResp.Payload, &confPayload)
	require.NoError(t, err)
	require.Equal(t, confPayload.HashType, common.ConfidentialPayload_HMAC)
	decConfPayload, err := decryptDataWithPrivKey(validPrivateKey, confPayload.EncryptedPayload)
	require.NoError(t, err)
	var confPayloadContents common.ConfidentialPayloadContents
	err = protoV2.Unmarshal(decConfPayload, &confPayloadContents)
	require.NoError(t, err)
	require.Equal(t, interopPayload.Payload, confPayloadContents.Payload)
	mac := hmac.New(sha256.New, confPayloadContents.Random)
	mac.Write(confPayloadContents.Payload)
	fmac := mac.Sum(nil)
	require.Equal(t, confPayload.Hash, fmac)
}

func testHandleExternalRequestED25519Signature(t *testing.T, query *common.Query, pbResp pb.Response, accessControl *common.AccessControlPolicy, fabricMembership *common.Membership, template x509.Certificate) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}
	chaincodeStub.GetCreatorReturns([]byte(getRelayCreator()), nil)
	interopCCId := "interopcc"
	wtest.SetMockStubCCId(chaincodeStub, interopCCId)

	// create ed25519 cert and signature
	certBytes, privKey, err := createED25519CertAndKeyFromTemplate(template)
	require.NoError(t, err)
	random := rand.Reader
	// hashed, err := computeSHA2Hash([]byte(query.Address+query.Nonce), 32*8)
	require.NoError(t, err)
	signature, err := privKey.Sign(random, []byte(query.Address+query.Nonce), crypto.Hash(0))
	require.NoError(t, err)
	// Generate PEM cert from DER format
	// https://gist.github.com/samuel/8b500ddd3f6118d052b5e6bc16bc4c09
	out := &bytes.Buffer{}
	pem.Encode(out, &pem.Block{Type: "CERTIFICATE", Bytes: certBytes})
	b64Signature := base64.StdEncoding.EncodeToString(signature)

	// set correct values for this test case
	query.RequestorSignature = b64Signature
	query.Certificate = string(out.Bytes())
	queryBytes, err := protoV2.Marshal(query)
	require.NoError(t, err)
	b64QueryBytes := base64.StdEncoding.EncodeToString(queryBytes)

	// mock all the calls to the chaincode stub
	membershipBytes, err := json.Marshal(fabricMembership)
	require.NoError(t, err)
	chaincodeStub.GetStateReturnsOnCall(0, membershipBytes, nil)

	_, err = interopcc.HandleExternalRequest(ctx, string(b64QueryBytes))
	// Mismatch in certificate algorithms when verifying membership
	require.EqualError(t, err, "Membership Verification failed: CA Certificate is not valid: x509: signature algorithm specifies an Ed25519 public key, but have public key of type *ecdsa.PublicKey")
}

func testHandleExternalRequestNoMembership(t *testing.T, query *common.Query, validCertificate string, signature []byte, pbResp pb.Response) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}
	chaincodeStub.GetCreatorReturns([]byte(getRelayCreator()), nil)
	interopCCId := "interopcc"
	wtest.SetMockStubCCId(chaincodeStub, interopCCId)

	// set correct values for this test case
	query.Certificate = validCertificate
	b64Signature := base64.StdEncoding.EncodeToString(signature)
	query.RequestorSignature = b64Signature
	queryBytes, err := protoV2.Marshal(query)
	require.NoError(t, err)
	b64QueryBytes := base64.StdEncoding.EncodeToString(queryBytes)

	// mock all the calls to the chaincode stub
	chaincodeStub.GetStateReturnsOnCall(0, nil, nil)

	_, err = interopcc.HandleExternalRequest(ctx, string(b64QueryBytes))
	require.EqualError(t, err, fmt.Sprintf("Membership Verification failed: Membership with id: %s does not exist", query.RequestingNetwork))
}

func testHandleExternalRequestNoAccessControlPolicy(t *testing.T, query *common.Query, validCertificate string, signature []byte, pbResp pb.Response, membership *common.Membership) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	interopcc := SmartContract{}
	chaincodeStub.GetCreatorReturns([]byte(getRelayCreator()), nil)
	interopCCId := "interopcc"
	wtest.SetMockStubCCId(chaincodeStub, interopCCId)

	// set correct values for this test case
	query.Certificate = validCertificate
	b64Signature := base64.StdEncoding.EncodeToString(signature)
	query.RequestorSignature = b64Signature
	queryBytes, err := protoV2.Marshal(query)
	require.NoError(t, err)
	b64QueryBytes := base64.StdEncoding.EncodeToString(queryBytes)

	// mock all the calls to the chaincode stub
	membershipBytes, err := json.Marshal(membership)
	require.NoError(t, err)
	chaincodeStub.GetStateReturnsOnCall(0, membershipBytes, nil)
	chaincodeStub.GetStateReturnsOnCall(1, nil, nil)

	_, err = interopcc.HandleExternalRequest(ctx, string(b64QueryBytes))
	require.EqualError(t, err, fmt.Sprintf("CC Access Denied: Access control policy does not exist for network: %s", query.RequestingNetwork))
}
