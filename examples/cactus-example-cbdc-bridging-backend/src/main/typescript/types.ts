import { LogLevelDesc } from "@hyperledger/cactus-common";
import { CbdcBridgingAppDummyInfrastructure } from "./infrastructure/cbdc-bridging-app-dummy-infrastructure";

export interface IRequestOptions {
  logLevel?: LogLevelDesc;
  infrastructure: CbdcBridgingAppDummyInfrastructure;
}

export interface SessionReference {
  id: string;
  status: string;
  substatus: string;
  sourceLedger: string;
  receiverLedger: string;
}
