package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

type AssetPledgeMap struct {
	PledgeID          string      `json:"pledgeid"`
	RemoteNetworkID   string      `json:"remotenetworkid"`
	Recipient         string      `json:"recipient"`
}

func createAssetPledgeIdMap(ctx contractapi.TransactionContextInterface, pledgeId, assetType, id, remoteNetworkId, recipientCert string) error {
	key := "asset_pledge_map_" + generateSHA256HashInHexForm(assetType + id)
	assetPledgeMap := &AssetPledgeMap{
		PledgeID: pledgeId,
		RemoteNetworkID: remoteNetworkId,
		Recipient: recipientCert,
	}
	assetPledgeMapJSON, err := json.Marshal(assetPledgeMap)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(key, assetPledgeMapJSON)
	if err != nil {
		return fmt.Errorf("error creating asset pledge mapping")
	}
	return nil
}

func getAssetPledgeIdMap(ctx contractapi.TransactionContextInterface, assetType, id string) (*AssetPledgeMap, error) {
	key := "asset_pledge_map_" + generateSHA256HashInHexForm(assetType + id)
	assetPledgeMap := &AssetPledgeMap{}
	assetPledgeMapJSON, err := ctx.GetStub().GetState(key)
	if err != nil {
		return assetPledgeMap, err
	}
	err = json.Unmarshal(assetPledgeMapJSON, assetPledgeMap)
	return assetPledgeMap, err
}

func delAssetPledgeIdMap(ctx contractapi.TransactionContextInterface, assetType, id string) error {
	key := "asset_pledge_map_" + generateSHA256HashInHexForm(assetType + id)
	err := ctx.GetStub().DelState(key)
	if err!=nil {
		return fmt.Errorf("error deleting asset pledge mapping")
	}
	return nil
}

