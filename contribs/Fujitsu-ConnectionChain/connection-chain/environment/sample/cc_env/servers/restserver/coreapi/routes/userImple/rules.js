/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * rules.js
 */

/* Summary:
 * Transformation Rules Information Management API
*/

var express = require('express');
var config = require('config');
var fabricSdkPost = require("../../lib/common/fabric_v1.0/sdk_if.js");
var CoreAPIError = require('../../lib/common/CoreAPIError.js');
var CoreAPIUtil = require('../../lib/common/CoreAPIUtil.js');
var router = express.Router();


/** 
 * Transformation Rule Information Generation
 * @name post
 * @function
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware
 * Request Body:
 * 	{
 * 		"ruleName": "<Rule Name>",							- display name on the UI
 * 		"fromChain":{										- The sender EC information
 * 			"chainID": "<Chain ID>",						- The ID of the sender EC
 * 			"settlementAccountID": "<Representative ID>",	- The ID of the representative account of the sender EC
 * 			"escrowAccountID": "<Escrow ID>"				- The ID of the escrow account of the sender EC. If omitted, no escrow occurs.
 * 		},
 * 		"toChain":{											- The receiver EC information
 * 			"chainID": "<Chain ID>",						- The ID of the receiver EC
 * 			"settlementAccountID": "<Representative ID>"	- The ID of the representative account of the receiver EC
 * 		},
 * 		"rule": "<Conversion Rate>",						- The conversion ratio (%) for the conversion of value from the sender asset to the receiver asset. The default is 100.
 * 		"commission": "<commission>"						- Amount to deduct from the receiver asset before conversion. The default is 0.
 * 	}
 * Response Body:
 * 	{
 * 		"ruleID": "<Rule ID>"	- ID of the registered transformation rule information
 * 	}
**/
router.post('/', function(req, res, next) {
	if (!CoreAPIUtil.isValidContentType(req)) {
		next(new CoreAPIError(400, 2000));
		return;
	}

	var ruleName = req.body.ruleName;
	if (ruleName == undefined) {
		next(new CoreAPIError(422, 2012));
		return;
	}
	if (req.body.fromChain == undefined) {
		next(new CoreAPIError(422, 2024));
		return;
	}
	var fromChainID = req.body.fromChain.chainID;
	if (fromChainID == undefined) {
		next(new CoreAPIError(422, 2013));
		return;
	}
	var fromAssetType = req.body.fromChain.assetType;
	if (fromAssetType == undefined) {
		// Treat as a number if omitted
		fromAssetType = 'number';
	}
	if (req.body.toChain == undefined) {
		next(new CoreAPIError(422, 2025));
		return;
	}
	var toChainID = req.body.toChain.chainID;
	if (toChainID == undefined) {
		next(new CoreAPIError(422, 2015));
		return;
	}
	var toAssetType = req.body.toChain.assetType;
	if (toAssetType == undefined) {
		// Treat as a number if omitted
		toAssetType = 'number';
	}
	var rule = req.body.rule;
	if (rule == undefined) {
		// Treat as 100% by default
		rule = '100';
	}
	var commission = req.body.commission;
	if (commission == undefined) {
		// Treat as 0 by default
		commission = '0';
	}
	var fromEscrowID = req.body.fromChain.escrowAccountID;
	if (fromEscrowID == undefined){
		// Set empty if omitted (treatment as no escrow)
		fromEscrowID = '';
	}
	var fromSettlementID = req.body.fromChain.settlementAccountID;
	var toSettlementID = req.body.toChain.settlementAccountID;
	// Representative account must be specified
	if (fromSettlementID == undefined || toSettlementID == undefined) {
		next(new CoreAPIError(422, 2011));
		return;
	}
	// Error if the same account ID is used for the escrow account and the representative account
	if (fromEscrowID == fromSettlementID) {
		next(new CoreAPIError(422, 2028));
		return;
	}

	// Register transformation rule information
	var invokeArgs = [ruleName, fromChainID, toChainID,
					  fromAssetType, toAssetType, 
					  fromEscrowID, fromSettlementID, toSettlementID,
					  rule, commission];

	fabricSdkPost.invokeRequest(config.chainId,
								config.network,
								config.channelName,
								config.chaincodeIDs[0],
								'addRuleInfo',
								invokeArgs)
	.then((response) => {
		res.header('Content-Type', 'application/json; charset=UTF-8');
		var resObj = {ruleID:response.data};
		res.status(201).send(resObj);
	})
	.catch((err) => {
		var detail = err.stack ? err.stack : err;
		next(new CoreAPIError(500, 3000, detail));
		return;
	});
});

