/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * MeterManagement.ts
 */

import { MeterInfo } from "./MeterInfo";
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
//const config: any = JSON.parse(fs.readFileSync("/etc/cactus/default.json", 'utf8'));
const config: any = yaml.safeLoad(
  fs.readFileSync("/etc/cactus/default.yaml", "utf8")
);
import { getLogger } from "log4js";
const moduleName = "MeterManagement";
const logger = getLogger(`${moduleName}`);
logger.level = config.logLevel;

// Meter Management Class
export class MeterManagement {
  fileName = "MeterInfo.json";

  constructor() {}

  // For debugging
  fileDump() {
    const confirmData: string = fs.readFileSync(this.fileName, "utf8");
    const arrayData: MeterInfo[] = JSON.parse(confirmData).table as MeterInfo[];
    logger.debug(arrayData);
  }

  addMeterInfo(addMeterInfo: MeterInfo): object {
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

    // Read table file
    const meterInfoFileData: string = fs.readFileSync(this.fileName, "utf8");
    const meterInfoTable: string[] = JSON.parse(meterInfoFileData)
      .table as string[];

    // Search target records / replace data
    const meterInfoTableNew = {
      table: [],
    };
    let existFlag = false;
    let action = "";
    meterInfoTable.forEach((meterInfoJSON, index) => {
      const meterInfo: MeterInfo = JSON.parse(meterInfoJSON) as MeterInfo;

      // Determine if it is a target record
      if (meterInfo.meterID === addMeterInfo.meterID) {
        // Change Status
        meterInfo.bankAccount = addMeterInfo.bankAccount;
        meterInfo.bankAccountPKey = addMeterInfo.bankAccountPKey;
        meterInfo.powerCompanyAccount = addMeterInfo.powerCompanyAccount;
        existFlag = true;
        action = "update";
      }

      // Register Record
      const meterInfoNewJson: string = JSON.stringify(meterInfo);
      //            logger.debug(`meter info = ${meterInfoNewJson}`);
      meterInfoTableNew.table.push(meterInfoNewJson);
    });
    if (existFlag === false) {
      const addMeterInfoJson: string = JSON.stringify(addMeterInfo);
      logger.debug(`add meter info = ${addMeterInfoJson}`);
      meterInfoTableNew.table.push(addMeterInfoJson);
      action = "add";
    }

    // Table File Write
    const meterInfoTableNewJson: string = JSON.stringify(meterInfoTableNew);
    fs.writeFileSync(this.fileName, meterInfoTableNewJson, "utf8");

    //        this.fileDump();

    const result = {
      action: action,
      meterID: addMeterInfo.meterID,
    };
    return result;
  }

  getMeterInfo(meterID: string): MeterInfo {
    // Existence check of table file
    try {
      fs.statSync(this.fileName);
    } catch (err) {
      throw err;
    }

    // Read table file
    const meterInfoFileData: string = fs.readFileSync(this.fileName, "utf8");
    const meterInfoTable: string[] = JSON.parse(meterInfoFileData)
      .table as string[];

    // Search target records
    let retMeterInfo: MeterInfo | null = null;
    meterInfoTable.forEach((meterInfoJSON, index) => {
      const meterInfo: MeterInfo = JSON.parse(meterInfoJSON) as MeterInfo;

      // Determine if it is a target record
      if (meterInfo.meterID === meterID) {
        retMeterInfo = meterInfo;
        return;
      }
    });

    return retMeterInfo;
  }

