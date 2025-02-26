import { LogLevelDesc } from "@hyperledger/cactus-common";
import { ValidatorOptions } from "class-validator";
import { BLODispatcher } from "../api1/dispatcher";
import { ISignerKeyPairs } from "@hyperledger/cactus-common/dist/lib/main/typescript/signer-key-pairs";
import { SATPSession } from "./satp-session";
import { ConnectRouter } from "@connectrpc/connect";
import { SATPGateway } from "../plugin-satp-hermes-gateway";
import { SATPService } from "../types/satp-protocol";
import { Client as ConnectClient } from "@connectrpc/connect";
import { IPrivacyPolicyValue } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/view-creation/privacy-policies";
import { IMergePolicyValue } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/view-merging/merge-policies";
import { SATPServiceInstance } from "./stage-services/satp-service";
import { NetworkConfig } from "../types/blockchain-interaction";
import { Knex } from "knex";
import { NetworkId } from "../services/network-identification/chainid-list";
import { LedgerType } from "@hyperledger/cactus-core-api";

export type SATPConnectHandler = (
  gateway: SATPGateway,
  service: SATPService,
) => (router: ConnectRouter) => void;

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

export type GatewayChannel = {
  fromGatewayID: string;
  toGatewayID: string;
  sessions: Map<string, SATPSession>;
  connectedDLTs: NetworkId[];
  clients: Map<string, ConnectClient<SATPServiceInstance>>;
};

export type Address =
  | `http://${string}`
  | `https://${string}`
  | `${number}.${number}.${number}.${number}`;

export type GatewayIdentity = {
  id: string;
  pubKey?: string;
  name?: string;
  version: DraftVersions[];
  connectedDLTs: NetworkId[];
  supportedDLTs?: LedgerType[];
  proofID?: string;
  gatewayServerPort?: number;
  gatewayClientPort?: number;
  gatewayOpenAPIPort?: number;
  gatewayUIPort?: number;
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
  bridgesConfig?: NetworkConfig[];
  knexLocalConfig?: Knex.Config;
  knexRemoteConfig?: Knex.Config;
  enableCrashRecovery?: boolean;
}

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
  sessionId: string;
  type: string;
  key: string;
  operation: string;
  timestamp?: string;
  data: string;
  sequenceNumber: number;
}
export interface RemoteLog {
  key: string;
  hash: string;
  signature: string;
  signerPubKey: string;
}

export { SATPServiceInstance };

export enum CrashStatus {
  IDLE = "IDLE",
  IN_RECOVERY = "IN_RECOVERY",
  IN_ROLLBACK = "IN_ROLLBACK",
  ERROR = "ERROR",
}
