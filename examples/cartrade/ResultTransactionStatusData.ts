/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * ResultTransactionStatusData.ts
 */

import { TransactionStatus } from "./TransactionStatus";

export class ResultTransactionStatusData {
  constructor() {
    this.transactionStatus = [];
  }

  stateInfo: number;
  transactionStatus: TransactionStatus[];
}
