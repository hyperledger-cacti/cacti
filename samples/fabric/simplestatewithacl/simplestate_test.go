package main

import (
	"encoding/base64"
	"testing"
	"fmt"

	"github.com/golang/protobuf/proto"
	"github.com/stretchr/testify/require"
	mspProtobuf "github.com/hyperledger/fabric-protos-go/msp"
	wtest "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils"
)

// function that supplies value that is to be returned by ctx.GetStub().GetCreator()
func getCreator() string {
	serializedIdentity := &mspProtobuf.SerializedIdentity{}
	eCertBytes, _ := base64.StdEncoding.DecodeString(getTxCreatorECertBase64())
	serializedIdentity.IdBytes = []byte(eCertBytes)
	serializedIdentity.Mspid = "Org1MSP"
	serializedIdentityBytes, _ := proto.Marshal(serializedIdentity)

	return string(serializedIdentityBytes)
}

// function that supplies the ECert in base64 for the transaction creator
func getTxCreatorECertBase64() string {
	eCertBase64 := "LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSUNoekNDQWkyZ0F3SUJBZ0lVV0tOUmlmVStDRENTZ0pGRFB1RjhCQnpmOEtNd0NnWUlLb1pJemowRUF3SXcKYURFTE1Ba0dBMVVFQmhNQ1ZWTXhGekFWQmdOVkJBZ1REazV2Y25Sb0lFTmhjbTlzYVc1aE1SUXdFZ1lEVlFRSwpFd3RJZVhCbGNteGxaR2RsY2pFUE1BMEdBMVVFQ3hNR1JtRmljbWxqTVJrd0Z3WURWUVFERXhCbVlXSnlhV010ClkyRXRjMlZ5ZG1WeU1CNFhEVEl4TURjek1EQTFORGt3TUZvWERUSXlNRGN6TURBMU5UUXdNRm93UWpFd01BMEcKQTFVRUN4TUdZMnhwWlc1ME1Bc0dBMVVFQ3hNRWIzSm5NVEFTQmdOVkJBc1RDMlJsY0dGeWRHMWxiblF4TVE0dwpEQVlEVlFRREV3VnlaV3hoZVRCWk1CTUdCeXFHU000OUFnRUdDQ3FHU000OUF3RUhBMElBQkNvekYzTTFMMmlJCklSN1JhWWFQTnZWY2Z0R2x0b0tlZ085TUJQZE1oeEJ5aUJxU2lxSW53cjVlVU84M3FOd1VhWHZ3TVZtUzh2LzQKYmcvMGZlYnE4ZXlqZ2Rvd2dkY3dEZ1lEVlIwUEFRSC9CQVFEQWdlQU1Bd0dBMVVkRXdFQi93UUNNQUF3SFFZRApWUjBPQkJZRUZLZmtwOHR3cU9PMGp3K3Y5SDdlL3lGWmFOaENNQjhHQTFVZEl3UVlNQmFBRkhLRzlZTDZPQzg2Cnk1RklYcHF0ZTdiT1hTRDhNSGNHQ0NvREJBVUdCd2dCQkd0N0ltRjBkSEp6SWpwN0ltaG1Ma0ZtWm1sc2FXRjAKYVc5dUlqb2liM0puTVM1a1pYQmhjblJ0Wlc1ME1TSXNJbWhtTGtWdWNtOXNiRzFsYm5SSlJDSTZJbkpsYkdGNQpJaXdpYUdZdVZIbHdaU0k2SW1Oc2FXVnVkQ0lzSW5KbGJHRjVJam9pZEhKMVpTSjlmVEFLQmdncWhrak9QUVFECkFnTklBREJGQWlFQTJwaDMvbkZZOXF5MmhyKzBWMkFHdDlqRWhEeC9kNmxZVitPck5PWmN6NEFDSUFQZW9GTEcKeGJ4M0lBQUQ2T2xsUjBCTVhqTHIzcHRDc3ExWlNVR2xoSzBwCi0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K"
	return eCertBase64
}

func TestCreate(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	ss := SmartContract{}

	key := "test-key"
	value := "test-value"

	chaincodeStub.PutStateReturnsOnCall(0, fmt.Errorf("failed writing to the ledger"))
	err := ss.Create(ctx, key, value)
	require.Error(t, err)
	require.EqualError(t, err, "failed writing to the ledger")

	chaincodeStub.PutStateReturnsOnCall(1, nil)
	err = ss.Update(ctx, key, value)
	require.NoError(t, err)
}

func TestRead(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	ss := SmartContract{}
	chaincodeStub.GetCreatorReturns([]byte(getCreator()), nil)
	interopCCId := "interopcc"
	wtest.SetMockStubCCId(chaincodeStub, "mycc")

	key := "test-key"
	value := "test-value"

	chaincodeStub.GetStateReturnsOnCall(0, nil, fmt.Errorf("failed reading from ledger"))
	err := ss.Update(ctx, key, value)
	require.Error(t, err)
	require.EqualError(t, err, "Failed to read key '" + key + "' from world state. " + "failed reading from ledger")

	valueBytes := []byte(value)
	chaincodeStub.GetStateReturnsOnCall(1, []byte(interopCCId), nil)

	// Test failure: local CC is directly invoked by the client without going through interop CC
	retValue, err := ss.Read(ctx, key)
	require.Error(t, err)
	require.EqualError(t, err, "Illegal access by relay")

	// Now test success after setting the interop CC as the chaincode first invoked by the client
	wtest.SetMockStubCCId(chaincodeStub, interopCCId)
	chaincodeStub.GetStateReturnsOnCall(2, []byte(interopCCId), nil)
	chaincodeStub.GetStateReturnsOnCall(3, valueBytes, nil)
	retValue, err = ss.Read(ctx, key)
	require.NoError(t, err)
	require.Equal(t, retValue, value)
}

func TestUpdate(t *testing.T) {
	ctx, chaincodeStub := wtest.PrepMockStub()
	ss := SmartContract{}

	key := "test-key"
	value := "test-value"

	chaincodeStub.GetStateReturnsOnCall(0, nil, fmt.Errorf("failed reading from ledger"))
	err := ss.Update(ctx, key, value)
	require.Error(t, err)
	require.EqualError(t, err, "Failed to read key '" + key + "' from world state. " + "failed reading from ledger")

	valueBytes := []byte(value)
	chaincodeStub.GetStateReturnsOnCall(1, valueBytes, nil)
	chaincodeStub.PutStateReturnsOnCall(0, fmt.Errorf("failed writing to the ledger"))
	err = ss.Update(ctx, key, value)
	require.Error(t, err)
	require.EqualError(t, err, "failed writing to the ledger")

	chaincodeStub.GetStateReturnsOnCall(2, valueBytes, nil)
	chaincodeStub.PutStateReturnsOnCall(1, nil)
	err = ss.Update(ctx, key, value)
	require.NoError(t, err)
}

func TestDelete(t *testing.T) {
	ctx, _ := wtest.PrepMockStub()
	ss := SmartContract{}

	key := "test-key"

	err := ss.Delete(ctx, key)
	require.NoError(t, err)
}
