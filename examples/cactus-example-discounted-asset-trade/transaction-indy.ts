/*
 * Copyright 2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * transaction-indy.ts
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
const moduleName = "TransactionIndy";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const xConnectInfo = new LPInfoHolder();
const verifierFactory = new VerifierFactory(
  xConnectInfo.ledgerPluginInfo as VerifierFactoryConfig,
  config.logLevel,
);

export function getDataFromIndy(
  arg_request: {
    did: string | null;
    schemaId: string;
  },
  identifier: string,
): Promise<{ data: string[] }> {
  return new Promise(async (resolve, reject) => {
    try {
      logger.debug(`getDataFromIndy: arg_request: ${arg_request}`);
      sendRequest(arg_request, identifier).then((result) => {
        logger.debug(`##getDataFromIndy: result: ${result}`);

        return resolve(result);
      });
    } catch (err) {
      logger.error(err);
      return reject(err);
    }
  });
}

function sendRequest(
  arg_request: Record<string, unknown>,
  identifier: string,
): Promise<{ data: string[] }> {
  return new Promise(async (resolve, reject) => {
    try {
      logger.debug(`##sendRequest: arg_request: ${arg_request}`);

      let commandName = "";

      if (identifier === "schema") {
        commandName = "get_schema";
      } else if (identifier === "credDef") {
        commandName = "get_cred_def";
      }

      const contract = {
        channelName: "mychannel",
        contractName: "indysomething",
      }; // NOTE: Since contract does not need to be specified, specify an empty object.
      const method = { type: "evaluateTransaction", command: commandName };

      const args = { args: arg_request };

      verifierFactory
        .getVerifier("3PfTJw8g")
        .sendSyncRequest(contract, method, args)
        .then((result) => {
          return resolve(result);
        });
    } catch (err) {
      logger.error(err);
      return reject(err);
    }
  });
}
