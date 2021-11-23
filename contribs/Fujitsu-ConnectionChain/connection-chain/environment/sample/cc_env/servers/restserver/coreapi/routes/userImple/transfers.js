/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * transfers.js
 */

/* Summary:
 * Asset Transfer Transaction Information Management API
*/

var express = require('express');
var config = require('config');
var fabricSdkPost = require("../../lib/common/fabric_v1.0/sdk_if.js");
var CoreAPIError = require('../../lib/common/CoreAPIError.js');
var CoreAPIUtil = require('../../lib/common/CoreAPIUtil.js');
var UserImpleUtil = require('../../lib/userImple/UserImpleUtil.js');
var AssetConverter = require('../../lib/userImple/AssetConverter.js');
var router = express.Router();


/** 
 * Asset transfer transaction information generation
 * @name post
 * @function
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware
 * Request Body:
 * 	{
 * 		"txID" "<<Operation ID>",			- ID of the asset transfer transaction information. The default is set automatically."
 * 		"ruleID": "<Rule ID>",				- ID of the conversion rule to apply
 * 		"fromChain":{						- the sender information
 * 			"chainID": "<Chain ID>",		- ID of the sender EC
 * 			"accountID": "<Account ID>",	- ID of the sender account
 * 			"asset": "<transfer amount>"	- The amount of assets in the sender end-chain. You can specify only one of it or that in the receiver EC.
 * 		},
 * 		"toChain":{							- the receiver information
 * 			"chainID": "<Chain ID>",		- The ID of the receiver EC
 * 			"accountID": "<Account ID>",	- The ID of the receiver account
 * 			"asset": "<transfer amount>"	- The amount of assets in the receiver end-chain. You can specify only one of it or that in the sender EC
 * 		}
 * 	}
 * Response Body:
 * 	{
 * 		"txID": "<Operation ID>"	- ID of the generated asset transfer transaction information
 * 	}
**/
router.post('/', function(req, res, next) {
	var userID = req.header('X-CCUser');
	if (userID == undefined) {
		next(new CoreAPIError(422, 2001));
		return;
	}
	if (!CoreAPIUtil.isValidContentType(req)) {
		next(new CoreAPIError(400, 2000));
		return;
	}

	// TxID can also be specified as a parameter. Generated here if not specified.
	var txID = req.body.txID;
	var timestamp = UserImpleUtil.getTimestampString();
	if (txID == undefined) {
		var date = new Date();
		var ms = ('0' + date.getMilliseconds()).slice(-3);
		txID = timestamp + ms + '_'+ userID;
	}

	var ruleID = req.body.ruleID;
	if (ruleID == undefined) {
		next(new CoreAPIError(422, 2019));
		return;
	}

	if (req.body.fromChain == undefined) {
		next(new CoreAPIError(422, 2024));
		return;
	}
	var fromChain = req.body.fromChain.chainID;
	if (fromChain == undefined) {
		next(new CoreAPIError(422, 2013));
		return;
	}
	var fromAccount = req.body.fromChain.accountID;
	if (fromAccount == undefined) {
		next(new CoreAPIError(422, 2020));
		return;
	}
	if (req.body.toChain == undefined) {
		next(new CoreAPIError(422, 2025));
		return;
	}
	var toChain = req.body.toChain.chainID;
	if (toChain == undefined) {
		next(new CoreAPIError(422, 2015));
		return;
	}
	var toAccount = req.body.toChain.accountID;
	if (toAccount == undefined) {
		next(new CoreAPIError(422, 2021));
		return;
	}
	var fromAsset = req.body.fromChain.asset;
	var toAsset = req.body.toChain.asset;

	var fromEscrowID = '';
	var fromSettlementID = '';
	var toSettlementID = '';

	// Get conversion Rule
	var queryArgs = [ruleID];
	var rule = {};
	fabricSdkPost.queryRequest( config.chainId,
								config.network,
								config.channelName,
								config.chaincodeIDs[0],
								'getRuleInfo',
								queryArgs)
	.then((response) => {
		// Result of getting conversion the rule
		if (response != ''){
			rule = JSON.parse(response);
			if ((rule.fromChain.chainID != fromChain) || (rule.toChain.chainID != toChain)) {
				// The chain ID specified does not match the chain ID defined in the rule
				throw new CoreAPIError(422, 2032);
			}
			// Convert assets according to the rule
			return AssetConverter.convert(rule, fromAsset, toAsset)
		}else{
			// If no conversion rule exists for the given ID
			throw new CoreAPIError(404, 1003);
		}
	})
	.then((output) => {
		// Reflect asset conversion result
		fromAsset = output.fromAsset;
		toAsset = output.toAsset;

		// Reflect parameters from the rule (Transfer Source Esccrow/Representative Account, Transfer Receiver Representative Account) in the Tx information
		fromEscrowID = rule.fromChain.escrowAccountID;
		if (fromEscrowID == undefined) {
			fromEscrowID = '';
		}
		fromSettlementID = rule.fromChain.settlementAccountID;
		toSettlementID = rule.toChain.settlementAccountID;

		// Check duplicated accounts
		// The sender account and the escrow account are the same
		if (fromAccount == fromEscrowID) {
			throw new CoreAPIError(422, 2029);
		}
		// The sender account and the representative account of the sender EC are the same
		if (fromAccount == fromSettlementID) {
			throw new CoreAPIError(422, 2030);
		}
		// The receiver account and the representative account of the receiver EC are the same
		if (toAccount == fromSettlementID) {
			throw new CoreAPIError(422, 2031);
		}

		// request to create asset transfer transaction
		var invokeArgs = [txID, userID, ruleID,
						  fromChain, fromAccount, rule.fromChain.assetType, ''+fromAsset, fromEscrowID, fromSettlementID,
						  toChain, toAccount, rule.toChain.assetType, ''+toAsset, toSettlementID, timestamp];

		return fabricSdkPost.invokeRequest(config.chainId,
										config.network,
										config.channelName,
										config.chaincodeIDs[0],
										'createTransferTransaction',
										invokeArgs)
	})
	.then((response) => {
		// result of request to create asset transfer transaction
		res.header('Content-Type', 'application/json; charset=UTF-8');
		var resObj = {txID:txID};
		res.send(resObj);
	})
	.catch((err) => {
		console.log(err);
		if (err instanceof CoreAPIError) {
			// No conversion rules or error on conversion failure
			next(err);
		} else {
			var detail = err.stack ? err.stack : err;
			next(new CoreAPIError(500, 3000, detail));
		}
	});
});

