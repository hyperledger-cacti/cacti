/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EventMediator.js
 */

/* Summary:
 * Allocate subsequent processing for chaincodes added to CC by user and events from EC
*/

var fabricv10Post = require("../common/fabric_v1.0/sdk_if.js");
var expPost = require("../common/exp/adapter_if.js");
var EcInfoAction = require("../common/EcInfoAction.js");
var UserImpleUtil = require('./UserImpleUtil.js');
var config = require('config');
// Log settings
var log4js = require('log4js');
var logger = log4js.getLogger('EventMediator[' + process.pid + ']');
logger.level = config.logLevel;

// hash table for caching asset transfer transaction information
var TxTable = {};

/**
 * Perform subsequent processing of detected events from your own additional chaincode
 * @param {string} ccid :Chaincode ID
 * @param {string} func :invoke execute function
 * @param {[]string} args :invoke run-time arguments
**/
exports.receivedUserChaincodeEvent = function(ccid, func, args) {
	if (ccid == config.chaincodeIDs[0]) {
		// Events from chaincodes for asset transfer information management
		// add/update asset transfer transaction information
		if (func == 'createTransferTransaction') {
			operation_createTransferTransaction(args);
		} else if (func == 'updateTransferTransaction') {
			operation_updateTransferTransaction(args);
		}
	} else {
		// Events from chaincodes outside the ConnectionChain function in the blockchain in the CC side
		// No special handling
	}
}


// Perform asset transfer transaction cache update and state update requests
function updateTransactionInfo(txID, progress, eventID) {
	var txCache = TxTable[txID];
	var argEcEvID = eventID;
	// Update cache contents
	var updateTime = UserImpleUtil.getTimestampString();
	txCache._updateTime = updateTime;
	txCache._progress = progress;
	if (progress == 'requestMargin' || progress == 'fixedMargin') {
		if (txCache._escrowEvID == '') {
			txCache._escrowEvID = eventID;
		} else {
			argEcEvID = ''; // Do not update if already set
		}
	} else if (progress == 'requestDirectFreeze' || progress == 'fixedDirectFreeze') {
		if (txCache._settlementEvID == '') {
			txCache._settlementEvID = eventID;
		} else {
			argEcEvID = ''; // Do not update if already set
		}
	} else if (progress == 'requestCredit') {
		txCache._paymentEvID = eventID;
	} else if (progress == 'requestFreeze') {
		txCache._settlementEvID = eventID;
	} else if (progress == 'requestRecovery') {
		txCache._restoreEvID = eventID;
	}

	// You can update the asset information, but it is not necessary for the current sample.
	var assetInfo = '';

	// Update asset transfer transaction information
	var invokeArgs = [txID, progress, argEcEvID, assetInfo, updateTime];
	fabricv10Post.invokeRequest(config.chainId,
								config.network,
								config.channelName,
								config.chaincodeIDs[0],
								'updateTransferTransaction',
								invokeArgs)
	.then((response) => {
		if (response.data != '') {
			logger.info('Update Transaction information requested. id: ' + txID + ', progress: ' + progress);
		} else {
			throw new Error('Transaction information does not exist. id: ' + txID);
		}
	})
	.catch((err) => {
		logger.error(JSON.stringify(err));
	});
}

