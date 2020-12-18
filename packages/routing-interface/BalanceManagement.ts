/*
 * Copyright 2020 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BalanceManagement.ts
 */

import { LedgerOperation } from '../business-logic-plugin/LedgerOperation';
import { LPInfoHolder } from './util/LPInfoHolder';
import { VerifierBase } from '../ledger-plugin/VerifierBase';
import { ConfigUtil } from './util/ConfigUtil';

const fs = require('fs');
const path = require('path');
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = 'BalanceManagement';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class BalanceManagement {
    private connectInfo: LPInfoHolder = null;                   // connection information
    private verifierEthereum: VerifierBase = null;

    constructor() {
        this.connectInfo = new LPInfoHolder();
    }

    getBalance(account: string): Promise<any> {
        return new Promise((resolve, reject) => {
            if (this.verifierEthereum === null) {
                logger.debug("create verifierEthereum");
                const ledgerPluginInfo: string = this.connectInfo.getLegerPluginInfo("84jUisrs");
                this.verifierEthereum = new VerifierBase(ledgerPluginInfo);
            }

            // for LedgerOperation
            // const execData = {"referedAddress": account};
            // const ledgerOperation: LedgerOperation = new LedgerOperation("getNumericBalance", "", execData);

            // for Neo
            const contract = {}; // NOTE: Since contract does not need to be specified, specify an empty object.
            const method = {type: "web3Eth", command: "getBalance"};
            const args = {"args": [account]};

            this.verifierEthereum.execSyncFunctionNeo(contract, method, args).then(result => {
                const response = {
                    "status": result.status,
                    "amount": parseFloat(result.data)
                }
                resolve(response);
            }).catch((err) => {
                logger.error(err);
                reject(err);
            });

        });
    }

}
