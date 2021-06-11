/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

package main

import (
	"errors"
	"fmt"
	"os"

	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	log "github.com/sirupsen/logrus"
)

const applicationCCKey = "applicationccid"

// SmartContract provides functions for managing arbitrary key-value pairs
type SmartContract struct {
	contractapi.Contract
}

func init() {
	if os.Getenv("FABRIC_INTEROP_CC_MODE") == "production" {
		log.SetLevel(log.InfoLevel)
	} else {
		log.SetLevel(log.DebugLevel)
	}
	log.SetOutput(os.Stdout)
}

// InitLedger initilises ledger with data. Need the application chaincode id so the handleExtnernalRequest flow can
// call the application chaincode.
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	var err error

	_, args := ctx.GetStub().GetFunctionAndParameters()

	if len(args) != 1 {
		err = fmt.Errorf("Incorrect number of arguments. Expecting 1: {APPLICATION Chaincode ID/hash}. Found %d", len(args))
		fmt.Printf("Error %s", err.Error())
		return err
	}

	err = ctx.GetStub().PutState(applicationCCKey, []byte(args[0]))
	if err != nil {
		errMsg := fmt.Sprintf("Error saving APPLICATION ID: %s", err.Error())
		fmt.Printf(errMsg)
		return errors.New(errMsg)
	}

	return nil
}

// GetApplicationID retrieves the app CC id from the ledger
func (s *SmartContract) GetApplicationID(ctx contractapi.TransactionContextInterface) (string, error) {
	bytes, err := ctx.GetStub().GetState(applicationCCKey)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(new(SmartContract))

	if err != nil {
		fmt.Printf("Error creating Interop chaincode: %s", err.Error())
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
		fmt.Printf("Error starting Interop chaincode: %s", err)
	}



}
