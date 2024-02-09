/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * LPInfoHolder.ts
 */

import { DBAccess } from "./DBAccess.js";
import { ConfigUtil } from "../util/ConfigUtil.js";
import { LedgerPluginInfo } from "../../verifier/validator-registry.js";

const fs = require("fs");
const path = require("path");
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "LPInfoHolder";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class LPInfoHolder {
  ledgerPluginInfo: LedgerPluginInfo[];

  constructor() {
    // TODO: Get connection information for all LedgerPlugins
    const dbAccess: DBAccess = new DBAccess();
    this.ledgerPluginInfo = dbAccess.getLedgerPluginInfo();
  }

  getLegerPluginInfo(validatorId?: string): string {
    // TODO: Get information about the specified LedgerPlugin

    if (validatorId) {
      let ret = "";
      this.ledgerPluginInfo.forEach((info) => {
        if (info["validatorID"] === validatorId) {
          ret = JSON.stringify(info);
        }
      });
      if (ret === "") {
        logger.warn(
          "LegerPluginInfo is Not Found : validatorId = " + validatorId
        );
      }
      return ret;
    } else {
      return JSON.stringify(this.ledgerPluginInfo);
    }
  }
}
