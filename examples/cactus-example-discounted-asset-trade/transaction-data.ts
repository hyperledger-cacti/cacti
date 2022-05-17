/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * transaction-data.ts
 */

export class TransactionData {
  target: string; // "escrow" or "transfer" or "settlement"
  ledger: string;
  txID: string;

  constructor(target: string, ledger: string, txID: string) {
    this.target = target;
    this.ledger = ledger;
    this.txID = txID;
  }
}
