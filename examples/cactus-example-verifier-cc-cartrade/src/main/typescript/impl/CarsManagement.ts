/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * CarsManagement.ts
 */

import { LPInfoHolder } from "@hyperledger/cactus-plugin-verifier-cc";
import { VerifierBase } from "@hyperledger/cactus-plugin-verifier-cc";
import { ConfigUtil } from "@hyperledger/cactus-plugin-verifier-cc";

const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "CarsManagement";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class CarsManagement {
  private connectInfo: LPInfoHolder | null = null; // connection information
  private verifierFabric: VerifierBase | null = null;

  constructor() {
    this.connectInfo = new LPInfoHolder();
  }

  queryCar(carID: string): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.verifierFabric === null) {
        logger.debug("create verifierFabric");
        if (!this.connectInfo) {
          throw new Error(
            "CarsManagement#queryCar() this.connectInfo cannot be falsy.",
          );
        }
        const ledgerPluginInfo: string = this.connectInfo.getLegerPluginInfo(
          "r9IS4dDf",
        );
        this.verifierFabric = new VerifierBase(ledgerPluginInfo);
      }

      const contract = { channelName: "mychannel", contractName: "fabcar" };
      const method = { type: "evaluateTransaction", command: "queryCar" };
      const template = "default";
      const args = { args: [carID] };
      // const method = "default";
      // const args = {"method": {type: "evaluateTransaction", command: "queryCar"},"args": {"args": [carID]}};

      this.verifierFabric
        .execSyncFunction(contract, method, template, args)
        .then((result) => {
          resolve(result);
        })
        .catch((err) => {
          logger.error(err);
          reject(err);
        });
    });
  }

  queryAllCars(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.verifierFabric === null) {
        logger.debug("create verifierFabric");
        if (!this.connectInfo) {
          throw new Error(
            "CarsManagement#queryAllCars() this.connectInfo cannot be falsy.",
          );
        }
        const ledgerPluginInfo: string = this.connectInfo.getLegerPluginInfo(
          "r9IS4dDf",
        );
        this.verifierFabric = new VerifierBase(ledgerPluginInfo);
      }

      const contract = { channelName: "mychannel", contractName: "fabcar" };
      const method = { type: "evaluateTransaction", command: "queryAllCars" };
      const template = "default";
      const args = { args: [] };
      // const method = "default";
      // const args = {"method": {type: "evaluateTransaction", command: "queryAllCars"}, "args": {"args": []}};

      this.verifierFabric
        .execSyncFunction(contract, method, template, args)
        .then((result) => {
          resolve(result);
        })
        .catch((err) => {
          logger.error(err);
          reject(err);
        });
    });
  }
}
