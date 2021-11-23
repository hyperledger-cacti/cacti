/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * naming_service.go
 */

// Package
package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

// Object structure definition
// End-chain account information
type ECAccountInfo struct {
	ECAccountID  string `json:"id"`
	UserID string `json:"userID"`
	ChainID string `json:"chainID"`
	AccountID string `json:"accountID"`
	Alias string `json:"alias"`
	AuthInfo string `json:"authInfo,omitempty"`
}

// Constant definition
// End-chain accountID numbering counter
const LAST_INDEX = "last_ec_account_id"

// Chaincode structure definition
type NamingService struct {
}

// Chaincode initialization function
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @param {string} function
 * @param {[]string} args
 * @return {pb.Response}
**/
func (cc *NamingService) Init(stub shim.ChaincodeStubInterface) pb.Response {
	// Store initial value 0 only if end-chain accountID numbering counter is not set
	getBytes, err := stub.GetState(LAST_INDEX)
	if err != nil {
		return shim.Error("[Init] GetState operation failed. " + err.Error())
	}
	if getBytes == nil {
		err := stub.PutState(LAST_INDEX, []byte(strconv.Itoa(0)))
		if err != nil {
			return shim.Error("[Init] PutState operation failed. " + err.Error())
		}
	}

	return shim.Success(nil)
}

// Invoke, query interface in chaincode
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @param {string} function Execution function
 * @param {[]string} args Arguments to pass to the function
 * @return {pb.Response} 
**/
func (cc *NamingService) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()
	switch function {
// Invoke functions
	// Add end-chain account information
	case "addECAccount":
		return addECAccount(stub, args)
	// Update end-chain account information
	case "updateECAccount":
		return updateECAccount(stub, args)
	// Delete end-chain account information
	case "deleteECAccount":
		return deleteECAccount(stub, args)
// Query functions
	// Get single end-chain account information
	case "getECAccount":
		return getECAccount(stub, args)
	// Get end-chain account information list
	case "getECAccountList":
		return getECAccountList(stub, args)

	default:
		return shim.Error("Unkown operation.")
	}
}

/***** Invoke internal functions *****/
// Register end-chain account information
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @param {[]string} args Content of end-chain account information to register
 *          - args[0] : ID of the ConectionChain user bound to the account
 *          - args[1] : Chain ID of end-chain
 *          - args[2] : account ID
 *          - args[3] : Display name for account
 *          - args[4] : Authentication information for the asset transfer operation (Optional)
 * @return {pb.Response}
**/
func addECAccount(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	// Error if args number is not 4 or 5
	if len(args) != 4 && len(args) != 5 {
		return shim.Error("Incorrect number of arguments. Expecting 4 or 5")
	}
	
	userID := args[0]
	chainID := args[1]
	accountID := args[2]
	alias := args[3]
	// Register empty string if no authentication parameter is specified
	authinfo := ""
	if len(args) == 5 {
		authinfo = args[4]
	}

	// Get end-chain account ID
	indexBytes, err := stub.GetState(LAST_INDEX)
	if err != nil {
		return shim.Error("GetState operation failed. " + err.Error())
	}
	indexStr := string(indexBytes)
	index, err := strconv.Atoi(indexStr)
	if err != nil {
		return shim.Error("strconv operation failed. " + err.Error())
	}

	// Update with + 1 counter for end-chain account ID numbering
	err = stub.PutState(LAST_INDEX, []byte(strconv.Itoa(index + 1)))
	if err != nil {
		return shim.Error("PutState operation failed. " + err.Error())
	}

	// JSON style object data creation
	accountInfo := &ECAccountInfo{indexStr, userID, chainID, accountID, alias, authinfo}
	jsonBytes, err := json.Marshal(accountInfo)
	if err != nil {
		return shim.Error("Marshal operation failed. " + err.Error())
	}

	// Register in World State
	err = stub.PutState(indexStr, jsonBytes)
	if err != nil {
		return shim.Error("PutState operation failed. " + err.Error())
	}
	// Return end-chain account ID
	return shim.Success(indexBytes)
}

// Update end-chain account information
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @param {[]string} args Content of end-chain account information to update
 *          - args[0] : End-chain account ID
 *          - args[1] : ID of the ConnectionChain user tied to the account
 *          - args[2] : Chain ID of end-chain to which the account belongs
 *          - args[3] : ID to be specified in the API of the asset management function on end-chain
 *          - args[4] : Alias to use for the display on the UI
 *          - args[5] : Parameters to use if authentication is required for the asset transfer operation (Optional)
 * @return {pb.Response}
