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
import * as config from "../common/core/config";
// Log settings
import { getLogger } from "log4js";
const logger = getLogger("ServerMonitorPlugin[" + process.pid + "]");
logger.level = config.read("logLevel", "info");
// utility
import { ValidatorAuthentication } from "./ValidatorAuthentication";
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

import https from "https";
import fs = require("fs");

export type MonitorCallback = (callback: {
  status: number;
  blockData: string;
}) => void;

/*
 * ServerMonitorPlugin
 * Class definitions of server monitoring
 */
export class ServerMonitorPlugin {
  currentBlockNumber: number;

  /*
   * constructors
   */
  constructor() {
    // Define dependent specific settings
    this.currentBlockNumber = -1;
  }

  /*
   * startMonitor
   * Start Monitoring
   * @param {string} clientId: Client ID from which monitoring start request was made
   * @param {string} filterKey: Key to filter blocks
   * @param {function} cb: A callback function that receives monitoring results at any time.
   */
  startMonitor(clientId: string, filterKey: string, cb: MonitorCallback) {
    const request_blocknum_body = JSON.stringify({
      to_chain: "B0123456789012345678901234567890123456789",
      from_chaincode_id: "QueryChainCode",
      to_chaincode_id: "QueryChainCode",
      to_query_func_name: "QueryBlockNum",
      args: ["a"],
    });
    //- (not recommended - only for development): Temporarily set CertCheck to false when using a self-signed certificate
    var CertCheck = config.read<boolean>("CertCheck")
    if (CertCheck == undefined){
      CertCheck = true
    }
    const options: https.RequestOptions = {
      hostname: "agent",
      port: 8080,
      path: "/v1/cross/transaction/query",
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "Content-Length": Buffer.byteLength(request_blocknum_body),
      },
      cert: fs.readFileSync(config.read("sslParam.clientCert")),
      key: fs.readFileSync(config.read("sslParam.clientKey")),
      rejectUnauthorized: CertCheck,
    };

    let resData;
    let blockNum;
    const that = this;
    const req = https.request(options, (res) => {
      res.on("data", (d) => {
        resData = JSON.parse(d);
        that.currentBlockNumber = resData.data.payload;
        setInterval(function () {
          that.periodicMonitoring(clientId, filterKey, cb);
        }, 2000);
      });
    });

    req.write(request_blocknum_body);

    req.on("error", (error) => {
      logger.error(error);
    });
    req.end();

    logger.info("*** START MONITOR ***");
    logger.info("Client ID :" + clientId);
    logger.debug(`filterKey = ${filterKey}`);
  }

  /*
   * periodicMonitoring
   * Periodic monitoring
   * @param {string} clientId: Client ID from which monitoring start request was made
   * @param {string} filterKey: Key to filter blocks
   * @param {function} cb: A callback function that receives monitoring results at any time.
   */
  periodicMonitoring(clientId: string, filterKey: string, cb: MonitorCallback) {
    let targetBlockNum: number = this.currentBlockNumber;
    targetBlockNum++;
    const request_block_body = JSON.stringify({
      to_chain: "B0123456789012345678901234567890123456789",
      from_chaincode_id: "QueryChainCode",
      to_chaincode_id: "QueryChainCode",
      to_query_func_name: "GetBlockByNumber",
      args: [targetBlockNum.toString()],
    });
    var CertCheck = config.read<boolean>("CertCheck")
    if (CertCheck == undefined){
      CertCheck = true
    }
    const options: https.RequestOptions = {
      hostname: "agent",
      port: 8080,
      path: "/v1/cross/transaction/query",
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "Content-Length": Buffer.byteLength(request_block_body),
      },
      cert: fs.readFileSync(config.read("sslParam.clientCert")),
      key: fs.readFileSync(config.read("sslParam.clientKey")),
      rejectUnauthorized: CertCheck,
    };

    let resData;
    const transactionDataArray: any[] = [];
    const that = this;
    const req = https.request(options, (res) => {
      res.on("data", (d) => {
        resData = JSON.parse(d);
        if (resData.error_message == "block not found") {
          logger.debug("block not found, continue to poll");
          return;
        }
        const payload = JSON.parse(resData.data.payload);
        if (payload.Header.BlockNum != targetBlockNum) {
          logger.error(
            "expected ",
            targetBlockNum,
            " get ",
            payload.Header.BlockNum,
          );
          return;
        }
        for (const transaction of payload.Data) {
          transactionDataArray.push(transaction);
        }
        if (this.currentBlockNumber < targetBlockNum) {
          this.currentBlockNumber = targetBlockNum;
        }
        if (transactionDataArray.length > 0) {
          logger.info("*** SEND TRANSACTION DATA ***");
          logger.debug(
            `transactionDataArray = ${JSON.stringify(transactionDataArray)}`,
          );
          const signedTransactionDataArray = ValidatorAuthentication.sign({
            blockData: transactionDataArray,
          });
          logger.debug(
            `signedTransactionDataArray = ${signedTransactionDataArray}`,
          );
          const retObj = {
            status: 200,
            blockData: signedTransactionDataArray,
          };
          cb(retObj);
        }
        this.currentBlockNumber + 1;
      });
    });

    req.write(request_block_body);

    req.on("error", (error) => {
      logger.error(error);
    });
    req.end();
  }
}
