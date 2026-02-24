/**
 * @fileoverview
 * SATP Type Definitions - Core Types, Interfaces, and Data Structures
 *
 * @description
 * This module defines the core type definitions, interfaces, and data structures
 * used throughout the SATP (Secure Asset Transfer Protocol) implementation in
 * the Hyperledger Cacti ecosystem. These types provide type safety, structure,
 * and consistency across all SATP components and operations.
 *
 * **Type Categories:**
 * - **Handler Types**: Function signatures and handler interfaces
 * - **Gateway Types**: Gateway identity, channels, and connection structures
 * - **Session Types**: Session management and lifecycle types
 * - **Network Types**: Network addressing and connectivity types
 * - **Utility Types**: Generic utility types and helper interfaces
 * - **Protocol Types**: SATP protocol-specific type definitions
 *
 * **Key Features:**
 * - **Type Safety**: Comprehensive TypeScript type definitions
 * - **Protocol Compliance**: Types aligned with IETF SATP specifications
 * - **Integration Support**: Types for gateway communication and networking
 * - **Extensibility**: Flexible type definitions for future enhancements
 * - **Documentation**: Well-documented types for developer experience
 *
 * @author SATP Development Team
 * @since 0.0.3-beta
 * @version 0.0.3-beta
 * @see {@link SATPGateway} for gateway implementation
 * @see {@link SATPSession} for session management
 * @see {@link NetworkId} for network identification
 */

import { LogLevelDesc } from "@hyperledger/cactus-common";
import { BLODispatcher } from "../api1/dispatcher";
import { SATPSession } from "./satp-session";
import { ConnectRouter } from "@connectrpc/connect";
import { SATPGateway } from "../plugin-satp-hermes-gateway";
import { SATPService } from "../types/satp-protocol";
import { Client as ConnectClient } from "@connectrpc/connect";
import { SATPServiceInstance } from "./stage-services/satp-service";
import { NetworkId } from "../public-api";

/**
 * Function signature for SATP Connect protocol handlers.
 *
 * @description
 * Defines the structure for Connect protocol handlers that integrate
 * SATP gateways with services and routing infrastructure.
 */
export type SATPConnectHandler = (
  gateway: SATPGateway,
  service: SATPService,
) => (router: ConnectRouter) => void;

/**
 * Enumeration of current SATP draft specifications.
 *
 * @description
 * Defines the different SATP specification drafts that are currently
 * supported and implemented within the system.
 */
export enum CurrentDrafts {
  /** SATP Core protocol specification */
  Core = "Core",
  /** SATP Architecture specification */
  Architecture = "Architecture",
  /** SATP Crash Recovery specification */
  Crash = "Crash",
}

/**
 * Request options interface for SATP operations.
 *
 * @description
 * Defines the configuration options for SATP requests including
 * logging level and dispatcher configuration.
 */
export interface IRequestOptions {
  /** Optional logging level for request operations */
  logLevel?: LogLevelDesc;
  /** BLO dispatcher for request handling */
  dispatcher: BLODispatcher;
}

/**
 * Type mapping for SATP draft versions.
 *
 * @description
 * Provides version string mapping for each SATP draft specification
 * to ensure proper version tracking and compatibility.
 */
export type DraftVersions = {
  [K in CurrentDrafts]: string;
};

/**
 * Shutdown hook definition for graceful service termination.
 *
 * @description
 * Defines the structure for shutdown hooks that enable graceful
 * service termination and resource cleanup.
 */
export type ShutdownHook = {
  /** Human-readable name for the shutdown hook */
  name: string;
  /** Async function to execute during shutdown */
  hook: () => Promise<void>;
};

/**
 * Gateway communication channel definition.
 *
 * @description
 * Defines the structure for communication channels between SATP gateways,
 * including session management, connected DLTs, and client connections.
 */
export type GatewayChannel = {
  /** Source gateway identifier */
  fromGatewayID: string;
  /** Destination gateway identifier */
  toGatewayID: string;
  /** Map of active SATP sessions */
  sessions: Map<string, SATPSession>;
  /** List of connected distributed ledger technologies */
  connectedDLTs: NetworkId[];
  /** Map of connected service clients */
  clients: Map<string, ConnectClient<SATPServiceInstance>>;
};

/**
 * Network address type definition.
 *
 * @description
 * Defines valid network address formats for SATP gateway communication
 * including HTTP/HTTPS URLs and IPv4 addresses.
 */
export type Address =
  | `http://${string}`
  | `https://${string}`
  | `${number}.${number}.${number}.${number}`;

/**
 * Enumeration of supported signing algorithms.
 *
 * @description
 * Defines the cryptographic signing algorithms supported for
 * gateway identification credentials.
 */
export enum SupportedSigningAlgorithms {
  SECP256K1 = "SECP256K1",
}

/**
 * Identification credential structure for gateways.
 *
 * @description
 * Defines the structure for gateway identification credentials
 * including the signing algorithm used for key generation and
 * the respective public key.
 */
export type IdentificationCredential = {
  signingAlgorithm: SupportedSigningAlgorithms;
  pubKey: string;
};

/**
 * SATP gateway identity structure.
 *
 * @description
 * Comprehensive identity definition for SATP gateways including
 * identification, networking, versioning, and capability information.
 */
export type GatewayIdentity = {
  /** Unique gateway identifier */
  id: string;
  /** Optional identification credential for the gateway*/
  identificationCredential?: IdentificationCredential;
  /** Optional human-readable gateway name */
  name?: string;
  /** Supported SATP draft versions */
  version: DraftVersions[];
  /** Optional list of connected DLTs */
  connectedDLTs?: NetworkId[];
  /** Optional proof identifier */
  proofID?: string;
  /** Optional gateway server port */
  gatewayServerPort?: number;
  /** Optional gateway client port */
  gatewayClientPort?: number;
  /** Optional gateway OpenAPI port */
  gatewayOapiPort?: number;
  /** Optional gateway UI port */
  gatewayUIPort?: number;
  /** Optional gateway network address */
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

export interface Log {
  key: string;
  type: string;
  operation: string;
  timestamp?: string;
  data: string;
}
export interface SATPLocalLog extends Log {
  sessionId: string;
  sequenceNumber: number;
}
export interface OracleLocalLog extends Log {
  taskId: string;
  oracleOperationId: string;
}

export interface SATPRemoteLog {
  key: string;
  hash: string;
  signature: string;
  signerPubKey: string;
}

export { SATPServiceInstance };

/**
 * Enumeration of SATP crash recovery states.
 *
 * @description
 * Defines the possible states during SATP crash recovery operations
 * according to the SATP Crash Recovery specification.
 */
export enum CrashStatus {
  /** System is idle and operating normally */
  IDLE = "IDLE",
  /** System is actively performing crash recovery */
  IN_RECOVERY = "IN_RECOVERY",
  /** System is performing transaction rollback */
  IN_ROLLBACK = "IN_ROLLBACK",
  /** System encountered an error during recovery */
  ERROR = "ERROR",
}
