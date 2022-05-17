/*
 * Copyright 2020-2022 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * define.ts
 */

export enum AssetTradeStatus {
  UnderEscrow = 0,
  UnderTransfer = 1,
  UnderSettlement = 2,
  Completed = 3,
}
