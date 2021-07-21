/*
 * Copyright 2021 Hyperledger Cactus Contributors
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
// const SplugConfig = require("./PluginConfig.js");
import { SplugConfig } from "./PluginConfig";
import { config } from "../core/config/default";
import path from "path";
import fs from "fs";
// Log settings
import { getLogger } from "log4js";
const logger = getLogger("ServerPlugin[" + process.pid + "]");
logger.level = config.logLevel;
// utility
// const SplugUtil = require("./PluginUtil.js");
import { convNum } from "./PluginUtil";
import { ValidatorAuthentication } from "../../../../ValidatorAuthentication";
// Load libraries, SDKs, etc. according to specifications of endchains as needed
import Web3 from "web3";

const privateKeyB64 = fs.readFileSync(
  path.resolve(__dirname, config.validatorKeyPath),
  "base64",
);

/*
 * ServerPlugin
 * Class definition for server plugins
 */
export class ServerPlugin {
  /*
   * constructors
   */
  constructor() {
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
  isExistFunction(funcName: any) {
    if ((this as any)[funcName] != undefined) {
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
  getNumericBalance(args: any) {
    // * The Web3 API can be used synchronously, but each function is always an asynchronous specification because of the use of other APIs such as REST,
    return new Promise((resolve, reject) => {
      logger.info("getNumericBalance start");
      let retObj: any = {};

      const referedAddress = args.args.args[0];
      const reqID = args["reqID"];

      if (referedAddress === undefined) {
        const emsg = "JSON parse error!";
        logger.info(emsg);
        retObj = {
          resObj: {
            status: 504,
            errorDetail: emsg,
          },
        };
        return reject(retObj);
      }
      const ethargs = referedAddress;
      // Handling exceptions to absorb the difference of interest.
      try {
        const web3 = new Web3();
        web3.setProvider(new Web3.providers.HttpProvider(SplugConfig.provider));
        const balance: any = web3.eth.getBalance(ethargs);
        const amountVal = balance.toNumber();
        retObj = {
          resObj: {
            status: 200,
            amount: amountVal,
          },
        };
        if (reqID !== undefined) {
          retObj["id"] = reqID;
        }
        logger.debug(`##getNumericBalance: retObj: ${JSON.stringify(retObj)}`);
        return resolve(retObj);
      } catch (e) {
        const emsg = e.toString().replace(/Error: /g, "");
        logger.error(emsg);
        retObj = {
          resObj: {
            status: 504,
            errorDetail: emsg,
          },
        };
        if (reqID !== undefined) {
          retObj["id"] = reqID;
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
  transferNumericAsset(args: any) {
    return new Promise((resolve, reject) => {
      logger.info("transferNumericAsset start");

      let retObj: any = {};
      let sendArgs = {};
      const sendFunction = "sendTransaction";
      // const funcParam = args;
      const funcParam = args.args.args[0];
      const reqID = args["reqID"];

      if (
        funcParam["fromAddress"] == undefined ||
        funcParam["toAddress"] == undefined ||
        funcParam["amount"] == undefined
      ) {
        const emsg = "JSON parse error!";
        logger.error(emsg);
        retObj = {
          resObj: {
            status: 504,
            errorDetail: emsg,
          },
        };
        return reject(retObj);
      }
      // Dealing with exponentiation strings.
      const amount = convNum(funcParam["amount"], 0);

      // Create an argument object for sendTransaction.
      sendArgs = {
        from: funcParam["fromAddress"],
        to: funcParam["toAddress"],
        value: amount,
      };

      logger.info("send_func  :" + sendFunction);
      logger.info("sendArgs  :" + JSON.stringify(sendArgs));

      // Handle the exception once to absorb the difference of interest.
      try {
        const web3 = new Web3();
        web3.setProvider(new Web3.providers.HttpProvider(SplugConfig.provider));
        const res = web3.eth[sendFunction](sendArgs);

        retObj = {
          resObj: {
            status: 200,
            txid: res,
          },
        };
        if (reqID !== undefined) {
          retObj["reqID"] = reqID;
        }
        logger.debug(
          `##transferNumericAsset: retObj: ${JSON.stringify(retObj)}`,
        );
        return resolve(retObj);
      } catch (e) {
        const emsg = e.toString().replace(/Error: /g, "");
        logger.error(emsg);
        retObj = {
          resObj: {
            status: 504,
            errorDetail: emsg,
          },
        };
        if (reqID !== undefined) {
          retObj["reqID"] = reqID;
        }
        logger.debug(
          `##transferNumericAsset: retObj: ${JSON.stringify(retObj)}`,
        );
        return reject(retObj);
      }
    });
  }

  /*
   * getNonce
   * Get nonce. nonce is transaction count.
   *
   * @param {Object} args JSON Object
   * {
   *      "targetAddress":<target account>,
   *      "reqID":<request ID> (option)
   * }
   * @return {Object} JSON object
   */
  getNonce(args: any) {
    // * The Web3 API can be used synchronously, but each function is always an asynchronous specification because of the use of other APIs such as REST,
    return new Promise((resolve, reject) => {
      logger.info("getNonce start");
      let retObj: any = {};

      const validatorAuthentication = new ValidatorAuthentication({
        logLevel: config.logLevel,
        privateKeyB64,
      });

      const targetAddress = args.args.args.args[0];
      const reqID = args["reqID"];

      if (targetAddress === undefined) {
        const emsg = "JSON parse error!";
        logger.info(emsg);
        retObj = {
          resObj: {
            status: 504,
            errorDetail: emsg,
          },
        };
        return reject(retObj);
      }

      // var ethargs = '0x' + targetAddress;
      const ethargs = targetAddress;
      logger.debug(
        `getNonce(): ethargs: ${ethargs}, targetAddress: ${targetAddress}`,
      );
      // Handling exceptions to absorb the difference of interest.
      try {
        const web3 = new Web3();
        web3.setProvider(new Web3.providers.HttpProvider(SplugConfig.provider));
        // FIXME - compiler error, double check if this code is broken
        const txnCount: any = web3.eth.getTransactionCount(ethargs);
        logger.info(`getNonce(): txnCount: ${txnCount}`);
        const hexStr = Web3.utils.toHex(txnCount);
        logger.info(`getNonce(): hexStr: ${hexStr}`);
        const result = {
          nonce: txnCount,
          nonceHex: hexStr,
        };
        logger.debug(`getNonce(): result: ${result}`);

        const signedResults = validatorAuthentication.sign({ result: result });
        logger.debug(`getNonce(): signedResults: ${signedResults}`);
        retObj = {
          resObj: {
            status: 200,
            data: signedResults,
          },
        };
        if (reqID !== undefined) {
          retObj["id"] = reqID;
        }
        logger.debug(`##getNonce: retObj: ${JSON.stringify(retObj)}`);
        return resolve(retObj);
      } catch (e) {
        const emsg = e.toString().replace(/Error: /g, "");
        logger.error(emsg);
        retObj = {
          resObj: {
            status: 504,
            errorDetail: emsg,
          },
        };
        if (reqID !== undefined) {
          retObj["id"] = reqID;
        }
        logger.debug(`##getNonce: retObj: ${JSON.stringify(retObj)}`);
        return reject(retObj);
      }
    });
  }

  /*
   * toHex
   * Convert to hex string.
   *
   * @param {Object} args JSON Object
   * {
   *      "value":<value>,
   *      "reqID":<request ID> (option)
   * }
   * @return {Object} JSON object
   */
  toHex(args: any) {
    // * The Web3 API can be used synchronously, but each function is always an asynchronous specification because of the use of other APIs such as REST,
    return new Promise((resolve, reject) => {
      logger.info("toHex start");
      let retObj: any = {};

      const validatorAuthentication = new ValidatorAuthentication({
        logLevel: config.logLevel,
        privateKeyB64,
      });

      const targetValue = args.args.args.args[0];
      const reqID = args["reqID"];

      if (targetValue === undefined) {
        const emsg = "JSON parse error!";
        logger.info(emsg);
        retObj = {
          resObj: {
            status: 504,
            errorDetail: emsg,
          },
        };
        return reject(retObj);
      }

      logger.debug(`toHex(): targetValue: ${targetValue}`);
      // Handling exceptions to absorb the difference of interest.
      try {
        const web3 = new Web3();
        web3.setProvider(new Web3.providers.HttpProvider(SplugConfig.provider));
        const hexStr = Web3.utils.toHex(targetValue);
        logger.info(`toHex(): hexStr: ${hexStr}`);
        const result = {
          hexStr: hexStr,
        };
        logger.debug(`toHex(): result: ${result}`);

        const signedResults = validatorAuthentication.sign({ result: result });
        logger.debug(`toHex(): signedResults: ${signedResults}`);
        retObj = {
          resObj: {
            status: 200,
            data: signedResults,
          },
        };
        if (reqID !== undefined) {
          retObj["id"] = reqID;
        }
        logger.debug(`##toHex: retObj: ${JSON.stringify(retObj)}`);
        return resolve(retObj);
      } catch (e) {
        const emsg = e.toString().replace(/Error: /g, "");
        logger.error(emsg);
        retObj = {
          resObj: {
            status: 504,
            errorDetail: emsg,
          },
        };
        if (reqID !== undefined) {
          retObj["id"] = reqID;
        }
        logger.debug(`##toHex: retObj: ${JSON.stringify(retObj)}`);
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
  sendRawTransaction(args: any) {
    return new Promise((resolve, reject) => {
      logger.info("sendRawTransaction(start");

      let retObj: any = {};
      const funcParam = args.args.args[0];

      if (funcParam["serializedTx"] == undefined) {
        const emsg = "JSON parse error!";
        logger.error(emsg);
        retObj = {
          status: 504,
          errorDetail: emsg,
        };
        return reject(retObj);
      }

      const serializedTx = funcParam["serializedTx"];
      logger.info("serializedTx  :" + serializedTx);

      // Handle the exception once to absorb the difference of interest.
      try {
        const web3: any = new Web3();
        web3.setProvider(new Web3.providers.HttpProvider(SplugConfig.provider));
        // FIXME - double check if this works, compiler thinks it's broken
        const res = web3.eth.sendRawTransaction(serializedTx);

        retObj = {
          status: 200,
          txid: res,
        };
        return resolve(retObj);
      } catch (e) {
        const emsg = e.toString().replace(/Error: /g, "");
        logger.error(emsg);
        retObj = {
          status: 504,
          errorDetail: emsg,
        };
        return reject(retObj);
      }
    });
  }

  /*
   * web3Eth
   *
   * @param {Object} args JSON Object
   * {
   *      "method":<method information>,
   *      "args":<argument information>,
   *      "reqID":<request ID> (option)
   * }
   * @return {Object} JSON object
   */
  web3Eth(args: any) {
    return new Promise((resolve, reject) => {
      logger.info("web3Eth start");
      const validatorAuthentication = new ValidatorAuthentication({
        logLevel: config.logLevel,
        privateKeyB64,
      });
      let retObj: any = {};
      const sendFunction = args.method.command;
      const sendArgs = args.args.args[0];
      const reqID = args["reqID"];

      logger.info("send_func  :" + sendFunction);
      logger.info("sendArgs  :" + JSON.stringify(sendArgs));

      // Handle the exception once to absorb the difference of interest.
      try {
        // FIXME - compiler thinks this is broken, check on it at runtime
        const web3: any = new Web3();
        web3.setProvider(new Web3.providers.HttpProvider(SplugConfig.provider));
        let result: any = null;
        if (sendArgs !== undefined) {
          result = web3.eth[sendFunction](sendArgs);
        } else {
          result = web3.eth[sendFunction]();
        }
        const signedResults = validatorAuthentication.sign({ result: result });
        retObj = {
          resObj: {
            status: 200,
            data: signedResults,
          },
        };
        if (reqID !== undefined) {
          retObj["id"] = reqID;
        }
        logger.debug(`##web3Eth: retObj: ${JSON.stringify(retObj)}`);
        return resolve(retObj);
      } catch (e) {
        const emsg = e.toString().replace(/Error: /g, "");
        logger.error(emsg);
        retObj = {
          resObj: {
            status: 504,
            errorDetail: emsg,
          },
        };
        if (reqID !== undefined) {
          retObj["id"] = reqID;
        }
        logger.debug(`##web3Eth: retObj: ${JSON.stringify(retObj)}`);
        return reject(retObj);
      }
    });
  }

  /*
   * contract
   *
   * @param {Object} args JSON Object
   * {
   *      "contract":<contract information>,
   *      "method":<method information>,
   *      "args":<argument information>,
   *      "reqID":<request ID> (option)
   * }
   * @return {Object} JSON object
   */
  contract(args: any) {
    return new Promise((resolve, reject) => {
      logger.info("contract start");
      const validatorAuthentication = new ValidatorAuthentication({
        logLevel: config.logLevel,
        privateKeyB64,
      });

      let retObj: any = {};
      const sendCommand = args.method.command;
      const sendFunction = args.method.function;
      const sendArgs = args.args.args;
      const reqID = args["reqID"];

      logger.info("sendCommand  :" + sendCommand);
      logger.info("sendFunction  :" + sendFunction);
      logger.info("sendArgs  :" + JSON.stringify(sendArgs));

      // Handle the exception once to absorb the difference of interest.
      try {
        // FIXME - the compiler thinks that this is broken - double check it
        const web3: any = new Web3();
        web3.setProvider(new Web3.providers.HttpProvider(SplugConfig.provider));
        const contract = web3.eth
          .contract(args.contract.abi)
          .at(args.contract.address);

        let result: any = null;
        switch (sendArgs.length) {
          case 0:
            logger.debug(`##contract: No args.`);
            result = contract[sendCommand][sendFunction]();
            break;
          case 1:
            logger.debug(`##contract: One arg.`);
            result = contract[sendCommand][sendFunction](sendArgs[0]);
            break;
          case 2:
            logger.debug(`##contract: Two args.`);
            result = contract[sendCommand][sendFunction](
              sendArgs[0],
              sendArgs[1],
            );
            break;
          case 3:
            logger.debug(`##contract: Three args.`);
            result = contract[sendCommand][sendFunction](
              sendArgs[0],
              sendArgs[1],
              sendArgs[2],
            );
            break;
        }
        logger.debug(`##contract: result: ${result}`);

        const signedResults = validatorAuthentication.sign({ result: result });
        retObj = {
          resObj: {
            status: 200,
            data: signedResults,
          },
        };
        if (reqID !== undefined) {
          retObj["id"] = reqID;
        }
        logger.debug(`##contract: retObj: ${JSON.stringify(retObj)}`);
        return resolve(retObj);
      } catch (e) {
        const emsg = e.toString().replace(/Error: /g, "");
        logger.error(emsg);
        retObj = {
          resObj: {
            status: 504,
            errorDetail: emsg,
          },
        };
        if (reqID !== undefined) {
          retObj["id"] = reqID;
        }
        logger.debug(`##contract: retObj: ${JSON.stringify(retObj)}`);
        return reject(retObj);
      }
    });
  }
} /* class */