// processing after generating asset transfer transaction information
function operation_createTransferTransaction(args) {
	var txID = args[0];
	var ruleID = args[2];
	var fromChainID = args[3];
	var fromAccountID = args[4];
	var fromAssetType = args[5];
	var fromAsset = args[6];
	var fromEscrowID = args[7];
	var fromSettlementID = args[8];
	var toChainID = args[9];
	var toAccountID = args[10];
	var toAssetType = args[11];
	var toAsset = args[12];
	var toSettlementID = args[13];
	var createTime = args[14];

	logger.info(args);	// for call timing and parameter verification.
	// add asset transfer transaction information to cache
	var txCache = new TxInfo(ruleID, fromChainID, fromAccountID, fromAssetType, fromAsset,
							 fromEscrowID, fromSettlementID,
							 toChainID, toAccountID, toAssetType, toAsset, 
							 toSettlementID, createTime);
	TxTable[txID] = txCache;
	
	var ecInfoJson = {};
	// run flag for the escrow (or direct freezing) failure action
	var isTransferFailed = false;

	// Get destination EC information by specifying destination end-chain ID
	EcInfoAction.getECInfoCache(fromChainID)
	.then((ecCache) => {
		ecInfoJson = ecCache.getJsonObj();
		var otherData = {};
		// Get the asset information of the sender user
		return execEndChainApi(ecInfoJson.adapterUrl, fromChainID, 'reference', 'MarginOrDfreeze', txCache, otherData)
	})
	.then((response) => {
		// Confirm the asset information of the sender user (Balance or ID Exists)
		checkExistAsset(response, fromAssetType, fromAsset);

		var otherData = {};
		// Transfer assets from the sender user to the escrow account (or representative account) in the sender end-chain
		return execEndChainApi(ecInfoJson.adapterUrl, fromChainID, 'transfer', 'MarginOrDfreeze', txCache, otherData)
	})
	.catch((err) => {
		// Failure of escrow / direct freeze if error occurs anywhere in the above flow
		isTransferFailed = true;
		throw err;
	})
	.then((response) => {
		// Get and return the event ID (Or substituted value) from the execution result of the transfer and credit API
		var parsedResponse = parseEndChainApiResponse(response);
		var eventID = parsedResponse.eventID;

		if (txCache.isEscrow()) {
			// Escrow
			logger.info('escrow id: ' + eventID);
			// Update asset transfer transaction information
			updateTransactionInfo(txID, 'requestMargin', eventID);
		} else {
			// Direct freezing
			logger.info('settlement id: ' + eventID);
			// Update asset transfer transaction information
			updateTransactionInfo(txID, 'requestDirectFreeze', eventID);
		}
	})
	.catch((err) => {
		logger.error(JSON.stringify(err));
		if (isTransferFailed){
			if (txCache.isEscrow()) {
				// Update asset transfer transaction information to failure state of escrow
				updateTransactionInfo(txID, 'failedMargin', '');
			} else {
				// Update asset transfer transaction information to failure state of direct freezing
				updateTransactionInfo(txID, 'failedDirectFreeze', '');
			}
		}
	});
}


// Processing after updating asset transfer transaction information
function operation_updateTransferTransaction(args) {
	var txID = args[0];
	var progress = args[1];

	if (progress == 'fixedMargin') {
		// Completion of update to fixedMargin (escrow complete) state 
		// Initiate credit requests in the receiver end-chain
		operation_updatedFixedMargin(txID);
	} else if (progress == 'failedMargin') {
		// Completion of update to failedMargin (escrow failure) state
		operation_updatedFailedMargin(txID);
	} else if (progress == 'fixedDirectFreeze') {
		// Completion of update to fixedDirectFreeze (direct freezing complete) state
		// Start credit request in the receiver end-chain (Same process as after completion of escrow)
		operation_updatedFixedMargin(txID);
	} else if (progress == 'failedDirectFreeze') {
		// Completion of update to failedDirectFreeze (direct freeze failure) state
		operation_updatedFailedDirectFreeze(txID);
	} else if (progress == 'fixedCredit') {
		// Completion of update to fixedCredit (credit complete) state
		// Start freezing request on the sender end-chain
		// or completion of the transfer process itself (in the case of no escrow)
		operation_updatedFixedCredit(txID);
	} else if (progress == 'failedCredit') {
		// Completion of update to failedCredit (credit failure) state
		// Start recovery request in the sender end-chain
		operation_updatedFailedCredit(txID);
	} else if (progress == 'fixedRecovery') {
		// Completion of update to fixedRecovery (recovery complete) state
		operation_updatedFixedRecovery(txID);
	} else if (progress == 'fixedFreeze') {
		// Completion of update to fixedFreeze (freezing complete) state
		// = completion of the transfer process itself
		operation_updatedComplete(txID);
	}
	// Do nothing when notifying completion of update to various request states
}

