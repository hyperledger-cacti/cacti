import { ILoggerOptions } from "@hyperledger/cactus-common";
import { ConnectRouter } from "@connectrpc/connect";
import { SATPSession } from "../core/satp-session";
import {
  ISATPServiceOptions,
  SATPService,
  SATPServiceType,
} from "../core/stage-services/satp-service";

import { Stage0SATPHandler } from "../core/stage-handlers/stage0-handler";
import { Stage1SATPHandler } from "../core/stage-handlers/stage1-handler";
import { Stage2SATPHandler } from "../core/stage-handlers/stage2-handler";
import { Stage3SATPHandler } from "../core/stage-handlers/stage3-handler";
import { CrashRecoveryHandler } from "../core/crash-management/crash-handler";
import { BridgeManagerClientInterface } from "../cross-chain-mechanisms/bridge/interfaces/bridge-manager-client-interface";

/**
 * Represents a handler for various stages of the SATP (Secure Asset Transfer Protocol).
 * Handlers implementing this interface must provide mechanisms to setup routes and handle
 * protocol-specific requests based on the stage they are designed for.
 */

export enum SATPHandlerType {
  STAGE0 = "stage-0-handler",
  STAGE1 = "stage-1-handler",
  STAGE2 = "stage-2-handler",
  STAGE3 = "stage-3-handler",
  CRASH = "crash-handler",
}

export enum Stage {
  STAGE0 = "stage-0",
  STAGE1 = "stage-1",
  STAGE2 = "stage-2",
  STAGE3 = "stage-3",
}

export interface SATPServiceStatic {
  new (options: ISATPServiceOptions): SATPService;
  readonly SERVICE_TYPE: SATPServiceType;
  readonly SATP_STAGE: string;
  // service name serves as an internal, hardcoded service name. One can assign a more user-friendly service name via the SATPService constructor
  readonly SATP_SERVICE_INTERNAL_NAME: string;
  get ServiceType(): SATPServiceType;
}
export interface ISATPHandler {
  new (options: SATPHandlerOptions): SATPHandler;
  getHandlerSessions(): string[];
  getHandlerIdentifier(): SATPHandlerType;
  setupRouter(router: ConnectRouter): void;
}

export type SATPHandlerInstance =
  | (typeof Stage0SATPHandler & ISATPHandler)
  | (typeof Stage1SATPHandler & ISATPHandler)
  | (typeof Stage2SATPHandler & ISATPHandler)
  | (typeof Stage3SATPHandler & ISATPHandler)
  | (typeof CrashRecoveryHandler & ISATPHandler);

export interface SATPHandler {
  setupRouter(router: ConnectRouter): void;
  getHandlerIdentifier(): SATPHandlerType;
  getHandlerSessions(): string[];
  getStage(): string;
}

export interface SATPHandlerOptions {
  sessions: Map<string, SATPSession>;
  serverService: SATPService;
  clientService: SATPService;
  bridgeClient: BridgeManagerClientInterface;
  pubkeys: Map<string, string>;
  gatewayId: string;
  loggerOptions: ILoggerOptions;
  stage: string;
}
export { SATPService, SATPServiceType };
