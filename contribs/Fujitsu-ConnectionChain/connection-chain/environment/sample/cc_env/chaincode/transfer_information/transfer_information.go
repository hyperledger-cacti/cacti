/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * transfer_information.go
 */

// Package
package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
	"time"
)

// Object structure definition

// Conversion rule information
type RuleInfo struct {
	RuleID     string `json:"id"`                       // RuleID
	RuleName   string `json:"ruleName"`                 // Rule Display Name
	From       RuleChainInfo `json:"fromChain"`         // Source Chain Information
	To         RuleChainInfo `json:"toChain"`           // Destination Chain Information
	Rule       string `json:"rule"`                     // Conversion Rule
	Commission string `json:"commission"`
}

// Information of each chain in conversion rule
type RuleChainInfo struct {
	ChainID             string `json:"chainID"`
	AssetType           string `json:"assetType"`
	EscrowAccountID     string `json:"escrowAccountID,omitempty"` // Used in "fromChain" Only
	SettlementAccountID string `json:"settlementAccountID"`       // ID of the representative account of end-chain
}

// Asset transfer transaction information
type TxInfo struct {
	TxID       string `json:"id"`               // transaction ID of ConnectionChain
	UserID     string `json:"userID"`           // ID of the ConnectionChain user who requested the asset transfer
	RuleID     string `json:"ruleID"`           // The ID of the conversion rule to apply
	From       TxChainInfo `json:"fromChain"`   // Source Chain Information
	To         TxChainInfo `json:"toChain"`     // Destination chain Information
	Progress   string `json:"progress"`         // transfer status
	Timestamps TxTimestamps `json:"timestamps"`
}

// chain-specific information in asset transfer transactions
type TxChainInfo struct {
	ChainID             string `json:"chainID"`
	AccountID           string `json:"accountID"`
	AssetType           string `json:"assetType"`
	Asset               string `json:"asset"`                     // The amount of asset transfer or ID in the end-chain (depending on the type)
	EscrowAccountID     string `json:"escrowAccountID,omitempty"` // Used in "fromChain" Only
	SettlementAccountID string `json:"settlementAccountID"`       // ID of the representative account of end-chain
	EscrowEvID          string `json:"escrowEvID,omitempty"`      // Escrow Request Event ID (Used in "fromChain" Only)
	SettlementEvID      string `json:"settlementEvID,omitempty"`  // Event ID of the freeze or direct freeze request (Used in "fromChain" Only)
	RestoreEvID         string `json:"restoreEvID,omitempty"`     // Recover Request event ID (Used in "fromChain" Only)
	PaymentEvID         string `json:"paymentEvID,omitempty"`     // payment Request Event ID (Used in "toChain" Only)
}

// Timestamp information in the asset transfer transaction
type TxTimestamps struct {
	Create              string `json:"create"`                        // date of asset transfer transaction created
	RequestMargin       string `json:"requestMargin,omitempty"`       // date of "EscrowEvID" recorded
	FixedMargin         string `json:"fixedMargin,omitempty"`         // date of Escrow Commitment status recorded
	FailedMargin        string `json:"failedMargin,omitempty"`        // date of Escrow Failure status recorded
	RequestDirectFreeze string `json:"requestDirectFreeze,omitempty"` // date of "SettlementEvID" recorded (direct freeze)
	FixedDirectFreeze   string `json:"fixedDirectFreeze,omitempty"`   // date of Direct Freeze Commitment status recorded
	FailedDirectFreeze  string `json:"failedDirectFreeze,omitempty"`  // date of Direct Freeze Failure status recorded
	RequestCredit       string `json:"requestCredit,omitempty"`       // date of  "PaymentEvID" recorded
	FixedCredit         string `json:"fixedCredit,omitempty"`         // date of Payment Commitment status recorded
	FailedCredit        string `json:"failedCredit,omitempty"`        // date of Payment Failure status recorded
	RequestRecovery     string `json:"requestRecovery,omitempty"`     // date of "RestoreEvID" recorded
	FixedRecovery       string `json:"fixedRecovery,omitempty"`       // date of Recovery Commitment status recorded
	RequestFreeze       string `json:"requestFreeze,omitempty"`       // date of "SettlementEvID" recorded(freeze)
	FixedFreeze         string `json:"fixedFreeze,omitempty"`         // date of Freeze Commitment status recorded
}

// Asset transfer transaction information (Used Internal)
// Basic information
type TxBaseInfo struct {
	TxID       string      // transaction ID of ConnectionChain
	UserID     string      // ID of the ConnectionChain user who requested the asset transfer
	RuleID     string      // ID of the conversion rule to apply
	From       TxChainInfo // Source chain information
	To         TxChainInfo // Destination chain information
	CreateTime string      // date of asset transfer transaction created
}


// constant definition

// transformation rule information storage object
const RULE_INFO = "rule_info"

// asset transfer transaction information storage object
const TX_INFO = "tx_info"

// asset transfer transaction ID storage object
const TX_ID = "tx_id"

// Counter for conversion rule ID numbering
const LAST_INDEX = "last_rule_id"

