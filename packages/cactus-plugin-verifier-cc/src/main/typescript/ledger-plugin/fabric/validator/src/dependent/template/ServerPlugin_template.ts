/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * ServerPlugin_template.js
 */

/*
 * Summary:
 * Connector: a part dependent on endchains
 * Define and implement the function according to the connection destination dependent part (ADAPTER) on the core side.
 */

// configuration file
const config = require("config");
// Log settings
const log4js = require("log4js");
const logger = log4js.getLogger("ServerPlugin[" + process.pid + "]");
logger.level = config.logLevel;
// utility
// Load libraries, SDKs, etc. according to specifications of endchains as needed

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
    if ((this as any)[funcName] != undefined) {
      return true;
    } else {
      return false;
    }
  }

  // Define an arbitrary function and implement it according to specifications of end-chains
} /* class */

module.exports = ServerPlugin;
