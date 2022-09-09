/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * transaction-fabric.ts
 */

////////
// Usage
//
////////

/* Summary:
 * Request library for fabric v1.4.0 (for offline signature) Processing library Testing library
 * In this case, it is used only when transferring assets.
 */

import { ConfigUtil } from "@hyperledger/cactus-cmd-socketio-server";
import { Verifier } from "@hyperledger/cactus-verifier-client";

import { FileSystemWallet } from "fabric-network";

const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "TransactionFabric";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

interface SendSyncRequestResult {
  data: {
    signedCommitProposal: {
      signature: string | Buffer;
      proposal_bytes: string | Buffer;
    };
  };
  txId: string;
}

export function makeSignedProposal<T>(
  ccFncName: string,
  ccArgs: string[],
  verifierFabric: Verifier<T>,
): Promise<SendSyncRequestResult> {
  return new Promise(async (resolve, reject) => {
    try {
      /*
       *  Endorse step
       */
      const transactionProposalReq = {
        fcn: ccFncName, // Chaincode function name
        args: ccArgs, // Chaincode argument
        chaincodeId: config.assetTradeInfo.fabric.chaincodeID,
        channelId: config.assetTradeInfo.fabric.channelName,
      };
      logger.debug(transactionProposalReq);

      // Get certificate and key acquisition
      let certPem = undefined;
      let privateKeyPem = undefined;
      const submitter = config.assetTradeInfo.fabric.submitter.name;
      const wallet = new FileSystemWallet(
        config.assetTradeInfo.fabric.keystore,
      );
      logger.debug(`Wallet path: ${config.assetTradeInfo.fabric.keystore}`);

      const submitterExists = await wallet.exists(submitter);
      if (submitterExists) {
        const submitterIdentity = await wallet.export(submitter);
        certPem = (submitterIdentity as any).certificate;
        privateKeyPem = (submitterIdentity as any).privateKey;
      }

      const contract = {
        channelName: config.assetTradeInfo.fabric.channelName,
      };
      const method = { type: "function", command: "sendSignedProposal" };
      const argsParam: {
        args: {
          transactionProposalReq: Record<string, unknown>;
          certPem: undefined;
          privateKeyPem: undefined;
        };
      } = {
        args: {
          transactionProposalReq: transactionProposalReq,
          certPem: certPem,
          privateKeyPem: privateKeyPem,
        },
      };
      verifierFabric
        .sendSyncRequest(contract, method, argsParam)
        .then((resp) => {
          logger.debug(`Successfully build endorse and commit`);

          const args = {
            signedCommitProposal: resp.data["signedCommitProposal"],
            commitReq: resp.data["commitReq"],
          };
          const result: SendSyncRequestResult = {
            data: args,
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
