/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * DBAccess.ts
 */

import { ConfigUtil } from "../util/ConfigUtil";
import {
  ValidatorRegistry,
  LedgerPluginInfo,
} from "../../verifier/validator-registry";

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const configDefault: any = ConfigUtil.getConfig();

import { getLogger } from "log4js";
const logger = getLogger("DBAccess");
logger.level = configDefault.logLevel;

export class DBAccess {
  ledgerPluginInfo: LedgerPluginInfo[] = [];
  contractInfo: [] = [];
  blpRegistryInfo: [] = [];

  constructor() {
    // TODO: DB Access Initialization
  }

  getLedgerPluginInfo(): LedgerPluginInfo[] {
    try {
      const configVerifier: ValidatorRegistry = new ValidatorRegistry(
        path.resolve(__dirname, "/etc/cactus/validator-registry-config.yaml"),
      );
      this.ledgerPluginInfo = configVerifier.ledgerPluginInfo;
    } catch (error) {
      logger.info("Could not get ledger plugin info");
      logger.debug(error);
    }

    return this.ledgerPluginInfo;
  }

  getContractInfo(): [] {
    try {
      const configContract: any = yaml.safeLoad(
        fs.readFileSync("/etc/cactus/contractInfo.yaml", "utf8"),
      );

      this.contractInfo = configContract.contractInfo;
    } catch (error) {
      logger.info("Could not get contract info");
      logger.debug(error);
    }

    return this.contractInfo;
  }

  getBLPRegistryInfo(): [] {
    // TODO: Future access to DB for business logic plugin information

    this.blpRegistryInfo = configDefault.blpRegistry;
    return this.blpRegistryInfo;
  }
}
