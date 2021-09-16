package main_test

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/hyperledger/fabric-protos-go/ledger/queryresult"
	sa "github.com/hyperledger-labs/weaver-dlt-interoperability/samples/fabric/simpleassetandinterop"
	"github.com/stretchr/testify/require"
	wtest "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils"
	wtestmocks "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/testutils/mocks"
)

const (
	defaultAssetType    = "BearerBonds"
	defaultAssetId      = "asset1"
	defaultAssetOwner   = "Alice"
	defaultAssetIssuer  = "Treasury"
)

func TestInitBondAssetLedger(t *testing.T) {
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleAsset := sa.SmartContract{}

	err := simpleAsset.InitBondAssetLedger(transactionContext)
	require.NoError(t, err)

	chaincodeStub.PutStateReturns(fmt.Errorf("failed inserting key"))
	err = simpleAsset.InitBondAssetLedger(transactionContext)
	require.EqualError(t, err, "failed to put to world state. failed inserting key")
}

func TestCreateAsset(t *testing.T) {
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleAsset := sa.SmartContract{}

	err := simpleAsset.CreateAsset(transactionContext, "", "", "", "", 0, "02 Jan 26 15:04 MST")
	require.Error(t, err)

	err = simpleAsset.CreateAsset(transactionContext, defaultAssetType, "", "", "", 0, "02 Jan 26 15:04 MST")
	require.Error(t, err)

	err = simpleAsset.CreateAsset(transactionContext, defaultAssetType, defaultAssetId, "", "", 0, "02 Jan 26 15:04 MST")
	require.Error(t, err)

	err = simpleAsset.CreateAsset(transactionContext, defaultAssetType, defaultAssetId, defaultAssetOwner, "", 0, "02 Jan 26 15:04 MST")
	require.NoError(t, err)

	err = simpleAsset.CreateAsset(transactionContext, defaultAssetType, defaultAssetId, "", defaultAssetIssuer, 0, "02 Jan 26 15:04 MST")
	require.NoError(t, err)

	err = simpleAsset.CreateAsset(transactionContext, defaultAssetType, defaultAssetId, defaultAssetOwner, "", 0, "02 Jan 06 15:04 MST")
	require.EqualError(t, err, "maturity date can not be in past.")

	err = simpleAsset.CreateAsset(transactionContext, defaultAssetType, defaultAssetId, defaultAssetOwner, "", 0, "")
	require.EqualError(t, err, "maturity date provided is not in correct format, please use this format: 02 Jan 06 15:04 MST")

	chaincodeStub.GetStateReturns([]byte{}, nil)
	err = simpleAsset.CreateAsset(transactionContext, defaultAssetType, defaultAssetId, defaultAssetOwner, "", 0, "")
	require.EqualError(t, err, "the asset asset1 already exists")

	chaincodeStub.GetStateReturns(nil, fmt.Errorf("unable to retrieve asset"))
	err = simpleAsset.CreateAsset(transactionContext, defaultAssetType, defaultAssetId, defaultAssetOwner, "", 0, "")
	require.EqualError(t, err, "failed to read asset record from world state: unable to retrieve asset")
}

func TestReadAsset(t *testing.T) {
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleAsset := sa.SmartContract{}

	expectedAsset := &sa.BondAsset{ID: "asset1"}
	bytes, err := json.Marshal(expectedAsset)
	require.NoError(t, err)

	chaincodeStub.GetStateReturns(bytes, nil)
	asset, err := simpleAsset.ReadAsset(transactionContext, "", "", false)
	require.NoError(t, err)
	require.Equal(t, expectedAsset, asset)

	chaincodeStub.GetStateReturns(nil, fmt.Errorf("unable to retrieve asset"))
	_, err = simpleAsset.ReadAsset(transactionContext, "", "", false)
	require.EqualError(t, err, "failed to read asset record from world state: unable to retrieve asset")

	chaincodeStub.GetStateReturns(nil, nil)
	asset, err = simpleAsset.ReadAsset(transactionContext, "", "asset1", false)
	require.EqualError(t, err, "the asset asset1 does not exist")
	require.Nil(t, asset)
}

func TestUpdateFaceValue(t *testing.T) {
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleAsset := sa.SmartContract{}

	expectedAsset := &sa.BondAsset{ID: "asset1"}
	bytes, err := json.Marshal(expectedAsset)
	require.NoError(t, err)

	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleAsset.UpdateFaceValue(transactionContext, "", "", 0)
	require.NoError(t, err)

	chaincodeStub.GetStateReturns(nil, nil)
	err = simpleAsset.UpdateFaceValue(transactionContext, "", "asset1", 0)
	require.EqualError(t, err, "the asset asset1 does not exist")

	chaincodeStub.GetStateReturns(nil, fmt.Errorf("unable to retrieve asset"))
	err = simpleAsset.UpdateFaceValue(transactionContext, "", "asset1", 0)
	require.EqualError(t, err, "failed to read asset record from world state: unable to retrieve asset")
}

