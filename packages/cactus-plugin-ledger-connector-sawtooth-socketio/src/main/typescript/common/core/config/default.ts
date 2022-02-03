/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * default.js
 */

export const config = {
  //module.exports = {
  // Defined value for the destination independent part. I don't think I can use it only at www, so I think I can write directly there.
  sslParam: {
    port: 5140,
    key: "./common/core/CA/connector.priv",
    cert: "./common/core/CA/connector.crt",
  },
  blockMonitor: {
    request: {
      method: "GET",
      host: "http://rest-api:8008/",
      getLatestBlockNumberCommand: "blocks?limit=1",
      periodicMonitoringCommand1: "blocks?start=",
      periodicMonitoringCommand2: "&reverse",
    },
    pollingInterval: 5000,
  },
  validatorKeyPath: "../common/core/validatorKey/keysUr7d10R.priv",
  // Log level (trace/debug/info/warn/error/fatal)
  logLevel: "debug",
};
