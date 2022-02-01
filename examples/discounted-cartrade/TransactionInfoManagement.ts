/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * TransactionInfoManagement.ts
 */

import { TransactionInfo } from "./TransactionInfo";
import { TransactionData } from "./TransactionData";
import { TxInfoData } from "./TxInfoData";
import { TradeInfo } from "@hyperledger/cactus-cmd-socket-server";
import { CartradeStatus } from "./define";

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
//const config: any = JSON.parse(fs.readFileSync("/etc/cactus/default.json", 'utf8'));
const config: any = yaml.safeLoad(
  fs.readFileSync("/etc/cactus/default.yaml", "utf8")
);
import { getLogger } from "log4js";
const moduleName = "TransactionInfoManagement";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

// Transaction Information Management Class
export class TransactionInfoManagement {
  fileName = "TransactionInfo.json";

  constructor() {}

  // For debugging
  fileDump() {
    const confirmData: string = fs.readFileSync(this.fileName, "utf8");
    const arrayData: TransactionInfo[] = JSON.parse(confirmData)
      .table as TransactionInfo[];
    // logger.debug(arrayData);
  }

  addTransactionInfo(transactionInfo: TransactionInfo) {
    // Existence check of table file
    try {
      fs.statSync(this.fileName);
    } catch (err) {
      // Creating an empty table file
      const emptyTable = {
        table: [],
      };
      const emptyTableJson: string = JSON.stringify(emptyTable);
      fs.writeFileSync(this.fileName, emptyTableJson, "utf8");
    }

    const transactionInfoJson: string = JSON.stringify(transactionInfo);

    let transactionInfoTable = {
      table: [],
    };
    const transactionInfoFileData: string = fs.readFileSync(
      this.fileName,
      "utf8"
    );
    transactionInfoTable = JSON.parse(transactionInfoFileData);
    transactionInfoTable.table.push(transactionInfoJson);
    const transactionInfoTableJson: string =
      JSON.stringify(transactionInfoTable);
    fs.writeFileSync(this.fileName, transactionInfoTableJson, "utf8");

    this.fileDump();
  }

  setStatus(tradeInfo: TradeInfo, status: CartradeStatus) {
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

    // Search target records / replace data
    const transactionInfoTableNew = {
      table: [],
    };
    transactionInfoTable.forEach((transactionInfoJSON, index) => {
      const transactionInfo: TransactionInfo = JSON.parse(
        transactionInfoJSON
      ) as TransactionInfo;

      // Determine if it is a target record
      if (
        transactionInfo.businessLogicID === tradeInfo.businessLogicID &&
        transactionInfo.tradeID === tradeInfo.tradeID
      ) {
        // Change Status
        transactionInfo.status = status;
      }

      // Register Record
      const transactionInfoJson: string = JSON.stringify(transactionInfo);
      transactionInfoTableNew.table.push(transactionInfoJson);
    });

    // Table File Write
    const transactionInfoTableNewJson: string = JSON.stringify(
      transactionInfoTableNew
    );
    fs.writeFileSync(this.fileName, transactionInfoTableNewJson, "utf8");

    this.fileDump();
  }

  setTransactionData(tradeInfo: TradeInfo, transactionData: TransactionData) {
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

    // Search target records / replace data
    const transactionInfoTableNew = {
      table: [],
    };
    transactionInfoTable.forEach((transactionInfoJSON, index) => {
      const transactionInfo: TransactionInfo = JSON.parse(
        transactionInfoJSON
      ) as TransactionInfo;

      // Determine if it is a target record
      if (
        transactionInfo.businessLogicID === tradeInfo.businessLogicID &&
        transactionInfo.tradeID === tradeInfo.tradeID
      ) {
        // Determine if it is the target transaction
        if (transactionData.target === "escrow") {
          // escrow: dataset
          transactionInfo.escrowLedger = transactionData.ledger;
          transactionInfo.escrowTxID = transactionData.txID;
        } else if (transactionData.target === "transfer") {
          // transfer: dataset
          transactionInfo.transferLedger = transactionData.ledger;
          transactionInfo.transferTxID = transactionData.txID;
        } else if (transactionData.target === "settlement") {
          // settlement: dataset
          transactionInfo.settlementLedger = transactionData.ledger;
          transactionInfo.settlementTxID = transactionData.txID;
        }
      }

      // Register Record
      const transactionInfoJson: string = JSON.stringify(transactionInfo);
      transactionInfoTableNew.table.push(transactionInfoJson);
    });

    // Table File Write
    const transactionInfoTableNewJson: string = JSON.stringify(
      transactionInfoTableNew
    );
    fs.writeFileSync(this.fileName, transactionInfoTableNewJson, "utf8");

    this.fileDump();
  }

  setTxInfo(tradeInfo: TradeInfo, txInfoData: TxInfoData) {
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

    // Search target records / replace data
    const transactionInfoTableNew = {
      table: [],
    };
    transactionInfoTable.forEach((transactionInfoJSON, index) => {
      const transactionInfo: TransactionInfo = JSON.parse(
        transactionInfoJSON
      ) as TransactionInfo;

      // Determine if it is a target record
      if (
        transactionInfo.businessLogicID === tradeInfo.businessLogicID &&
        transactionInfo.tradeID === tradeInfo.tradeID
      ) {
        // Determine if it is the target transaction
        if (txInfoData.target === "escrow") {
          // escrow: dataset
          transactionInfo.escrowTxInfo = txInfoData.txInfo;
        } else if (txInfoData.target === "transfer") {
          // transfer: dataset
          transactionInfo.transferTxInfo = txInfoData.txInfo;
        } else if (txInfoData.target === "settlement") {
          // settlement: dataset
          transactionInfo.settlementTxInfo = txInfoData.txInfo;
        }
      }

      // Register Record
      const transactionInfoJson: string = JSON.stringify(transactionInfo);
      transactionInfoTableNew.table.push(transactionInfoJson);
    });

    // Table File Write
    const transactionInfoTableNewJson: string = JSON.stringify(
      transactionInfoTableNew
    );
    fs.writeFileSync(this.fileName, transactionInfoTableNewJson, "utf8");

    this.fileDump();
  }

  /**
   * Get transaction data corresponding to the specified txId.
   * (*Return if any of escrowTxID, transferTxID, settlementTxID matches txId)
   *
   * @return Transaction data corresponding to txId. Returns null if it does not exist.
   *
   */
  getTransactionInfoByTxId(txId: string): TransactionInfo {
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

    // Search target records
    const transactionInfoTableNew = {
      table: [],
    };
    let retTransactionInfo: TransactionInfo | null = null;
    transactionInfoTable.forEach((transactionInfoJSON, index) => {
      const transactionInfo: TransactionInfo = JSON.parse(
        transactionInfoJSON
      ) as TransactionInfo;

      // Determine if it is a target record
      if (
        transactionInfo.escrowTxID === txId ||
        transactionInfo.transferTxID === txId ||
        transactionInfo.settlementTxID === txId
      ) {
        retTransactionInfo = transactionInfo;
        return;
      }
    });

    return retTransactionInfo;
  }
}
