/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package main

import (
	"fmt"
	"os"

	"github.com/hyperledger/fabric-chaincode-go/shim"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
	wutils "github.com/hyperledger-labs/weaver-dlt-interoperability/core/network/fabric-interop-cc/libs/utils"
)

// SmartContract provides functions for managing arbitrary key-value pairs
type SmartContract struct {
	contractapi.Contract
}

// Record Interoperation Chaincode ID on ledger
func (s *SmartContract) Init(ctx contractapi.TransactionContextInterface, ccId string) error {
	ccBytes := []byte(ccId)
	fmt.Printf("Init called. CC ID: %s\n", ccId)

	return ctx.GetStub().PutState(wutils.GetInteropChaincodeIDKey(), ccBytes)
}

// Create adds a new entry with the specified key and value
func (s *SmartContract) Create(ctx contractapi.TransactionContextInterface, key string, value string) error {
	bytes := []byte(value)
	fmt.Printf("Create called. Key: %s Value: %s\n", key, value)

	return ctx.GetStub().PutState(key, bytes)
}

// CreateFromRemote adds a new entry with the specified key and value obtained (with proof) from a remote network
func (s *SmartContract) CreateFromRemote(ctx contractapi.TransactionContextInterface, key string, value string) error {
	callerCheck, err := wutils.IsCallerInteropChaincode(ctx.GetStub())
	if err != nil {
		return err
	}
	if !callerCheck {
		return fmt.Errorf("Illegal access; function can only be invoked from Interop Chaincode")
	}
	fmt.Printf("Caller access check passed. Key: %s\n", key)

	bytes := []byte(value)
	fmt.Printf("Create called. Key: %s Value: %s\n", key, value)

	return ctx.GetStub().PutState(key, bytes)
}

// Read returns the value of the entry with the specified key
func (s *SmartContract) Read(ctx contractapi.TransactionContextInterface, key string) (string, error) {
	relayAccessCheck, err := wutils.CheckAccessIfRelayClient(ctx.GetStub())
	if err != nil {
		return "", err
	}
	if !relayAccessCheck {
		return "", fmt.Errorf("Illegal access by relay")
	}
	fmt.Printf("Relay access check passed. Key: %s\n", key)

	bytes, err := ctx.GetStub().GetState(key)

	if err != nil {
		return "", fmt.Errorf("Failed to read key '%s' from world state. %s", key, err.Error())
	}

	value := string(bytes)
	return value, nil
}

// Update updates the value of the entry with specified key, using the given value
func (s *SmartContract) Update(ctx contractapi.TransactionContextInterface, key string, value string) error {
	_, err := ctx.GetStub().GetState(key)

	if err != nil {
		return fmt.Errorf("Failed to read key '%s' from world state. %s", key, err.Error())
	}

	bytes := []byte(value)
	return ctx.GetStub().PutState(key, bytes)
}

// Delete deletes the entry with the specified key
func (s *SmartContract) Delete(ctx contractapi.TransactionContextInterface, key string) error {
	return ctx.GetStub().DelState(key)
}

func main() {
	chaincode, err := contractapi.NewChaincode(new(SmartContract))

	if err != nil {
		fmt.Printf("Error create SimpleState chaincode: %s", err.Error())
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
		fmt.Printf("Error starting SimpleState chaincode: %s", err.Error())
	}
}
