/*
 * Copyright 2020-2021 Hyperledger Cactus Contributors
 * SPDX-License-Identifier: Apache-2.0
 *
 * LedgerPlugin.ts
 */

export {
  IVerifier,
  LedgerEvent,
  IVerifierEventListener,
} from "@hyperledger/cactus-core-api";

export class ApiInfo {
  apiType = "";
  requestedData: RequestedData[] = [];
}

export class RequestedData {
  dataName = "";
  dataType = "";
}