// progress of the asset transfer transaction
// other than INIT and COMPLETE, this is also name of timestamp storage field of asset transfer transaction information
const INIT =         "initial"             // initial state
const MARGIN_REQ =   "requestMargin"       // Escrow request on Source End-chain
const MARGIN_FIX =   "fixedMargin"         // Escrow commitment on Source End-chain
const MARGIN_ERR =   "failedMargin"        // Escrow failure on Source End-chain (Used in Escrow transaction: Transfer process ends)
const DIRECT_REQ =   "requestDirectFreeze" // Direct freeze request on Source End-chain
const DIRECT_FIX =   "fixedDirectFreeze"   // Direct freeze commitment on Source End-chain
const DIRECT_ERR =   "failedDirectFreeze"  // Direct freeze failure on Source End-chain (Used in NonEscrow transaction: Transfer process ends)
const CREDIT_REQ =   "requestCredit"       // Payment request on Destination End-chain
const CREDIT_FIX =   "fixedCredit"         // Payment commitment on Destination End-chain (Used in NonEscrow transaction: Transfer process ends)
const CREDIT_ERR =   "failedCredit"        // Payment failure on Destination End-chain
const RECOVERY_REQ = "requestRecovery"     // Recover request on Source End-chain
const RECOVERY_FIX = "fixedRecovery"       // Recovery commitment on Source End-chain  (transfer process ends)
const FREEZE_REQ =   "requestFreeze"       // Freeze request on Source End-chain
const FREEZE_FIX =   "fixedFreeze"         // Freeze commitment on Source End-chain (Used in Escrow transaction: Transfer process ends)
const COMPLETE =     "complete"            // complete state

// Basic information storage field name of asset transfer transaction information (Internal)
const BASE_INFO = "base_info"

// End-chain side event ID storage field name of asset transfer transaction information (Internal)
const ESCROW_ID     = "escrowEvID"     // event ID of escrow request
const PAYMENT_ID    = "paymentEvID"    // event ID of payment request
const RESTORE_ID    = "restoreEvID"    // event ID of recover request
const SETTLEMENT_ID = "settlementEvID" // event ID of freeze request
// asset transfer transaction information name of the field to be stored when updating the asset information
const FROM_ASSET    = "fromAsset"      // post-update asset information for the source End-chain
const TO_ASSET      = "toAsset"        // post-update asset information for the destination End-chain

// Timestamp format
const TIME_FORMAT = "20060102T150405"

// Chaincode structure definition
type TransferInformation struct {
}

// Chaincode initialization function
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @param {string} function
 * @param {[]string} args
 * @return {pb.Response}
**/
func (cc *TransferInformation) Init(stub shim.ChaincodeStubInterface) pb.Response {
	// Store initial value 0 only if conversion rule ID numbering counter is not set
	getBytes, err := stub.GetState(LAST_INDEX)
	if err != nil {
		return shim.Error("[Init] GetState operation failed. " + err.Error())
	}
	if getBytes == nil {
		err = stub.PutState(LAST_INDEX, []byte(strconv.Itoa(0)))
		if err != nil {
			return shim.Error("[Init] PutState operation failed. " + err.Error())
		}
	}

	return shim.Success(nil)
}

// Invoke query interface in chaincode
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @param {string} function Execution function
 * @param {[]string} args Arguments to pass to the function
 * @return {pb.Response} 
**/
func (cc *TransferInformation) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	function, args := stub.GetFunctionAndParameters()
	switch function {
// Invoke function for conversion rule information
	case "addRuleInfo":
		return addRuleInfo(stub, args)
	case "updateRuleInfo":
		return updateRuleInfo(stub, args)
	case "deleteRuleInfo":
		return deleteRuleInfo(stub, args)
// Query function for conversion rule information
	case "getRuleInfo":
		return getRuleInfo(stub, args)
	case "getRuleInfoList":
		return getRuleInfoList(stub, args)

// Invoke function for asset transfer transaction information
	case "createTransferTransaction":
		return createTransferTransaction(stub, args)
	case "updateTransferTransaction":
		return updateTransferTransaction(stub, args)
// Query function for asset transfer transaction information
	case "getTransferTransaction":
		return getTransferTransaction(stub, args)
	case "getTransferTransactionList":
		return getTransferTransactionList(stub, args)

	default:
		return shim.Error("Unkown operation.")
	}
}

/***** Invoke internal functions *****/

// Add conversion rule information
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @param {[]string} args Content of conversion rule information to add
 *          - args[0]  : Display name of the rule
 *          - args[1]  : Chain ID of Source End-chain
 *          - args[2]  : Chain ID of Destination End-chain
 *          - args[3]  : Type of asset on Source End-chain
 *          - args[4]  : Type of asset on Destination End-chain
 *          - args[5]  : ID of Escrow account to be used in Source End-chain. Specify an empty character in Non-Escrow transaction.
 *          - args[6]  : ID of Representative account to be used in Source End-chain.
 *          - args[7]  : ID of Representative account to be used in Destination End-chain.
 *          - args[8]  : conversion rule
 *          - args[9]  : Charge
 * @return {pb.Response}
