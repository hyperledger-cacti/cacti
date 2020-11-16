/*
 * Copyright 2020 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BalanceManagement.ts
 */

import { Request } from 'express';
import { BusinessLogicPlugin } from '../business-logic-plugin/BusinessLogicPlugin';
import { LedgerOperation } from '../business-logic-plugin/LedgerOperation';
import { BLPRegistry } from './util/BLPRegistry';
import { LPInfoHolder } from './util/LPInfoHolder';
import { json2str } from '../ledger-plugin/DriverCommon'
import { VerifierBase } from '../ledger-plugin/VerifierBase';
import { VerifierEventListener, LedgerEvent } from '../ledger-plugin/LedgerPlugin';
import { getTargetBLPInstance } from '../config/BLP_config';
import { ConfigUtil } from './util/ConfigUtil';

const fs = require('fs');
const path = require('path');
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = 'TransactionManagement';
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
            
            const execData = {"referedAddress": account};
            const ledgerOperation: LedgerOperation = new LedgerOperation("getNumericBalance", "", execData);

            this.verifierEthereum.execSyncFunction(ledgerOperation).then(result => {
                resolve(result);
            }).catch(function (err) {
                logger.error(err);
                reject(err);
            });

        });
    }

}
