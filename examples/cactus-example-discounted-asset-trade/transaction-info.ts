/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * transaction-info.ts
 */

import { RequestInfo } from "@hyperledger/cactus-common-example-server";

export class TransactionInfo {
  businessLogicID = "";
  tradeID = "";
  ethereumAccountFrom = "";
  ethereumAccountTo = "";
  ethereumAccountFromKey = "";
  ethereumAccountToKey = "";
  fabricAccountFrom = "";
  fabricAccountTo = "";
  fabricAccountFromKey = "";
  fabricAccountToKey = "";
  tradingValue = "";
  assetID = "";
  status = 0;
  escrowLedger = "";
  escrowTxID = "";
  escrowTxInfo = "";
  transferLedger = "";
  transferTxID = "";
  transferTxInfo = "";
  settlementLedger = "";
  settlementTxID = "";
  settlementTxInfo = "";

  constructor() {
    // Do nothing
  }

  setRequestInfo(mode: number, requestInfo: RequestInfo): void {
    // Set request information
    this.businessLogicID = requestInfo.businessLogicID;
    this.tradeID = requestInfo.tradeID;
    this.ethereumAccountFrom = requestInfo.tradeInfo.ethereumAccountFrom;
    this.ethereumAccountTo = requestInfo.tradeInfo.ethereumAccountTo;
    this.fabricAccountFrom = requestInfo.tradeInfo.fabricAccountFrom;
    this.fabricAccountTo = requestInfo.tradeInfo.fabricAccountTo;
    this.tradingValue = requestInfo.tradeInfo.tradingValue;
    this.assetID = requestInfo.tradeInfo.assetID;

    // mode check
    if (mode === 0) {
      // init mode
      // Initialize anything other than request information
      this.status = 0;
      this.escrowLedger = "";
      this.escrowTxID = "";
      this.escrowTxInfo = "";
      this.transferLedger = "";
      this.transferTxID = "";
      this.transferTxInfo = "";
      this.settlementLedger = "";
      this.settlementTxID = "";
      this.settlementTxInfo = "";
    }
  }
}