// Processing after update to escrow complete state
function operation_updatedFixedMargin(txID) {
	var txCache = TxTable[txID];
	var toChainID = txCache._toChainID;
	var toAccountID = txCache._toAccountID;
	var toAsset = txCache._toAsset;
	var toAssetType = txCache._toAssetType;
	var toSettlementID = txCache._toSettlementID;

	var ecInfoJson = {};
	// whether the credit process is transferred from the representative account
	var isTransfer = false;
	// Execution flag of credit failure processing
	var isCreditFailed = false;

	// Get the receiver end-chain information
	EcInfoAction.getECInfoCache(toChainID)
	.then((ecCache) => {
		ecInfoJson = ecCache.getJsonObj();
		// Before a credit request, the balance checking API checks for the presence of the receiver account
		// Specify the receiver account as the target
		var otherData = {targetAccountID:toAccountID};
		// Get the receiver user's asset information (Do not check the contents)
		return execEndChainApi(ecInfoJson.adapterUrl, toChainID, 'reference', 'Credit', txCache, otherData)
	})
	.then((response) => {
		// Check balance of credit source
		// Specify the representative account of the receiver end-chain as the target
		var otherData = {targetAccountID:toSettlementID};
		// Get the asset information of the representative account of the receiver end-chain
		return execEndChainApi(ecInfoJson.adapterUrl, toChainID, 'reference', 'Credit', txCache, otherData)
	})
	.then((response) => {
		// Check balance of credit source
		checkExistAsset(response, toAssetType, toAsset);

		var otherData = {};
		// Asset Credit to the receiver user (move from the representative account)
		return execEndChainApi(ecInfoJson.adapterUrl, toChainID, 'payment', 'Credit', txCache, otherData)
	})
	.catch((err) => {
		// Credit failure if there is an error somewhere in the above flow
		isCreditFailed = true;
		throw err;
	})
	.then((response) => {
		// Get and return the event ID (or substituted value) from the execution result of the transfer and credit API
		var parsedResponse = parseEndChainApiResponse(response);
		var eventID = parsedResponse.eventID;
		logger.info('payment id: ' + eventID);
		// Update of asset transfer transaction information
		updateTransactionInfo(txID, 'requestCredit', eventID);
	})
	.catch((err) => {
		logger.error(JSON.stringify(err));
		if (isCreditFailed){
			// Update of asset transfer transaction information to credit failure state
			updateTransactionInfo(txID, 'failedCredit', '');
		}
	});
}

// Processing after updating to credit complete state
function operation_updatedFixedCredit(txID) {
	var txCache = TxTable[txID];

	// In the case of no escrow, the transfer process itself is now complete
	if (!txCache.isEscrow()) {
		operation_updatedComplete(txID);
		return;
	}

	var fromChainID = txCache._fromChainID;
	var fromAsset = txCache._fromAsset;
	var ecInfoJson = {};

	// Get the sender end-chain information
	EcInfoAction.getECInfoCache(fromChainID)
	.then((ecCache) => {
		ecInfoJson = ecCache.getJsonObj();
		var otherData = {};

		// Asset transfer from the escrow account to the representative account in the sender end-chain
		return execEndChainApi(ecInfoJson.adapterUrl, fromChainID, 'transfer', 'Freeze', txCache, otherData)
	})
	.then((response) => {
		// Get and return the event ID (or substituted value) from the execution result of the transfer and credit API
		var parsedResponse = parseEndChainApiResponse(response);
		var eventID = parsedResponse.eventID;
		logger.info('settlement id: ' + eventID);
		// Update of asset transfer transaction information
		updateTransactionInfo(txID, 'requestFreeze', eventID);
	})
	.catch((err) => {
		logger.error(JSON.stringify(err));
	});
}

