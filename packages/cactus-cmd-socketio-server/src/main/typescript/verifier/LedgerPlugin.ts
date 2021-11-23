/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * LedgerPlugin.ts
 */

import { LedgerOperation } from "./../business-logic-plugin/LedgerOperation";

export interface IVerifier {
  // BLP -> Verifier
  sendAsyncRequest(
    contract: object,
    method: object,
    args: object
  ): Promise<void>;
  sendSyncRequest(contract: object, method: object, args: object): Promise<any>;
  startMonitor(
    id: string,
    options: Object,
    eventListener: VerifierEventListener
  ): Promise<void>;
  stopMonitor(id?: string): void;

  // Validator -> Verifier
  // NOTE: The following methods are not implemented this time
  // connect(): void;
  // disconnect(): void;
  // getVerifierInfo(): VerifierInfo[];
}

export class ApiInfo {
  apiType = "";
  requestedData: RequestedData[] = [];
}

export class RequestedData {
  dataName = "";
  dataType = "";
}

export class LedgerEvent {
  id = "";
  verifierId = "";
  data: object | null = null;
  // NOTE: A class that represents an event.
  //       The purpose is to receive the event of Ledger on the Verifier side.
}

export interface VerifierEventListener {
  onEvent(ledgerEvent: LedgerEvent): void;
  // getEventFilter(): object | null;
  // isTargetEvent(ledgerEvent: LedgerEvent): boolean;
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
