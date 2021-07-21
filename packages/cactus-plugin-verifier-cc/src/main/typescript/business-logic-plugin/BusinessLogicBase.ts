/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BusinessLogicBase.ts
 */

import { Request } from "express";
import { BusinessLogicPlugin } from "./BusinessLogicPlugin";
import type { LedgerEvent } from "../ledger-plugin/LedgerPlugin";
import { ConfigUtil } from "../routing-interface/util/ConfigUtil";

const config: any = ConfigUtil.getConfig();
import { getLogger } from "log4js";
const moduleName = "BusinessLogicBase";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

export interface BusinessLogicBase extends BusinessLogicPlugin {
  // NOTE: This method implements the BusinessLogicPlugin operation(* Override by subclass)
  startTransaction(
    req: Request,
    businessLogicID: string,
    tradeID: string,
  ): void;

  // NOTE: This method implements the BusinessLogicPlugin operation(* Override by subclass)
  executeNextTransaction(txInfo: Record<string, unknown>, txId: string): void;

  // NOTE: This method implements the BusinessLogicPlugin operation(* Override by subclass)
  getOperationStatus(tradeID: string): Record<string, unknown>;

  // NOTE: This method implements the BusinessLogicPlugin operation(* Override by subclass)
  setConfig(data: []): Record<string, unknown>;

  // NOTE: This method implements the BusinessLogicPlugin operation(* Override by subclass)
  onEvent(ledgerEvent: LedgerEvent, targetIndex: number): void;

  getEventFilter(): Record<string, unknown> | null;

  setEventFilter(filter: Record<string, unknown>): void;

  // NOTE: This method implements the BusinessLogicPlugin operation(* Override by subclass)
  getEventDataNum(ledgerEvent: LedgerEvent): number;

  // NOTE: This method implements the BusinessLogicPlugin operation(* Override by subclass)
  getTxIDFromEvent(
    ledgerEvent: LedgerEvent,
    targetIndex: number,
  ): string | null;

  // NOTE: This method implements the BusinessLogicPlugin operation(* Override by subclass)
  hasTxIDInTransactions(txID: string): boolean;
}