// Processing after updating to credit failure state
function operation_updatedFailedCredit(txID) {
	var txCache = TxTable[txID];
	var fromChainID = txCache._fromChainID;
	var fromAccountID = txCache._fromAccountID;
	var fromAsset = txCache._fromAsset;

	var ecInfoJson = {};

	// Get the sender end-chain information
	EcInfoAction.getECInfoCache(fromChainID)
	.then((ecCache) => {
		ecInfoJson = ecCache.getJsonObj();
		var otherData = {};

		// Asset transfer from the escrow account to the sender account in the sender end-chain
		return execEndChainApi(ecInfoJson.adapterUrl, fromChainID, 'transfer', 'Recovery', txCache, otherData)
	})
	.then((response) => {
		// Get and return the event ID (or substituted value) from the execution result of the transfer and credit API
		var parsedResponse = parseEndChainApiResponse(response);
		var eventID = parsedResponse.eventID;
		logger.info('restore id: ' + eventID);
		// Update of asset transfer transaction information
		updateTransactionInfo(txID, 'requestRecovery', eventID);
	})
	.catch((err) => {
		logger.error(JSON.stringify(err));
	});
}

// Processing after updating to escrow failure state
function operation_updatedFailedMargin(txID) {
	// Cache deleting of asset transfer transaction information
	delete TxTable[txID];
}

// Processing after updating to directly freezing failure state
function operation_updatedFailedDirectFreeze(txID) {
	// Cache deleting of asset transfer transaction information
	delete TxTable[txID];
}

// Processing after updating to recovery complete state
function operation_updatedFixedRecovery(txID) {
	// Cache deleting of asset transfer transaction information
	delete TxTable[txID];
}

// Processing after updating to freezing complete state or credit complete (no escrow) state
function operation_updatedComplete(txID) {
	// Cache deleting of asset transfer transaction information
	delete TxTable[txID];
}


/**
 * Execute of processing after detected events from EC (via the pass from connector to adapter)
 * @param {string} cainId : Chain ID
 * @param {string} eventId : Event ID
 * @param {JSON} eventInfo : Event Information
**/
exports.receivedEndchainEvent = function(chainId, eventId, eventInfo) {
	// Get destination end-chain information
	EcInfoAction.getECInfoCache(chainId)
	.then((ecCache) => {
		var ecInfoJson = ecCache.getJsonObj();
		var transferEvid = eventId;
		var paymentEvid = eventId;

		// cache lookup of asset transfer transaction information
		var isFind = false;
		for (txID in TxTable) {
			var txCache = TxTable[txID];
			if (chainId == txCache._fromChainID) {
				// One of the events in the sender end-chain (Escrow/Directly Freezing/Freezing/Recovery).
				// Find transaction information matching each condition.
				// Usually, it is enough to determine with only progress and eventID.
				// In some cases, the contents of eventInfo are also used to determine, but this example does not require it.

				if (txCache._progress == 'requestMargin') {
					// If it is a transfer from the sender account to the escrow account?
					if (transferEvid == txCache._escrowEvID) {
						// If found, update the asset transfer transaction to escrow complete state.
						isFind = true;
						updateTransactionInfo(txID, 'fixedMargin', transferEvid);
						break;
					}
				} else if (txCache._progress == 'requestDirectFreeze') {
					// If it is a transfer from the sender account to the representative account?
					if (transferEvid == txCache._settlementEvID) {
						// If found, update the asset transfer transaction to directly freezing complete state.
						isFind = true;
						updateTransactionInfo(txID, 'fixedDirectFreeze', transferEvid);
						break;
					}
				} else if (txCache._progress == 'requestFreeze') {
					// If it is a transfer from the escrow account to the representative account?
					if (transferEvid == txCache._settlementEvID) {
						// If found, update the asset transfer transaction to recovery complete state.
						isFind = true;
						updateTransactionInfo(txID, 'fixedFreeze', '');
						break;
					}
				} else if (txCache._progress == 'requestRecovery') {
					// If it is a transfer from the escrow account to the sender account or a transfer from the representative account to the sender account?
					if (transferEvid == txCache._restoreEvID) {
						// If found, update the asset transfer transaction to recovery complete state.
						isFind = true;
						updateTransactionInfo(txID, 'fixedRecovery', '');
						break;
					}
				}
			}
			if (chainId == txCache._toChainID) {
				// events in the receiver chain (credit)

				if (txCache._progress == 'requestCredit') {
					// If it is a moving or adding to the receiver account?
					if (paymentEvid == txCache._paymentEvID) {
						// If found, update the asset transfer transaction to credit complete state.
						isFind = true;
						updateTransactionInfo(txID, 'fixedCredit', '');
						break;
					}
				}
			}
		}

	})
	.catch((err) => {
		logger.error(JSON.stringify(err));
	});
}


