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
import {
  configRead,
  signMessageJwt,
} from "@hyperledger/cactus-cmd-socketio-server";
// Log settings
import { getLogger } from "log4js";
const logger = getLogger("ServerPlugin[" + process.pid + "]");
logger.level = configRead("logLevel", "info");
// utility
import * as SplugUtil from "./PluginUtil";
// Load libraries, SDKs, etc. according to specifications of endchains as needed
import Web3 from "web3";
import { AbiItem } from "web3-utils";
import { BlockNumber } from "web3-core";
import { safeStringifyException } from "@hyperledger/cactus-common";

const WEB3_HTTP_PROVIDER_OPTIONS = {
  keepAlive: true,
};

const WEB3_WS_PROVIDER_OPTIONS = {
  // Enable auto reconnection
  reconnect: {
    auto: true,
    delay: 3000, // ms
    maxAttempts: 30,
    onTimeout: false,
  },
};

function getWeb3Provider(host: string) {
  const hostUrl = new URL(host);

  switch (hostUrl.protocol) {
    case "http:":
    case "https:":
      return new Web3.providers.HttpProvider(host, WEB3_HTTP_PROVIDER_OPTIONS);
    case "ws:":
      return new Web3.providers.WebsocketProvider(
        host,
        WEB3_WS_PROVIDER_OPTIONS,
      );
    default:
      throw new Error(
        `Unknown host protocol ${hostUrl.protocol} in URL ${host}`,
      );
  }
}

const web3Provider = getWeb3Provider(configRead("ledgerUrl"));
const web3 = new Web3(web3Provider);

