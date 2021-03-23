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

import { TransactionSigner } from '../../packages/ledger-plugin/util/TransactionSigner';

const fs = require('fs');
const path = require('path');
const config: any = JSON.parse(fs.readFileSync(path.resolve(__dirname, "./config/default.json"), 'utf8'));
import { getLogger } from "log4js";
const moduleName = 'TransactionFabric';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;


export function makeSignedProposal(ccFncName: string, ccArgs: string[]): Promise<{ data: {}, txId: string }> {
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
                fcn: ccFncName,                     // Chaincode function name
                args: ccArgs,                       // Chaincode argument
                chaincodeId: config.cartradeInfo.fabric.chaincodeID,
                channelId: config.cartradeInfo.fabric.channelName,
            };
            logger.debug(transactionProposalReq);

            // Get certificate and key acquisition
            const certPem = config.cartradeInfo.fabric.submitter.certificate;
            const privateKeyPem = config.cartradeInfo.fabric.submitter.pkey;

            const signedTx = await TransactionSigner.signTxFabric(transactionProposalReq, certPem, privateKeyPem);

            logger.debug('Successfully build endorse transaction proposal');
            logger.debug("##new param type##");

            const args: {} = {
                signedCommitProposal: signedTx["signedCommitProposal"],
                commitReq: signedTx["commitReq"]
            };
            const result: { data: {}, txId: string } = {
                data: args,
                // txId: txId.getTransactionID()
                txId: signedTx["txId"]
            }
            return resolve(result);
        } catch (e) {
            logger.error(`error at Invoke: err=${e}`);
            return reject(e);
        }
    });
}
