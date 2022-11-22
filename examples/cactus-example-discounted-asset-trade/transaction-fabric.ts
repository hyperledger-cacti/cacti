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
import { signProposal } from "./sign-utils";

import { FileSystemWallet } from "fabric-network";

const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "TransactionFabric";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export function makeSignedProposal<T>(
  ccFncName: string,
  ccArgs: string[],
  verifierFabric: Verifier<T>,
): Promise<{ signedTxArgs: unknown; txId: string }> {
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

      if (!certPem || !privateKeyPem) {
        throw new Error(
          "Could not read certPem or privateKeyPem from BLP fabric wallet.",
        );
      }

      // Get unsigned proposal
      const contractUnsignedProp = {
        channelName: config.assetTradeInfo.fabric.channelName,
      };
      const methodUnsignedProp = {
        type: "function",
        command: "generateUnsignedProposal",
      };
      const argsUnsignedProp = {
        args: {
          transactionProposalReq,
          certPem,
        },
      };

      logger.debug("Sending fabric.generateUnsignedProposal");
      const responseUnsignedProp = await verifierFabric.sendSyncRequest(
        contractUnsignedProp,
        methodUnsignedProp,
        argsUnsignedProp,
      );
      const proposalBuffer = Buffer.from(
        responseUnsignedProp.data.proposalBuffer,
      );
      const proposal = responseUnsignedProp.data.proposal;
      const txId = responseUnsignedProp.data.txId;

      // Prepare signed proposal
      const signedProposal = signProposal(proposalBuffer, privateKeyPem);

      // Call sendSignedProposalV2
      const contractSignedProposal = {
        channelName: config.assetTradeInfo.fabric.channelName,
      };
      const methodSignedProposal = {
        type: "function",
        command: "sendSignedProposalV2",
      };
      const argsSignedProposal = {
        args: {
          signedProposal,
        },
      };

      logger.debug("Sending fabric.sendSignedProposalV2");
      const responseSignedEndorse = await verifierFabric.sendSyncRequest(
        contractSignedProposal,
        methodSignedProposal,
        argsSignedProposal,
      );

      if (!responseSignedEndorse.data.endorsmentStatus) {
        throw new Error("Fabric TX endorsment was not OK.");
      }
      const proposalResponses = responseSignedEndorse.data.proposalResponses;

      // Get unsigned commit (transaction) proposal
      const contractUnsignedTx = {
        channelName: config.assetTradeInfo.fabric.channelName,
      };
      const methodUnsignedTx = {
        type: "function",
        command: "generateUnsignedTransaction",
      };
      const argsUnsignedTx = {
        args: {
          proposal: proposal,
          proposalResponses: proposalResponses,
        },
      };

      logger.debug("Sending fabric.generateUnsignedTransaction");
      const responseUnsignedTx = await verifierFabric.sendSyncRequest(
        contractUnsignedTx,
        methodUnsignedTx,
        argsUnsignedTx,
      );

      const commitProposalBuffer = Buffer.from(
        responseUnsignedTx.data.txProposalBuffer,
      );

      // Prepare signed commit proposal
      const signedCommitProposal = signProposal(
        commitProposalBuffer,
        privateKeyPem,
      );

      const signedTxArgs = {
        signedCommitProposal,
        proposal,
        proposalResponses,
      };

      return resolve({
        txId,
        signedTxArgs,
      });
    } catch (e) {
      logger.error(`error at Invoke: err=${e}`);
      return reject(e);
    }
  });
}
