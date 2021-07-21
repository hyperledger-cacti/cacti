/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * TransactionInfo.ts
 */

import { RequestInfo } from "@hyperledger/cactus-plugin-verifier-cc";

export class TransactionInfo {
  businessLogicID!: string;
  tradeID!: string;
  ethereumAccountFrom!: string;
  ethereumAccountTo!: string;
  ethereumAccountFromKey!: string;
  ethereumAccountToKey!: string;
  fabricAccountFrom!: string;
  fabricAccountTo!: string;
  fabricAccountFromKey!: string;
  fabricAccountToKey!: string;
  tradingValue!: string;
  carID!: string;
  status!: number | null;
  escrowLedger!: string | null;
  escrowTxID!: string | null;
  escrowTxInfo!: string | null;
  transferLedger!: string | null;
  transferTxID!: string | null;
  transferTxInfo!: string | null;
  settlementLedger!: string | null;
  settlementTxID!: string | null;
  settlementTxInfo!: string | null;

  setRequestInfo(mode: number, requestInfo: RequestInfo) {
    // Set request information
    this.businessLogicID = requestInfo.businessLogicID as string;
    this.tradeID = requestInfo.tradeID as string;
    this.ethereumAccountFrom = requestInfo.tradeInfo
      .ethereumAccountFrom as string;
    this.ethereumAccountTo = requestInfo.tradeInfo.ethereumAccountTo as string;
    this.fabricAccountFrom = requestInfo.tradeInfo.fabricAccountFrom as string;
    this.fabricAccountTo = requestInfo.tradeInfo.fabricAccountTo as string;
    this.tradingValue = requestInfo.tradeInfo.tradingValue as string;
    this.carID = requestInfo.tradeInfo.carID as string;

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
