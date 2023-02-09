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
)

// SmartContract provides functions for managing arbitrary key-value pairs
type SmartContract struct {
	contractapi.Contract
}

// CreateAndReturnKey adds a new entry with the specified key and value, and returns the key
func (s *SmartContract) CreateAndReturnKey(ctx contractapi.TransactionContextInterface, key string, value string) (string, error) {
	bytes := []byte(value)
	fmt.Printf("CreateAndReturnKey called. Key: %s Value: %s\n", key, value)

	err := ctx.GetStub().PutState(key, bytes)
	if err != nil {
		return "", err
	}
	return key, nil
}

// Create adds a new entry with the specified key and value
func (s *SmartContract) Create(ctx contractapi.TransactionContextInterface, key string, value string) error {
	bytes := []byte(value)
	fmt.Printf("Create called. Key: %s Value: %s\n", key, value)

	err := ctx.GetStub().PutState(key, bytes)
	if err != nil {
		return err
	} else {
		err = ctx.GetStub().SetEvent("CreateSimpleState", []byte(key))
		if err != nil {
			fmt.Printf("Unable to set 'CreateSimpleState' event: %+v\n", err)
		}
	}
	return nil
}

// Read returns the value of the entry with the specified key
func (s *SmartContract) Read(ctx contractapi.TransactionContextInterface, key string) (string, error) {
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
	sc := new(SmartContract)
	chaincode, err := contractapi.NewChaincode(sc)

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
