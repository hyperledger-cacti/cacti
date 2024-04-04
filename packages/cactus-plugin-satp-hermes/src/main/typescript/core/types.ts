import { Secp256k1Keys, LogLevelDesc } from "@hyperledger/cactus-common";
import { ValidatorOptions } from "class-validator";
import { BLODispatcher } from "../blo/dispatcher";

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

export enum SupportedGatewayImplementations {
  FABRIC = "FabricSATPGateway",
  BESU = "BesuSATPGateway",
}

export type GatewayChannel = {
  id: string;
};

export type Address =
  | `http://${string}`
  | `https://${string}`
  | `${number}.${number}.${number}.${number}.`;

export type GatewayIdentity = {
  id: string;
  name?: string;
  version: DraftVersions[];
  supportedChains: SupportedGatewayImplementations[];
  proofID?: string;
  gatewayServerPort?: number;
  gatewayClientPort?: number;
  address?: Address;
};

export interface SATPGatewayConfig {
  gid?: GatewayIdentity;
  logLevel?: LogLevelDesc;
  keys?: Secp256k1Keys;
  environment?: "development" | "production";
  enableOpenAPI?: boolean;
  validationOptions?: ValidatorOptions;
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
