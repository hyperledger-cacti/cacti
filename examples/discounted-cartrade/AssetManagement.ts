/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * AssetManagement.ts
 */

import { LPInfoHolder } from "@hyperledger/cactus-cmd-socket-server";
import { ContractInfoHolder } from "@hyperledger/cactus-cmd-socket-server";
import { ConfigUtil } from "@hyperledger/cactus-cmd-socket-server";
import {
  VerifierFactory,
  VerifierFactoryConfig,
} from "@hyperledger/cactus-verifier-client";

const fs = require("fs");
const path = require("path");
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "AssetManagement";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class AssetManagement {
  private connectInfo: LPInfoHolder = null; // connection information
  private contractInfoholder: ContractInfoHolder = null; // contract information
  private readonly verifierFactory: VerifierFactory;

  constructor() {
    this.connectInfo = new LPInfoHolder();
    this.contractInfoholder = new ContractInfoHolder();
    this.verifierFactory = new VerifierFactory(
      this.connectInfo.ledgerPluginInfo as VerifierFactoryConfig,
      config.logLevel,
    );
  }

  addAsset(amount: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // for Neo
      const contractInfo: string =
        this.contractInfoholder.getContractInfo("AssetContract");
      const contractInfoObj: {} = JSON.parse(contractInfo);
      const coinbase = contractInfoObj["_eth"]["coinbase"];
      const address = contractInfoObj["address"];
      const abi = contractInfoObj["abi"];
      const contract = {
        address: address,
        abi: abi,
      };
      const method = {
        type: "contract",
        command: "addAsset",
        function: "sendTransaction",
      };
      const template = "default";
      const args = { args: [amount, { from: coinbase }] };
      // const method = "default";
      // const args = {"method": {type: "contract", command: "addAsset", function: "sendTransaction"}, "args": {"args": [amount, {from: coinbase}]}};

      this.verifierFactory
        .getVerifier("84jUisrs")
        .sendSyncRequest(contract, method, args)
        .then((result) => {
          const response = {
            status: result.status,
            "Transaction hash": result.data,
          };
          resolve(response);
        })
        .catch((err) => {
          logger.error(err);
          reject(err);
        });
    });
  }

  getAsset(): Promise<any> {
    return new Promise((resolve, reject) => {
      // for Neo
      const contractInfo: string =
        this.contractInfoholder.getContractInfo("AssetContract");
      const contractInfoObj: {} = JSON.parse(contractInfo);
      const address = contractInfoObj["address"];
      const abi = contractInfoObj["abi"];
      const contract = {
        address: address,
        abi: abi,
      };
      const method = {
        type: "contract",
        command: "getAsset",
        function: "call",
      };
      const template = "default";
      const args = { args: [] };
      // const method = "default";
      // const args = {"method": {type: "contract", command: "getAsset", function: "call"}, "args": {"args": []}};

      this.verifierFactory
        .getVerifier("84jUisrs")
        .sendSyncRequest(contract, method, args)
        .then((result) => {
          const response = {
            status: result.status,
            asset: parseFloat(result.data),
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
