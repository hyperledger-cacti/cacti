/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * tx-info-data.ts
 */

export class TxInfoData {
  target: string; // "escrow" or "transfer" or "settlement"
  txInfo: string;

  constructor(target: string, txInfo: string) {
    this.target = target;
    this.txInfo = txInfo; // JSON string
  }
}
