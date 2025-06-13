import { LogLevelDesc } from "@hyperledger/cactus-common";
import { BLODispatcher } from "../api1/dispatcher";
import { SATPSession } from "./satp-session";
import { ConnectRouter } from "@connectrpc/connect";
import { SATPGateway } from "../plugin-satp-hermes-gateway";
import { SATPService } from "../types/satp-protocol";
import { Client as ConnectClient } from "@connectrpc/connect";
import { SATPServiceInstance } from "./stage-services/satp-service";
import { NetworkId } from "../public-api";

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
  connectedDLTs?: NetworkId[];
  proofID?: string;
  gatewayServerPort?: number;
  gatewayClientPort?: number;
  gatewayOapiPort?: number;
  gatewayUIPort?: number;
  address?: Address;
};

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
