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
// Libraries of a part independent of end-chains (cooperation server side)
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
	**/
	execConnecterApi(client, params) {
		var functionName = "";
		var args = {};
		// Write the processing according to the API definition of the connector side
		// Example)
		/*
			// Determine the function of the connector to be executed based on the contents of params
			// build arguments from params, configuration file, etc.
			var apiType = params.type;
			switch(apiType) {
				case "test":
					functionName = "connecterFunc1";
					args = {
						"arg1": params.info,
						"arg2": CplugConfig.adapterDefData
					};
					break;
				case "dummy":
					functionName = "connecterFunc2";
					args = {
						"argX": "dummy_data"
					};
					break;
				default:
			}
		 */

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
				// Example)
				/*
					for (var i = 0; i < res.data.length; i++) {
						var eventInfo = {
							"id"  : res.data[i].id,
							"data": res.data[i].detail
						};
						events[i] = eventInfo;
					}
				 */

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

