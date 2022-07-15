/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * MeterInfo.ts
 */

export class MeterInfo {
  meterID: string;
  bankAccount: string;
  bankAccountPKey: string;
  powerCompanyAccount: string;

  constructor(meterParams: string[]) {
    this.meterID = meterParams[0];
    this.bankAccount = meterParams[1];
    this.bankAccountPKey = meterParams[2];
    this.powerCompanyAccount = meterParams[3];
  }
}
