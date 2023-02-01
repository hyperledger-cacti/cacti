package main

import (
	"testing"
	"fmt"

	"github.com/stretchr/testify/require"
	wtest "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils"
)

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

	key := "test-key"
	value := "test-value"

	chaincodeStub.GetStateReturnsOnCall(0, nil, fmt.Errorf("failed reading from ledger"))
	err := ss.Update(ctx, key, value)
	require.Error(t, err)
	require.EqualError(t, err, "Failed to read key '" + key + "' from world state. " + "failed reading from ledger")

	valueBytes := []byte(value)
	chaincodeStub.GetStateReturnsOnCall(1, valueBytes, nil)
	retValue, err := ss.Read(ctx, key)
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
