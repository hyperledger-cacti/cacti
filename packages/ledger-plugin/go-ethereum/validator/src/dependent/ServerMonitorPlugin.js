/*
 * Copyright 2019-2020 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ServerMonitorPlugin.js
 */

/*
 * Summary:
 * Connector: monitoring class of a part dependent on end-chains
 * Used in the case of monitoring continuously.
 * Processing that ends with the acceptance of a single event is handled by a custom function implementation in server plugins.
 * Unlike server plugins, it basically does not handle its own functions.
 */

// configuration file
var SplugConfig = require('./PluginConfig.js');
var config = require('config');
// Log settings
var log4js = require('log4js');
var logger = log4js.getLogger('ServerMonitorPlugin[' + process.pid + ']');
logger.level = config.logLevel;
// Load libraries, SDKs, etc. according to specifications of endchains as needed
var Web3 = require('web3');

/*
 * ServerMonitorPlugin
 * Class definitions of server monitoring 
 */
var ServerMonitorPlugin = class {
	/*
	 * constructors
	 */
	constructor(){
		// Define dependent specific settings
		// Initialize monitored filter
		this._filterTable = {};
	}

	/*
	 * startMonitor
	 * Start Monitoring
	 * @param {string} clientId: Client ID from which monitoring start request was made
	 * @param {function} cb: A callback function that receives monitoring results at any time.
	 */
	startMonitor(clientId, cb) {
		logger.info('*** START MONITOR ***');
		logger.info('Client ID :' + clientId);
		// Implement handling to receive events from an end-chain and return them in a callback function
		var filter = this._filterTable[clientId];
		if (!filter) {
			logger.info('create new web3 filter and start watching.');
			try {
				var web3 = new Web3();
				var provider = new web3.providers.HttpProvider(SplugConfig.provider);
				web3.setProvider(provider);
				filter = web3.eth.filter("latest");
				// filter should be managed by client ID
				// (You should never watch multiple urls from the same client)
				this._filterTable[clientId] = filter;
				filter.watch(function (error, blockHash) {
					if (!error) {
						console.log('##[HL-BC] Notify new block data(D2)');
						var blockData = web3.eth.getBlock(blockHash, true);
						var trLength = blockData.transactions.length;
						logger.info(trLength + " transactions in block " + blockData.number);
						console.log('##[HL-BC] Validate transactions(D3)');
						console.log('##[HL-BC] digital sign on valid transaction(D4)');
						if (trLength > 0) {
							logger.info('*** SEND BLOCK DATA ***');
							// Notify only if transaction exists
							var ret_obj = {
								"status"    : 200,
								"blockData" : blockData
							};
							cb(ret_obj);
						}
					} else {
						var err_obj = {
							"status" : 504,
							"errorDetail" : error
						};
						cb(err_obj);
					}
				});
			} catch (e) {
				var emsg = e.toString().replace(/Error: /g , "");
				var err_obj = {
					"status" : 504,
					"errorDetail" : emsg
				};
				cb(err_obj);
			}
		} else {
			logger.info('target filter has already start watching.');
		}
	}
	
	/*
	 * stopMonitor
	 * monitoring stop
	 * @param {string} clientId: Client ID from which monitoring stop request was made
	 */
	stopMonitor(clientId) {
		// Implement a process to end EC monitoring
		var filter = this._filterTable[clientId];
		if (filter) {
			// Stop the filter & Remove it from table
			logger.info('stop watching and remove filter.');
			filter.stopWatching();
			delete this._filterTable[clientId];
		}
	}

}	/* class */

module.exports = ServerMonitorPlugin;

