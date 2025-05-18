/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * business-logic-inquire-asset-trade-status.ts
 */

import { TransactionInfo } from "./transaction-info";
import { TransactionStatus } from "./transaction-status";
import { ResultTransactionStatusData } from "./result-transactions-status-data";
import { BusinessLogicBase } from "@hyperledger/cactus-common-example-server";
import fs = require("fs");

export class BusinessLogicInquireAssetTradeStatus extends BusinessLogicBase {
  fileName = "transaction-Info.json";

  constructor() {
    super();
  }

  getAssetTradeOperationStatus(tradeID: string): {
    stateInfo: number | undefined;
    transactionStatus: TransactionStatus[];
  } {
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
    const resultTransactionStatusData: ResultTransactionStatusData =
      new ResultTransactionStatusData();
    for (const transactionInfoJson of transactionInfoTable) {
      const transactionInfo: TransactionInfo = JSON.parse(
        transactionInfoJson,
      ) as TransactionInfo;

      // Determine if target record
      if (transactionInfo.tradeID === tradeID) {
        // Set information
        resultTransactionStatusData.stateInfo = transactionInfo.status;

        const escrowTransactionStatus: TransactionStatus =
          new TransactionStatus();
        escrowTransactionStatus.state = "escrow";
        escrowTransactionStatus.ledger = transactionInfo.escrowLedger;
        escrowTransactionStatus.txID = transactionInfo.escrowTxID;
        escrowTransactionStatus.txInfo = JSON.parse(
          transactionInfo.escrowTxInfo,
        );
        resultTransactionStatusData.transactionStatus.push(
          escrowTransactionStatus,
        );

        const transferTransactionStatus = new TransactionStatus();
        transferTransactionStatus.state = "transfer";
        transferTransactionStatus.ledger = transactionInfo.transferLedger;
        transferTransactionStatus.txID = transactionInfo.transferTxID;
        transferTransactionStatus.txInfo = JSON.parse(
          transactionInfo.transferTxInfo,
        );
        resultTransactionStatusData.transactionStatus.push(
          transferTransactionStatus,
        );

        const settlementTransactionStatus = new TransactionStatus();
        settlementTransactionStatus.state = "settlement";
        settlementTransactionStatus.ledger = transactionInfo.settlementLedger;
        settlementTransactionStatus.txID = transactionInfo.settlementTxID;
        settlementTransactionStatus.txInfo = JSON.parse(
          transactionInfo.settlementTxInfo,
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