/** 
 * Update transformation rule information
 * @name put/:id
 * @function
 * @inner
 * @param {string} path - The rule ID to update
 * @param {callback} middleware - Express middleware
 * Request Body:
 * * Elements that is not changed can be omitted.
 * 	{
 * 		"ruleName": "<Rule Name>",
 * 		"fromChain":{
 * 			"chainID": "<Chain ID>",
			"isEscrow" <Escrow or not (boolean)>,	- true if the change (no escrow -> escrow), false if the change (escrow -> no escrow)
 * 			"settlementAccountID": "<Representative ID>",
 * 			"escrowAccountID": "<Escrow ID>"
 * 		},
 * 		"toChain":{
 * 			"chainID": "<Chain ID>",
 * 			"settlementAccountID": "<Representative ID>"
 * 		},
 * 		"rule": "<Conversion ratio>",
 * 		"commission": "<commission>"
 * 	}
 * Response Body:
 * 	{
 * 		"ruleID": "<Rule ID>"	- ID of the updated transformation rule information
 * 	}
**/
router.put('/:id', function(req, res, next) {
	if (!CoreAPIUtil.isValidContentType(req)) {
		next(new CoreAPIError(400, 2000));
		return;
	}

	var id = req.params.id;
	var ruleName = '';
	var fromChainID = '';
	var fromAssetType = '';
	var isEscrow = null;
	var fromEscrowID = '';
	var fromSettlementID = '';
	var toSettlementID = '';
	var toChainID = '';
	var toAssetType = '';
	var rule = '';
	var commission = '';
	var removeEscrow = '';
	// Changed or not of the end-chain itself used in the rule
	var fromChainChange = false;
	var toChainChange = false;

	// Get current transformation rule information
	var ruleInfo = null;
	var queryArgs = [id];
	fabricSdkPost.queryRequest( config.chainId,
								config.network,
								config.channelName,
								config.chaincodeIDs[0],
								'getRuleInfo',
								queryArgs)
	.then((response) => {
		if (response != ''){
			ruleInfo = JSON.parse(response);
		}else{
			throw new CoreAPIError(404, 1003);
		}

		// Unspecified parameter specifies an empty string (Never Update)
		// * If the chain itself is changed, there is no guarantee that there will be a deposit/representative account with the same ID as the chain before the change.
		//   Specifying is required even if same ID exists
		if (req.body.ruleName != undefined) {
			ruleName = req.body.ruleName;
		}
		if (req.body.fromChain != undefined) {
			if (req.body.fromChain.chainID != undefined) {
				fromChainID = req.body.fromChain.chainID;
				if (fromChainID != ruleInfo.fromChain.chainID) {
					fromChainChange = true;
				}
			}
			if (req.body.fromChain.assetType != undefined) {
				fromAssetType = req.body.fromChain.assetType;
			}
			isEscrow = req.body.fromChain.isEscrow;
			var escrowID = req.body.fromChain.escrowAccountID;
			if (isEscrow != undefined) {
				// Escrow or not is specified
				if (isEscrow) {
					// Change to "escrow"
					if (escrowID == undefined) {
						// Error if unspecified
						throw new CoreAPIError(404, 2010);
					} else {
						// Update to specified value if specified
						fromEscrowID = escrowID;
					}
				} else {
					// Some value for removeEscrow if changing to "no escrow"
					removeEscrow = '-';
				}
			} else {
				// If escrow or not specified,
				if (ruleInfo.fromChain.escrowAccountID == undefined) {
					// If there is no current value, no matter what else you specify "No change (Blank)" 
					fromEscrowID = '';
				} else if (escrowID == undefined) {
					// If there is a current value and the escrow account specification is also omitted
					if (fromChainChange) {
						// Error if not specified in the context of changing the chain itself
						throw new CoreAPIError(404, 2010);
					} else {
						// If the chain itself has not changed "No change (Blank)"
						fromEscrowID = '';
					}
				} else {
					// Current value exists, update to specified value if specified
					fromEscrowID = escrowID;
				}
			}
			if (req.body.fromChain.settlementAccountID != undefined) {
				fromSettlementID = req.body.fromChain.settlementAccountID;
			} else if (fromChainChange) {
				// Error if not specified in the context of changing the chain itself
				throw new CoreAPIError(404, 2011);
			}
		}
		if (req.body.toChain != undefined) {
			if (req.body.toChain.chainID != undefined) {
				toChainID = req.body.toChain.chainID;
				if (toChainID != ruleInfo.toChain.chainID) {
					toChainChange = true;
				}
			}
			if (req.body.toChain.assetType != undefined) {
				toAssetType = req.body.toChain.assetType;
			}
			if (req.body.toChain.settlementAccountID != undefined) {
				toSettlementID = req.body.toChain.settlementAccountID;
			} else if (toChainChange) {
				// Error if not specified in the context of changing the chain itself
				throw new CoreAPIError(404, 2011);
			}
		}
		if (req.body.rule != undefined) {
			rule = req.body.rule;
		}
		if (req.body.commission != undefined) {
			commission = req.body.commission;
		}

		// Error if the same account ID is used for the escrow account and the representative account
		if ((fromEscrowID != '') && (fromEscrowID == fromSettlementID)) {
			throw new CoreAPIError(422, 2028);
		}

		var invokeArgs = [id, ruleName, fromChainID, toChainID,
						  fromAssetType, toAssetType,
						  fromEscrowID, fromSettlementID, toSettlementID,
						  rule, commission, removeEscrow];

		return fabricSdkPost.invokeRequest(config.chainId,
										config.network,
										config.channelName,
										config.chaincodeIDs[0],
										'updateRuleInfo',
										invokeArgs)
	})
	.then((response) => {
		if (response.data != ''){
			res.header('Content-Type', 'application/json; charset=UTF-8');
			var resObj = {ruleID:response.data};
			res.send(resObj);
		}else{
			next(new CoreAPIError(404, 1003));
		}
	})
	.catch((err) => {
		if (err instanceof CoreAPIError) {
			next(err);
		} else {
			var detail = err.stack ? err.stack : err;
			next(new CoreAPIError(500, 3000, detail));
		}
	});
});

