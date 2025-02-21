import type { LogLevelDesc } from "@hyperledger/cactus-common";
import type { NetworkBridge } from "../network-bridge";

export interface InteractionData {
  functionSignature: string;
  variables: string[];
  available: boolean;
}

export interface SATPBridgeConfig {
  network: NetworkBridge;
  logLevel?: LogLevelDesc;
}
