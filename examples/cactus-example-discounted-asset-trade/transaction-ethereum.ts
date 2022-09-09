/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * transaction-ethereum.ts
 */

import {
  ConfigUtil,
  LPInfoHolder,
  TransactionSigner,
} from "@hyperledger/cactus-cmd-socketio-server";

import {
  VerifierFactory,
  VerifierFactoryConfig,
} from "@hyperledger/cactus-verifier-client";

const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "TransactionEthereum";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const mapFromAddressNonce: Map<string, number> = new Map();
const xConnectInfo = new LPInfoHolder();
const verifierFactory = new VerifierFactory(
  xConnectInfo.ledgerPluginInfo as VerifierFactoryConfig,
  config.logLevel,
);

export function makeRawTransaction(txParam: {
  fromAddress: string;
  fromAddressPkey: string;
  toAddress: string;
  amount: number;
  gas: number;
}): Promise<{
  data: { serializedTx: string };
  txId: string;
}> {
  return new Promise(async (resolve, reject) => {
    try {
      logger.debug(`makeRawTransaction: txParam: ${JSON.stringify(txParam)}`);

      getNewNonce(txParam.fromAddress).then((result) => {
        logger.debug(
          `##makeRawTransaction(A): result: ${JSON.stringify(result)}`,
        );

        const txnCountHex: string = result.txnCountHex;

        const rawTx = {
          nonce: txnCountHex,
          to: txParam.toAddress,
          value: txParam.amount,
          gas: txParam.gas,
        };
        logger.debug(
          `##makeRawTransaction(B), rawTx: ${JSON.stringify(rawTx)}`,
        );

        const signedTx = TransactionSigner.signTxEthereum(
          rawTx,
          txParam.fromAddressPkey,
        );
        const resp = {
          data: { serializedTx: signedTx["serializedTx"] },
          txId: signedTx["txId"],
        };

        return resolve(resp);
      });
    } catch (err) {
      logger.error(err);
      return reject(err);
    }
  });
}

function getNewNonce(fromAddress: string): Promise<{ txnCountHex: string }> {
  return new Promise(async (resolve, reject) => {
    try {
      logger.debug(`getNewNonce start: fromAddress: ${fromAddress}`);

      // Get the number of transactions in account
      const contract = {}; // NOTE: Since contract does not need to be specified, specify an empty object.
      const method = { type: "function", command: "getNonce" };

      const args = { args: { args: [fromAddress] } };

      logger.debug(`##getNewNonce(A): call validator#getNonce()`);

      verifierFactory
        .getVerifier("84jUisrs")
        .sendSyncRequest(contract, method, args)
        .then((result) => {
          let txnCount: number = result.data.nonce;
          let txnCountHex: string = result.data.nonceHex;

          const latestNonce = getLatestNonce(fromAddress);
          if (latestNonce) {
            if (txnCount <= latestNonce && latestNonce) {
              // nonce correction
              txnCount = latestNonce + 1;
              logger.debug(
                `##getNewNonce(C): Adjust txnCount, fromAddress: ${fromAddress}, txnCount: ${txnCount}, latestNonce: ${latestNonce}`,
              );

              const method = { type: "function", command: "toHex" };
              const args = { args: { args: [txnCount] } };

              logger.debug(`##getNewNonce(D): call validator#toHex()`);
              verifierFactory
                .getVerifier("84jUisrs")
                .sendSyncRequest(contract, method, args)
                .then((result) => {
                  txnCountHex = result.data.hexStr;
                  logger.debug(`##getNewNonce(E): txnCountHex: ${txnCountHex}`);
                  setLatestNonce(fromAddress, txnCount);

                  return resolve({ txnCountHex: txnCountHex });
                });
            } else {
              setLatestNonce(fromAddress, txnCount);

              logger.debug(`##getNewNonce(G): txnCountHex: ${txnCountHex}`);
              return resolve({ txnCountHex: txnCountHex });
            }
          }
        });
    } catch (err) {
      logger.error(err);
      return reject(err);
    }
  });
}

function getLatestNonce(fromAddress: string): number | undefined {
  if (mapFromAddressNonce.has(fromAddress)) {
    return mapFromAddressNonce.get(fromAddress);
  }

  return -1;
}

function setLatestNonce(fromAddress: string, nonce: number): void {
  mapFromAddressNonce.set(fromAddress, nonce);
}