/** 
 * Get one asset transfer transaction
 * @name get/:id
 * @function
 * @inner
 * @param {string} path - The operation ID to get
 * @param {callback} middleware - Express middleware
 * Response Body:
 * Each event ID and time stamp is displayed only when the corresponding operation is performed.
 * 	{
 * 		"id": "<Operation ID>",
 * 		"userID": "<CC User ID>",					- ID of the user who generated the asset transfer transaction information
 * 		"ruleID": "<Rule ID>",
 * 		"fromChain":{
 * 			"chainID": "<Chain ID>",
 * 			"accountID": "<Account ID>",
 * 			"asset": "<transfer amount>",
 * 			"settlementAccountID": "<Representative ID>",
 * 			"escrowAccountID": "<Escrow ID>",
 * 			"escrowEvID":" <Escrow Event ID>",		- Event ID of the asset transfer request to the escrow account
 * 			"settlementEvID": "<Freezing Event ID>",- Event ID of the asset transfer request to the representative account
 * 			"restoreEvID": "<Recovery Event ID>"	- Event ID of the transfer request from the escrow account to the sender account
 * 		},
 * 		"toChain":{
 * 			"chainID": "<Chain ID>",
 * 			"accountID": "<Account ID>",
 * 			"asset": "<transfer amount>",
 * 			"settlementAccountID": "<Representative ID>",
 * 			"paymentEvID": "<Credit Event ID>"		- Event ID of the transfer request from the representative account to the receiver account
 * 		},
 * 		"progress": "<Transfer Status>",			- Current asset transfer transaction progress
 * 		"timestamps" :{								- Timestamp at each progress of the asset transfer transaction
 * 			"create": "<Date Created>",
 * 			"requestMargin": "<Date and time when escrow event ID was recorded>",
 * 			"fixedMargin": "<Date and time of the escrow complete status>",
 * 			"failedMargin": "<Date and time of the escrow failure status>",
 * 			"requestDirectFreeze": "<Date and time when dicrectly freezing event ID was recorded (No escrow)>",
 * 			"fixedDirectFreeze": "<Date and time of the dicrectly freezing complete status (No escrow)>",
 * 			"failedDirectFreeze": "<Date and time of the dicrectly freezing failure status (No escrow)>",
 * 			"requestCredit": "<Date and time when credit event ID was recorded>",
 * 			"fixedCredit": "<Date and time of the credit complete status>",
 * 			"failedCredit": "<Date and time of the credit failure status>",
 * 			"requestRecovery": "<Date and time when recovery event ID was recorded>",
 * 			"fixedRecovery": "<Date and time of the recovery complete status>",
 * 			"requestFreeze": "<Date and time when freezing event ID was recorded (Escrow)>",
 * 			"fixedFreeze": "<Date and time of the freezing complete status (Escrow)>"
 * 		}
 * 	}
**/
router.get('/:id', function(req, res, next) {
	var queryArgs = [req.params.id];
	fabricSdkPost.queryRequest( config.chainId,
								config.network,
								config.channelName,
								config.chaincodeIDs[0],
								'getTransferTransaction',
								queryArgs)
	.then((response) => {
		if (response != ''){
			res.header('Content-Type', 'application/json; charset=UTF-8');
			res.send(JSON.parse(response));
		}else{
			next(new CoreAPIError(404, 1004));
		}
	})
	.catch((err) => {
		var detail = err.stack ? err.stack : err;
		next(new CoreAPIError(500, 3000, detail));
		return;
	});
});

