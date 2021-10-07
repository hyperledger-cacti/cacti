/*
 * Copyright 2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * ledger-plugin.ts
 */

export interface IVerifier {
  // BLP -> Verifier
  getApiList(): Array<ApiInfo>;
  requestLedgerOperation(param: any): void;
  startMonitor(): Promise<LedgerEvent>;
  stopMonitor(param: any): void;

  // Validator -> Verifier
  // NOTE: The following methods are not implemented this time
  // connect(): void;
  // disconnect(): void;
  // getVerifierInfo(): VerifierInfo[];
}

export class ApiInfo {
  apiType = "";
  requestedData: Array<RequestedData> = [];
}

export class RequestedData {
  dataName = "";
  dataType = "";
}

export class LedgerEvent {
  id = "";
  // NOTE: A class that represents an event.
  //       The purpose is to receive the event of Ledger on the Verifier side.
}

// NOTE: The following methods are not implemented this time
// class VerifierInfo {
//     version: string = "";
//     name: string = "";
//     ID: string = "";
//     otherData: VerifierInfoOtherData[] = [];
// }

// class VerifierInfoOtherData {
//     dataName: string = "";
//     dataType: string[] = [];
// }