**/
func addRuleInfo(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	// Error if number of args is not 10
	if len(args) != 10 {
		return shim.Error("[addRuleInfo] Incorrect number of arguments. Expecting 10")
	}

	ruleName := args[0]
	fromChainID := args[1]
	toChainID := args[2]
	fromAssetType := args[3]
	toAssetType := args[4]
	fromEscrowAccountID := args[5]
	fromSettlementAccountID := args[6]
	toSettlementAccountID := args[7]
	rule := args[8]
	commission := args[9]

	// Get conversion rule ID
	indexBytes, err := stub.GetState(LAST_INDEX)
	if err != nil {
		return shim.Error("[addRuleInfo#ID] GetState operation failed. " + err.Error())
	}
	indexStr := string(indexBytes)
	index, err := strconv.Atoi(indexStr)
	if err != nil {
		return shim.Error("[addRuleInfo#ID] strconv operation failed. " + err.Error())
	}

	// Composite key generation
	key, err := stub.CreateCompositeKey(RULE_INFO, []string{indexStr})
	if err != nil {
		return shim.Error("[addRuleInfo] CreateCompositeKey operation failed. " + err.Error())
	}

	// Update conversion rule ID numbering counter by + 1
	err = stub.PutState(LAST_INDEX, []byte(strconv.Itoa(index + 1)))
	if err != nil {
		return shim.Error("[addRuleInfo#ID] PutState operation failed. " + err.Error())
	}

	// JSON style object data creation
	fromInfo := RuleChainInfo{fromChainID, fromAssetType, fromEscrowAccountID, fromSettlementAccountID}
	toInfo := RuleChainInfo{toChainID, toAssetType, "", toSettlementAccountID}
	ruleInfo := &RuleInfo{indexStr, ruleName, fromInfo, toInfo, rule, commission}
	jsonBytes, err := json.Marshal(ruleInfo)
	if err != nil {
		return shim.Error("[addRuleInfo] Marshal operation failed. " + err.Error())
	}

	// Register in World State
	err = stub.PutState(key, jsonBytes)
	if err != nil {
		return shim.Error("[addRuleInfo] PutState operation failed. " + err.Error())
	}
	// Return conversion rule ID
	return shim.Success(indexBytes)
}

// Update conversion rule information
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @param {[]string} args Content of conversion rule information to update.
 *          - args[0]  : conversion rule ID
 *          - args[1]  : Display name of the rule
 *          - args[2]  : Chain ID of Source End-chain
 *          - args[3]  : Chain ID of Destination End-chain
 *          - args[4]  : Type of asset in Source End-chain
 *          - args[5]  : Type of asset in Destination End-chain
 *          - args[6]  : ID of Escrow account used in Source End-chain
 *          - args[7]  : ID of representative account used in Source End-chain
 *          - args[8]  : ID of representative account used in Destination End-chain
 *          - args[9]  : conversion rule
 *          - args[10] : Charge
 *          - args[11] : Optional value. Delete Escrow account ID when non-empty string is specified.
 * @return {pb.Response}
**/
func updateRuleInfo(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	// Error if number of args is not 12
	if len(args) != 12 {
		return shim.Error("[updateRuleInfo] Incorrect number of arguments. Expecting 12")
	}

	ruleID := args[0]
	ruleName := args[1]
	fromChainID := args[2]
	toChainID := args[3]
	fromAssetType := args[4]
	toAssetType := args[5]
	fromEscrowAccountID := args[6]
	fromSettlementAccountID := args[7]
	toSettlementAccountID := args[8]
	rule := args[9]
	commission := args[10]
	removeEscrow := args[11]

	// Composite key generation
	key, err := stub.CreateCompositeKey(RULE_INFO, []string{ruleID})
	if err != nil {
		return shim.Error("[updateRuleInfo] CreateCompositeKey operation failed. " + err.Error())
	}

	// Check if registered information exists
	getBytes, err := stub.GetState(key)
	if err != nil {
		return shim.Error("[updateRuleInfo] GetState operation failed. " + err.Error())
	}
	if getBytes == nil {
		// Returns success with null if not registered
		fmt.Printf("This rule is not yet registered. RuleID = %s", ruleID)
		return shim.Success(nil)
	}

	// Overwrite the registered information
	var ruleInfo RuleInfo
	err = json.Unmarshal(getBytes, &ruleInfo)
	if err != nil {
		return shim.Error("Error unmarshaling JSON: " + err.Error())
	}

	// Do not update empty fields
	if ruleName != "" {
		ruleInfo.RuleName = ruleName
	}
	if fromChainID != "" {
		ruleInfo.From.ChainID = fromChainID
	}
	if toChainID != "" {
		ruleInfo.To.ChainID = toChainID
	}
	if fromAssetType != "" {
		ruleInfo.From.AssetType = fromAssetType
	}
	if toAssetType != "" {
		ruleInfo.To.AssetType = toAssetType
	}
	if fromEscrowAccountID != "" {
		ruleInfo.From.EscrowAccountID = fromEscrowAccountID
	}
	if fromSettlementAccountID != "" {
		ruleInfo.From.SettlementAccountID = fromSettlementAccountID
	}
	if toSettlementAccountID != "" {
		ruleInfo.To.SettlementAccountID = toSettlementAccountID
	}
	if rule != "" {
		ruleInfo.Rule = rule
	}
	if commission != "" {
		ruleInfo.Commission = commission
	}
	if removeEscrow != "" {
		// Update the escrow account to an empty string to stop the escrow process
		ruleInfo.From.EscrowAccountID = ""
	}

	jsonBytes, err := json.Marshal(ruleInfo)
	if err != nil {
		return shim.Error("[updateRuleInfo] Marshal operation failed. " + err.Error())
	}

	// Register in World State
	err = stub.PutState(key, jsonBytes)
	if err != nil {
		return shim.Error("[updateRuleInfo] PutState operation failed. " + err.Error())
	}
	// Return ID on update success
	return shim.Success([]byte(ruleID))
}

