package main

import (
	"encoding/json"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

// AssetOrigin defines the asset's origin
type AssetOrigin struct {
	OriginDltID   string `json:"origin_dlt_id"`
	OriginAssetID string `json:"origin_asset_id"`
}

// AssetProperties represent the other functional properties of the asset
type AssetProperties struct {
	Property1 string `json:"property1"`
	Property2 string `json:"property2"`
}

// Asset represents the main object to be manipulated by the chaincode
type Asset struct {
	AssetID     string          `json:"asset_id"`
	DltID       string          `json:"dlt_id"`
	Origin      []AssetOrigin   `json:"origin"`
	Properties  AssetProperties `json:"properties"`
	Locked      bool            `json:"locked"`
	TargetDltID string          `json:"target_dlt_id"`
	ReceiverPK  string          `json:"receiver_pk"`
}

func (t *MyChaincode) lockAsset(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 3 {
		return shim.Error("Failed because incorrect num of arguments. Expecting 3 " +
			"(asset_id, target_dlt_id, receiver_pk)")
	}

	var assetID = args[0]
	var targetDltID = args[1]
	var receiverPK = args[2]

	var assetKey = getKey(assetID)

	var asset = Asset{}

	var decodeErr error
	var putAssetErr error

	// Check that the asset exists
	assetBytes, getAssetErr := stub.GetState(assetKey)
	if getAssetErr != nil {
		return shim.Error("Failed to get asset")
	}
	if assetBytes == nil {
		return shim.Error("Failed as asset doesn't exist")
	}

	decodeErr = json.Unmarshal(assetBytes, &asset)
	// Decode stringified json to get an Asset type object
	if decodeErr != nil {
		return shim.Error("Failed to decode retrieved asset")
	}

	if asset.Locked {
		return shim.Error("Failed as asset is already locked")
	}

	// Lock the asset and update it on the Blockchain
	asset.Locked = true
	asset.TargetDltID = targetDltID
	asset.ReceiverPK = receiverPK

	// Put the asset to the blockchain KVS
	assetBytes, _ = json.Marshal(asset)
	putAssetErr = stub.PutState(assetKey, assetBytes)
	if putAssetErr != nil {
		return shim.Error("Failed to write asset to the blockchain")
	}

	return shim.Success(assetBytes)
}

func (t *MyChaincode) setProperty(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	if len(args) != 3 {
		return shim.Error("Failed because incorrect number of arguments. Expecting 3 " +
			"(assetID, propertyName, propertyValue)")
	}

	var assetID = args[0]
	var propertyName = args[1]
	var propertyValue = args[2]
	var assetKey = getKey(assetID)

	var asset = Asset{}

	var decodeErr error
	var putAssetErr error

	// Check that the asset exists
	assetBytes, getAssetErr := stub.GetState(assetKey)
	if getAssetErr != nil {
		return shim.Error("Failed to get asset")
	}
	if assetBytes == nil {
		return shim.Error("Failed as asset doesn't exist")
	}

	decodeErr = json.Unmarshal(assetBytes, &asset)
	// Decode stringified json to get an Asset type object
	if decodeErr != nil {
		return shim.Error("Failed to decode retrieved asset")
	}

	// Check that the asset is not locked before updating asset's properties
	if asset.Locked {
		return shim.Error("Failed as asset is locked, no updates ar allowed")
	}

	// Change the propety's value
	switch propertyName {
	case "property1":
		asset.Properties.Property1 = propertyValue
	case "property2":
		asset.Properties.Property2 = propertyValue
	default:
		return shim.Error("Failed as property to update doesn't exist")
	}

	// Put the asset to the blockchain KVS
	assetBytes, _ = json.Marshal(asset)
	putAssetErr = stub.PutState(assetKey, assetBytes)
	if putAssetErr != nil {
		return shim.Error("Failed to write asset to the blockchain")
	}

	return shim.Success(assetBytes)
}

func (t *MyChaincode) createAsset(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	logger.Info("########### creating asset ###########")

	var assetKey string
	var assetStr string

	var decodeErr error
	var getAssetErr error
	var putAssetErr error

	if len(args) != 1 {
		return shim.Error("Failed because incorrect number of arguments. Expecting 1 " +
			"(asset definition object)")
	}

	assetStr = args[0]

	var asset = Asset{}
	decodeErr = json.Unmarshal([]byte(assetStr), &asset)
	// Decode stringified json to get an Asset type object
	if decodeErr != nil {
		return shim.Error("Bad asset format")
	}

	assetKey = getKey(asset.AssetID)

	// Check that the asset doesn't already exist
	assetBytes, getAssetErr := stub.GetState(assetKey)
	if getAssetErr != nil {
		return shim.Error("Failed to get asset")
	}
	if assetBytes != nil {
		return shim.Error("Failed as entity already exists")
	}

	// Asset is created unlocked at first
	asset.Locked = false
	asset.DltID = "Accenture_DLT"

	// Put the asset to the blockchain KVS
	assetBytes, _ = json.Marshal(asset)
	putAssetErr = stub.PutState(assetKey, assetBytes)
	if putAssetErr != nil {
		return shim.Error("Failed to write asset to the blockchain")
	}

	return shim.Success(assetBytes)
}
