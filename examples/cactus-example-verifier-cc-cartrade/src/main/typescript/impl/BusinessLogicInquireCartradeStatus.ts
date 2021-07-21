/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BusinessLogicInquireCartradeStatus.ts
 */

import { BusinessLogicBase } from "@hyperledger/cactus-plugin-verifier-cc";
import { ResultTransactionStatusData } from "./ResultTransactionStatusData";
import { TransactionInfo } from "./TransactionInfo";
import { TransactionStatus } from "./TransactionStatus";
import fs from "fs";

export class BusinessLogicInquireCartradeStatus implements BusinessLogicBase {
  fileName = "TransactionInfo.json";

  // NOTE: This method implements the BusinessLogicPlugin operation(* Override by subclass)
  startTransaction(): void {
    throw new Error("Not implemented.");
  }

  // NOTE: This method implements the BusinessLogicPlugin operation(* Override by subclass)
  executeNextTransaction(): void {
    throw new Error("Not implemented.");
  }

  // NOTE: This method implements the BusinessLogicPlugin operation(* Override by subclass)
  getOperationStatus(): Record<string, unknown> {
    throw new Error("Not implemented.");
  }

  // NOTE: This method implements the BusinessLogicPlugin operation(* Override by subclass)
  setConfig(): Record<string, unknown> {
    throw new Error("Not implemented.");
  }

  // NOTE: This method implements the BusinessLogicPlugin operation(* Override by subclass)
  onEvent(): void {
    throw new Error("Not implemented.");
  }

  getEventFilter(): Record<string, unknown> | null {
    throw new Error("Not implemented.");
  }

  setEventFilter(): void {
    throw new Error("Not implemented.");
  }

  // NOTE: This method implements the BusinessLogicPlugin operation(* Override by subclass)
  getEventDataNum(): number {
    throw new Error("Not implemented.");
  }

  // NOTE: This method implements the BusinessLogicPlugin operation(* Override by subclass)
  getTxIDFromEvent(): string | null {
    throw new Error("Not implemented.");
  }

  // NOTE: This method implements the BusinessLogicPlugin operation(* Override by subclass)
  hasTxIDInTransactions(): boolean {
    throw new Error("Not implemented.");
  }

  getCartradeOperationStatus(tradeID: string): any {
    // Existence check of table file
    try {
      fs.statSync(this.fileName);
    } catch (err) {
      throw err;
    }

    // Read table file
    const fileData: string = fs.readFileSync(this.fileName, "utf8");
    const transactionInfoTable: string[] = JSON.parse(fileData)
      .table as string[];

    // Create Response Information
    const resultTransactionStatusData: ResultTransactionStatusData = new ResultTransactionStatusData();
    for (const transactionInfoJson of transactionInfoTable) {
      const transactionInfo: TransactionInfo = JSON.parse(
        transactionInfoJson,
      ) as TransactionInfo;

      // Determine if target record
      if (transactionInfo.tradeID === tradeID) {
        // Set information
        resultTransactionStatusData.stateInfo = transactionInfo.status as number;

        const escrowTransactionStatus: TransactionStatus = new TransactionStatus();
        escrowTransactionStatus.state = "escrow";
        escrowTransactionStatus.ledger = transactionInfo.escrowLedger as string;
        escrowTransactionStatus.txID = transactionInfo.escrowTxID as string;
        escrowTransactionStatus.txInfo = JSON.parse(
          transactionInfo.escrowTxInfo as string,
        );
        resultTransactionStatusData.transactionStatus.push(
          escrowTransactionStatus,
        );

        const transferTransactionStatus = new TransactionStatus();
        transferTransactionStatus.state = "transfer";
        transferTransactionStatus.ledger = transactionInfo.transferLedger as string;
        transferTransactionStatus.txID = transactionInfo.transferTxID as string;
        transferTransactionStatus.txInfo = JSON.parse(
          transactionInfo.transferTxInfo as string,
        );
        resultTransactionStatusData.transactionStatus.push(
          transferTransactionStatus,
        );

        const settlementTransactionStatus = new TransactionStatus();
        settlementTransactionStatus.state = "settlement";
        settlementTransactionStatus.ledger = transactionInfo.settlementLedger as string;
        settlementTransactionStatus.txID = transactionInfo.settlementTxID as string;
        settlementTransactionStatus.txInfo = JSON.parse(
          transactionInfo.settlementTxInfo as string,
        );
        resultTransactionStatusData.transactionStatus.push(
          settlementTransactionStatus,
        );

        break;
      }
    }

    // Reply acquired information
    return resultTransactionStatusData;
  }
}