// Register asset transfer transaction information
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @param {[]string} args Contents of asset transfer transaction information to add
 *          - args[0]  : Transaction ID of ConnectionChain
 *          - args[1]  : ID of ConnectionChain user who requested asset transfer
 *          - args[2]  : ID of conversion rule to apply
 *          - args[3]  : Chain ID of Source End-chain
 *          - args[4]  : ID of source account
 *          - args[5]  : Asset type of source account
 *          - args[6]  : Amount or ID of asset to be transferred in source account
 *          - args[7]  : ID of Escrow account used in Source End-chain
 *          - args[8]  : ID of Representative account used in Source End-chain
 *          - args[9]  : Chain ID of Destination End-chain
 *          - args[10] : ID of destination account
 *          - args[11] : Asset type of destination account
 *          - args[12] : Amount or ID of asset to be transferred in destination account
 *          - args[13] : ID of Representative account used in Destination End-chain
 *          - args[14] : Transaction creation time (YYYYMMDDDThhmmss)
 * @return {pb.Response}
**/
func createTransferTransaction(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	// Error if number of args is not 15
	if len(args) != 15 {
		return shim.Error("[createTransferTransaction] Incorrect number of arguments. Expecting 15")
	}

	txID := args[0]
	userID := args[1]
	ruleID := args[2]
	fromChainID := args[3]
	fromAccountID := args[4]
	fromAssetType := args[5]
	fromAsset := args[6]
	fromEscrowAccountID := args[7]
	fromSettlementAccountID := args[8]
	toChainID := args[9]
	toAccountID := args[10]
	toAssetType := args[11]
	toAsset := args[12]
	toSettlementAccountID := args[13]
	createTime := args[14]


	// Composite key generation (basic information about asset transfer transactions)
	key, err := stub.CreateCompositeKey(TX_INFO, []string{txID, BASE_INFO})
	if err != nil {
		return shim.Error("[createTransferTransaction] CreateCompositeKey operation failed. " + err.Error())
	}
	// Check if registered information exists
	getBytes, err := stub.GetState(key)
	if err != nil {
		return shim.Error("[createTransferTransaction] GetState operation failed. " + err.Error())
	}
	if getBytes != nil {
		//Return success with null if ID already exists
		fmt.Printf("This transaction is already registered. TransactionID = %s", txID)
		return shim.Success(nil)
	}

	// Error if date/time format is incorrect
	_, err = time.Parse(TIME_FORMAT, createTime)
	if err != nil {
		msg := fmt.Sprintf("Invalid timestamp format. [%s]", createTime)
		return shim.Error(msg)
	}

	// JSON style object data creation
	fromInfo := TxChainInfo{fromChainID, fromAccountID, fromAssetType, fromAsset, fromEscrowAccountID, fromSettlementAccountID, "", "", "", ""}
	toInfo := TxChainInfo{toChainID, toAccountID, toAssetType, toAsset, "", toSettlementAccountID, "", "", "", ""}
	txInfo := &TxBaseInfo{txID, userID, ruleID, fromInfo, toInfo, createTime}
	jsonBytes, err := json.Marshal(txInfo)
	if err != nil {
		return shim.Error("[createTransferTransaction] Marshal operation failed. " + err.Error())
	}

	// Register in World State
	// Composite key generation (For TxID list)
	idKey, err := stub.CreateCompositeKey(TX_ID, []string{txID})
	if err != nil {
		return shim.Error("[createTransferTransaction#ID] CreateCompositeKey operation failed. " + err.Error())
	}
	err = stub.PutState(idKey, []byte(txID))
	if err != nil {
		return shim.Error("[createTransferTransaction#ID] PutState operation failed. " + err.Error())
	}
	err = stub.PutState(key, jsonBytes)
	if err != nil {
		return shim.Error("[createTransferTransaction] PutState operation failed. " + err.Error())
	}

	// Return ID on successful registration
	return shim.Success([]byte(txID))
}

// Update asset transfer transaction information
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @param {[]string} args Contents of asset transfer transaction information to add
 *          - args[0] : Transaction ID of ConnectionChain
 *          - args[1] : Progress of the asset transfer transaction information
 *          - args[2] : ID of event requested to perform on End-chain
 *                      Specify an empty string for anything other than status "fixedMargin", "requestDirectFreeze", "requestMargin", "fixedDirectFreeze",
 *                      "requestCredit", "requestRecovery", or "requestFreeze".
 *                      (Ignores non-empty characters)
 *                      In "requestMargin" and "fixedMargin" and "requestDirectFreeze" and "fixedDirectFreeze"
 *                      they must only be specified as either request or fixed.
 *          - args[3] : Asset transfer amount  or transferred Asset ID to be updated
 *          - args[4] : Updated time (YYYYMMDDDThhmmss)
 * @return {pb.Response}
