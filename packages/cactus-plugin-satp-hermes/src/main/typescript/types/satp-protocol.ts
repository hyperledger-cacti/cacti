import { JsObjectSigner, LogLevelDesc, Logger } from "@hyperledger/cactus-common";
import { SupportedGatewayImplementations } from "../core/types";
import { SessionData } from "../generated/proto/cacti/satp/v02/common/session_pb";
import { v4 as uuidV4 } from "uuid";
import { ConnectRouter } from "@connectrpc/connect";

/**
 * Interface for SATP Services.
 * Each service implementing this interface must provide one or more function(s) to handle specific stages of the SATP protocol.
 * Implementations should ensure compliance with the defined asynchronous patterns essential for SATP protocol interactions.
 */
export interface SATPService {
  readonly className: string;
  readonly stage: string;
  readonly log: Logger;
  readonly serviceType: SATPServiceType;
  getServiceIdentifier(): string;
}

/**
 * Represents a handler for various stages of the SATP (Secure Asset Transfer Protocol).
 * Handlers implementing this interface must provide mechanisms to setup routes and handle
 * protocol-specific requests based on the stage they are designed for.
  */
export interface SATPHandler {
  setupRouter(router: ConnectRouter): void;
  getHandlerIdentifier(): string;
}

export enum SATPServiceType {
  Server,
  Client,
} 

export type ISATPServiceOptions = {
  logLevel: LogLevelDesc
  signer: JsObjectSigner;
}

export type ISATPServerServiceOptions  = ISATPServiceOptions & {

}

export type ISATPClientServiceOptions = ISATPServiceOptions & {

}