**/
func updateECAccount(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	// Error if size of args[] array is not 5 or 6
	if len(args) != 5 && len(args) != 6 {
		return shim.Error("Incorrect number of arguments. Expecting 5 or 6")
	}
	
	ecAccountID := args[0]
	userID := args[1]
	chainID := args[2]
	accountID := args[3]
	alias := args[4]
	authinfo := ""
	if len(args) == 6 {
		authinfo = args[5]
	}

	// Check if any registered information exists
	getBytes, err := stub.GetState(ecAccountID)
	if err != nil {
		return shim.Error("GetState operation failed. " + err.Error())
	}
	if getBytes == nil {
		// Return success with null if not registered
		fmt.Printf("This account is not yet registered. ECAccountID = %s", ecAccountID)
		return shim.Success(nil)
	}

	// Overwrite the registered information
	var accountInfo ECAccountInfo
	err = json.Unmarshal(getBytes, &accountInfo)
	if err != nil {
		return shim.Error("Error unmarshaling JSON: " + err.Error())
	}
	// Do not update fields with empty string other than authentication parameter
	if userID != "" {
		accountInfo.UserID = userID
	}
	if chainID != "" {
		accountInfo.ChainID = chainID
	}
	if accountID != "" {
		accountInfo.AccountID = accountID
	}
	if alias != "" {
		accountInfo.Alias = alias
	}
	// Update authentication parameters only if specified in argument
	if len(args) == 6 {
		accountInfo.AuthInfo = authinfo
	}

	jsonBytes, err := json.Marshal(accountInfo)
	if err != nil {
		return shim.Error("Marshal operation failed. " + err.Error())
	}

	// Register in World State
	err = stub.PutState(ecAccountID, jsonBytes)
	if err != nil {
		return shim.Error("PutState operation failed. " + err.Error())
	}
	// Return ID on successful update 
	return shim.Success([]byte(ecAccountID))
}

// Delete end-chain account information
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @param {[]string} args ID of the end-chain account to delete
 *          - args[0] : End-chain account ID
 * @return {pb.Response}
**/
func deleteECAccount(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	// Error if size of args[] array is not 1
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	ecAccountID := args[0]

	// Remove the data from world state
	err := stub.DelState(ecAccountID)
	if err != nil {
		return shim.Error("DelState operation failed. " + err.Error())
	}
	return shim.Success(nil)
}

/***** Internal query functions *****/

// Get single end-chain account information
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @param {[]string} args ID of the end-chain account to get
 *          - args[0] : End-chain account ID
 * @return {pb.Response}
**/
func getECAccount(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	// Error if number of args is not 1
	if len(args) != 1 {
		return shim.Error("Incorrect number of arguments. Expecting 1")
	}

	ecAccountID := args[0]

	// Check if registered information exists
	getBytes, err := stub.GetState(ecAccountID)
	if err != nil {
		return shim.Error("GetState operation failed. " + err.Error())
	}
	if getBytes == nil {
		// Returns success with null if not registered
		fmt.Printf("This account is not yet registered. ECAccountID = %s", ecAccountID)
		return shim.Success(nil)
	}
	// Return the retrieved content
	return shim.Success(getBytes)
}

// Get end-chain account information list
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @param {[]string} args ID of end-chain account to get.
 *          - args[0] : ID of the ConnectionChain user associated with the account (Optional)
 *          - args[1] : Chain ID of end-chain to which the account belongs (Optional)
 * @return {pb.Response}
**/
func getECAccountList(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	// Error if the number of args is greater than or equal to 3
	if len(args) > 2 {
		return shim.Error("Incorrect number of arguments. Expecting 2 or less")
	}

	userID := ""
	chainID := ""
	if len(args) > 0 {
		userID = args[0]
	}
	if len(args) > 1 {
		chainID = args[1]
	}

	// Get All information and then filter
	iter, err := stub.GetStateByRange("", "~")
	if err != nil {
		return shim.Error("Unable to start iter")
	}
	defer iter.Close()

	// Obtains sequentially from Iterator and stores in results
	var results []ECAccountInfo
	for iter.HasNext() {
		qr, err := iter.Next()
		if err != nil {
			return shim.Error("Iterator.Next operation failed. " + err.Error())
		}
		// No need for "End-chain Account ID Numbering Counter"
		if qr.Key == LAST_INDEX {
			continue
		}

		// Analyze registered end-chain account information
		var info ECAccountInfo
		err = json.Unmarshal(qr.Value, &info)
		if err != nil {
			return shim.Error("Error unmarshaling JSON: " + err.Error())
		}

		// If the number of args is greater than or equal to 1, filter by user ID
		if len(args) > 0 {
			if info.UserID != userID {
				continue
			}
			// If the number of args is 2, then filter by chain ID
			if len(args) == 2 {
				if info.ChainID != chainID {
					continue
				}
			}
		}
		results = append(results, info)
	}

	// Convert results to JSON format and return
	marshalledResults, err := json.Marshal(results)
	if err != nil {
		return shim.Error("Marshal operation failed. " + err.Error())
	}
	return shim.Success([]byte(marshalledResults))
}

func main() {
	err := shim.Start(new(NamingService))
	if err != nil {
		fmt.Printf("Error starting namingservice chaincode: %s",err)
	}
}
