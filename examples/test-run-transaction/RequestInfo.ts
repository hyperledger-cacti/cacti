/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * RequestInfo.ts
 */

// request information
export class RequestInfo {
  businessLogicID: string;
  tradeID: string;

  keychainId: string;
  keychainRef: string;
  channelName: string;
  invocationType: string;
  functionName: string;
  functionArgs: Array<any>;

  setBusinessLogicID(businessLogicID: string) {
    this.businessLogicID = businessLogicID;
  }

  setTradeID(tradeID: string) {
    this.tradeID = tradeID;
  }
}
