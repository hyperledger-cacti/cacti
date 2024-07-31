import { LogLevelDesc } from "@hyperledger/cactus-common";
import { ValidatorOptions } from "class-validator";
import { BLODispatcher } from "../blo/dispatcher";
import { ISignerKeyPairs } from "@hyperledger/cactus-common/dist/lib/main/typescript/signer-key-pairs";
import { SATPSession } from "./satp-session";
import { SatpStage0Service } from "../generated/proto/cacti/satp/v02/stage_0_connect";
import { SatpStage1Service } from "../generated/proto/cacti/satp/v02/stage_1_connect";
import { SatpStage2Service } from "../generated/proto/cacti/satp/v02/stage_2_connect";
import { SatpStage3Service } from "../generated/proto/cacti/satp/v02/stage_3_connect";
import { ConnectRouter } from "@connectrpc/connect";
import { SATPGateway } from "../plugin-satp-hermes-gateway";
import { SATPService } from "../types/satp-protocol";
import { PromiseClient as PromiseConnectClient } from "@connectrpc/connect";
import { IPrivacyPolicyValue } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/view-creation/privacy-policies";
import { IMergePolicyValue } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/view-merging/merge-policies";

export type SATPConnectHandler = (
  gateway: SATPGateway,
  service: SATPService,
) => (router: ConnectRouter) => void;

export type SATPServiceClient =
  | typeof SatpStage0Service
  | typeof SatpStage1Service
  | typeof SatpStage2Service
  | typeof SatpStage3Service;
import { NetworkBridge } from "./stage-services/satp-bridge/network-bridge";

export enum CurrentDrafts {
  Core = "Core",
  Architecture = "Architecture",
  Crash = "Crash",
}
export interface IRequestOptions {
  logLevel?: LogLevelDesc;
  dispatcher: BLODispatcher;
}

export type DraftVersions = {
  [K in CurrentDrafts]: string;
};

export type ShutdownHook = {
  name: string;
  hook: () => Promise<void>;
};

export enum SupportedChain {
  FABRIC = "FabricSATPGateway",
  BESU = "BesuSATPGateway",
}

export type GatewayChannel = {
  fromGatewayID: string;
  toGatewayID: string;
  sessions: Map<string, SATPSession>;
  supportedDLTs: SupportedChain[];
  clients: PromiseConnectClient<SATPServiceClient>[];
};

export type Address =
  | `http://${string}`
  | `https://${string}`
  | `${number}.${number}.${number}.${number}.`;

export type GatewayIdentity = {
  id: string;
  name?: string;
  version: DraftVersions[];
  supportedDLTs: SupportedChain[];
  proofID?: string;
  gatewayServerPort?: number;
  gatewayClientPort?: number;
  gatewayGrpcPort?: number;
  address?: Address;
};

export interface SATPGatewayConfig {
  gid?: GatewayIdentity;
  counterPartyGateways?: GatewayIdentity[];
  logLevel?: LogLevelDesc;
  keyPair?: ISignerKeyPairs;
  environment?: "development" | "production";
  enableOpenAPI?: boolean;
  validationOptions?: ValidatorOptions;
  privacyPolicies?: IPrivacyPolicyValue[];
  mergePolicies?: IMergePolicyValue[];
}

// export interface SATPBridgeConfig {
//   logLevel?: LogLevelDesc;
//   network: NetworkBridge;
// }

export type Immutable<T> = {
  readonly [K in keyof T]: Immutable<T[K]>;
};

export interface keyable {
  [key: string]: unknown;
}

export function isOfType<T>(
  obj: any,
  type: new (...args: any[]) => T,
): obj is T {
  return obj instanceof type;
}

export interface LocalLog {
  sessionID: string;
  type: string;
  key?: string;
  operation: string;
  timestamp?: string;
  data: string;
}
export interface RemoteLog {
  key: string;
  hash: string;
  signature: string;
  signerPubKey: string;
}

export interface SATPBridgeConfig {
  network: NetworkBridge;
  logLevel?: LogLevelDesc;
}
