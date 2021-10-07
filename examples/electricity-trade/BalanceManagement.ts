/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BalanceManagement.ts
 */

import { LPInfoHolder } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/util/LPInfoHolder";
import { Verifier } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/verifier/Verifier";
import { ConfigUtil } from "../../packages/cactus-cmd-socketio-server/src/main/typescript/routing-interface/util/ConfigUtil";

const fs = require("fs");
const path = require("path");
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "BalanceManagement";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class BalanceManagement {
  private connectInfo: LPInfoHolder = null; // connection information
  private verifierEthereum: Verifier = null;

  constructor() {
    this.connectInfo = new LPInfoHolder();
  }

  getBalance(account: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.verifierEthereum === null) {
        logger.debug("create verifierEthereum");
        const ledgerPluginInfo: string =
          this.connectInfo.getLegerPluginInfo("84jUisrs");
        this.verifierEthereum = new Verifier(ledgerPluginInfo);
      }

      // for LedgerOperation
      // const execData = {"referedAddress": account};
      // const ledgerOperation: LedgerOperation = new LedgerOperation("getNumericBalance", "", execData);

      // for Neo
      const contract = {}; // NOTE: Since contract does not need to be specified, specify an empty object.
      const method = { type: "web3Eth", command: "getBalance" };
      const template = "default";
      const args = { args: [account] };
      // const method = "default";
      // const args = {"method": {type: "web3Eth", command: "getBalance"}, "args": {"args": [account]}};

      this.verifierEthereum
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
