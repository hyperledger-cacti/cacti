/*
 * Copyright 2021 Hyperledger Cactus Contributors
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
import { SplugConfig } from "./PluginConfig";
import { config } from "../common/core/config/default";
// Log settings
import { getLogger } from "log4js";
const logger = getLogger("ServerMonitorPlugin[" + process.pid + "]");
logger.level = config.logLevel;
// utility
import { ValidatorAuthentication } from "./ValidatorAuthentication";
// Load libraries, SDKs, etc. according to specifications of endchains as needed
const Web3 = require("web3");
import safeStringify from "fast-safe-stringify";

/*
 * ServerMonitorPlugin
 * Class definitions of server monitoring
 */
export class ServerMonitorPlugin {
  _filterTable: object;

  /*
   * constructors
   */
  constructor() {
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
    logger.info("*** START MONITOR ***");
    logger.info("Client ID :" + clientId);
    // Implement handling to receive events from an end-chain and return them in a callback function
    let filter = this._filterTable[clientId];
    if (!filter) {
      logger.info("create new web3 filter and start watching.");
      try {
        const web3 = new Web3();
        const provider = new web3.providers.HttpProvider(SplugConfig.provider);
        web3.setProvider(provider);
        filter = web3.eth.filter("latest");
        // filter should be managed by client ID
        // (You should never watch multiple urls from the same client)
        this._filterTable[clientId] = filter;
        filter.watch(function (error, blockHash) {
          if (!error) {
            console.log("##[HL-BC] Notify new block data(D2)");
            const blockData = web3.eth.getBlock(blockHash, true);
            const trLength = blockData.transactions.length;
            logger.info(
              trLength + " transactions in block " + blockData.number,
            );
            console.log("##[HL-BC] Validate transactions(D3)");
            console.log("##[HL-BC] digital sign on valid transaction(D4)");

            if (trLength > 0) {
              logger.info("*** SEND BLOCK DATA ***");
              logger.debug(`blockData = ${JSON.stringify(blockData)}`);
              const signedBlockData = ValidatorAuthentication.sign({
                blockData: blockData,
              });
              logger.debug(`signedBlockData = ${signedBlockData}`);
              // Notify only if transaction exists
              const retObj = {
                status: 200,
                blockData: signedBlockData,
              };
              cb(retObj);
            }
          } else {
            const errObj = {
              status: 504,
              errorDetail: error,
            };
            cb(errObj);
          }
        });
      } catch (e) {
        const errObj = {
          status: 504,
          errorDetail: safeStringify(e),
        };
        logger.error(errObj);
        cb(errObj);
      }
    } else {
      logger.info("target filter has already start watching.");
    }
  }

  /*
   * stopMonitor
   * monitoring stop
   * @param {string} clientId: Client ID from which monitoring stop request was made
   */
  stopMonitor(clientId) {
    // Implement a process to end EC monitoring
    const filter = this._filterTable[clientId];
    if (filter) {
      // Stop the filter & Remove it from table
      logger.info("stop watching and remove filter.");
      filter.stopWatching();
      delete this._filterTable[clientId];
    }
  }
}
