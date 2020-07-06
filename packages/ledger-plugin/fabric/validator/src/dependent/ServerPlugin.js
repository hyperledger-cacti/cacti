/*
 * Copyright 2019-2020 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 *
 * ServerPlugin.js
 */

/*
 * Summary:
 * Dependent part of the connection destination of the connector
 * Define and implement the function independently according to the connection destination dependent part (adapter) on the core side.
 */

'use strict';

// config file
var SplugConfig = require('./PluginConfig.js');
var config = require('config');
// Log settings
var log4js = require('log4js');
var logger = log4js.getLogger('ServerPlugin[' + process.pid + ']');
logger.level = config.logLevel;
// utility
var SplugUtil = require('./PluginUtil.js');
// Read the library, SDK, etc. according to EC specifications as needed
var fabric = require('./fabricaccess.js');

/*
 * ServerPlugin
 * ServerPlugin class definition
 */
var ServerPlugin = class {
	/*
	 * constructor
	 */
	constructor() {
		// Define settings specific to the dependent part
	}

	/*
	 * isExistFunction
	 *
	 * @param {String} funcName : The function name you want to determine.
	 *
	 * @return {Boolean} true : exist / false : not exist
	 *
	 * @desc Determines if the specified function exists in its class.
	 *       Make sure that the support status of your class can be determined by your class.
	 *       Functions that you do not want to call directly need to be devised such as implemented outside of this class like utilities.
	 */
	isExistFunction(funcName) {
		if (this[funcName] != undefined) {
			return true;
		} else {
			return false;
		}
	}

	/*
	 * changeCarOwner
	 * Change car owner
	 *
	 * @param {Object} args :  JSON Object
	 * {
	 * 		"carId":<Car ID>,
	 * 		"newOwner":<New owner name>
	 * }
	 * @return {Object} JSON object
	 */
	changeCarOwner(args) {
		return new Promise((resolve, reject) => {
			logger.info("changeCarOwner start");
			var ret_obj = {};
			var carId = args["carId"];
			var newOwner = args["newOwner"];
			if (carId == undefined || newOwner == undefined) {
				var emsg = "Insufficient parameters.";
				logger.info(emsg);
				ret_obj = {
					"status": 504,
					"errorDetail": emsg
				};
				return reject(ret_obj);
			}
			var reqparam = { fcn: "changeCarOwner", args: [carId, newOwner] };
			// Block generation event monitoring target because it is performed from the operation request by the CC chain code
			fabric.Invoke(reqparam, false)
				.then((returnvalue) => {
					if (returnvalue != null) {
						ret_obj = {
							"status": 200,
							"data": returnvalue // Should contain the transaction ID
						};
						return resolve(ret_obj);
					}
				}).catch(err => {
					var emsg = err.toString().replace(/Error: /g, "");
					logger.error(emsg);
					ret_obj = {
						"status": 504,
						"errorDetail": emsg
					};
					return reject(ret_obj);
				});
		});
	}

	/**
	 * Offline trading
	 * @param {object} args 
	 *          [0]  signedCommitProposal 
	 *          [1]	 commitReq            
	 * @return {Object} JSON object
	 */
	sendSignedProposal(args) {
		return new Promise((resolve, reject) => {
			logger.info("sendSignedProposal start");
			var ret_obj = {};
			// parameter check
			logger.info("sendSignedProposal parameter check");
			var signedCommitProposal = args[0];
			var commitReq = args[1];
			if (signedCommitProposal == undefined || commitReq == undefined) {
				var emsg = "Insufficient parameters.";
				logger.info(emsg);
				ret_obj = {
					"status": 504,
					"errorDetail": emsg
				};
				return reject(ret_obj);
			}
			// call chainncode
			fabric.InvokeSendSignedProposal(signedCommitProposal, commitReq)
				.then((returnvalue) => {
					if (returnvalue != null) {
						ret_obj = {
							"status": 200,
							"data": returnvalue
						};
						return resolve(ret_obj);
					}
				}).catch(err => {
					var emsg = err.toString().replace(/Error: /g, "");
					logger.error(emsg);
					ret_obj = {
						"status": 504,
						"errorDetail": emsg
					};
					return reject(ret_obj);
				});
		});
	}

}	/* class */

module.exports = ServerPlugin;

