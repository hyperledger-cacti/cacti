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
import {
  configRead,
  signMessageJwt,
} from "@hyperledger/cactus-cmd-socketio-server";
// Log settings
import { getLogger } from "log4js";
const logger = getLogger("ServerMonitorPlugin[" + process.pid + "]");
logger.level = configRead("logLevel", "info");
// Load libraries, SDKs, etc. according to specifications of endchains as needed
import Web3 from "web3";
import { Subscription } from "web3-core-subscriptions";
import { BlockHeader } from "web3-eth";

import { safeStringifyException } from "@hyperledger/cactus-common";

export type MonitorCallback = (callback: {
  status: number;
  blockData?: string;
  errorDetail?: string;
}) => void;

/*
 * ServerMonitorPlugin
 * Class definitions of server monitoring
 */
export class ServerMonitorPlugin {
  _subscriptionTable = new Map<string, Subscription<BlockHeader>>();

  /*
   * startMonitor
   * Start Monitoring
   * @param {string} clientId: Client ID from which monitoring start request was made
   * @param {function} cb: A callback function that receives monitoring results at any time.
   */

  blockSigner = (blockData: any) => {
    const signedBlockData = signMessageJwt({
      blockData: blockData,
    });
    logger.debug(`signedBlockData = ${signedBlockData}`);
    return {
      status: 200,
      blockData: signedBlockData,
    };
  };

  startMonitor(clientId: string, allBlocks = false, cb: MonitorCallback) {
    logger.info("*** START MONITOR ***");
    logger.info("Client ID :" + clientId);
    // Implement handling to receive events from an end-chain and return them in a callback function
    let sub = this._subscriptionTable.get(clientId);
    if (!sub) {
      logger.info("create new web3 subscription and start watching.");
      try {
        const web3 = new Web3(
          new Web3.providers.WebsocketProvider(configRead("ledgerUrl")),
        );
        sub = web3.eth.subscribe("newBlockHeaders");
        // subscription should be managed by client ID
        // (You should never watch multiple urls from the same client)
        this._subscriptionTable.set(clientId, sub);
        sub.subscribe(async (error: any, block: BlockHeader) => {
          if (!error) {
            console.log("##[HL-BC] Notify new block data(D2)");
            const blockData = await web3.eth.getBlock(block.hash, true);
            const trLength = blockData.transactions.length;
            logger.info(
              trLength + " transactions in block " + blockData.number,
            );
            console.log("##[HL-BC] Validate transactions(D3)");
            console.log("##[HL-BC] digital sign on valid transaction(D4)");

            if (allBlocks == false) {
              if (trLength > 0) {
                logger.info("*** SEND BLOCK DATA ***");
                logger.debug(
                  "monitor is set to report blocks with at least one transaction",
                );
                logger.debug(`blockData = ${JSON.stringify(blockData)}`);
                const retObj = this.blockSigner(blockData);
                cb(retObj);
              }
            } else {
              logger.info("*** SEND BLOCK DATA ***");
              logger.debug("monitor is set to report empty blocks");
              logger.debug(`blockData = ${JSON.stringify(blockData)}`);
              const retObj = this.blockSigner(blockData);
              cb(retObj);
            }
          } else {
            const errObj = {
              status: 504,
              errorDetail: safeStringifyException(error),
            };
            cb(errObj);
          }
        });
      } catch (e) {
        const errObj = {
          status: 504,
          errorDetail: safeStringifyException(e),
        };
        logger.error(errObj);
        cb(errObj);
      }
    } else {
      logger.info("target subscription has already start watching.");
    }
  }

  /*
   * stopMonitor
   * monitoring stop
   * @param {string} clientId: Client ID from which monitoring stop request was made
   */
  async stopMonitor(clientId: string) {
    // Implement a process to end EC monitoring
    let sub = this._subscriptionTable.get(clientId);
    if (sub) {
      // Stop the subscription & Remove it from table
      logger.info("stop watching and remove subscription.");
      await sub.unsubscribe();
      this._subscriptionTable.delete(clientId);
    }
  }
}
