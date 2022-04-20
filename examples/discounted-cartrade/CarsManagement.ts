/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * CarsManagement.ts
 */

import { LPInfoHolder } from "@hyperledger/cactus-cmd-socket-server";
import { ConfigUtil } from "@hyperledger/cactus-cmd-socket-server";
import {
  VerifierFactory,
  VerifierFactoryConfig,
} from "@hyperledger/cactus-verifier-client";

const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "CarsManagement";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class CarsManagement {
  private connectInfo: LPInfoHolder = null; // connection information
  private readonly verifierFactory: VerifierFactory;

  constructor() {
    this.connectInfo = new LPInfoHolder();
    this.verifierFactory = new VerifierFactory(
      this.connectInfo.ledgerPluginInfo as VerifierFactoryConfig,
      config.logLevel,
    );
  }

  queryCar(carID: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const contract = { channelName: "mychannel", contractName: "basic" };
      const method = { type: "evaluateTransaction", command: "ReadAsset" };
      const args = { args: [carID] };
      // const method = "default";
      // const args = {"method": {type: "evaluateTransaction", command: "queryCar"},"args": {"args": [carID]}};

      this.verifierFactory
        .getVerifier("r9IS4dDf")
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

  queryAllCars(): Promise<any> {
    return new Promise((resolve, reject) => {
      const contract = { channelName: "mychannel", contractName: "basic" };
      const method = { type: "evaluateTransaction", command: "GetAllAssets" };
      const args = { args: [] };
      // const method = "default";
      // const args = {"method": {type: "evaluateTransaction", command: "queryAllCars"}, "args": {"args": []}};

      this.verifierFactory
        .getVerifier("r9IS4dDf")
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
}
