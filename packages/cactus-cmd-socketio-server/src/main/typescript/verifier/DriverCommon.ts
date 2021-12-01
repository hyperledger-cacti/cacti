/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * DriverCommon.ts
 */

import { ApiInfo, RequestedData } from "./LedgerPlugin";
import { ConfigUtil } from "../routing-interface/util/ConfigUtil";

const fs = require("fs");
const path = require("path");
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "DriverCommon";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

// for debug
export function json2str(jsonObj: object) {
  try {
    return JSON.stringify(jsonObj);
  } catch (error) {
    logger.warn("invalid json format.");
    return null;
  }
}