func TestUpdateMaturityDate(t *testing.T) {
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleAsset := sa.SmartContract{}

	expectedAsset := &sa.BondAsset{ID: "asset1"}
	bytes, err := json.Marshal(expectedAsset)
	require.NoError(t, err)

	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleAsset.UpdateMaturityDate(transactionContext, "", "", time.Now())
	require.NoError(t, err)

	chaincodeStub.GetStateReturns(nil, nil)
	err = simpleAsset.UpdateMaturityDate(transactionContext, "", "asset1", time.Now())
	require.EqualError(t, err, "the asset asset1 does not exist")

	chaincodeStub.GetStateReturns(nil, fmt.Errorf("unable to retrieve asset"))
	err = simpleAsset.UpdateMaturityDate(transactionContext, "", "asset1", time.Now())
	require.EqualError(t, err, "failed to read asset record from world state: unable to retrieve asset")
}

func TestDeleteAsset(t *testing.T) {
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleAsset := sa.SmartContract{}

	asset := &sa.BondAsset{ID: "asset1"}
	bytes, err := json.Marshal(asset)
	require.NoError(t, err)

	chaincodeStub.GetStateReturns(bytes, nil)
	chaincodeStub.DelStateReturns(nil)
	err = simpleAsset.DeleteAsset(transactionContext, "", "")
	require.NoError(t, err)

	chaincodeStub.GetStateReturns(nil, nil)
	err = simpleAsset.DeleteAsset(transactionContext, "", "asset1")
	require.EqualError(t, err, "the bond asset of type " + "" + " and id " + "asset1" + " does not exist")

	chaincodeStub.GetStateReturns(nil, fmt.Errorf("unable to retrieve asset"))
	err = simpleAsset.DeleteAsset(transactionContext, "", "")
	require.EqualError(t, err, "failed to read asset record from world state: unable to retrieve asset")
}

func TestUpdateOwner(t *testing.T) {
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleAsset := sa.SmartContract{}

	asset := &sa.BondAsset{ID: "asset1"}
	bytes, err := json.Marshal(asset)
	require.NoError(t, err)

	chaincodeStub.GetStateReturns(bytes, nil)
	err = simpleAsset.UpdateOwner(transactionContext, "", "", "")
	require.NoError(t, err)

	chaincodeStub.GetStateReturns(nil, fmt.Errorf("unable to retrieve asset"))
	err = simpleAsset.UpdateOwner(transactionContext, "", "", "")
	require.EqualError(t, err, "failed to read asset record from world state: unable to retrieve asset")
}

func TestGetMyAssets(t *testing.T) {
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleAsset := sa.SmartContract{}
	iterator := &wtestmocks.StateQueryIterator{}

	asset := &sa.BondAsset{ID: "asset1", Owner: getTestTxCreatorECertBase64()}
	bytes, err := json.Marshal(asset)
	require.NoError(t, err)

	iterator.HasNextReturnsOnCall(0, true)
	iterator.HasNextReturnsOnCall(1, false)
	iterator.NextReturns(&queryresult.KV{Value: bytes}, nil)

	chaincodeStub.GetCreatorReturns([]byte(getCreator()), nil)

	chaincodeStub.GetStateByRangeReturns(iterator, nil)
	assets, err := simpleAsset.GetAllAssets(transactionContext)
	require.NoError(t, err)
	require.Equal(t, []*sa.BondAsset{asset}, assets)

	iterator.HasNextReturns(true)
	iterator.NextReturns(nil, fmt.Errorf("failed retrieving next item"))
	assets, err = simpleAsset.GetAllAssets(transactionContext)
	require.EqualError(t, err, "failed retrieving next item")
	require.Nil(t, assets)

	chaincodeStub.GetStateByRangeReturns(nil, fmt.Errorf("failed retrieving all assets"))
	assets, err = simpleAsset.GetAllAssets(transactionContext)
	require.EqualError(t, err, "failed retrieving all assets")
	require.Nil(t, assets)
}

func TestGetAllAssets(t *testing.T) {
	transactionContext, chaincodeStub := wtest.PrepMockStub()
	simpleAsset := sa.SmartContract{}
	iterator := &wtestmocks.StateQueryIterator{}

	asset := &sa.BondAsset{ID: "asset1"}
	bytes, err := json.Marshal(asset)
	require.NoError(t, err)

	iterator.HasNextReturnsOnCall(0, true)
	iterator.HasNextReturnsOnCall(1, false)
	iterator.NextReturns(&queryresult.KV{Value: bytes}, nil)

	chaincodeStub.GetStateByRangeReturns(iterator, nil)
	assets, err := simpleAsset.GetAllAssets(transactionContext)
	require.NoError(t, err)
	require.Equal(t, []*sa.BondAsset{asset}, assets)

	iterator.HasNextReturns(true)
	iterator.NextReturns(nil, fmt.Errorf("failed retrieving next item"))
	assets, err = simpleAsset.GetAllAssets(transactionContext)
	require.EqualError(t, err, "failed retrieving next item")
	require.Nil(t, assets)

	chaincodeStub.GetStateByRangeReturns(nil, fmt.Errorf("failed retrieving all assets"))
	assets, err = simpleAsset.GetAllAssets(transactionContext)
	require.EqualError(t, err, "failed retrieving all assets")
	require.Nil(t, assets)
}
