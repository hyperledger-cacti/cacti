/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BusinessLogicBase.ts
 */

import { Request } from "express";
import { BusinessLogicPlugin } from "./BusinessLogicPlugin";
import { LedgerEvent } from "../verifier/LedgerPlugin";
import { json2str } from "../verifier/DriverCommon";
import { ConfigUtil } from "../routing-interface/util/ConfigUtil";

const fs = require("fs");
const path = require("path");
const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "BusinessLogicBase";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export class BusinessLogicBase implements BusinessLogicPlugin {
  eventFilter: object | null = null;

  startTransaction(
    req: Request,
    businessLogicID: string,
    tradeID: string,
  ): void {
    // NOTE: This method implements the BisinessLogcPlugin operation(* Override by subclass)
  }

  executeNextTransaction(txInfo: object, txId: string): void {
    // NOTE: This method implements the BisinessLogcPlugin operation(* Override by subclass)
  }

  getOperationStatus(tradeID: string): object {
    // NOTE: This method implements the BisinessLogcPlugin operation(* Override by subclass)
    return {};
  }

  setConfig(data: []): object {
    // NOTE: This method implements the BisinessLogcPlugin operation(* Override by subclass)
    return {};
  }

  onEvent(ledgerEvent: LedgerEvent, targetIndex: number): void {
    // NOTE: This method implements the BisinessLogcPlugin operation(* Override by subclass)
  }

  getEventFilter(): object | null {
    if (this.eventFilter) {
      logger.debug(`##called getEventFilter: ${json2str(this.eventFilter)}`);
    }

    return this.eventFilter;
  }

  setEventFilter(filter: object): void {
    let eventFilterStr = "unset";
    if (this.eventFilter) {
      eventFilterStr = json2str(this.eventFilter) || "(could not be parsed)";
    }
    logger.debug("##called setEventFilter(before):", eventFilterStr);

    this.eventFilter = filter;

    logger.debug(
      `##called setEventFilter(after): ${json2str(this.eventFilter)}`,
    );
  }

  getEventDataNum(ledgerEvent: LedgerEvent): number {
    // NOTE: This method implements the BisinessLogcPlugin operation(* Override by subclass)
    return 0;
  }

  getTxIDFromEvent(
    ledgerEvent: LedgerEvent,
    targetIndex: number,
  ): string | null {
    // NOTE: This method implements the BisinessLogcPlugin operation(* Override by subclass)
    return null;
  }

  // This function is optional in setup with single BLP,
  // that's why value true is returned (to indicate that given Tx always belong to this BLP)
  hasTxIDInTransactions(txID: string): boolean {
    // NOTE: This method implements the BisinessLogcPlugin operation(* Override by subclass)
    return true;
  }
}
