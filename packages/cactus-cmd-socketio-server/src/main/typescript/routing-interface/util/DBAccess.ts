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
// const configVerifier: any = yaml.safeLoad(fs.readFileSync("/etc/cactus/validator-registry-config.yaml", 'utf8'));
const configVerifier: ValidatorRegistry = new ValidatorRegistry(
  path.resolve(__dirname, "/etc/cactus/validator-registry-config.yaml")
);
const configContract: any = yaml.safeLoad(
  fs.readFileSync("/etc/cactus/contractInfo.yaml", "utf8")
);

export class DBAccess {
  ledgerPluginInfo: LedgerPluginInfo[] = [];
  contractInfo: [] = [];
  blpRegistryInfo: [] = [];

  constructor() {
    // TODO: DB Access Initialization
  }

  getLedgerPluginInfo(): LedgerPluginInfo[] {
    // TODO: Future access to DB for connection information

    this.ledgerPluginInfo = configVerifier.ledgerPluginInfo;
    return this.ledgerPluginInfo;
  }

  getContractInfo(): [] {
    // TODO: Future access to DB for contract information

    this.contractInfo = configContract.contractInfo;
    return this.contractInfo;
  }

  getBLPRegistryInfo(): [] {
    // TODO: Future access to DB for business logic plugin information

    this.blpRegistryInfo = configDefault.blpRegistry;
    return this.blpRegistryInfo;
  }
}
