/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BusinessLogicPlugin.ts
 */

import { Request } from "express";
import { LedgerEvent } from "../ledger-plugin/LedgerPlugin";

export interface BusinessLogicPlugin {
  startTransaction(
    req: Request,
    businessLogicID: string,
    tradeID: string,
  ): void;
  getOperationStatus(tradeID: string): Record<string, unknown>;
  setConfig(data: []): Record<string, unknown>;
  onEvent(ledgerEvent: LedgerEvent, targetIndex: number): void;
  getEventDataNum(ledgerEvent: LedgerEvent): number;
  getTxIDFromEvent(
    ledgerEvent: LedgerEvent,
    targetIndex: number,
  ): string | null;
  hasTxIDInTransactions(txID: string): boolean;
}
