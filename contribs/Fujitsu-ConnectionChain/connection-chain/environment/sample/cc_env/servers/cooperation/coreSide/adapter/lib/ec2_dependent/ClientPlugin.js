/*
 * Copyright 2019 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ClientPlugin.js
 */

/*
 * Summary:
 * Adapter: a part dependent on end-chains
 */

// configuration file
var CplugConfig = require('./PluginConfig.js');
var config = require('config');
// Log settings
var log4js = require('log4js');
var logger = log4js.getLogger('ClientPlugin[' + process.pid + ']');
logger.level = config.logLevel;
// Library of a part independent of end-chains (cooperation server side)
var connector_if = require('../connector_if.js');

/*
 * ClientPlugin
 * Class definitions for client plugins
 */
var ClientPlugin = class {
	/*
	 * constructors
	 */
	constructor(){
		// Define dependent specific settings
	}

	/**
	 * execConnecterApi: Connector API execution request
	 * @param {Object} client : The core-side client from which the run was requested
	 * @param {JSON} params : Information to determine the distribution of operations to be performed on the EC side
	 * {
	 * 		"apiType":<API Type>, 				- one of "reference" "," "transfer" "," "payment"
	 * 		"progress":<Transfer Status>, 		- one of "MarginOrDfreeze" "," "Credit" "," "Freeze" "," "Recovery" "," "Other"
	 * 		"txInfo": <Transaction Information>, object for inter-EC asset transfer transaction information"
	 * 		"otherData": <Other Parameters> 	- as is, where to find in the pre-supply review" "targetAccountID" "only"
	 * }
	**/
	execConnecterApi(client, params) {
		var functionName = "";
		var args = {};
		// Write the processing according to the API definition of the connector side
		var apiType = params.apiType;
		var progress = params.progress;
		var txInfo = params.txInfo;
		var otherData = params.otherData;
		var fromAddress = "";
		var toAddress = "";
		var referedAddress = "";
		var amount = 0;

		switch(apiType) {
			case "reference":
				var referedAddress = '';
				if (progress == 'MarginOrDfreeze') {
					// Confirmation of fromAccount and balance before escrow or directly freezing
					functionName = 'getNumericBalance';
					referedAddress = txInfo._fromAccountID;
				} else if (progress == 'Credit') {
					functionName = 'getNumericBalance';
					referedAddress = otherData.targetAccountID;
				} else if (progress == 'Other') {
					functionName = 'getNumericBalance';
					referedAddress = otherData.targetAccountID;
				} else {
					// Suppress sending to server plugins by making functionName empty.
					functionName = "";
				}
				// Create the argument as a JSON object.
				args = {
					"referedAddress" : referedAddress
				};
				break;
			case "transfer":
				functionName = 'transferNumericAsset';
				if (progress == 'MarginOrDfreeze') {
					// Escrow or directly freezing request
					// segregate destination with/without escrow
					if (txInfo._fromEscrowID != '') {
						toAddress = txInfo._fromEscrowID;
					} else {
						toAddress = txInfo._fromSettlementID;
					}
					fromAddress = txInfo._fromAccountID;
				} else if (progress == 'Freeze') {
					// Freezing request
					fromAddress = txInfo._fromEscrowID;
					toAddress = txInfo._fromSettlementID;
				} else if (progress == 'Recovery') {
					// Recovery request
					// segregate assets with/without escrow
					if (txInfo._fromEscrowID != '') {
						fromAddress = txInfo._fromEscrowID;
					} else {
						fromAddress = txInfo._fromSettlementID;
					}
					toAddress = txInfo._fromAccountID;
				} else {
					// Bad pattern, empty function name leads to error
					functionName = "";
				}
				amount = txInfo._fromAsset;
				// Create the argument as a JSON object.
				args = {
					"fromAddress" : fromAddress,
					"toAddress" : toAddress,
					"amount" : amount
				};
				break;
			case "payment":
				if (progress == 'Credit') {
					amount = txInfo._toAsset;
					// Credit request
					// Trasnfering from the settlement account of the fromChain
					functionName = 'transferNumericAsset';
					fromAddress = txInfo._toSettlementID;
					toAddress = txInfo._toAccountID;
					args = {
						"fromAddress" : fromAddress,
						"toAddress" : toAddress,
						"amount" : amount
					};
				} else {
					// Bad pattern, empty function name leads to error
					functionName = "";
				}
				break;
			default:
				return new Promise((resolve, reject) => {
					var emsg = "apiType \"" + apiType + "\" not found!";
					logger.error(emsg);
					var ret_obj = {
						"status" : 404,
						"errorCode" : 3000,
						"errorDetail" : emsg
					};
					return reject(ret_obj);
				});
		}	// switch(apiType)

		if (functionName=="") {
			return new Promise((resolve, reject) => {
				var emsg = "Function not found!";
				logger.error(emsg);
				var ret_obj = {
					"status" : 404,
					"errorCode" : 3000,
					"errorDetail" : emsg
				};
				return reject(ret_obj);
			});
		}

		return new Promise((resolve, reject) => {
			logger.info('  function     : ' + functionName);
			logger.info('  args         : ' + JSON.stringify(args));

			connector_if.request(client, functionName, args)
			.then((response) => {
				return resolve(response);
			})
			.catch((err) => {
				return reject(err);
			});
		});
	}

	startMonitor(client, cb) {
		var plugCb = function(res) {
			var events = [];
			if (res.status == 200) {
				// res into a core-readable format (Array of identification IDs and data bodies)
				var block = res.blockData;
				var len = block.transactions.length;
				for (var i = 0; i < len; i++) {
					var txData = block.transactions[i];
					var txid = txData.hash; // Ethereum has id in "hash"
					var eventInfo = {
						'id' : txid,
						'data' : txData
					};
					events[i] = eventInfo;
				}

				var ret_obj = {
					"status" : 200,
					"events" : events
				};
				cb(ret_obj);
			} else {
				// Callback in response to error
				cb(res);
			}
		}
		connector_if.startMonitor(client, plugCb);
	}

	stopMonitor(clientid) {
		connector_if.stopMonitor(clientid);
	}

}	/* class */

module.exports = ClientPlugin;

