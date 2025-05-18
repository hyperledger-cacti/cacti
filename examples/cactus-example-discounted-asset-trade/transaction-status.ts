/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * transaction-status.ts
 */

export class TransactionStatus {
  state = "";
  ledger = "";
  txID = "";
  txInfo = ""; // JSON string
}
