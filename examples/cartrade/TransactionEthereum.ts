/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * TransactionEthereum.ts
 */

import { TransactionSigner } from '../../packages/ledger-plugin/util/TransactionSigner';

const ethJsCommon = require('ethereumjs-common').default;
const ethJsTx = require('ethereumjs-tx').Transaction;
const libWeb3 = require('web3');

const fs = require('fs');
const path = require('path');
const config: any = JSON.parse(fs.readFileSync(path.resolve(__dirname, "./config/default.json"), 'utf8'));
import { getLogger } from "log4js";
const moduleName = 'TransactionEthereum';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

const mapFromAddressNonce: Map<string, number> = new Map();

export function makeRawTransaction(txParam: { fromAddress: string, fromAddressPkey: string, toAddress: string, amount: number, gas: number }): Promise<{ data: {}, txId: string }> {
    return new Promise(async (resolve, reject) => {
        try {
            logger.debug("txParam : " + JSON.stringify(txParam));
            // Initial setting
            logger.debug('gethUrl: ' + config.cartradeInfo.ethereum.gethURL);
            const provider = new libWeb3.providers.HttpProvider(config.cartradeInfo.ethereum.gethURL);
            const web3 = new libWeb3(provider);

            // web3_v1.2.9_support
            web3.eth.getTransactionCount(txParam.fromAddress)
                .then(_nonce => {
                    let txnCount: number = _nonce;
                    // NOTE: No need to count up.

                    // NOTE: gasPrice is not used
                    // const gasPrice: string = web3.eth.getGasPrice();

                    const latestNonce = getLatestNonce(txParam.fromAddress);
                    logger.debug(`#####(A) _nonce: ${_nonce}, latestNonce: ${latestNonce}`);
                    logger.debug(`####makeRawTransaction(): fromAddress: ${txParam.fromAddress}, txnCount: ${web3.utils.toHex(txnCount)}, latestNonce: ${web3.utils.toHex(latestNonce)}`);
                    if (txnCount <= latestNonce) {
                        txnCount = latestNonce + 1;
                        logger.debug(`####makeRawTransaction(): Adjust txnCount, fromAddress: ${txParam.fromAddress}, txnCount: ${web3.utils.toHex(txnCount)}, latestNonce: ${web3.utils.toHex(latestNonce)}`);
                    }
                    logger.debug(`#####(B) _nonce: ${_nonce}, latestNonce: ${latestNonce}, txnCount: ${txnCount}`);
                    setLatestNonce(txParam.fromAddress, txnCount);

                    const rawTx: { nonce: number, to: string, value: number, gas: number } = {
                        "nonce": web3.utils.toHex(txnCount),
                        "to": txParam.toAddress,
                        "value": txParam.amount,
                        "gas": txParam.gas,
                    }

                    const signedTx = TransactionSigner.signTxEthereum(rawTx, txParam.fromAddressPkey);

                    const result: { data: {}, txId: string } = {
                        data: { serializedTx: signedTx["serializedTx"] },
                        txId: signedTx["txId"]
                    }

                    return resolve(result);
                })
        } catch (err) {
            logger.error(err);
            return reject(err);
        };
    });
}


function getLatestNonce(fromAddress: string): number {
    if (mapFromAddressNonce.has(fromAddress)) {
        return mapFromAddressNonce.get(fromAddress);
    }
    //return 0;
    return -1;
}

function setLatestNonce(fromAddress: string, nonce: number): void {
    mapFromAddressNonce.set(fromAddress, nonce);
}
