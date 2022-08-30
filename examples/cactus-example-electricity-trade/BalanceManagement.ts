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
import {
  VerifierFactory,
  VerifierFactoryConfig,
} from "@hyperledger/cactus-verifier-client";

const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "BalanceManagement";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export interface BalanceResponse {
  status: string | number;
  amount: number;
}

export class BalanceManagement {
  private connectInfo: LPInfoHolder | null = null; // connection information
  private readonly verifierFactory: VerifierFactory;

  constructor() {
    this.connectInfo = new LPInfoHolder();
    this.verifierFactory = new VerifierFactory(
      this.connectInfo.ledgerPluginInfo as VerifierFactoryConfig,
      config.logLevel,
    );
  }

  getBalance(account: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      // for Neo
      const contract = {}; // NOTE: Since contract does not need to be specified, specify an empty object.
      const method = { type: "web3Eth", command: "getBalance" };
      const args = { args: [account] };

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
