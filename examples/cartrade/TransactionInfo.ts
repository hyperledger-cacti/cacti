/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * TransactionInfo.ts
 */

import { RequestInfo } from "@hyperledger/cactus-cmd-socket-server";

export class TransactionInfo {
  businessLogicID: string;
  tradeID: string;
  ethereumAccountFrom: string;
  ethereumAccountTo: string;
  ethereumAccountFromKey: string;
  ethereumAccountToKey: string;
  fabricAccountFrom: string;
  fabricAccountTo: string;
  fabricAccountFromKey: string;
  fabricAccountToKey: string;
  tradingValue: string;
  carID: string;
  status: number;
  escrowLedger: string;
  escrowTxID: string;
  escrowTxInfo: string;
  transferLedger: string;
  transferTxID: string;
  transferTxInfo: string;
  settlementLedger: string;
  settlementTxID: string;
  settlementTxInfo: string;

  constructor() {}

  setRequestInfo(mode: number, requestInfo: RequestInfo) {
    // Set request information
    this.businessLogicID = requestInfo.businessLogicID;
    this.tradeID = requestInfo.tradeID;
    this.ethereumAccountFrom = requestInfo.tradeInfo.ethereumAccountFrom;
    this.ethereumAccountTo = requestInfo.tradeInfo.ethereumAccountTo;
    this.fabricAccountFrom = requestInfo.tradeInfo.fabricAccountFrom;
    this.fabricAccountTo = requestInfo.tradeInfo.fabricAccountTo;
    this.tradingValue = requestInfo.tradeInfo.tradingValue;
    this.carID = requestInfo.tradeInfo.carID;

    // mode check
    if (mode === 0) {
      // init mode
      // Initialize anything other than request information
      this.status = null;
      this.escrowLedger = null;
      this.escrowTxID = null;
      this.escrowTxInfo = null;
      this.transferLedger = null;
      this.transferTxID = null;
      this.transferTxInfo = null;
      this.settlementLedger = null;
      this.settlementTxID = null;
      this.settlementTxInfo = null;
    }
  }
}
