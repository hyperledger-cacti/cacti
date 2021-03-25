export const SHIPMENT_CONTRACT_GO_SOURCE = `package main

import (
	"bytes"
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	"github.com/hyperledger/fabric/protos/peer"
)

type ShipmentChaincode struct {
}

type Shipment struct {
	Id          string \`json:"id"\`
	BookshelfId string \`json:"bookshelfId"\`
}

func main() {
	if err := shim.Start(new(ShipmentChaincode)); err != nil {
		fmt.Printf("Error starting ShipmentChaincode chaincode: %s", err)
	}
}

func (t *ShipmentChaincode) Init(stub shim.ChaincodeStubInterface) peer.Response {
	return shim.Success(nil)
}

func (t *ShipmentChaincode) Invoke(stub shim.ChaincodeStubInterface) peer.Response {
	fn, args := stub.GetFunctionAndParameters()

	if fn == "insertShipment" {
		return t.insertShipment(stub, args)
	} else if fn == "getListShipment" {
		return t.getListShipment(stub, args)
	}
	return shim.Error("Unknown function")
}

func (t *ShipmentChaincode) insertShipment(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	if len(args) != 2 {
		return shim.Error("Incorrect arguments. Expecting an id and a bookshelfId")
	}

	var newShipment Shipment
	newShipment.Id = args[0]
	newShipment.BookshelfId = args[1]

	newShipmentJSON, err := json.Marshal(newShipment)
	if err != nil {
		return shim.Error(err.Error())
	}

	err2 := stub.PutState(args[0], newShipmentJSON)
	if err2 != nil {
		return shim.Error("Failed to insert shipment:" + args[0] + err2.Error())
	}

	return shim.Success([]byte(args[0]))
}

func (t *ShipmentChaincode) getListShipment(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	if len(args) != 0 {
		return shim.Error("Incorrect arguments. No arguments expected")
	}
	bookmark := ""

	resultsIterator, _, err := stub.GetStateByRangeWithPagination("", "", 25, bookmark)
	if err != nil {
		return shim.Error("Error in getListShipment: " + err.Error())
	}
	defer resultsIterator.Close()

	var listShipment []Shipment

	for resultsIterator.HasNext() {
		var buffer bytes.Buffer
		var aux Shipment
		response, err := resultsIterator.Next()
		if err != nil {
			return shim.Error("Error in iterator: " + err.Error())
		}

		buffer.WriteString(string(response.Value))

		_ = json.Unmarshal(buffer.Bytes(), &aux)

		listShipment = append(listShipment, aux)
	}

	jsonResponse, err := json.Marshal(listShipment)
	if err != nil {
		return shim.Error("Error get result: " + err.Error())
	}

	return shim.Success(jsonResponse)
}
`;

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
