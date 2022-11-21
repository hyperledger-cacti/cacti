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
const SplugUtil = require("./PluginUtil");
import { configRead, signMessageJwt } from "@hyperledger/cactus-cmd-socketio-server";
// Log settings
import { getLogger } from "log4js";
const logger = getLogger("ServerMonitorPlugin[" + process.pid + "]");
logger.level = configRead("logLevel", "info");
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

export type MonitorCallback = (callback: {
  status: number;
  blockData: string;
}) => void;

/*
 * ServerMonitorPlugin
 * Class definitions of server monitoring
 */
export class ServerMonitorPlugin {
  currentBlockNumber = -1;
  runningMonitors = new Map<string, ReturnType<typeof setInterval>>();

  /*
   * startMonitor
   * Start Monitoring
   * @param {string} clientId: Client ID from which monitoring start request was made
   * @param {string} filterKey: Key to filter blocks
   * @param {function} cb: A callback function that receives monitoring results at any time.
   */
  startMonitor(clientId: string, filterKey: string, cb: MonitorCallback) {
    logger.info("*** START MONITOR ***");
    logger.info("Client ID :" + clientId);
    logger.debug(`filterKey = ${filterKey}`);

    const that = this;
    const httpReq = new XMLHttpRequest();
    httpReq.onload = function () {
      const responseObj = JSON.parse(httpReq.responseText);
      that.currentBlockNumber = parseInt(responseObj.data[0].header.block_num);
      logger.debug(`responseObj = ${JSON.stringify(responseObj)}`);
      logger.debug(`currentBlockNumber = ${that.currentBlockNumber}`);
      that.periodicMonitoring(clientId, filterKey, cb);
    }

    const method = configRead<string>("blockMonitor.request.method");
    const latestBlockURL = new URL(
      configRead<string>("blockMonitor.request.getLatestBlockNumberCommand"),
      configRead<string>("blockMonitor.request.host"))
      .toString();
    logger.debug("latestBlockURL:", latestBlockURL);

    httpReq.open(
      method,
      latestBlockURL,
    );

    httpReq.send();
  }

  /*
   * periodicMonitoring
   * Periodic monitoring
   * @param {string} clientId: Client ID from which monitoring start request was made
   * @param {string} filterKey: Key to filter blocks
   * @param {function} cb: A callback function that receives monitoring results at any time.
   */
  periodicMonitoring(clientId: string, filterKey: string, cb: MonitorCallback) {
    logger.info("*** START PERIODIC MONITORING ***");

    const that = this;

    const httpReq = new XMLHttpRequest();
    httpReq.onload = function () {
      const responseObj = JSON.parse(httpReq.responseText);
      logger.debug(`responseObj = ${JSON.stringify(responseObj)}`);

      let newBlockNumber = -1;
      for (const blockData of responseObj.data) {
        const targetBlockNumber = parseInt(blockData.header.block_num);
        if (targetBlockNumber === that.currentBlockNumber) {
          continue;
        }
        const transactionDataArray = [];
        for (const batchData of blockData.batches) {
          logger.debug(
            `transaction_ids.length = ${batchData.header.transaction_ids.length}`,
          );
          if (batchData.header.transaction_ids.length < 1) {
            logger.debug(`skip block (No transactions) = ${targetBlockNumber}`);
            continue;
          }
          for (const transactionData of batchData.transactions) {
            if (transactionData.header.family_name !== filterKey) {
              logger.debug(
                `skip transaction (Not target) = ${transactionData.header_signature}`,
              );
              continue;
            }
            const transactionDataPlus = Object.assign({}, transactionData);
            transactionDataPlus["payload_decoded"] = SplugUtil.deccodeCbor(
              SplugUtil.decodeBase64(transactionData.payload),
            );
            transactionDataArray.push(transactionDataPlus);
          }
        }
        if (newBlockNumber < targetBlockNumber) {
          newBlockNumber = targetBlockNumber;
        }
        if (transactionDataArray.length > 0) {
          logger.info("*** SEND TRANSACTION DATA ***");
          logger.debug(
            `transactionDataArray = ${JSON.stringify(transactionDataArray)}`,
          );
          const signedTransactionDataArray = signMessageJwt({
            blockData: transactionDataArray,
          });
          logger.debug(
            `signedTransactionDataArray = ${signedTransactionDataArray}`,
          );
          const retObj = {
            status: 200,
            blockData: signedTransactionDataArray,
          };

          if (that.runningMonitors.has(clientId)) {
            cb(retObj);
          } else {
            logger.info("Monitoring seems to be stopped - don't send the response! ClientID:", clientId);
          }
        }
      }

      if (that.currentBlockNumber < newBlockNumber) {
        that.currentBlockNumber = newBlockNumber;
      }
      logger.debug(`currentBlockNumber = ${that.currentBlockNumber}`);
    };

    const timerBlockMonitoring = setInterval(function () {
      const newBlocksPath =
        configRead<string>("blockMonitor.request.periodicMonitoringCommand1") +
        SplugUtil.convertBlockNumber(that.currentBlockNumber) +
        configRead<string>("blockMonitor.request.periodicMonitoringCommand2");
      const newBlocksUrl = new URL(
        newBlocksPath,
        configRead<string>("blockMonitor.request.host"))
        .toString();
      logger.debug(`newBlocksUrl = ${newBlocksUrl}`);

      httpReq.open(configRead<string>("blockMonitor.request.method"), newBlocksUrl);
      httpReq.send();
    }, configRead("blockMonitor.pollingInterval"));

    this.runningMonitors.set(clientId, timerBlockMonitoring);
  }

  /**
   * Stop monitor for given client.
   *
   * @param {string} clientId: Client ID from which monitoring stop request was made
   */
  stopMonitor(clientId: string) {
    let monitorInterval = this.runningMonitors.get(clientId);
    if (monitorInterval) {
      logger.info("stop watching and remove interval.");
      clearInterval(monitorInterval);
      this.runningMonitors.delete(clientId);
    }
  }
}
