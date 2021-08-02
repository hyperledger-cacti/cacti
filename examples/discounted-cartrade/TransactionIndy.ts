/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * TransactionIndy.ts
 */

import { LPInfoHolder } from '../../packages/routing-interface/util/LPInfoHolder';
import { VerifierBase } from '../../packages/ledger-plugin/VerifierBase';
import { TransactionSigner } from '../../packages/ledger-plugin/util/TransactionSigner';

const libWeb3 = require('web3');

const fs = require('fs');
const path = require('path');
const config: any = JSON.parse(fs.readFileSync(path.resolve(__dirname, "./config/default.json"), 'utf8'));
import { getLogger } from "log4js";
import { stringify } from 'querystring';
const moduleName = 'TransactionIndy';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

let xConnectInfo: LPInfoHolder = null;      // connection information
let xVerifierIndy: VerifierBase = null;

export function getDataFromIndy(arg_request: {}, identifier: string): Promise<{}> {
    return new Promise(async (resolve, reject) => {
        try {
            logger.debug(`getDataFromIndy: arg_request: ${arg_request}`);
            sendRequest(arg_request, identifier)
            .then(result => {
                logger.debug(`##getDataFromIndy: result: ${result}`);

                return resolve(result);
            })
        } catch (err) {
            logger.error(err);
            return reject(err);
        };
    });
}

// convert response to list value
function convertResponse(response) {
    logger.debug("called convertResponse");

    logger.debug(`##convertResponse response: ${JSON.stringify(response)}`);
    const responseObj = response["data"];

    logger.debug(`##responseObj : ${responseObj}`);

    const receivedId = responseObj[0];
    const receivedData = responseObj[1];
    const result = {"receivedId": receivedId, "receivedData": receivedData};

    logger.debug(`##convertResponse response: ${JSON.stringify(result)}`);
    return result;
}

function sendRequest(arg_request: {}, identifier: string): Promise<{}> {
    return new Promise(async (resolve, reject) => {
        try {
            logger.debug(`##sendRequest: arg_request: ${arg_request}`);


            if (xConnectInfo === null) {
                xConnectInfo = new LPInfoHolder();
            }
    
            if (xVerifierIndy === null) {
                logger.debug("create verifierIndy");
                const ledgerPluginInfo: string = xConnectInfo.getLegerPluginInfo("3PfTJw8g");
                xVerifierIndy = new VerifierBase(ledgerPluginInfo);
            }

            let commandName = "";

            if(identifier === "schema"){
                commandName = "get_schema"
            }else if(identifier === "credDef"){
                commandName = "get_cred_def"
            }

            const contract = {"channelName": "mychannel", "contractName": "indysomething"}; // NOTE: Since contract does not need to be specified, specify an empty object.
            const method = {type: "evaluateTransaction", command: commandName};
            const template = "default";

            const args = {"args": arg_request};

            xVerifierIndy.execSyncFunction(contract, method, template, args)
            .then(result => {
                // logger.debug(`xVerifierIndy.execSyncFunction: ${JSON.stringify(result)}`);
                // logger.debug(`xVerifierIndy.execSyncFunction: ${JSON.stringify(result["data"])}`);
                return resolve(result);
            })


        } catch (err) {
            logger.error(err);
            return reject(err);
        };
    });
}