/*
 * end-chain API Execution Functions
 * @param {string} adapterUrl   :Adapter URL
 * @param {string} chainID      :Chain ID of the end-chain to execute. Processically unused, for review logs
 * @param {string} apiType      :API type
 *                               Reference ("reference") | Transfer ("transfer") | Credit ("payment")
 * @param {string} progress     :Transfer Status
 *                               Escrow/Directly Frozen ("MarginOrDfreeze") | Credit ("Credit") | Freezing ("Freeze") | Recovery ("Recovery") | Other ("Other")
 * @param {JSON} txInfo         :Information about the running transaction
 * @param {JSON} otherData      :Other information to give to the API.
 */
function execEndChainApi(adapterUrl, chainID, apiType, progress, txInfo, otherData) {
	logger.info('exec EndChain Api.');
	logger.info('  chain id      : ' + chainID);
	logger.info('  api type      : ' + apiType);
	logger.info('  progress      : ' + progress);
	var params = {
		apiType : apiType,
		progress : progress,
		txInfo : txInfo,
		otherData : otherData
	};

	logger.info('  adapter     : ' + adapterUrl);
	logger.info('  params      : ' + JSON.stringify(params));

	return new Promise((resolve, reject) => {
		// Just call it as it is (Branch processing is performed in the adapter.)
		expPost.send(adapterUrl, params)
		.then((response) => {
			// Return in JSON format if parse is possible. Use as is if it cannot be converted (Just a string, already a JSON Object... etc.)
			var resData = null;
			logger.info('api response:');
			try {
				resData = JSON.parse(response);
			} catch (e) {
				resData = response;
			}
			logger.info(JSON.stringify(resData));
			return resolve(resData);
		})
		.catch((err) => {
			return reject(err);
		});
	});
}

// Check asset existence (Balance)
function checkExistAsset(srcData, assetType, assetInfo) {
	logger.info('check asset.');
	// Get balance value from execEndChainApi (reference) response content

	var fieldName = 'amount'; // The name of the balance storage area set in the Connector
	var referenceData = UserImpleUtil.getFieldData(srcData, fieldName);
	if (referenceData == undefined) {
		// No area with the specified name exists
		throw new Error('The specified data field does not exist:' + fieldName);
	}
	logger.info('    asset type     : ' + assetType);
	logger.info('    reference data : ' + referenceData);
	logger.info('    necessary asset: ' + assetInfo);
	if (assetType == 'number') {
		// For numerical values, compare the balance with the current transfer amount
		if (Number(referenceData) < Number(assetInfo)) {
			// insufficient balance
			throw new Error('Transfer source quantity is insufficient. remaining: ' + referenceData + ' , necessary: ' + assetInfo);
		}
	} else {
		// Currently, only numerical values ('number') are available for asset types.
		// Excluding numbers, eliminated by AssetConverter when generating asset transfer transaction
	}
}

// Result to analize execution of execEndChainApi (Transfer/Credit)
function parseEndChainApiResponse(response) {
	// Get and return the event ID (Or substituted values)
	var retObj = {eventID:''};
	var resultField = 'txid'; // EC-side event ID storage area name set by the adapter
	// If it is a number, it will be treated as a string.
	retObj.eventID = '' + UserImpleUtil.getFieldData(response, resultField);
	return retObj;
}

