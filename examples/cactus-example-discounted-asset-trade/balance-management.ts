/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * balance-management.ts
 */

import { LPInfoHolder } from "@hyperledger/cactus-cmd-socket-server";
import { ConfigUtil } from "@hyperledger/cactus-cmd-socket-server";
import {
  VerifierFactory,
  VerifierFactoryConfig,
} from "@hyperledger/cactus-verifier-client";

const fs = require("fs");
const path = require("path");
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "BalanceManagement";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class BalanceManagement {
  private connectInfo: LPInfoHolder = null; // connection information
  private readonly verifierFactory: VerifierFactory;

  constructor() {
    this.connectInfo = new LPInfoHolder();
    this.verifierFactory = new VerifierFactory(
      this.connectInfo.ledgerPluginInfo as VerifierFactoryConfig,
      config.logLevel,
    );
  }

  getBalance(account: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // for LedgerOperation
      // const execData = {"referedAddress": account};
      // const ledgerOperation: LedgerOperation = new LedgerOperation("getNumericBalance", "", execData);

      // for Neo
      const contract = {}; // NOTE: Since contract does not need to be specified, specify an empty object.
      const method = { type: "web3Eth", command: "getBalance" };
      const template = "default";
      const args = { args: [account] };
      // const method = "default";
      // const args = {"method": {type: "web3Eth", command: "getBalance"},"args": {"args": [account]}};

      this.verifierFactory
        .getVerifier("84jUisrs")
        .sendSyncRequest(contract, method, args)
        .then((result) => {
          const response = {
            status: result.status,
            amount: parseFloat(result.data),
          };
          resolve(response);
        })
        .catch((err) => {
          logger.error(err);
          reject(err);
        });
    });
  }
}
