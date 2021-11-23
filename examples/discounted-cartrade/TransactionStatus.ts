/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * TransactionStatus.ts
 */

export class TransactionStatus {
  state: string;
  ledger: string;
  txID: string;
  txInfo: string; // JSON string
}
