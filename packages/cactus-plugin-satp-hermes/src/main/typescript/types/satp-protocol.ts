import { ILoggerOptions } from "@hyperledger/cactus-common";
import { SupportedChain } from "../core/types";
import { ConnectRouter } from "@connectrpc/connect";
import { SATPSession } from "../core/satp-session";
import {
  SATPService,
  SATPServiceType,
} from "../core/stage-services/satp-service";

/**
 * Represents a handler for various stages of the SATP (Secure Asset Transfer Protocol).
 * Handlers implementing this interface must provide mechanisms to setup routes and handle
 * protocol-specific requests based on the stage they are designed for.
 */

export enum SATPHandlerType {
  STAGE0 = "Stage0SATPHandler",
  STAGE1 = "Stage1SATPHandler",
  STAGE2 = "Stage2SATPHandler",
  STAGE3 = "Stage3SATPHandler",
}
export interface SATPHandler {
  setupRouter(router: ConnectRouter): void;
  getHandlerIdentifier(): SATPHandlerType;
  getHandlerSessions(): string[];
}

export interface SATPHandlerOptions {
  sessions: Map<string, SATPSession>;
  serverService: SATPService;
  clientService: SATPService;
  supportedDLTs: SupportedChain[];
  loggerOptions: ILoggerOptions;
  stage: string;
}
export { SATPService, SATPServiceType };