function setTxInfoCache() {
	// Store in cache the asset transfer transaction information in an incomplete state
	logger.info('Cache Transaction info start.');
	getTxListByProgress(0);
}

function getTxListByProgress(index) {
	// Escrow Failure (failedMargin), Directly Freezing Failure (failedDirectFreeze), Recovery Complete (fixedRecovery), Completed (complete)
	// Get list in each cases different from the above states.
	var targetProgress = ['initial', 'requestMargin', 'fixedMargin',
						  'requestDirectFreeze', 'fixedDirectFreeze', 
						  'requestCredit', 'fixedCredit',
						  'requestRecovery', 'requestFreeze'];
	logger.info('Step :' + index);
	var queryArgs = ['', targetProgress[index], '', '', '', ''];
	fabricv10Post.queryRequest( config.chainId,
								config.network,
								config.channelName,
								config.chaincodeIDs[0],
								'getTransferTransactionList',
								queryArgs)
	.then((response) => {
		var txList = JSON.parse(response);
		if (txList) {
			for (var i = 0; i < txList.length; i++) {
				var txInfo = txList[i];
				var txID = txInfo.id;
				var ruleID = txInfo.ruleID;
				var fromChainID = txInfo.fromChain.chainID;
				var fromAccountID = txInfo.fromChain.accountID;
				var fromAssetType = txInfo.fromChain.assetType;
				var fromAsset = txInfo.fromChain.asset;
				var fromEscrowID = txInfo.fromChain.escrowAccountID;
				if (fromEscrowID == undefined) {
					fromEscrowID = '';
				}
				var fromSettlementID = txInfo.fromChain.settlementAccountID;
				var toChainID = txInfo.toChain.chainID;
				var toAccountID = txInfo.toChain.accountID;
				var toAssetType = txInfo.toChain.assetType;
				var toAsset = txInfo.toChain.asset;
				var toSettlementID = txInfo.toChain.settlementAccountID;
				var createTime = txInfo.timestamps.create;

				// caching transfer transaction information.
				var txCache = new TxInfo(ruleID, fromChainID, fromAccountID, fromAssetType, fromAsset,
										 fromEscrowID, fromSettlementID,
										 toChainID, toAccountID, toAssetType, toAsset, 
										 toSettlementID, createTime);

				txCache._progress = txInfo.progress;
				// Set in cache if there is escrow state information.
				var escrowEvID = txInfo.fromChain.escrowEvID;
				if (escrowEvID != undefined) {
					txCache._escrowEvID = escrowEvID;
					var fixedMarginTime = txInfo.timestamps.fixedMargin;
					var failedMarginTime = txInfo.timestamps.failedMargin;
					if (fixedMarginTime != undefined) {
						txCache._updateTime = fixedMarginTime;
					} else if (failedMarginTime != undefined) {
						// Impossible route because escrow failure status has not been obtained.
						txCache._updateTime = failedMarginTime;
					} else {
						txCache._updateTime = txInfo.timestamps.requestMargin;
					}
				}
				// Set in cache if there is directly freezing state information.
				var settlementEvID = txInfo.fromChain.settlementEvID;
				if (settlementEvID != undefined && !txCache.isEscrow()) {
					txCache._settlementEvID = settlementEvID;
					var fixedDirectFreezeTime = txInfo.timestamps.fixedDirectFreeze;
					var failedDirectFreezeTime = txInfo.timestamps.failedDirectFreeze;
					if (fixedDirectFreezeTime != undefined) {
						txCache._updateTime = fixedDirectFreezeTime;
					} else if (failedDirectFreezeTime != undefined) {
						// Impossible route because directly freezing failure status is not obtained.
						txCache._updateTime = failedDirectFreezeTime;
					} else {
						txCache._updateTime = txInfo.timestamps.requestDirectFreeze;
					}
				}
				// Set in cache if there is credit status information.
				var paymentEvID = txInfo.toChain.paymentEvID;
				if (paymentEvID != undefined) {
					txCache._paymentEvID = paymentEvID;
					var fixedCreditTime = txInfo.timestamps.fixedCredit;
					var failedCreditTime = txInfo.timestamps.failedCredit;
					if (fixedCreditTime != undefined) {
						txCache._updateTime = fixedCreditTime;
					} else if (failedCreditTime != undefined) {
						txCache._updateTime = failedCreditTime;
					} else {
						txCache._updateTime = txInfo.timestamps.requestCredit;
					}
				}
				// Set in cache if there is recovery state information.
				var restoreEvID = txInfo.fromChain.restoreEvID;
				if (restoreEvID != undefined) {
					txCache._restoreEvID = restoreEvID;
					var fixedRecoveryTime = txInfo.timestamps.fixedRecovery;
					if (fixedRecoveryTime != undefined) {
						// Impossible route because we have not obtained the fixed state.
						txCache._updateTime = fixedRecoveryTime;
					} else {
						txCache._updateTime = txInfo.timestamps.requestRecovery;
					}
				}
				// Set in cache if there is freezing state information.
				if (settlementEvID != undefined && txCache.isEscrow()) {
					txCache._settlementEvID = settlementEvID;
					var fixedFreezeTime = txInfo.timestamps.fixedFreeze;
					if (fixedFreezeTime != undefined) {
						// Impossible route because the completion state has not been obtained.
						txCache._updateTime = fixedFreezeTime;
					} else {
						txCache._updateTime = txInfo.timestamps.requestFreeze;
					}
				}
				// Append to cache table.
				TxTable[txID] = txCache;
			}
		}
		logger.info('TxTable:');
		logger.info(Object.keys(TxTable));
		var nextIndex = index + 1;
		if (nextIndex < targetProgress.length) {
			// get list for next state.
			getTxListByProgress(nextIndex);
		} else {
			logger.info('Cache Transaction info end.');
		}
	})
	.catch((err) => {
		logger.error(JSON.stringify(err));
	});
}


