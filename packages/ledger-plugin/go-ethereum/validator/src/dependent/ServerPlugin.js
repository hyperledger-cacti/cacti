/*
 * Copyright 2019-2020 Fujitsu Laboratories Ltd.
 * SPDX-License-Identifier: Apache-2.0
 * 
 * ServerPlugin.js
 */

/*
 * Summary:
 * Connector: a part dependent on endchains
 * Define and implement the function according to the connection destination dependent part (ADAPTER) on the core side.
 */

// configuration file
var SplugConfig = require('./PluginConfig.js');
var config = require('config');
// Log settings
var log4js = require('log4js');
var logger = log4js.getLogger('ServerPlugin[' + process.pid + ']');
logger.level = config.logLevel;
// utility
var SplugUtil = require('./PluginUtil.js');
// Load libraries, SDKs, etc. according to specifications of endchains as needed
var Web3 = require('web3');


/*
 * ServerPlugin
 * Class definition for server plugins
 */
var ServerPlugin = class {
	/*
	 * constructors
	 */
	constructor(){
		// Define dependent specific settings
	}

	/*
	 * isExistFunction
	 *
	 * @param {String} funcName: The function name to check.
	 *
	 * @return {Boolean} true: Yes./false: does not exist.
	 *
	 * @desc Return if end-chain specific funtion is implemented
	 *       Scope of this function is in this class
	 *       Functions that should not be called directly should be implemented outside this class like utilities.
	 */
	isExistFunction(funcName) {
		if(this[funcName]!=undefined) {
			return true;
		} else {
			return false;
		}
	}

	// Define an arbitrary function and implement it according to specifications of end-chains
	/*
	 * getNumericBalance
	 * Get numerical balance
	 *
	 * @param {Object} args JSON Object
	 * {
	 * 		"referedAddress":<reference account>
	 * }
	 * @return {Object} JSON object
	 */
	getNumericBalance(args) {
		// * The Web3 API can be used synchronously, but each function is always an asynchronous specification because of the use of other APIs such as REST,
		return new Promise((resolve, reject) => {
			logger.info("getNumericBalance start");
			var ret_obj = {};
			if(args["referedAddress"]==undefined) {
				var emsg = "JSON parse error!";
				logger.info(emsg);
				ret_obj = {
					"status" : 504,
					"errorDetail" : emsg
				};
				return reject(ret_obj);
			}
			var ethargs = args["referedAddress"];
			// Handling exceptions to absorb the difference of interest.
			try {
				var web3 = new Web3();
				web3.setProvider(new web3.providers.HttpProvider(SplugConfig.provider));
				var balance = web3.eth.getBalance(ethargs);
				var amount_val = balance.toNumber();

				ret_obj = {
					"status" : 200,
					"amount" : amount_val
				};
				return resolve(ret_obj);
			} catch (e) {
				var emsg = e.toString().replace(/Error: /g , "");
				logger.error(emsg);
				ret_obj = {
					"status" : 504,
					"errorDetail" : emsg
				};
				return reject(ret_obj);
			}
		});
	}

	/*
	 * transferNumericAsset
	 * Transfer numerical asset
	 *
	 * @param {Object} args JSON Object
	 * {
	 * 		"fromAddress":<sender account>,
	 * 		"toAddress":<receiver account>,
	 * 		"amount":<transfering amount>
	 * }
	 * @return {Object} JSON object
	 */
	transferNumericAsset(args) {
		return new Promise((resolve, reject) => {
			logger.info("transferNumericAsset start");

			var ret_obj = {};
			var send_args = {};
			var send_function = 'sendTransaction';

			if((args["fromAddress"]==undefined)||(args["toAddress"]==undefined)||
			   (args["amount"]==undefined)) {
				var emsg = "JSON parse error!";
				logger.error(emsg);
				ret_obj = {
					"status" : 504,
					"errorDetail" : emsg
				};
				return reject(ret_obj);
			}
			// Dealing with exponentiation strings.
			var amount = SplugUtil.convNum(args["amount"], 0);

			// Create an argument object for sendTransaction.
			send_args = {
				"from" : args["fromAddress"],
				"to" : args["toAddress"],
				"value" : amount
			};


			logger.info('send_func  :' + send_function);
			logger.info('send_args  :' + JSON.stringify(send_args));

			// Handle the exception once to absorb the difference of interest.
			try {
				var web3 = new Web3();
				web3.setProvider(new web3.providers.HttpProvider(SplugConfig.provider));
				var res = web3.eth[send_function](send_args);

				ret_obj = {
					"status" : 200,
					"txid" : res
				};
				return resolve(ret_obj);
			} catch (e) {
				var emsg = e.toString().replace(/Error: /g , "");
				logger.error(emsg);
				ret_obj = {
					"status" : 504,
					"errorDetail" : emsg
				};
				return reject(ret_obj);
			}
		});
	}

	/*
	 * sendRawTransaction
	 * send row trancastion
	 *
	 * @param {Object} args JSON Object
	 * {
	 * 		"serializedTx":<Serialized and signed transaction>
	 * }
	 * @return {Object} JSON object
	 */
	sendRawTransaction(args) {
		return new Promise((resolve, reject) => {
			logger.info("sendRawTransaction start");

			var ret_obj = {};
			var send_args = {};
			var send_function = 'sendTransaction';

			if(args["serializedTx"]==undefined) {
				var emsg = "JSON parse error!";
				logger.error(emsg);
				ret_obj = {
					"status" : 504,
					"errorDetail" : emsg
				};
				return reject(ret_obj);
			}
			
			var serializedTx = args["serializedTx"];
			logger.info('serializedTx  :' + serializedTx);
			
			// Handle the exception once to absorb the difference of interest.
			try {
				var web3 = new Web3();
				web3.setProvider(new web3.providers.HttpProvider(SplugConfig.provider));
				var res = web3.eth.sendRawTransaction(serializedTx);

				ret_obj = {
					"status" : 200,
					"txid" : res
				};
				return resolve(ret_obj);
			} catch (e) {
				var emsg = e.toString().replace(/Error: /g , "");
				logger.error(emsg);
				ret_obj = {
					"status" : 504,
					"errorDetail" : emsg
				};
				return reject(ret_obj);
			}
		});
	}

}	/* class */

module.exports = ServerPlugin;

