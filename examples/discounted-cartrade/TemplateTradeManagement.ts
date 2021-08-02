/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * TemplateTradeManagement.ts
 */

import { Request } from 'express';
import { LPInfoHolder } from '../../packages/routing-interface/util/LPInfoHolder';
import { VerifierBase } from '../../packages/ledger-plugin/VerifierBase';
import { ConfigUtil } from '../../packages/routing-interface/util/ConfigUtil';

const fs = require('fs');
const path = require('path');
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = 'TemplateTradeManagement';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class TemplateTradeManagement {
    private connectInfo: LPInfoHolder = null;                   // connection information
    private verifier: VerifierBase = null;

    constructor() {
        this.connectInfo = new LPInfoHolder();
    }

    execTemplateTrade(functionName: string, req: Request): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.verifier === null) {
                logger.debug("create verifier");
                const ledgerPluginInfo: string = this.connectInfo.getLegerPluginInfo("84jUisrs");
                this.verifier = new VerifierBase(ledgerPluginInfo);
            }

            const contract = {}; // NOTE: Since contract does not need to be specified, specify an empty object.
            const method = {};
            const template = req.body.template;
            const args = req.body.args;
            logger.debug(`##contract: ${contract}, method: ${JSON.stringify(method)}, template: ${template}, args: ${JSON.stringify(args)}`);

            // ex. 
            //    contract: {}
            //    method: "name"
            //    args: {"tokenID": "token-12345", "contractID": "contract-123456"}

            this.verifier.execSyncFunction(contract, method, template, args).then(result => {
                const response = {
                    "status": result.status,
                    "result": JSON.stringify(result.data)
                }
                // resolve(response);
                resolve(result);
            }).catch((err) => {
                logger.error(err);
                reject(err);
            });

        });
    }

    execTemplateTradeAsync(functionName: string, req: Request): string {
        // TODO
        const tradeID = this.createTradeID();

        if (this.verifier === null) {
            logger.debug("create verifier");
            const ledgerPluginInfo: string = this.connectInfo.getLegerPluginInfo("84jUisrs");
            this.verifier = new VerifierBase(ledgerPluginInfo);
        }


        const contract = {}; // NOTE: Since contract does not need to be specified, specify an empty object.
        const method = {};
        const template = req.body.template;
        const args = req.body.args;
        logger.debug(`##contract: ${contract}, method: ${method}, args: ${JSON.stringify(args)}`);

        // ex. 
        //    contract: {}
        //    method: "transfer"
        //    args: {"_from": "account1", "_to": "account2", "value": 100, "tokenID": "token-12345", "contractID": "contract-123456"}

        this.verifier.sendSignedTransaction(contract, method, template, args);

        return tradeID;
    }

    createTradeID(): string {
        // NOTE: tradeID is "(GMT date when the API was accepted) - (serial number)"

        // TODO: Trailing number-generating part not implemented
        //  NOTE: The last serial number is fixed "001" for 2020/9 months.
        const currentTime: Date = new Date();
        const tradeID: string = currentTime.getFullYear()
            + ('0' + (currentTime.getMonth() + 1)).slice(-2)
            + ('0' + currentTime.getDate()).slice(-2)
            + ('0' + currentTime.getHours()).slice(-2)
            + ('0' + currentTime.getMinutes()).slice(-2)
            + ('0' + currentTime.getSeconds()).slice(-2)
            + ('00' + currentTime.getMilliseconds()).slice(-3)
            + "-001";   // NOTE: Serial number for the same time. Since the priority is low, it is fixed at "001" at this time.
        return tradeID;
    }


}