/** 
 * Geth the list of asset transfer transaction information 
 * @name get
 * @function
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware
 * Request Body:
 * Squeezing condition. You can omit elements that you do not want to narrow down.
 * 	{
 * 		"userID": "<CC User ID>",
 * 		"progress": "<Transfer Status>",
 * 		"createdBefore": "<Creation Date and Time (Before the specified date)>",
 * 		"createdAfter": "<Creation Date and Time (After the specified date)>",
 * 		"updatedBefore": "<Last Modified (Before the specified date)>",
 * 		"updatedAfter": "<Last Modified (After the specified date)>"
 * 	}
 * Response Body:Array of asset transfer transaction information
**/
router.get('/', function(req, res, next) {
	var userID = req.query.userID;
	if (userID == undefined) {
		userID = '';
	}
	var progress = req.query.progress;
	if (progress == undefined) {
		progress = '';
	}
	var createdBefore = req.query.createdBefore;
	if (createdBefore == undefined) {
		createdBefore = '';
	}
	var createdAfter = req.query.createdAfter;
	if (createdAfter == undefined) {
		createdAfter = '';
	}
	var updatedBefore = req.query.updatedBefore;
	if (updatedBefore == undefined) {
		updatedBefore = '';
	}
	var updatedAfter = req.query.updatedAfter;
	if (updatedAfter == undefined) {
		updatedAfter = '';
	}

	var queryArgs = [userID, progress, createdBefore, createdAfter, updatedBefore, updatedAfter];

	fabricSdkPost.queryRequest( config.chainId,
								config.network,
								config.channelName,
								config.chaincodeIDs[0],
								'getTransferTransactionList',
								queryArgs)

	.then((response) => {
		res.header('Content-Type', 'application/json; charset=UTF-8');
		res.send(JSON.parse(response));
	})
	.catch((err) => {
		var detail = err.stack ? err.stack : err;
		next(new CoreAPIError(500, 3000, detail));
		return;
	});
});

module.exports = router;
