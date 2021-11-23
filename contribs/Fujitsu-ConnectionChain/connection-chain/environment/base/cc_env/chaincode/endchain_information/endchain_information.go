/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * endchain_information.go
 */

// Package
package main

import (
	"encoding/json"
	"fmt"
	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

// Object structure definition
// Destination end-chain information
type EndChainInfo struct {
	ChainID             string `json:"id"`                 // Chain ID
	ChainName           string `json:"chainName"`          // Display name on the UI
	AdapterUrl          string `json:"adapterUrl"`         // Contact URL for cooperation server(adapter)
}

// Constant definition
// Connection destination end-chain information storage object
const EC_INFO = "ec_info"

// Chaincode data structure definition
type EndchainInformation struct {
}

// Chaincode initialization function
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @return {pb.Response} Always returns successful response (nil value)
**/
func (cc *EndchainInformation) Init(stub shim.ChaincodeStubInterface) pb.Response {
	// Do nothing
	return shim.Success(nil)
}

// chaincode IF of Invoke, query
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @return {pb.Response} 
**/
func (cc *EndchainInformation) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()
	switch function {
// invoke function for setting destination end-chain information
	case "addECInfo":
		return addECInfo(stub, args)
	case "updateECInfo":
		return updateECInfo(stub, args)
	case "deleteECInfo":
		return deleteECInfo(stub, args)
// query function for obtaiing the destination end-chain information
	case "getECInfo":
		return getECInfo(stub, args)
	case "getECInfoList":
		return getECInfoList(stub, args)

	default:
		return shim.Error("Unkown operation.")
	}
}

/***** Invoke internal functions *****/

// Add destination end-chain information
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @param {[]string} args Content of destination end-chain information to be added
 *          - args[0] : Chain ID
 *          - args[1] : Display name on the UI
 *          - args[2] : URL to contact Adapter server
 * @return {pb.Response}
**/
func addECInfo(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	// Error if the size of args[] array is not 3
	if len(args) != 3 {
		return shim.Error("[addECInfo] Incorrect number of arguments. Expecting 3")
	}

	chainID := args[0]
	chainName := args[1]
	adapterUrl := args[2]

	// Composite key generation
	key, err := stub.CreateCompositeKey(EC_INFO, []string{chainID})
	if err != nil {
		return shim.Error("[addECInfo] CreateCompositeKey operation failed. " + err.Error())
	}
	// Check if registered information exists
	getBytes, err := stub.GetState(key)
	if err != nil {
		return shim.Error("[addECInfo] GetState operation failed. " + err.Error())
	}
	if getBytes != nil {
		// Return success with null if ID already exists
		fmt.Printf("This endchain is already registered. ChainID = %s", chainID)
		return shim.Success(nil)
	}

	// JSON object creation
	ecInfo := &EndChainInfo{chainID, chainName, adapterUrl}
	jsonBytes, err := json.Marshal(ecInfo)
	if err != nil {
		return shim.Error("[addECInfo] Marshal operation failed. " + err.Error())
	}
	// Register in World State
	err = stub.PutState(key, jsonBytes)
	if err != nil {
		return shim.Error("[addECInfo] PutState operation failed. " + err.Error())
	}

	// Return ID on successful
	return shim.Success([]byte(chainID))
}

// Update destination end-chain information
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @param {[]string} args Content of destination end-chain information to update
 *          - args[0] : Chain ID
 *          - args[1] : Display name on the UI
 *          - args[2] : Adapter URL
 * @return {pb.Response}
