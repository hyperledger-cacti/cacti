/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * ServerMonitorPlugin_template.js
 */

/*
 * Summary:
 * Connector: monitoring class of a part dependent on end-chains
 * Used in the case of monitoring continuously.
 * Processing that ends with the acceptance of a single event is handled by a custom function implementation in server plugins.
 * Unlike server plugins, it basically does not handle its own functions.
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

// configuration file
const SplugConfig = require("./PluginConfig.js");
const config = require("config");
// Log settings
const log4js = require("log4js");
const logger = log4js.getLogger("ServerMonitorPlugin[" + process.pid + "]");
logger.level = config.logLevel;
// Load libraries, SDKs, etc. according to specifications of endchains as needed

/*
 * ServerMonitorPlugin
 * Class definitions of server monitoring
 */
export class ServerMonitorPlugin {
  /*
   * constructors
   */
  constructor() {
    // Define dependent specific settings
  }

  /*
   * startMonitor
   * Start Monitoring
   * @param {string} clientId: Client ID from which monitoring start request was made
   * @param {function} cb: A callback function that receives monitoring results at any time.
   */
  startMonitor(clientId: any, cb: any) {
    logger.info("*** START MONITOR ***");
    logger.info("Client ID :" + clientId);
    // Implement handling to receive events from an endchain and return them in a callback function
  }

  /*
   * stopMonitor
   * monitoring stop
   * @param {string} clientId: Client ID from which monitoring stop request was made
   */
  stopMonitor(clientId: string) {
    // Implement a process to end EC monitoring
  }
} /* class */
