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
var config = require('config');
// Log settings
var log4js = require('log4js');
var logger = log4js.getLogger('EventMediator[' + process.pid + ']');
logger.level = config.logLevel;


/**
 * Perform subsequent processing of detected events from your own additional chaincode
 * @param {string} ccid : Chain Code ID
 * @param {string} func : invoke execute function
 * @param {[]string} args : invoke run-time arguments
**/
exports.receivedUserChaincodeEvent = function(ccid, func, args) {
	if (ccid == config.chaincodeIDs[0]) {
		// describe the processing for each chaincode listed in chaincodeIDs
		// Example)
		/*
			// Get the ID of the end-chain to operate on, for example, from the value of args
			var chainID = args[0];
			// Get adapter URL from end-chain info
			EcInfoAction.getECInfoCache(chainID)
			.then((ecCache) => {
				var adapterUrl = ecCache._adapterUrl;
				// Build parameters to pass to the adapter from args values, etc.
				var params = {
					type: "test",
					info: args[2]
				};
				// API execution of the adapter
			return expPost.send(adapterUrl, params)
			})
			.then((response) => {
			})
			.catch((err) => {
			})
		 */
	}
}

/**
 * Successive processing of detected events from EC (via connector -> adapter)
 * @param {string} cainId : Chain ID
 * @param {string} eventId : Event ID
 * @param {JSON} eventInfo : Event information
**/
exports.receivedEndchainEvent = function(chainId, eventId, eventInfo) {
	// Write an event description or other context sensitive action
	// Example)
	/*
		var args = [];
		var func = "";
		if (eventInfo.status == 0) {
			args = [chainId, eventId, eventInfo.dataX, "dummy"];
			func = "function1";
		} else {
			args = [chainId, eventId, eventInfo.dataY];
			func = "function2";
		}
		// Request execution to your own additional chaincode
		fabricv10Post.invokeRequest(config.chainId,
									config.network,
									config.channelName,
									config.chaincodeIDs[0],
									func,
									args)
		.then((response) => {
		})
		.catch((err) => {
		});
	 */
}


/**
 * Initial processing at server startup
**/
exports.initAction = function() {
	// Write what to do at server startup
}