/** 
 * Delete conversion rule information
 * @name delete/:id
 * @function
 * @inner
 * @param {string} path - Rule ID to delete
 * @param {callback} middleware - Express middleware
**/
router.delete('/:id', function(req, res, next) {
	var invokeArgs = [req.params.id];
	fabricSdkPost.invokeRequest( config.chainId,
								config.network,
								config.channelName,
								config.chaincodeIDs[0],
								'deleteRuleInfo',
								invokeArgs)
	.then((response) => {
		res.status(204).send();
	})
	.catch((err) => {
		var detail = err.stack ? err.stack : err;
		next(new CoreAPIError(500, 3000, detail));
		return;
	});
});

/** 
 * Get one conversion rule information
 * @name get/:id
 * @function
 * @inner
 * @param {string} path - Rule ID to get
 * @param {callback} middleware - Express middleware
 * Response Body:
 * 	{
 * 		"id": "<Rule ID>",
 * 		"ruleName": "<Rule Name>",
 * 		"fromChain":{
 * 			"chainID": "<Chain ID>",
 * 			"settlementAccountID": "<Representative ID>",
 * 			"escrowAccountID": "<Escrow ID>"
 * 		},
 * 		"toChain":{
 * 			"chainID": "<Chain ID>",
 * 			"settlementAccountID": "<Representative ID>"
 * 		},
 * 		"rule": "<Conversion Ratio>",
 * 		"commission": "<commission>"
 * 	}
**/
router.get('/:id', function(req, res, next) {
	var queryArgs = [req.params.id];
	fabricSdkPost.queryRequest( config.chainId,
								config.network,
								config.channelName,
								config.chaincodeIDs[0],
								'getRuleInfo',
								queryArgs)
	.then((response) => {
		if (response != ''){
			var resInfo = JSON.parse(response);
			res.header('Content-Type', 'application/json; charset=UTF-8');
			res.send(resInfo);
		}else{
			next(new CoreAPIError(404, 1003));
		}
	})
	.catch((err) => {
		var detail = err.stack ? err.stack : err;
		next(new CoreAPIError(500, 3000, detail));
		return;
	});
});

/** 
 * Get the list of conversion rule information
 * @name get
 * @function
 * @inner
 * @param {string} path - Express path
 * @param {callback} middleware - Express middleware
 * Request Body:
 * Squeezing condition. You can omit elements that you do not want to narrow down.
 * 	{
 * 		"fromChainID": "<Chain ID of the sender EC>",
 * 		"toChainID": "<Chain ID of the receiver EC>"
 * 	}
 * Response Body: Array of transformation rule information
**/
router.get('/', function(req, res, next) {
	var fromChainID = req.query.fromChainID;
	if (fromChainID == undefined) {
		fromChainID = '';
	}
	var toChainID = req.query.toChainID;
	if (toChainID == undefined) {
		toChainID = '';
	}

	var queryArgs = [fromChainID, toChainID];

	fabricSdkPost.queryRequest( config.chainId,
								config.network,
								config.channelName,
								config.chaincodeIDs[0],
								'getRuleInfoList',
								queryArgs)
	.then((response) => {
		var resInfo = JSON.parse(response);
		res.header('Content-Type', 'application/json; charset=UTF-8');
		res.send(resInfo);
	})
	.catch((err) => {
		var detail = err.stack ? err.stack : err;
		next(new CoreAPIError(500, 3000, detail));
		return;
	});
});

module.exports = router;
