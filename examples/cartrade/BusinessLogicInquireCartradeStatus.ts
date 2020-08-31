/*
 * Copyright 2020 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * BusinessLogicInquireCartradeStatus.ts
 */

import { TransactionInfo } from './TransactionInfo';
import { TransactionStatus } from './TransactionStatus';
import { ResultTransactionStatusData } from './ResultTransactionStatusData';
import { BusinessLogicBase } from '../../packages/business-logic-plugin/BusinessLogicBase';
import * as fs from 'fs';

export class BusinessLogicInquireCartradeStatus extends BusinessLogicBase {

    fileName: string = "TransactionInfo.json";

    constructor() {
        super();
    }

    getCartradeOperationStatus(tradeID: string): string {

        // Existence check of table file
        try {
            fs.statSync(this.fileName);
        } catch (err) {
            throw err;
        }

        // Read table file
        const fileData: string = fs.readFileSync(this.fileName, 'utf8');
        const transactionInfoTable: string[] = JSON.parse(fileData).table as string[];

        // Create Response Information
        const resultTransactionStatusData: ResultTransactionStatusData = new ResultTransactionStatusData();
        for (const transactionInfoJson of transactionInfoTable) {
            const transactionInfo: TransactionInfo = JSON.parse(transactionInfoJson) as TransactionInfo;

            // Determine if target record
            if (transactionInfo.tradeID === tradeID) {

                // Set information
                resultTransactionStatusData.stateInfo = transactionInfo.status;

                const escrowTransactionStatus: TransactionStatus = new TransactionStatus();
                escrowTransactionStatus.state = "escrow";
                escrowTransactionStatus.ledger = transactionInfo.escrowLedger;
                escrowTransactionStatus.txID = transactionInfo.escrowTxID;
                escrowTransactionStatus.txInfo = JSON.parse(transactionInfo.escrowTxInfo);
                resultTransactionStatusData.transactionStatus.push(escrowTransactionStatus);

                const transferTransactionStatus = new TransactionStatus();
                transferTransactionStatus.state = "transfer";
                transferTransactionStatus.ledger = transactionInfo.transferLedger;
                transferTransactionStatus.txID = transactionInfo.transferTxID;
                transferTransactionStatus.txInfo = JSON.parse(transactionInfo.transferTxInfo);
                resultTransactionStatusData.transactionStatus.push(transferTransactionStatus);

                const settlementTransactionStatus = new TransactionStatus();
                settlementTransactionStatus.state = "settlement";
                settlementTransactionStatus.ledger = transactionInfo.settlementLedger;
                settlementTransactionStatus.txID = transactionInfo.settlementTxID;
                settlementTransactionStatus.txInfo = JSON.parse(transactionInfo.settlementTxInfo);
                resultTransactionStatusData.transactionStatus.push(settlementTransactionStatus);

                break;
            }
        }

        // Reply acquired information
        const resultTransactionStatusDataJson: string = JSON.stringify(resultTransactionStatusData);
        return resultTransactionStatusDataJson;
    }
}

