/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BalanceManagement.ts
 */

import {
  LPInfoHolder,
  ConfigUtil,
} from "@hyperledger/cactus-cmd-socketio-server";

import { ISendRequestResultV1 } from "@hyperledger/cactus-core-api";

import {
  VerifierFactory,
  VerifierFactoryConfig,
} from "@hyperledger/cactus-verifier-client";

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

  getBalance(account: string): Promise<unknown> {
    return new Promise(async (resolve, reject) => {
      // for LedgerOperation
      // const execData = {"referedAddress": account};
      // const ledgerOperation: LedgerOperation = new LedgerOperation("getNumericBalance", "", execData);

      // for Neo
      const contract = {}; // NOTE: Since contract does not need to be specified, specify an empty object.
      const method = { type: "web3Eth", command: "getBalance" };
      const args = { args: [account] };
      // const method = "default";
      // const args = {"method": {type: "web3Eth", command: "getBalance"}, "args": {"args": [account]}};

      const verifier = await this.verifierFactory.getVerifier(
        "84jUisrs",
        "legacy-socketio",
      );
      verifier
        .sendSyncRequest(contract, method, args)
        .then((result) => {
          const res1 = result as ISendRequestResultV1<string>;
          const response = {
            status: res1.status,
            amount: parseFloat(res1.data),
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