**/
func updateTransferTransaction(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	// Error if number of args is not 5
	if len(args) != 5 {
		return shim.Error("[updateTransferTransaction] Incorrect number of arguments. Expecting 5")
	}

	txID := args[0]
	status := args[1]
	evID := args[2]
	updateAsset := args[3]
	updateTime := args[4]

	// Error if date/time format is incorrect
	_, err := time.Parse(TIME_FORMAT, updateTime)
	if err != nil {
		msg := fmt.Sprintf("Invalid timestamp format. [%s]", updateTime)
		return shim.Error(msg)
	}

	// Get one asset transfer transaction information
	getBytes, err := getTxFieldInfo(stub, txID, BASE_INFO)
	if err != nil {
		return shim.Error(err.Error())
	}
	if getBytes == nil {
		// Return success with null if not registered
		return shim.Success(nil)
	}

	// set the value in the field according to the specified state
	tsField := status
	idField := ""
	assetField := FROM_ASSET

	switch status {
	case MARGIN_REQ:
		idField = ESCROW_ID
	case MARGIN_FIX:
		idField = ESCROW_ID
	case MARGIN_ERR:
	case DIRECT_REQ:
		idField = SETTLEMENT_ID
	case DIRECT_FIX:
		idField = SETTLEMENT_ID
	case DIRECT_ERR:
	case CREDIT_REQ:
		idField = PAYMENT_ID
		assetField = TO_ASSET
	case CREDIT_FIX:
		assetField = TO_ASSET
	case CREDIT_ERR:
		assetField = TO_ASSET
	case RECOVERY_REQ:
		idField = RESTORE_ID
	case RECOVERY_FIX:
	case FREEZE_REQ:
		idField = SETTLEMENT_ID
	case FREEZE_FIX:
	default:
		return shim.Error("Unkown progress.")
	}

	// ID registration of events performed in End-chain
	if idField != "" && evID != "" {
		// Composite key generation
		key, err := stub.CreateCompositeKey(TX_INFO, []string{txID, idField})
		if err != nil {
			return shim.Error("[updateTransferTransaction#evID] CreateCompositeKey operation failed. " + err.Error())
		}
		// Register in World State
		err = stub.PutState(key, []byte(evID))
		if err != nil {
			return shim.Error("[updateTransferTransaction#evID] PutState operation failed. " + err.Error())
		}
	}

	// Set asset transfer amount or ID update information (only if it is not set in the registration of asset transfer transaction information)
	if updateAsset != "" {
		var getInfo TxBaseInfo
		err = json.Unmarshal(getBytes, &getInfo)
		if err != nil {
			return shim.Error("[updateTransferTransaction#Asset] Error unmarshaling JSON: " + err.Error())
		}
		baseAsset := getInfo.From.Asset
		if assetField != FROM_ASSET {
			baseAsset = getInfo.To.Asset
		}
		if baseAsset == "" {
			// Composite key generation
			key, err := stub.CreateCompositeKey(TX_INFO, []string{txID, assetField})
			if err != nil {
				return shim.Error("[updateTransferTransaction#Asset] CreateCompositeKey operation failed. " + err.Error())
			}
			// Register in World State
			err = stub.PutState(key, []byte(updateAsset))
			if err != nil {
				return shim.Error("[updateTransferTransaction#Asset] PutState operation failed. " + err.Error())
			}
		}
	}

	// Register timestamp
	// Composite key generation
	key, err := stub.CreateCompositeKey(TX_INFO, []string{txID, tsField})
	if err != nil {
		return shim.Error("[updateTransferTransaction#Timestamp] CreateCompositeKey operation failed. " + err.Error())
	}
	// Register in World State
	err = stub.PutState(key, []byte(updateTime))
	if err != nil {
		return shim.Error("[updateTransferTransaction#Timestamp] PutState operation failed. " + err.Error())
	}
	// Return ID on update success
	return shim.Success([]byte(txID))
}

// Remove conversion rule information
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @param {string} args ID of conversion rule information to delete
 *          - args[0] : ID
 * @return {pb.Response}
**/
func deleteRuleInfo(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	// Error if number of args is not 1
	if len(args) != 1 {
		return shim.Error("[deleteRuleInfo] Incorrect number of arguments. Expecting 1")
	}

	ruleID := args[0]

	// Composite key generation
	key, err := stub.CreateCompositeKey(RULE_INFO, []string{ruleID})
	if err != nil {
		return shim.Error("[deleteRuleInfo] CreateCompositeKey operation failed. " + err.Error())
	}

	// remove the data from world state
	err = stub.DelState(key)
	if err != nil {
		return shim.Error("[deleteRuleInfo] DelState operation failed. " + err.Error())
	}
	return shim.Success(nil)
}

/***** Internal query functions *****/

// Get single conversion rule info
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @param {string} args ID of conversion rule information to get
 *          - args[0] : ID
 * @return {pb.Response}
**/
func getRuleInfo(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	// Error if number of args is not 1
	if len(args) != 1 {
		return shim.Error("[getRuleInfo] Incorrect number of arguments. Expecting 1")
	}

	ruleID := args[0]

	// Composite key generation
	key, err := stub.CreateCompositeKey(RULE_INFO, []string{ruleID})
	if err != nil {
		return shim.Error("[getRuleInfo] CreateCompositeKey operation failed. " + err.Error())
	}

	// Check if registered information exists
	getBytes, err := stub.GetState(key)
	if err != nil {
		return shim.Error("[getRuleInfo] GetState operation failed. " + err.Error())
	}
	if getBytes == nil {
		// Return success with null if not registered
		fmt.Printf("This rule is not yet registered. RuleID = %s", ruleID)
		return shim.Success(nil)
	}
	// Return the retrieved content as is
	return shim.Success(getBytes)
}

// Get single asset transfer transaction information
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @param {string} args ID of asset transfer transaction information to get
 *          - args[0] : ID
 * @return {pb.Response}
