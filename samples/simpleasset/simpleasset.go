package simpleasset

import (
	"encoding/json"
	"fmt"
	"time"
	"os"

	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing an Asset
type SmartContract struct {
	contractapi.Contract
}

type Asset struct {
	ID							string 			`json:"id"`
	AssetType				string 			`json:"assettype"`
	Owner						string 			`json:"owner"`
	Issuer					string 			`json:"issuer"`
	FaceValue				int					`json:"facevalue"`
	MaturityDate		time.Time		`json:"maturitydate"`
}


// InitLedger adds a base set of assets to the ledger
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	assets := []Asset{
		{ID: "a1", AssetType: "type1", Issuer: "Treasury" , Owner: "", FaceValue: 300,
			 MaturityDate: time.Date(2022, time.April, 1, 12, 0, 0, 0, time.UTC)},
		{ID: "a2", AssetType: "type1", Issuer: "Treasury" , Owner: "", FaceValue: 400,
			 MaturityDate: time.Date(2022, time.July, 1, 12, 0, 0, 0, time.UTC)},
		{ID: "a3", AssetType: "type2", Issuer: "Treasury" , Owner: "", FaceValue: 1000,
			 MaturityDate: time.Date(2023, time.April, 1, 12, 0, 0, 0, time.UTC) },
		{ID: "a4", AssetType: "type3", Issuer: "Treasury" , Owner: "", FaceValue: 2000,
			 MaturityDate: time.Date(2025, time.April, 1, 12, 0, 0, 0, time.UTC) },
	}

	for _, asset := range assets {
		assetJSON, err := json.Marshal(asset)
		if err != nil {
			return err
		}

		err = ctx.GetStub().PutState(asset.ID, assetJSON)
		if err != nil {
			return fmt.Errorf("failed to put to world state. %v", err)
		}
	}

	return nil
}

// CreateAsset issues a new asset to the world state with given details.
func (s *SmartContract) CreateAsset(ctx contractapi.TransactionContextInterface, id string, assettype string, owner string, issuer string, faceValue int, maturityDate time.Time) error {
	exists, err := s.AssetExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("the asset %s already exists", id)
	}

	asset := Asset{
		ID:							id,
		AssetType:			assettype,
		Owner:					owner,
		Issuer:					issuer,
		FaceValue:			faceValue,
		MaturityDate:		maturityDate,
	}
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, assetJSON)
}

// ReadAsset returns the asset stored in the world state with given id.
func (s *SmartContract) ReadAsset(ctx contractapi.TransactionContextInterface, id string) (*Asset, error) {
	assetJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if assetJSON == nil {
		return nil, fmt.Errorf("the asset %s does not exist", id)
	}

	var asset Asset
	err = json.Unmarshal(assetJSON, &asset)
	if err != nil {
		return nil, err
	}

	return &asset, nil
}

// DeleteAsset deletes an given asset from the world state.
func (s *SmartContract) DeleteAsset(ctx contractapi.TransactionContextInterface, id string) error {
	exists, err := s.AssetExists(ctx, id)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("the asset %s does not exist", id)
	}

	return ctx.GetStub().DelState(id)
}

// AssetExists returns true when asset with given ID exists in world state
func (s *SmartContract) AssetExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	assetJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, fmt.Errorf("failed to read from world state: %v", err)
	}

	return assetJSON != nil, nil
}
// AssetExists returns true when asset with given ID exists in world state
func (s *SmartContract) isAssetReleased(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	asset, err := s.ReadAsset(ctx, id)
	if err != nil {
		return false, err
	}
	currDate := time.Now()
	if (currDate.After(asset.MaturityDate)) {
		return true, nil
	}

	return false, nil
}

// TransferAsset updates the owner field of asset with given id in world state.
func (s *SmartContract) UpdateOwner(ctx contractapi.TransactionContextInterface, id string, newOwner string) error {
	asset, err := s.ReadAsset(ctx, id)
	if err != nil {
		return err
	}

	asset.Owner = newOwner
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, assetJSON)
}
// UpdateAsset updates an existing asset in the world state with provided parameters.
func (s *SmartContract) UpdateMaturityDate(ctx contractapi.TransactionContextInterface, id string, newMaturityDate time.Time) error {
	asset, err := s.ReadAsset(ctx, id)
	if err != nil {
		return err
	}

	asset.MaturityDate = newMaturityDate
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, assetJSON)
}
// UpdateAsset updates an existing asset in the world state with provided parameters.
func (s *SmartContract) UpdateFaceValue(ctx contractapi.TransactionContextInterface, id string, newFaceValue int) error {
	asset, err := s.ReadAsset(ctx, id)
	if err != nil {
		return err
	}

	asset.FaceValue = newFaceValue
	assetJSON, err := json.Marshal(asset)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, assetJSON)
}

// GetAllAssets returns all assets found in world state
func (s *SmartContract) GetAllAssets(ctx contractapi.TransactionContextInterface) ([]*Asset, error) {
	// range query with empty string for startKey and endKey does an
	// open-ended query of all assets in the chaincode namespace.
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var assets []*Asset
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var asset Asset
		err = json.Unmarshal(queryResponse.Value, &asset)
		if err != nil {
			return nil, err
		}
		assets = append(assets, &asset)
	}

	return assets, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(new(SmartContract))

	if err != nil {
		fmt.Printf("Error create SimpleAsset chaincode: %s", err.Error())
		return
	}

	_, ok := os.LookupEnv("EXTERNAL_SERVICE")
	if ok {
		server := &shim.ChaincodeServer{
				CCID:    os.Getenv("CHAINCODE_CCID"),
				Address: os.Getenv("CHAINCODE_ADDRESS"),
				CC:      chaincode,
				TLSProps: shim.TLSProperties{
										Disabled: true,
									},
		}
		// Start the chaincode external server
		err = server.Start()
	} else {
		err = chaincode.Start()
	}
	if err != nil {
		fmt.Printf("Error starting SimpleAsset chaincode: %s", err.Error())
	}

}