  /*
    setStatus(tradeInfo: TradeInfo, status: CartradeStatus) {

        // Existence check of table file
        try {
            fs.statSync(this.fileName);
        } catch (err) {
            throw err;
        }

        // Read table file
        const fileData: string = fs.readFileSync(this.fileName, 'utf8');
        const transactionInfoTable: string[] = JSON.parse(fileData).table as string[];

        // Search target records / replace data
        const transactionInfoTableNew = {
            table: []
        };
        transactionInfoTable.forEach((transactionInfoJSON, index) => {
            const transactionInfo: TransactionInfo = JSON.parse(transactionInfoJSON) as TransactionInfo;

            // Determine if it is a target record
            if (transactionInfo.businessLogicID === tradeInfo.businessLogicID && transactionInfo.tradeID === tradeInfo.tradeID) {
                // Change Status
                transactionInfo.status = status;
            }

            // Register Record
            const transactionInfoJson: string = JSON.stringify(transactionInfo);
            transactionInfoTableNew.table.push(transactionInfoJson);
        });

        // Table File Write
        const transactionInfoTableNewJson: string = JSON.stringify(transactionInfoTableNew);
        fs.writeFileSync(this.fileName, transactionInfoTableNewJson, 'utf8');

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
        const fileData: string = fs.readFileSync(this.fileName, 'utf8');
        const transactionInfoTable: string[] = JSON.parse(fileData).table as string[];

        // Search target records / replace data
        const transactionInfoTableNew = {
            table: []
        };
        transactionInfoTable.forEach((transactionInfoJSON, index) => {
            const transactionInfo: TransactionInfo = JSON.parse(transactionInfoJSON) as TransactionInfo;

            // Determine if it is a target record
            if (transactionInfo.businessLogicID === tradeInfo.businessLogicID && transactionInfo.tradeID === tradeInfo.tradeID) {

                // Determine if it is the target transaction
                if (transactionData.target === "escrow") {
                    // escrow: dataset
                    transactionInfo.escrowLedger = transactionData.ledger;
                    transactionInfo.escrowTxID = transactionData.txID;
                }
                else if (transactionData.target === "transfer") {
                    // transfer: dataset
                    transactionInfo.transferLedger = transactionData.ledger;
                    transactionInfo.transferTxID = transactionData.txID;
                }
                else if (transactionData.target === "settlement") {
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
        const transactionInfoTableNewJson: string = JSON.stringify(transactionInfoTableNew);
        fs.writeFileSync(this.fileName, transactionInfoTableNewJson, 'utf8');

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
        const fileData: string = fs.readFileSync(this.fileName, 'utf8');
        const transactionInfoTable: string[] = JSON.parse(fileData).table as string[];

        // Search target records / replace data
        const transactionInfoTableNew = {
            table: []
        };
        transactionInfoTable.forEach((transactionInfoJSON, index) => {
            const transactionInfo: TransactionInfo = JSON.parse(transactionInfoJSON) as TransactionInfo;

            // Determine if it is a target record
            if (transactionInfo.businessLogicID === tradeInfo.businessLogicID && transactionInfo.tradeID === tradeInfo.tradeID) {

                // Determine if it is the target transaction
                if (txInfoData.target === "escrow") {
                    // escrow: dataset
                    transactionInfo.escrowTxInfo = txInfoData.txInfo;
                }
                else if (txInfoData.target === "transfer") {
                    // transfer: dataset
                    transactionInfo.transferTxInfo = txInfoData.txInfo;
                }
                else if (txInfoData.target === "settlement") {
                    // settlement: dataset
                    transactionInfo.settlementTxInfo = txInfoData.txInfo;
                }

            }

            // Register Record
            const transactionInfoJson: string = JSON.stringify(transactionInfo);
            transactionInfoTableNew.table.push(transactionInfoJson);
        });

        // Table File Write
        const transactionInfoTableNewJson: string = JSON.stringify(transactionInfoTableNew);
        fs.writeFileSync(this.fileName, transactionInfoTableNewJson, 'utf8');

        this.fileDump();
    }
*/
  /**
   * Get transaction data corresponding to the specified txId.
   * (*Return if any of escrowTxID, transferTxID, settlementTxID matches txId)
   *
   * @return Transaction data corresponding to txId. Returns null if it does not exist.
   *
   */
  /*
    getTransactionInfoByTxId(txId: string): TransactionInfo {

        // Existence check of table file
        try {
            fs.statSync(this.fileName);
        } catch (err) {
            throw err;
        }

        // Read table file
        const fileData: string = fs.readFileSync(this.fileName, 'utf8');
        const transactionInfoTable: string[] = JSON.parse(fileData).table as string[];

        // Search target records
        const transactionInfoTableNew = {
            table: []
        };
        let retTransactionInfo: TransactionInfo | null = null;
        transactionInfoTable.forEach((transactionInfoJSON, index) => {
            const transactionInfo: TransactionInfo = JSON.parse(transactionInfoJSON) as TransactionInfo;

            // Determine if it is a target record
            if (transactionInfo.escrowTxID === txId || transactionInfo.transferTxID === txId || transactionInfo.settlementTxID === txId) {
                retTransactionInfo = transactionInfo;
                return;
            }
        });

        return retTransactionInfo;
    }
*/
}
