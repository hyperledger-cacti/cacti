/*
 * Copyright 2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * template-trade-management.ts
 */

import { Request } from "express";
import { LPInfoHolder } from "@hyperledger/cactus-cmd-socketio-server";
import { ConfigUtil } from "@hyperledger/cactus-cmd-socketio-server";
import {
  VerifierFactory,
  VerifierFactoryConfig,
} from "@hyperledger/cactus-verifier-client";

const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "TemplateTradeManagement";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class TemplateTradeManagement {
  private connectInfo: LPInfoHolder | null = null; // connection information
  private readonly verifierFactory: VerifierFactory;

  constructor() {
    this.connectInfo = new LPInfoHolder();
    this.verifierFactory = new VerifierFactory(
      this.connectInfo.ledgerPluginInfo as VerifierFactoryConfig,
      config.logLevel,
    );
  }

  execTemplateTrade(
    functionName: string,
    req: Request,
  ): Promise<VerifierFactory> {
    return new Promise((resolve, reject) => {
      const contract = {}; // NOTE: Since contract does not need to be specified, specify an empty object.
      const method = {};
      const template = req.body.template;
      const args = req.body.args;
      logger.debug(
        `##contract: ${contract}, method: ${JSON.stringify(
          method,
        )}, template: ${template}, args: ${JSON.stringify(args)}`,
      );

      this.verifierFactory
        .getVerifier("84jUisrs")
        .sendSyncRequest(contract, method, args)
        .then((result) => {
          resolve(result);
        })
        .catch((err) => {
          logger.error(err);
          reject(err);
        });
    });
  }

  execTemplateTradeAsync(functionName: string, req: Request): string {
    // TODO
    const tradeID = this.createTradeID();

    const contract = {}; // NOTE: Since contract does not need to be specified, specify an empty object.
    const method = {};
    const args = req.body.args;
    logger.debug(
      `##contract: ${contract}, method: ${method}, args: ${JSON.stringify(
        args,
      )}`,
    );

    this.verifierFactory
      .getVerifier("84jUisrs")
      .sendAsyncRequest(contract, method, args)
      .then(() => {
        logger.debug(`##thirdTransaction sendAsyncRequest finish`);
      })
      .catch((err) => {
        logger.error(err);
      });

    return tradeID;
  }

  createTradeID(): string {
    // NOTE: tradeID is "(GMT date when the API was accepted) - (serial number)"

    // TODO: Trailing number-generating part not implemented
    //  NOTE: The last serial number is fixed "001" for 2020/9 months.
    const currentTime: Date = new Date();
    const tradeID: string =
      currentTime.getFullYear() +
      ("0" + (currentTime.getMonth() + 1)).slice(-2) +
      ("0" + currentTime.getDate()).slice(-2) +
      ("0" + currentTime.getHours()).slice(-2) +
      ("0" + currentTime.getMinutes()).slice(-2) +
      ("0" + currentTime.getSeconds()).slice(-2) +
      ("00" + currentTime.getMilliseconds()).slice(-3) +
      "-001"; // NOTE: Serial number for the same time. Since the priority is low, it is fixed at "001" at this time.
    return tradeID;
  }
}
