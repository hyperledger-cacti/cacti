export const SHIPMENT_CONTRACT_GO_SOURCE = `package main

import (
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"

)

func isNonBlank(str *string) bool {
	if str == nil {
		return false
	}
	return strings.TrimSpace(*str) != ""
}

type ShipmentChaincode struct {
	contractapi.Contract
}

type Shipment struct {
	Id          string \`json:"id"\`
	BookshelfId string \`json:"bookshelfId"\`
}

func main() {
	shipmentChaincode, err := contractapi.NewChaincode(&ShipmentChaincode{})
	if err != nil {
		log.Panicf("Error creating supply-chain shipment chaincode: %v", err)
	}

	if err := shipmentChaincode.Start(); err != nil {
		log.Panicf("Error starting supply-chain shipment chaincode: %v", err)
	}
}

// InitLedger adds a base set of assets to the ledger
func (t *ShipmentChaincode) InitLedger(ctx contractapi.TransactionContextInterface) error {

	log.Println("InitLedger ran for supply-chain shipment chaincode. %v", t)
	
	return nil
}

func (t *ShipmentChaincode) InsertShipment(ctx contractapi.TransactionContextInterface, newShipmentId string, bookshelfId string) (string, error) {
	if !isNonBlank(&newShipmentId) {
		return "E_NEW_SHIPMENT_ID_BLANK", fmt.Errorf("Incorrect arguments. Expecting a shipment ID as a non-blank string.")
	} 
	if !isNonBlank(&bookshelfId) {
		return "E_NEW_BOOKSHELF_ID_BLANK", fmt.Errorf("Incorrect arguments. Expecting a bookshelf ID as a non-blank string.")
	}

	var newShipment Shipment
	newShipment.Id = newShipmentId
	newShipment.BookshelfId = bookshelfId

	newShipmentJSON, err := json.Marshal(newShipment)
	if err != nil {
		return "OP_FAILED", fmt.Errorf("Failed to JSON marshal new shipment data: %v", err)
	}

	stub := ctx.GetStub()

	err2 := stub.PutState(newShipmentId, newShipmentJSON)
	if err2 != nil {
		return "E_PUT_STATE_FAIL", fmt.Errorf("Failed to insert new shipment to ledger state: %v --- %v", newShipmentJSON, err2)
	}

	return newShipmentId, nil
}

func (t *ShipmentChaincode) GetListShipment(ctx contractapi.TransactionContextInterface) ([]Shipment, error) {

	stub := ctx.GetStub()

	resultsIterator, _, err := stub.GetStateByRangeWithPagination("", "", 25, "")
	if err != nil {
		return nil, fmt.Errorf("Error in GetListShipment: %v", err)
	}
	defer resultsIterator.Close()

	var shipments []Shipment

	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, fmt.Errorf("Error in shipment result iterator: %v", err)
		}

		var aux Shipment
		if err := json.Unmarshal(response.Value, &aux); err != nil {
			return nil, fmt.Errorf("Error un-marshalling shipment: %v", err)
		}

		shipments = append(shipments, aux)
	}

	return shipments, nil
}`;

const exportSourceToFs = async () => {
  const path = await import("path");
  const fs = await import("fs");
  const fileName = "./shipment.go";
  const scriptPath = path.join(__dirname, fileName);
  fs.writeFileSync(scriptPath, SHIPMENT_CONTRACT_GO_SOURCE);
};

if (require.main === module) {
  exportSourceToFs();
}
