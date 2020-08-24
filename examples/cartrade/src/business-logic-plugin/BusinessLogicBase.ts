/*
 * Copyright 2020 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BusinessLogicBase.ts
 */

import { RequestInfo } from '../routing-interface/RequestInfo';
import { BusinessLogicPlugin } from './BusinessLogicPlugin';
import { VerifierEventListener, LedgerEvent } from '../ledger-plugin/LedgerPlugin';
import { json2str } from '../ledger-plugin/DriverCommon'
import { TransactionInfo } from '../examples/cartrade/TransactionInfo';

import config = require('config');
import { getLogger } from "log4js";
const moduleName = 'BusinessLogicCartrade';
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class BusinessLogicBase implements BusinessLogicPlugin, VerifierEventListener {
    eventFilter: object | null = null;

    startTransaction(requestInfo: RequestInfo) {
        // NOTE: This method implements the BisinessLogcPlugin operation(* Override by subclass)
    }

    executeNextTransaction(txInfo: object, txId: string): void {
        // NOTE: This method implements the BisinessLogcPlugin operation(* Override by subclass)
    }

    onEvent(ledgerEvent: LedgerEvent): void {
        // NOTE: This method implements the BisinessLogcPlugin operation(* Override by subclass)
    }

    getEventFilter(): object | null {
        logger.debug(`##called getEventFilter: ${json2str(this.eventFilter)}`);
        return this.eventFilter;
    }

    setEventFilter(filter: object): void {
        logger.debug(`##called setEventFilter(before): ${json2str(this.eventFilter)}`);
        this.eventFilter = filter;
        logger.debug(`##called setEventFilter(after): ${json2str(this.eventFilter)}`);
    }

    isTargetEvent(ledgerEvent: LedgerEvent): boolean {
        // NOTE: This method implements the BisinessLogcPlugin operation(* Override by subclass)
        return false;
    }
}