**/
func getTransferTransaction(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	// Error if number of args is not 1
	if len(args) != 1 {
		return shim.Error("[getTransferTransaction] Incorrect number of arguments. Expecting 1")
	}

	txID := args[0]
	txInfo, _, err := getTxInfo(stub, txID)
	if err != nil {
		return shim.Error(err.Error())
	}
	if txInfo == nil {
		// Return success with null if not registered
		return shim.Success(nil)
	}

	// convert to json format and return
	marshalledInfo, err := json.Marshal(txInfo)
	if err != nil {
		return shim.Error("[getTransferTransaction] Marshal operation failed. " + err.Error())
	}
	return shim.Success([]byte(marshalledInfo))
}

// Get conversion rule info list
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @param {string} args Filtering condition of conversion rule information 
 *                      If an empty character is specified, no filtering is performed under that condition.
 *          - args[0] : Chain ID of Source End-chain
 *          - args[1] : Chain ID of Destination End-chain
 * @return {pb.Response}
**/
func getRuleInfoList(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	// Error if number of args is not 2
	if len(args) != 2 {
		return shim.Error("[getRuleInfoList] Incorrect number of arguments. Expecting 2")
	}

	fromChainID := args[0]
	toChainID := args[1]

	// Retrieve with partial composite key (Specify object name only)
	iter, err := stub.GetStateByPartialCompositeKey(RULE_INFO, []string{})
	if err != nil {
		return shim.Error("[getRuleInfoList] GetStateByPartialCompositeKey operation failed. " + err.Error())
	}
	defer iter.Close()

	// Obtains sequentially from Iterator and stores in results
	var results []RuleInfo
	for iter.HasNext() {
		qr, err := iter.Next()
		if err != nil {
			return shim.Error("[getRuleInfoList] Iterator.Next operation failed. " + err.Error())
		}

		// Parse the registered transformation rule information
		var info RuleInfo
		err = json.Unmarshal(qr.Value, &info)
		if err != nil {
			return shim.Error("[getRuleInfoList] Error unmarshaling JSON: " + err.Error())
		}

		// Filter by chain ID of source End-chain
		if fromChainID != "" && fromChainID != info.From.ChainID {
			continue
		}

		// Filter by chain ID of destination End-chain
		if toChainID != "" && toChainID != info.To.ChainID {
			continue
		}

		results = append(results, info)
	}

	// convert results to json format and return
	marshalledResults, err := json.Marshal(results)
	if err != nil {
		return shim.Error("[getRuleInfoList] Marshal operation failed. " + err.Error())
	}
	return shim.Success([]byte(marshalledResults))
}

// Get Asset Transfer Transaction Information List
/**
 * @param {shim.ChaincodeStubInterface} stub
 * @param {string} args Filtering condition of Asset Transfer Transaction Information to get
 *                      If an empty character is specified, no filtering is performed under that condition.
 *          - args[0] : ID of the ConnectionChain user who requested the asset transfer
 *          - args[1] : Progress of Asset transfer
 *          - args[2] : Creation Date (Before the specified date)
 *          - args[3] : Creation Date (After the specified date)
 *          - args[4] : Update Date (Before the specified date)
 *          - args[5] : Update Date (After the specified date)
 * @return {pb.Response}
**/
func getTransferTransactionList(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	// Error if number of args is not 6
	if len(args) != 6 {
		return shim.Error("[getTransferTransactionList] Incorrect number of arguments. Expecting 6")
	}

	userID := args[0]
	progress := args[1]
	createdBefore := time.Now()
	createdAfter := time.Now()
	updatedBefore := time.Now()
	updatedAfter := time.Now()
	cbStr := args[2]
	caStr := args[3]
	ubStr := args[4]
	uaStr := args[5]
	var parseErr error

	if cbStr != "" {
		createdBefore, parseErr = time.Parse(TIME_FORMAT, cbStr)
		if parseErr != nil {
			msg := fmt.Sprintf("Invalid timestamp format. [%s]", cbStr)
			return shim.Error(msg)
		}
	}

	if caStr != "" {
		createdAfter, parseErr = time.Parse(TIME_FORMAT, caStr)
		if parseErr != nil {
			msg := fmt.Sprintf("Invalid timestamp format. [%s]", caStr)
			return shim.Error(msg)
		}
	}

	if ubStr != "" {
		updatedBefore, parseErr = time.Parse(TIME_FORMAT, ubStr)
		if parseErr != nil {
			msg := fmt.Sprintf("Invalid timestamp format. [%s]", ubStr)
			return shim.Error(msg)
		}
	}

	if uaStr != "" {
		updatedAfter, parseErr = time.Parse(TIME_FORMAT, uaStr)
		if parseErr != nil {
			msg := fmt.Sprintf("Invalid timestamp format. [%s]", uaStr)
			return shim.Error(msg)
		}
	}
	
	// Get Asset Transfer Transaction ID List
	// Retrieve with partial composite key (Specify object name only)
	iter, err := stub.GetStateByPartialCompositeKey(TX_ID, []string{})
	if err != nil {
		return shim.Error("[getTransferTransactionList] GetStateByPartialCompositeKey operation failed. " + err.Error())
	}
	defer iter.Close()

	// Get IDs sequentially from iterator
	// Retrieve asset transfer transaction information with acquired ID and store it in results
	var results []TxInfo
	for iter.HasNext() {
		qr, err := iter.Next()
		if err != nil {
			return shim.Error("[getTransferTransactionList] Iterator.Next operation failed. " + err.Error())
		}
		txID := string(qr.Value)

		// Get one asset transfer transaction information
		info, lastUpdate, err := getTxInfo(stub, txID)
		if err != nil {
			return shim.Error(err.Error())
		}

		// Filter by User ID
		if userID != "" && userID != info.UserID {
			continue
		}

		// Filter by Progress
		if progress != "" && progress != info.Progress {
			continue
		}

		// Filter by Creation Date
		// (Parse check has ended at the time of registration, so there is no error here)
		createTime, _ := time.Parse(TIME_FORMAT, info.Timestamps.Create)

		if cbStr != "" && createTime.After(createdBefore) {
			continue
		}
		if caStr != "" && createTime.Before(createdAfter) {
			continue
		}

		// Filter by Update Date
		updateTime, _ := time.Parse(TIME_FORMAT, lastUpdate)
		if ubStr != "" && updateTime.After(updatedBefore) {
			continue
		}
		if uaStr != "" && updateTime.Before(updatedAfter) {
			continue
		}

		results = append(results, *info)
	}

	// convert results to json format and return
	marshalledResults, err := json.Marshal(results)
	if err != nil {
		return shim.Error("[getTransferTransactionList] Marshal operation failed. " + err.Error())
	}
	return shim.Success([]byte(marshalledResults))
}

