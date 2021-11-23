/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EcInfoAction.js
 */

/* Summary:
 * Event processing related destination EC information and cache management library
*/

var fabricv10Post = require("./fabric_v1.0/sdk_if.js");
var MonitorManager = require('./MonitorManager.js');
var config = require('config');
// Log settings
var log4js = require('log4js');
var logger = log4js.getLogger('EcInfoAction[' + process.pid + ']');
logger.level = config.logLevel;

// Hash table for cache of destination EC information
var ECTable = {};

/**
 * Get the destination EC information
 * Returns cached information, if any. If not, it is retrieved from the chaincode and added back to the cache.
 * @param {string} chainID :Chain ID
 * @return{object} Cache of the destination EC information
**/
function getECInfoCache(chainID) {
	return new Promise((resolve, reject) => {
		var ecCache = ECTable[chainID];
		if (ecCache) {
			logger.info('Hit EC cache. id: ' + chainID);
			return resolve(ecCache);
		} else {
			logger.info('Get EC info request. id: ' + chainID);
			var queryArgs = [chainID];
			fabricv10Post.queryRequest( config.chainId,
										config.network,
										config.channelName,
										config.chaincodeID_ec,
										'getECInfo',
										queryArgs)
			.then((response) => {
				if (response != ''){
					var ecInfo = JSON.parse(response);
					var chainName = ecInfo.chainName;
					var adapterUrl = ecInfo.adapterUrl;
					// Cache update of the destination EC information
					ecCache = new ECInfo(chainName, adapterUrl);
					ECTable[chainID] = ecCache;
					return resolve(ecCache);
				} else {
					throw new Error('Chain information does not exist. id: ' + chainID);
				}
			})
			.catch((err) => {
				return reject(err);
			});
		}
	});
}

exports.getECInfoCache = function(chainID) {
	return getECInfoCache(chainID);
}

/**
 * processing after detecting the event of operation for the destination EC information 
 * @param {string} func : invoke execute function
 * @param {[]string} args :invoke run-time arguments
**/
exports.receivedECInfoEvent = function(func, args) {
	// add/modify/delete destination EC information
	if (func == 'addECInfo') {
		operation_addECInfo(args);
	} else if (func == 'updateECInfo') {
		operation_updateECInfo(args);
	} else if (func == 'deleteECInfo') {
		operation_deleteECInfo(args);
	}
}


// Processing after adding destination EC information
function operation_addECInfo(args) {
	var chainID = args[0];
	var chainName = args[1];
	var adapterUrl = args[2];
	// Generate cache of destination EC information
	var ecCache = new ECInfo(chainName, adapterUrl);
	ECTable[chainID] = ecCache;
	// Add ECMonitor
	MonitorManager.addECMonitor(chainID, adapterUrl);
}

// Processing after updating destination EC information
function operation_updateECInfo(args) {
	var chainID = args[0];
	// Delete cached destination EC information for a moment
	delete ECTable[chainID];
	// Get the updated destination end-chain information from the chain code and store it in the cache
	getECInfoCache(chainID)
	.then((ecCache) => {
		// Removed & re-added ECmonitor 
		MonitorManager.removeECMonitor(chainID);
		MonitorManager.addECMonitor(chainID, ecCache._adapterUrl);
	})
	.catch((err) => {
		logger.error(JSON.stringify(err));
	});
}

// Processing after deleting the destination EC information
function operation_deleteECInfo(args) {
	var chainID = args[0];
	// Delete cache of destination EC information
	delete ECTable[chainID];
	// Delete ECmonitor
	MonitorManager.removeECMonitor(chainID);
}

// Storage class for destination EC information 
var ECInfo = class {

	constructor(chainName, adapterUrl) {
		this._chainName = chainName;
		this._adapterUrl = adapterUrl;
	}

	// Return as JSON object
	getJsonObj() {
		var returnObj = {
			chainName : this._chainName,
			adapterUrl : this._adapterUrl
		};
		return returnObj;
	}
};

