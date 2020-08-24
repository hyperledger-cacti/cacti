/*
 * Copyright 2020 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * ResultTransactionStatusData.ts
 */

import { TransactionStatus } from './TransactionStatus';

export class ResultTransactionStatusData {

    constructor() {
        this.transactionStatus = new Array();
    }

    stateInfo: string;
    transactionStatus: TransactionStatus[];

}

