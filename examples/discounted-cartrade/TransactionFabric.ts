/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * TransactionFabric.ts
 */

////////
// Usage
//
////////

/* Summary:
 * Request library for fabric v1.4.0 (for offline signature) Processing library Testing library
 * In this case, it is used only when transferring assets.
 */

import { Verifier } from "@hyperledger/cactus-cmd-socket-server";

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
import { FileSystemWallet } from "fabric-network";

//const config: any = JSON.parse(fs.readFileSync("/etc/cactus/default.json", 'utf8'));
const config: any = yaml.safeLoad(
  fs.readFileSync("/etc/cactus/default.yaml", "utf8"),
);
import { getLogger } from "log4js";
const moduleName = "TransactionFabric";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export function makeSignedProposal(
  ccFncName: string,
  ccArgs: string[],
  verifierFabric: Verifier,
): Promise<{ data: {}; txId: string }> {
  // exports.Invoke = async function(reqBody, isWait){
  // let eventhubs = []; // For the time being, give up the eventhub connection of multiple peers.
  let invokeResponse; // Return value from chain code
  let channel;

  return new Promise(async (resolve, reject) => {
    try {
      /*
       *  Endorse step
       */
      const transactionProposalReq = {
        fcn: ccFncName, // Chaincode function name
        args: ccArgs, // Chaincode argument
        chaincodeId: config.cartradeInfo.fabric.chaincodeID,
        channelId: config.cartradeInfo.fabric.channelName,
      };
      logger.debug(transactionProposalReq);

      // Get certificate and key acquisition
      let certPem = undefined;
      let privateKeyPem = undefined;
      const submitter = config.cartradeInfo.fabric.submitter.name;
      const wallet = new FileSystemWallet(config.cartradeInfo.fabric.keystore);
      logger.debug(`Wallet path: ${config.cartradeInfo.fabric.keystore}`);

      const submitterExists = await wallet.exists(submitter);
      if (submitterExists) {
        const submitterIdentity = await wallet.export(submitter);
        certPem = (submitterIdentity as any).certificate;
        privateKeyPem = (submitterIdentity as any).privateKey;
      }

      // const signedTx = await TransactionSigner.signTxFabric(transactionProposalReq, certPem, privateKeyPem);
      const contract = { channelName: config.cartradeInfo.fabric.channelName };
      const method = { type: "function", command: "sendSignedProposal" };
      const template = "default";
      const argsParam: {} = {
        args: {
          transactionProposalReq: transactionProposalReq,
          certPem: certPem,
          privateKeyPem: privateKeyPem,
        },
      };
      verifierFabric
        .sendSyncRequest(contract, method, argsParam)
        .then((resp) => {
          // logger.debug(`##makeSignedProposal: resp: ${JSON.stringify(resp)}`);
          // logger.debug(`##makeSignedProposal: resp.data: ${JSON.stringify(resp.data)}`);
          logger.debug(`Successfully build endorse and commit`);

          const args: {} = {
            // signedCommitProposal: resp["signedCommitProposal"],
            signedCommitProposal: resp.data["signedCommitProposal"],
            // commitReq: resp["commitReq"]
            commitReq: resp.data["commitReq"],
          };
          const result: { data: {}; txId: string } = {
            data: args,
            // txId: resp["txId"]
            txId: resp.data["txId"],
          };
          return resolve(result);
        })
        .catch((err) => {
          logger.error(`##makeSignedProposal: err: ${err}`);
          reject(err);
        });
    } catch (e) {
      logger.error(`error at Invoke: err=${e}`);
      return reject(e);
    }
  });
}