export function shutdown() {
  web3Provider.disconnect();
}

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
  isExistFunction(funcName: string) {
    if ((this as any)[funcName]) {
      return true;
    } else {
      return false;
    }
  }

  /*
   * getBlock
   *
   * @param {String|Number} block hash, block number or string:"earliest", "latest" or "pending"
   *
   * @return {Object} JSON object
   */

  async getBlock(args: any) {
    logger.debug("getBlock start");

    const blockID: BlockNumber = args.args.args[0];
    const returnTransactionObjects = args.args.args[1] ?? false;
    const reqID = args["reqID"];

    if (!blockID) {
      const emsg = "JSON parse error!";
      logger.warn(emsg);
      throw {
        resObj: {
          status: 504,
          errorDetail: emsg,
        },
        id: reqID,
      };
    }

    try {
      const blockData = await web3.eth.getBlock(
        blockID,
        returnTransactionObjects,
      );
      const result = {
        blockData: blockData,
      };
      logger.debug(`getBlock(): result: ${result}`);

      const signedResults = signMessageJwt({ result });
      logger.debug(`getBlock(): signedResults: ${signedResults}`);

      return {
        resObj: {
          status: 200,
          data: signedResults,
        },
        id: reqID,
      };
    } catch (e) {
      const retObj = {
        resObj: {
          status: 504,
          errorDetail: safeStringifyException(e),
        },
        id: reqID,
      };

      logger.error(`##getBlock: retObj: ${JSON.stringify(retObj)}`);

      throw retObj;
    }
  }

  /*
   * getTransactionReceipt
   *
   * @param {String} transaction hash
   *
   * @return {Object} JSON object
   */

  async getTransactionReceipt(args: any) {
    logger.debug("getTransactionReceipt start");

    const txHash: string = args.args.args[0];
    const reqID = args["reqID"];

    if (txHash === undefined) {
      const emsg = "JSON parse error!";
      logger.warn(emsg);
      throw {
        resObj: {
          status: 504,
          errorDetail: emsg,
        },
        id: reqID,
      };
    }

    try {
      const txReceipt = await web3.eth.getTransactionReceipt(txHash);
      logger.info(`getTransactionReceipt(): txReceipt: ${txReceipt}`);

      const result = {
        txReceipt: txReceipt,
      };
      logger.debug(`getTransactionReceipt(): result: ${result}`);

      const signedResults = signMessageJwt({ result: result });
      logger.debug(`getTransactionReceipt(): signedResults: ${signedResults}`);

      const retObj = {
        resObj: {
          status: 200,
          data: signedResults,
        },
        id: reqID,
      };

      logger.debug(
        `##getTransactionReceipt: retObj: ${JSON.stringify(retObj)}`,
      );
      return retObj;
    } catch (e) {
      const retObj = {
        resObj: {
          status: 504,
          errorDetail: safeStringifyException(e),
        },
        id: reqID,
      };

      logger.error(
        `##getTransactionReceipt: retObj: ${JSON.stringify(retObj)}`,
      );

      throw retObj;
    }
  }

  // Define an arbitrary function and implement it according to specifications of end-chains
  /**
   * getNumericBalance
   * Get numerical balance
   *
   * @param {Object} args JSON Object
   * {
   *      "referedAddress":<reference account>,
   *      "reqID":<request ID> (option)
   * }
   * @return {Object} JSON object
   *
   * @todo Return string/BN instead of number
   * @todo Return signMessageJwt() message instead of plain message.
   */
  async getNumericBalance(args: any) {
    logger.debug("getNumericBalance start");

    const referedAddress = args.args.args[0];
    const reqID = args["reqID"];

    if (referedAddress === undefined) {
      const emsg = "JSON parse error!";
      logger.warn(emsg);
      throw {
        resObj: {
          status: 504,
          errorDetail: emsg,
        },
        id: reqID,
      };
    }

    const ethargs = referedAddress;

    // Handling exceptions to absorb the difference of interest.
    try {
      const balance = await web3.eth.getBalance(ethargs);
      const amountVal = parseInt(balance, 10);
      const retObj = {
        resObj: {
          status: 200,
          amount: amountVal,
        },
        id: reqID,
      };
      logger.debug(`##getNumericBalance: retObj: ${JSON.stringify(retObj)}`);
      return retObj;
    } catch (e) {
      const retObj = {
        resObj: {
          status: 504,
          errorDetail: safeStringifyException(e),
        },
        id: reqID,
      };

      logger.error(`##getNumericBalance: retObj: ${JSON.stringify(retObj)}`);

      throw retObj;
    }
  }

  /**
   * @deprecated - Not usable, can't unlock account remotely at the moment.
   *
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

      let retObj: Record<string, any>;
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
        logger.warn(emsg);
        retObj = {
          resObj: {
            status: 504,
            errorDetail: emsg,
          },
        };
        return reject(retObj);
      }
      // Dealing with exponentiation strings.
      const amount = SplugUtil.convNum(funcParam["amount"], 0);

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
        retObj = {
          resObj: {
            status: 504,
            errorDetail: safeStringifyException(e),
          },
        };
        logger.error(retObj);

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
  async getNonce(args: any) {
    logger.debug("getNonce start");

    const targetAddress = args.args.args.args[0];
    const reqID = args["reqID"];

    if (targetAddress === undefined) {
      const emsg = "JSON parse error!";
      logger.warn(emsg);
      return {
        resObj: {
          status: 504,
          errorDetail: emsg,
        },
        id: reqID,
      };
    }

    // var ethargs = '0x' + targetAddress;
    const ethargs = targetAddress;
    logger.debug(
      `getNonce(): ethargs: ${ethargs}, targetAddress: ${targetAddress}`,
    );

    // Handling exceptions to absorb the difference of interest.
    try {
      const txnCount = await web3.eth.getTransactionCount(ethargs);
      logger.info(`getNonce(): txnCount: ${txnCount}`);
      const hexStr = web3.utils.toHex(txnCount);
      logger.info(`getNonce(): hexStr: ${hexStr}`);
      const result = {
        nonce: txnCount,
        nonceHex: hexStr,
      };
      logger.debug(`getNonce(): result: ${result}`);

      const signedResults = signMessageJwt({ result: result });
      logger.debug(`getNonce(): signedResults: ${signedResults}`);
      const retObj = {
        resObj: {
          status: 200,
          data: signedResults,
        },
        id: reqID,
      };

      logger.debug(`##getNonce: retObj: ${JSON.stringify(retObj)}`);

      return retObj;
    } catch (e) {
      const retObj = {
        resObj: {
          status: 504,
          errorDetail: safeStringifyException(e),
        },
        id: reqID,
      };

      logger.error(`##getNonce: retObj: ${JSON.stringify(retObj)}`);

      return retObj;
    }
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
  async toHex(args: any) {
    logger.debug("toHex start");

    const targetValue = args.args.args.args[0];
    const reqID = args["reqID"];

    if (targetValue === undefined) {
      const emsg = "JSON parse error!";
      logger.warn(emsg);
      return {
        resObj: {
          status: 504,
          errorDetail: emsg,
        },
        id: reqID,
      };
    }

    logger.debug(`toHex(): targetValue: ${targetValue}`);

    // Handling exceptions to absorb the difference of interest.
    try {
      const hexStr = web3.utils.toHex(targetValue);
      logger.info(`toHex(): hexStr: ${hexStr}`);
      const result = {
        hexStr: hexStr,
      };
      logger.debug(`toHex(): result: ${result}`);

      const signedResults = signMessageJwt({ result: result });
      logger.debug(`toHex(): signedResults: ${signedResults}`);

      const retObj = {
        resObj: {
          status: 200,
          data: signedResults,
        },
        id: reqID,
      };

      logger.debug(`##toHex: retObj: ${JSON.stringify(retObj)}`);
      return retObj;
    } catch (e) {
      const retObj = {
        resObj: {
          status: 504,
          errorDetail: safeStringifyException(e),
        },
        id: reqID,
      };
      logger.error(retObj);

      logger.debug(`##toHex: retObj: ${JSON.stringify(retObj)}`);

      return retObj;
    }
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
   *
   * @todo Return entire transaction receipt
   */
  async sendRawTransaction(args: any) {
    logger.debug("sendRawTransaction(start");

    const funcParam = args.args.args[0];
    const reqID = args["reqID"];

    // Handle the exception once to absorb the difference of interest.
    try {
      if (!funcParam || funcParam["serializedTx"] == undefined) {
        const emsg = "JSON parse error!";
        logger.warn(emsg);
        return {
          resObj: {
            status: 504,
            errorDetail: emsg,
          },
          id: reqID,
        };
      }

      const serializedTx = funcParam["serializedTx"];
      logger.info("serializedTx  :" + serializedTx);

      const res = await web3.eth.sendSignedTransaction(serializedTx);
      const result = {
        txid: res.transactionHash,
      };

      const signedResults = signMessageJwt({ result });
      logger.debug(`sendRawTransaction(): signedResults: ${signedResults}`);
      const retObj = {
        resObj: {
          status: 200,
          data: signedResults,
        },
        id: reqID,
      };

      logger.debug(`##sendRawTransaction: retObj: ${JSON.stringify(retObj)}`);

      return retObj;
    } catch (e) {
      const retObj = {
        resObj: {
          status: 504,
          errorDetail: safeStringifyException(e),
        },
        id: reqID,
      };

      logger.error(`##sendRawTransaction: retObj: ${JSON.stringify(retObj)}`);

      return retObj;
    }
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
  async web3Eth(args: any) {
    logger.debug("web3Eth start");

    const sendFunction = args.method.command;
    const sendArgs = args.args.args ?? [];
    const reqID = args["reqID"];

    logger.debug("send_func  :", sendFunction);
    logger.debug("sendArgs  :", JSON.stringify(sendArgs));

    // Handle the exception once to absorb the difference of interest.
    try {
      const looseWeb3Eth = web3.eth as any;

      const isSafeToCall =
        Object.prototype.hasOwnProperty.call(looseWeb3Eth, sendFunction) &&
        typeof looseWeb3Eth[sendFunction] === "function";
      if (!isSafeToCall) {
        throw new Error(
          `Invalid method name provided in request. ${sendFunction} does not exist on the Web3.Eth 1.7+ object.`,
        );
      }

      let result = await looseWeb3Eth[sendFunction](...sendArgs);

      const signedResults = signMessageJwt({ result: result });
      const retObj = {
        resObj: {
          status: 200,
          data: signedResults,
        },
        id: reqID,
      };

      logger.debug(`##web3Eth: retObj: ${JSON.stringify(retObj)}`);

      return retObj;
    } catch (e) {
      const retObj = {
        resObj: {
          status: 504,
          errorDetail: safeStringifyException(e),
        },
        id: reqID,
      };
      logger.error(retObj);

      logger.error(`##web3Eth: retObj: ${JSON.stringify(retObj)}`);

      return retObj;
    }
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
  async contract(args: any) {
    logger.debug("contract start");

    const sendCommand = args.method.command;
    const sendFunction = args.method.function;
    const sendArgs = args.args.args ?? [];
    const reqID = args["reqID"];

    logger.info("sendCommand  :" + sendCommand);
    logger.info("sendFunction  :" + sendFunction);
    logger.info("sendArgs  :" + JSON.stringify(sendArgs));

    // Handle the exception once to absorb the difference of interest.
    try {
      const contract = new web3.eth.Contract(
        args.contract.abi as AbiItem[],
        args.contract.address,
      );
      (contract as any).setProvider(web3.currentProvider);

      const isSafeToCall =
        Object.prototype.hasOwnProperty.call(contract.methods, sendCommand) &&
        typeof contract.methods[sendCommand] === "function";
      if (!isSafeToCall) {
        throw new Error(
          `Invalid method name provided in request. ${sendCommand} does not exist on the Web3 contract object's "methods" property.`,
        );
      }

      // TODO - args.invocationParams do last
      const result = await contract.methods[sendCommand](...sendArgs)[
        sendFunction
      ]();
      logger.debug(`##contract: result: ${result}`);

      const signedResults = signMessageJwt({ result: result });
      const retObj = {
        resObj: {
          status: 200,
          data: signedResults,
        },
        id: reqID,
      };

      logger.debug(`##contract: retObj: ${JSON.stringify(retObj)}`);

      return retObj;
    } catch (e) {
      const retObj = {
        resObj: {
          status: 504,
          errorDetail: safeStringifyException(e),
        },
        id: reqID,
      };
      logger.error(retObj);

      logger.error(`##contract: retObj: ${JSON.stringify(retObj)}`);

      return retObj;
    }
  }
} /* class */
