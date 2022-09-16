/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * fabric-asset-management.ts
 */

import { LPInfoHolder } from "@hyperledger/cactus-cmd-socketio-server";
import { ConfigUtil } from "@hyperledger/cactus-cmd-socketio-server";
import {
  VerifierFactory,
  VerifierFactoryConfig,
} from "@hyperledger/cactus-verifier-client";

const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "FabricAssetManagement";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class FabricAssetManagement {
  private connectInfo: LPInfoHolder | null = null; // connection information
  private readonly verifierFactory: VerifierFactory;

  constructor() {
    this.connectInfo = new LPInfoHolder();
    this.verifierFactory = new VerifierFactory(
      this.connectInfo.ledgerPluginInfo as VerifierFactoryConfig,
      config.logLevel,
    );
  }

  queryAsset(assetID: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const contract = { channelName: "mychannel", contractName: "basic" };
      const method = { type: "evaluateTransaction", command: "ReadAsset" };
      const args = { args: [assetID] };

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

  queryAllAssets(): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const contract = { channelName: "mychannel", contractName: "basic" };
      const method = { type: "evaluateTransaction", command: "GetAllAssets" };
      const args = { args: [] };

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
