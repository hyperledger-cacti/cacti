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
export class ServerPlugin {
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
     *      "referedAddress":<reference account>,
     *      "reqID":<request ID> (option)
     * }
     * @return {Object} JSON object
     */
    getNumericBalance(args) {
        // * The Web3 API can be used synchronously, but each function is always an asynchronous specification because of the use of other APIs such as REST,
        return new Promise((resolve, reject) => {
            logger.info("getNumericBalance start");
            var retObj = {};
            if(args["referedAddress"]==undefined) {
                let emsg = "JSON parse error!";
                logger.info(emsg);
                retObj = {
                    "resObj" : {
                        "status" : 504,
                        "errorDetail" : emsg
                    }
                };
                return reject(retObj);
            }
            var ethargs = args["referedAddress"];
            // Handling exceptions to absorb the difference of interest.
            try {
                var web3 = new Web3();
                web3.setProvider(new web3.providers.HttpProvider(SplugConfig.provider));
                var balance = web3.eth.getBalance(ethargs);
                var amountVal = balance.toNumber();
                retObj = {
                    "resObj" : {
                        "status" : 200,
                        "amount" : amountVal
                    }
                };
                logger.debug("##getNumericBalance: add reqID");
                if (args["reqID"] !== undefined) {
                    retObj["id"] = args["reqID"];
                }
                logger.debug(`##getNumericBalance: retObj: ${JSON.stringify(retObj)}`);
                return resolve(retObj);
            } catch (e) {
                let emsg = e.toString().replace(/Error: /g , "");
                logger.error(emsg);
                retObj = {
                    "resObj" : {
                        "status" : 504,
                        "errorDetail" : emsg
                    }
                };
                logger.debug("##getNumericBalance: add reqID");
                if (args["reqID"] !== undefined) {
                    retObj["id"] = args["reqID"];
                }
                logger.debug(`##getNumericBalance: retObj: ${JSON.stringify(retObj)}`);
                return reject(retObj);
            }
        });
    }

    /*
     * transferNumericAsset
     * Transfer numerical asset
     *
     * @param {Object} args JSON Object
     * {
     *      "fromAddress":<sender account>,
     *      "toAddress":<receiver account>,
     *      "amount":<transfering amount>,
     *      "reqID":<request ID> (option)
     * }
     * @return {Object} JSON object
     */
    transferNumericAsset(args) {
        return new Promise((resolve, reject) => {
            logger.info("transferNumericAsset start");

            var retObj = {};
            var sendArgs = {};
            var sendFunction = 'sendTransaction';

            if((args["fromAddress"]==undefined)||(args["toAddress"]==undefined)||
               (args["amount"]==undefined)) {
                let emsg = "JSON parse error!";
                logger.error(emsg);
                retObj = {
                    "resObj" : {
                        "status" : 504,
                        "errorDetail" : emsg
                    }
                };
                return reject(retObj);
            }
            // Dealing with exponentiation strings.
            var amount = SplugUtil.convNum(args["amount"], 0);

            // Create an argument object for sendTransaction.
            sendArgs = {
                "from" : args["fromAddress"],
                "to" : args["toAddress"],
                "value" : amount
            };


            logger.info('send_func  :' + sendFunction);
            logger.info('sendArgs  :' + JSON.stringify(sendArgs));

            // Handle the exception once to absorb the difference of interest.
            try {
                var web3 = new Web3();
                web3.setProvider(new web3.providers.HttpProvider(SplugConfig.provider));
                var res = web3.eth[sendFunction](sendArgs);

                retObj = {
                    "resObj" : {
                        "status" : 200,
                        "txid" : res
                    }
                };
                logger.debug("##transferNumericAsset: add reqID");
                if (args["reqID"] !== undefined) {
                    retObj["reqID"] = args["reqID"];
                }
                logger.debug(`##transferNumericAsset: retObj: ${JSON.stringify(retObj)}`);
                return resolve(retObj);
            } catch (e) {
                let emsg = e.toString().replace(/Error: /g , "");
                logger.error(emsg);
                retObj = {
                    "resObj" : {
                        "status" : 504,
                        "errorDetail" : emsg
                    }
                };
                logger.debug("##transferNumericAsset: add reqID");
                if (args["reqID"] !== undefined) {
                    retObj["reqID"] = args["reqID"];
                }
                logger.debug(`##transferNumericAsset: retObj: ${JSON.stringify(retObj)}`);
                return reject(retObj);
            }
        });
    }

    /*
     * sendRawTransaction
     * send row trancastion
     *
     * @param {Object} args JSON Object
     * {
     *      "serializedTx":<Serialized and signed transaction>
     * }
     * @return {Object} JSON object
     */
    sendRawTransaction(args) {
        return new Promise((resolve, reject) => {
            logger.info("sendRawTransaction start");

            var retObj = {};
            var sendArgs = {};
            var sendFunction = 'sendTransaction';

            if(args["serializedTx"]==undefined) {
                let emsg = "JSON parse error!";
                logger.error(emsg);
                retObj = {
                    "status" : 504,
                    "errorDetail" : emsg
                };
                return reject(retObj);
            }
            
            var serializedTx = args["serializedTx"];
            logger.info('serializedTx  :' + serializedTx);
            
            // Handle the exception once to absorb the difference of interest.
            try {
                var web3 = new Web3();
                web3.setProvider(new web3.providers.HttpProvider(SplugConfig.provider));
                var res = web3.eth.sendRawTransaction(serializedTx);

                retObj = {
                    "status" : 200,
                    "txid" : res
                };
                return resolve(retObj);
            } catch (e) {
                let emsg = e.toString().replace(/Error: /g , "");
                logger.error(emsg);
                retObj = {
                    "status" : 504,
                    "errorDetail" : emsg
                };
                return reject(retObj);
            }
        });
    }

}   /* class */