**/
func updateECInfo(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	// Error if the size of args[] array is not 3
	if len(args) != 3 {
		return shim.Error("[updateECInfo] Incorrect number of arguments. Expecting 3")
	}

	chainID := args[0]
	chainName := args[1]
	adapterUrl := args[2]

	// Composite key generation
	key, err := stub.CreateCompositeKey(EC_INFO, []string{chainID})
	if err != nil {
		return shim.Error("[updateECInfo] CreateCompositeKey operation failed. " + err.Error())
	}
	// Check if registered information exists
	getBytes, err := stub.GetState(key)
	if err != nil {
		return shim.Error("[updateECInfo] GetState operation failed. " + err.Error())
	}
	if getBytes == nil {
		// Return success with null if not registered
		fmt.Printf("This endchain is not yet registered. ChainID = %s", chainID)
		return shim.Success(nil)
	}

	// Overwrite the registered information
	var ecInfo EndChainInfo
	err = json.Unmarshal(getBytes, &ecInfo)
	if err != nil {
		return shim.Error("Error unmarshaling JSON: " + err.Error())
	}
	// Do not update empty fields
	if chainName != "" {
		ecInfo.ChainName = chainName
	}
	if adapterUrl != "" {
		ecInfo.AdapterUrl = adapterUrl
	}

	jsonBytes, err := json.Marshal(ecInfo)
	if err != nil {
		return shim.Error("[updateECInfo] Marshal operation failed. " + err.Error())
	}
	// Register in World State
	err = stub.PutState(key, jsonBytes)
	if err != nil {
		return shim.Error("[updateECInfo] PutState operation failed. " + err.Error())
	}

	// Return ID on successful update 
	return shim.Success([]byte(chainID))
}

// Delete destination end-chain information
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @param {string} args ID of the destination end-chain information to delete
 *          - args[0] : Chain ID
 * @return {pb.Response}
**/
func deleteECInfo(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	// Error if size of args[] array is not 1
	if len(args) != 1 {
		return shim.Error("[deleteECInfo] Incorrect number of arguments. Expecting 1")
	}

	chainID := args[0]

	// Composite key generation
	key, err := stub.CreateCompositeKey(EC_INFO, []string{chainID})
	if err != nil {
		return shim.Error("[deleteECInfo] CreateCompositeKey operation failed. " + err.Error())
	}

	// Remove the data from world state
	err = stub.DelState(key)
	if err != nil {
		return shim.Error("[deleteECInfo] DelState operation failed. " + err.Error())
	}
	return shim.Success(nil)
}

/***** Internal query functions *****/

// Get single destination end-chain information
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @param {string} args ID of the destination end-chain information to get
 *          - args[0] : Chain ID
 * @return {pb.Response}
**/
func getECInfo(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	// Error if size of args[] array is not 1
	if len(args) != 1 {
		return shim.Error("[getECInfo] Incorrect number of arguments. Expecting 1")
	}

	chainID := args[0]

	// Composite key generation
	key, err := stub.CreateCompositeKey(EC_INFO, []string{chainID})
	if err != nil {
		return shim.Error("[getECInfo] CreateCompositeKey operation failed. " + err.Error())
	}

	// Check if registered information exists
	getBytes, err := stub.GetState(key)
	if err != nil {
		return shim.Error("[getECInfo] GetState operation failed. " + err.Error())
	}
	if getBytes == nil {
		// Return success with null if not registered
		fmt.Printf("This endchain is not yet registered. ChainID = %s", chainID)
		return shim.Success(nil)
	}
	// Return the retrieved content
	return shim.Success(getBytes)
}

// Get destination end-chain information list
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @return {pb.Response}
**/
func getECInfoList(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	// Error if size of args[] array is non-zero
	if len(args) != 0 {
		return shim.Error("[getECInfoList] Incorrect number of arguments. Expecting 0")
	}

	// Retrieve with partial composite key (Specify object name only)
	iter, err := stub.GetStateByPartialCompositeKey(EC_INFO, []string{})
	if err != nil {
		return shim.Error("[getECInfoList] GetStateByPartialCompositeKey operation failed. " + err.Error())
	}
	defer iter.Close()

	// Obtains sequentially from Iterator and stores in results
	var results []EndChainInfo
	for iter.HasNext() {
		qr, err := iter.Next()
		if err != nil {
			return shim.Error("[getECInfoList] Iterator.Next operation failed. " + err.Error())
		}

		var info EndChainInfo
		err = json.Unmarshal(qr.Value, &info)
		if err != nil {
			return shim.Error("[getECInfoList] Error unmarshaling JSON: " + err.Error())
		}
		results = append(results, info)
	}

	// Convert results to JSON format and return
	marshalledResults, err := json.Marshal(results)
	if err != nil {
		return shim.Error("[getECInfoList] Marshal operation failed. " + err.Error())
	}
	return shim.Success([]byte(marshalledResults))
}


func main() {
	err := shim.Start(new(EndchainInformation))
	if err != nil {
		fmt.Printf("Error starting endchaininformation chaincode: %s",err)
	}
}