/**
 * Initial processing at server startup
**/
exports.initAction = function() {
	return setTxInfoCache();
}


// Asset transfer transaction information storage class
var TxInfo = class {

	constructor(ruleID, fromChainID, fromAccountID, fromAssetType, fromAsset,
				fromEscrowID, fromSettlementID,
				toChainID, toAccountID, toAssetType, toAsset,
				toSettlementID, createTime) {
		this._ruleID = ruleID;
		this._fromChainID = fromChainID;
		this._fromAccountID = fromAccountID;
		this._fromAssetType = fromAssetType;
		this._fromAsset = fromAsset;
		this._fromEscrowID = fromEscrowID;
		this._fromSettlementID = fromSettlementID;
		this._toChainID = toChainID;
		this._toAccountID = toAccountID;
		this._toAssetType = toAssetType;
		this._toAsset = toAsset;
		this._toSettlementID = toSettlementID;
		this._createTime = createTime;
		this._updateTime = createTime;
		this._progress = 'initial';
		this._escrowEvID = '';
		this._paymentEvID = '';
		this._restoreEvID = '';
		this._settlementEvID = '';
	}

	isEscrow() {
		if (this._fromEscrowID == '') {
			return false;
		} else {
			return true;
		}
	}

	getJsonObj() {
		var returnObj = {
			ruleID : this._ruleID,
			fromChain : {
				chainID : this._fromChainID,
				accountID : this._fromAccountID,
				assetType : this._fromAssetType,
				asset : this._fromAsset,
				escrowAccountID : this._fromEscrowID,
				settlementAccountID : this._fromSettlementID,
				escrowEvID : this._escrowEvID,
				settlementEvID : this._settlementEvID,
				restoreEvID : this._restoreEvID
			},
			toChain : {
				chainID : this._toChainID,
				accountID : this._toAccountID,
				assetType : this._toAssetType,
				asset : this._toAsset,
				settlementAccountID : this._toSettlementID,
				paymentEvID : this._paymentEvID
			},
			progress : this._progress
		};
		return returnObj;
	}
};
