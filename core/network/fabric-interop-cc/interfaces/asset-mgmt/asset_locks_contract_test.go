package assetmgmt

import (
	"fmt"
	"testing"

	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/stretchr/testify/require"
)

func TestContractIsFungibleAssetLocked(t *testing.T) {
	ctx, chaincodeStub, amc := prepMockStub()

	// Test failure under the scenario that contractId is empty
	contractId := ""
	chaincodeStub.InvokeChaincodeReturns(shim.Success([]byte("false")))
	isAssetLocked, err := amc.IsFungibleAssetLocked(ctx, contractId)
	require.EqualError(t, err, "empty contract id")
	require.False(t, isAssetLocked)
	fmt.Printf("Test failed as expected with error: %+v\n", err)

	// Test failure under the scenario that there is no fungible asset locked with the contractId
	contractId = "non-existing-contract-id"
	chaincodeStub.InvokeChaincodeReturns(shim.Success([]byte("false")))
	isAssetLocked, err = amc.IsFungibleAssetLocked(ctx, contractId)
	require.NoError(t, err)
	require.False(t, isAssetLocked)
	fmt.Printf("Test failed as expected with error: %+v\n", err)
}