// Get one asset transfer transaction information
func getTxInfo(stub shim.ChaincodeStubInterface, txID string) (*TxInfo, string, error) {
	// Prepare object for return
	fromInfo := TxChainInfo{"", "", "", "", "", "", "", "", "", ""}
	toInfo := TxChainInfo{"", "", "", "", "", "", "", "", "", ""}
	timestamps := TxTimestamps{"", "", "", "", "", "", "", "", "", "", "", "", "", ""}
	txInfo := TxInfo{txID, "", "", fromInfo, toInfo, INIT, timestamps}

	// for return of last updated date
	lastUpdate := ""

	// Get the individual information belonging to txID and stuff it into return object
	// Basic information
	getBytes, err := getTxFieldInfo(stub, txID, BASE_INFO)
	if err != nil {
		return nil, "", err
	}
	if getBytes != nil {
		var getInfo TxBaseInfo
		err = json.Unmarshal(getBytes, &getInfo)
		if err != nil {
			msg := fmt.Sprintf("[getTxInfo] Error unmarshaling JSON: " + err.Error())
			return nil, "", errors.New(msg)
		}
		txInfo.UserID = getInfo.UserID
		txInfo.RuleID = getInfo.RuleID
		txInfo.From = getInfo.From
		txInfo.To = getInfo.To
		txInfo.Timestamps.Create = getInfo.CreateTime
		lastUpdate = getInfo.CreateTime
	} else {
		// If basic information is not registered, both transaction information and error are returned in null state.
		fmt.Printf("This transaction is not yet registered. TransactionID = %s", txID)
		return nil, "", nil
	}

	// If there is an update of the asset, set it to the return contents
	getBytes, err = getTxFieldInfo(stub, txID, FROM_ASSET)
	if err != nil {
		return nil, "", err
	}
	if getBytes != nil {
		txInfo.From.Asset = string(getBytes)
	}
	getBytes, err = getTxFieldInfo(stub, txID, TO_ASSET)
	if err != nil {
		return nil, "", err
	}
	if getBytes != nil {
		txInfo.To.Asset = string(getBytes)
	}


	// state transition changes with or without escrow
	// * Escrow: Escrow -> Payment -> Freeze (or Recovery)
	// * Non-Escrow: Freeze -> Payment (-> Recovery)
	isEscrow := true
	if txInfo.From.EscrowAccountID == "" {
		isEscrow = false
	}

	if isEscrow {
		// Recorded time of Ecrow request EvID
		getBytes, err = getTxFieldInfo(stub, txID, MARGIN_REQ)
		if err != nil {
			return nil, "", err
		}
		if getBytes != nil {
			lastUpdate = string(getBytes)
			txInfo.Timestamps.RequestMargin = lastUpdate
			// Recorded Escrow request EvID
			getBytes, err = getTxFieldInfo(stub, txID, ESCROW_ID)
			if err != nil {
				return nil, "", err
			}
			if getBytes != nil {
				txInfo.From.EscrowEvID = string(getBytes)
			}
			txInfo.Progress = MARGIN_REQ
		}

		// Record time of Escrow commitment status
		getBytes, err = getTxFieldInfo(stub, txID, MARGIN_FIX)
		if err != nil {
			return nil, "", err
		}
		if getBytes != nil {
			lastUpdate = string(getBytes)
			txInfo.Timestamps.FixedMargin = lastUpdate
			txInfo.Progress = MARGIN_FIX
		}

		// Record time of Escrow failure status
		getBytes, err = getTxFieldInfo(stub, txID, MARGIN_ERR)
		if err != nil {
			return nil, "", err
		}
		if getBytes != nil {
			lastUpdate = string(getBytes)
			txInfo.Timestamps.FailedMargin = lastUpdate
			txInfo.Progress = MARGIN_ERR
		}

	} else {

		// Recorded time of Direct freeze request EvID
		getBytes, err = getTxFieldInfo(stub, txID, DIRECT_REQ)
		if err != nil {
			return nil, "", err
		}
		if getBytes != nil {
			lastUpdate = string(getBytes)
			txInfo.Timestamps.RequestDirectFreeze = lastUpdate
			txInfo.Progress = DIRECT_REQ
			// Recorded freeze request EvID
			getBytes, err = getTxFieldInfo(stub, txID, SETTLEMENT_ID)
			if err != nil {
				return nil, "", err
			}
			if getBytes != nil {
				txInfo.From.SettlementEvID = string(getBytes)
			}
		}

		// Recorded time of Freeze commitment status
		getBytes, err = getTxFieldInfo(stub, txID, DIRECT_FIX)
		if err != nil {
			return nil, "", err
		}
		if getBytes != nil {
			lastUpdate = string(getBytes)
			txInfo.Timestamps.FixedDirectFreeze = lastUpdate
			txInfo.Progress = DIRECT_FIX
		}

		// Recorded time of Freeze failure status
		getBytes, err = getTxFieldInfo(stub, txID, DIRECT_ERR)
		if err != nil {
			return nil, "", err
		}
		if getBytes != nil {
			lastUpdate = string(getBytes)
			txInfo.Timestamps.FailedDirectFreeze = lastUpdate
			txInfo.Progress = DIRECT_ERR
		}

	}

	// Recorded time of Payment request EvID
	getBytes, err = getTxFieldInfo(stub, txID, CREDIT_REQ)
	if err != nil {
		return nil, "", err
	}
	if getBytes != nil {
		lastUpdate = string(getBytes)
		txInfo.Timestamps.RequestCredit = lastUpdate
		txInfo.Progress = CREDIT_REQ
		// Recorded Payment Request EvID
		getBytes, err = getTxFieldInfo(stub, txID, PAYMENT_ID)
		if err != nil {
			return nil, "", err
		}
		if getBytes != nil {
			txInfo.To.PaymentEvID = string(getBytes)
		}
	}

	// Recorded time of Payment commitment status
	getBytes, err = getTxFieldInfo(stub, txID, CREDIT_FIX)
	if err != nil {
		return nil, "", err
	}
	if getBytes != nil {
		lastUpdate = string(getBytes)
		txInfo.Timestamps.FixedCredit = lastUpdate
		if isEscrow {
			txInfo.Progress = CREDIT_FIX
		} else {
			// Complete here if non-escrow transaction
			txInfo.Progress = COMPLETE
		}
	}

	// Recorded time of Payment failure status
	getBytes, err = getTxFieldInfo(stub, txID, CREDIT_ERR)
	if err != nil {
		return nil, "", err
	}
	if getBytes != nil {
		lastUpdate = string(getBytes)
		txInfo.Timestamps.FailedCredit = lastUpdate
		txInfo.Progress = CREDIT_ERR
	}

	// Recorded time of Recover request EvID
	getBytes, err = getTxFieldInfo(stub, txID, RECOVERY_REQ)
	if err != nil {
		return nil, "", err
	}
	if getBytes != nil {
		lastUpdate = string(getBytes)
		txInfo.Timestamps.RequestRecovery = lastUpdate
		txInfo.Progress = RECOVERY_REQ
		// Recorded recover request EvID
		getBytes, err = getTxFieldInfo(stub, txID, RESTORE_ID)
		if err != nil {
			return nil, "", err
		}
		if getBytes != nil {
			txInfo.From.RestoreEvID = string(getBytes)
		}
	}

	// Recorded time of Recovery commitment status
	getBytes, err = getTxFieldInfo(stub, txID, RECOVERY_FIX)
	if err != nil {
		return nil, "", err
	}
	if getBytes != nil {
		lastUpdate = string(getBytes)
		txInfo.Timestamps.FixedRecovery = lastUpdate
		txInfo.Progress = RECOVERY_FIX
	}

	if isEscrow {
		// Recorded time of Freeze request EvID
		getBytes, err = getTxFieldInfo(stub, txID, FREEZE_REQ)
		if err != nil {
			return nil, "", err
		}
		if getBytes != nil {
			lastUpdate = string(getBytes)
			txInfo.Timestamps.RequestFreeze = lastUpdate
			txInfo.Progress = FREEZE_REQ
			// Recorded freeze request EvID
			getBytes, err = getTxFieldInfo(stub, txID, SETTLEMENT_ID)
			if err != nil {
				return nil, "", err
			}
			if getBytes != nil {
				txInfo.From.SettlementEvID = string(getBytes)
			}
		}

		// Recorded time of Freeze commitment status
		getBytes, err = getTxFieldInfo(stub, txID, FREEZE_FIX)
		if err != nil {
			return nil, "", err
		}
		if getBytes != nil {
			lastUpdate = string(getBytes)
			txInfo.Timestamps.FixedFreeze = lastUpdate
			// Complete here if escrow transaction
			txInfo.Progress = COMPLETE
		}
	}

	return &txInfo, lastUpdate, nil
}

/***** invoke, query common internal functions *****/
// Get Individual Field Values for Asset Transfer Transaction Information
func getTxFieldInfo(stub shim.ChaincodeStubInterface, txID string, field string) ([]byte, error) {
	// Composite key generation
	key, err := stub.CreateCompositeKey(TX_INFO, []string{txID, field})
	if err != nil {
		return nil, err
	}
	return stub.GetState(key)
}


func main() {
	err := shim.Start(new(TransferInformation))
	if err != nil {
		fmt.Printf("Error starting transferinformation chaincode: %s",err)
	}
}
