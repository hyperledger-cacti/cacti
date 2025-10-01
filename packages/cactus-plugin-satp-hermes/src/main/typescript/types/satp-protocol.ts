/**
 * @fileoverview SATP Protocol Type Definitions and Interfaces
 *
 * This module defines the core type system for SATP (Secure Asset Transfer Protocol)
 * implementation following the IETF SATP v2 specification. Provides comprehensive type
 * definitions for handlers, services, and protocol stages enabling type-safe cross-chain
 * asset transfers with fault-tolerant capabilities.
 *
 * The SATP protocol consists of four main stages:
 * - Stage 0: Transfer initiation and gateway negotiation
 * - Stage 1: Lock evidence and asset commitment
 * - Stage 2: Asset transfer and confirmation
 * - Stage 3: Commitment establishment and finalization
 *
 * Additionally includes crash recovery mechanisms based on Hermes research patterns
 * for maintaining consistency during network failures and system interruptions.
 *
 * @example
 * ```typescript
 * // Setting up a stage handler with proper typing
 * import { SATPHandlerOptions, Stage } from './types/satp-protocol';
 *
 * const handlerOptions: SATPHandlerOptions = {
 *   sessions: new Map(),
 *   serverService: myServerService,
 *   clientService: myClientService,
 *   bridgeClient: myBridgeClient,
 *   pubkeys: new Map(),
 *   gatewayId: 'gateway-001',
 *   loggerOptions: { level: 'info' },
 *   stage: Stage.STAGE1,
 *   monitorService: myMonitor
 * };
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @see {@link https://www.sciencedirect.com/science/article/abs/pii/S0167739X21004337} Hermes Research Paper
 * @author Hyperledger Cacti Contributors
 * @since 2.0.0
 */

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
import { MonitorService } from "../services/monitoring/monitor";

/**
 * Enumeration of SATP protocol handler types for different stages and crash recovery.
 *
 * Each handler type corresponds to a specific phase of the SATP protocol execution,
 * providing type-safe identification and routing of protocol messages. The crash
 * handler enables fault-tolerant operations following Hermes design patterns.
 *
 * @enum {string}
 * @since 2.0.0
 * @example
 * ```typescript
 * const handlerType = SATPHandlerType.STAGE1;
 * if (handlerType === SATPHandlerType.STAGE1) {
 *   // Handle lock evidence verification
 * }
 * ```
 */
export enum SATPHandlerType {
  /** Stage 0 handler for transfer initiation and gateway negotiation */
  STAGE0 = "stage-0-handler",
  /** Stage 1 handler for lock evidence and asset commitment */
  STAGE1 = "stage-1-handler",
  /** Stage 2 handler for asset transfer and confirmation */
  STAGE2 = "stage-2-handler",
  /** Stage 3 handler for commitment establishment and finalization */
  STAGE3 = "stage-3-handler",
  /** Crash recovery handler for fault-tolerant operations */
  CRASH = "crash-handler",
}

/**
 * Enumeration of SATP protocol execution stages.
 *
 * Defines the four main stages of the SATP protocol execution flow, enabling
 * structured state management and progression tracking during cross-chain
 * asset transfers. Each stage has specific responsibilities and message types.
 *
 * @enum {string}
 * @since 2.0.0
 * @example
 * ```typescript
 * const currentStage = Stage.STAGE1;
 * switch (currentStage) {
 *   case Stage.STAGE0:
 *     // Handle transfer initiation
 *     break;
 *   case Stage.STAGE1:
 *     // Handle lock evidence
 *     break;
 * }
 * ```
 */
export enum Stage {
  /** Transfer initiation and gateway negotiation phase */
  STAGE0 = "stage-0",
  /** Lock evidence and asset commitment phase */
  STAGE1 = "stage-1",
  /** Asset transfer and confirmation phase */
  STAGE2 = "stage-2",
  /** Commitment establishment and finalization phase */
  STAGE3 = "stage-3",
}

/**
 * Static interface for SATP service constructors and metadata.
 *
 * Defines the contract that all SATP service classes must implement, providing
 * standardized service creation, identification, and type information. This
 * interface enables dynamic service instantiation and runtime type checking
 * for different SATP protocol stages.
 *
 * @interface SATPServiceStatic
 * @since 2.0.0
 * @example
 * ```typescript
 * class MyStage1Service implements SATPServiceStatic {
 *   static readonly SERVICE_TYPE = SATPServiceType.SERVER;
 *   static readonly SATP_STAGE = "stage-1";
 *   static readonly SATP_SERVICE_INTERNAL_NAME = "stage1-server-service";
 *
 *   constructor(options: ISATPServiceOptions) {
 *     // Initialize service
 *   }
 *
 *   static get ServiceType() {
 *     return this.SERVICE_TYPE;
 *   }
 * }
 * ```
 */
export interface SATPServiceStatic {
  /** Constructor for creating new service instances */
  new (options: ISATPServiceOptions): SATPService;
  /** Service type classification (SERVER or CLIENT) */
  readonly SERVICE_TYPE: SATPServiceType;
  /** SATP protocol stage this service handles */
  readonly SATP_STAGE: string;
  /** Internal service identifier for debugging and logging */
  readonly SATP_SERVICE_INTERNAL_NAME: string;
  /** Getter for service type classification */
  get ServiceType(): SATPServiceType;
}
/**
 * Static interface for SATP handler constructors and metadata.
 *
 * Defines the contract that all SATP handler classes must implement for
 * consistent handler creation, session management, and router setup. This
 * interface enables dynamic handler instantiation and proper integration
 * with the Connect protocol routing system.
 *
 * @interface ISATPHandler
 * @since 2.0.0
 * @example
 * ```typescript
 * class MyStage1Handler implements ISATPHandler {
 *   constructor(options: SATPHandlerOptions) {
 *     // Initialize handler
 *   }
 *
 *   static getHandlerSessions(): string[] {
 *     return ['session-1', 'session-2'];
 *   }
 *
 *   static getHandlerIdentifier(): SATPHandlerType {
 *     return SATPHandlerType.STAGE1;
 *   }
 *
 *   static setupRouter(router: ConnectRouter): void {
 *     // Configure Connect protocol routes
 *   }
 * }
 * ```
 */
export interface ISATPHandler {
  /** Constructor for creating new handler instances */
  new (options: SATPHandlerOptions): SATPHandler;
  /** Retrieve list of active session identifiers */
  getHandlerSessions(): string[];
  /** Get the handler type identifier */
  getHandlerIdentifier(): SATPHandlerType;
  /** Configure Connect protocol router with handler routes */
  setupRouter(router: ConnectRouter): void;
}

/**
 * Union type for all possible SATP handler instances.
 *
 * Represents any valid SATP handler implementation that combines a specific
 * stage handler class with the ISATPHandler interface. This type enables
 * type-safe handler polymorphism and dynamic handler selection based on
 * protocol stage requirements.
 *
 * @since 2.0.0
 * @example
 * ```typescript
 * function createHandler(stage: Stage): SATPHandlerInstance {
 *   switch (stage) {
 *     case Stage.STAGE0:
 *       return Stage0SATPHandler;
 *     case Stage.STAGE1:
 *       return Stage1SATPHandler;
 *     // ... other stages
 *   }
 * }
 * ```
 */
export type SATPHandlerInstance =
  | (typeof Stage0SATPHandler & ISATPHandler)
  | (typeof Stage1SATPHandler & ISATPHandler)
  | (typeof Stage2SATPHandler & ISATPHandler)
  | (typeof Stage3SATPHandler & ISATPHandler)
  | (typeof CrashRecoveryHandler & ISATPHandler);

/**
 * Runtime interface for SATP handler instances.
 *
 * Defines the contract that all instantiated SATP handlers must implement,
 * providing methods for router configuration, identification, session management,
 * and stage retrieval. This interface ensures consistent handler behavior
 * across all SATP protocol stages.
 *
 * @interface SATPHandler
 * @since 2.0.0
 * @example
 * ```typescript
 * class Stage1Handler implements SATPHandler {
 *   setupRouter(router: ConnectRouter): void {
 *     // Configure stage-1 specific routes
 *     router.service(Stage1Service, {
 *       lockAsset: this.handleLockAsset.bind(this)
 *     });
 *   }
 *
 *   getHandlerIdentifier(): SATPHandlerType {
 *     return SATPHandlerType.STAGE1;
 *   }
 *
 *   getHandlerSessions(): string[] {
 *     return Array.from(this.sessions.keys());
 *   }
 *
 *   getStage(): string {
 *     return Stage.STAGE1;
 *   }
 * }
 * ```
 */
export interface SATPHandler {
  /** Configure Connect protocol router with handler-specific routes */
  setupRouter(router: ConnectRouter): void;
  /** Get the handler type identifier */
  getHandlerIdentifier(): SATPHandlerType;
  /** Retrieve list of active session identifiers managed by this handler */
  getHandlerSessions(): string[];
  /** Get the SATP protocol stage this handler manages */
  getStage(): string;
}

/**
 * Configuration options for SATP handler initialization.
 *
 * Provides all necessary dependencies and configuration parameters required
 * to initialize SATP protocol handlers. Includes session management, service
 * references, cryptographic keys, and monitoring capabilities for complete
 * protocol operation support.
 *
 * @interface SATPHandlerOptions
 * @since 2.0.0
 * @example
 * ```typescript
 * const handlerOptions: SATPHandlerOptions = {
 *   sessions: new Map<string, SATPSession>(),
 *   serverService: new Stage1ServerService(serviceOptions),
 *   clientService: new Stage1ClientService(serviceOptions),
 *   bridgeClient: new EthereumBridgeClient(),
 *   pubkeys: new Map([
 *     ['gateway-001', 'public_key_pem_format'],
 *     ['gateway-002', 'another_public_key_pem']
 *   ]),
 *   gatewayId: 'gateway-001',
 *   loggerOptions: { level: 'info', label: 'satp-handler' },
 *   stage: Stage.STAGE1,
 *   monitorService: new MetricsMonitorService()
 * };
 * ```
 */
export interface SATPHandlerOptions {
  /** Active SATP sessions mapped by session identifier */
  sessions: Map<string, SATPSession>;
  /** Server-side service instance for handling incoming requests */
  serverService: SATPService;
  /** Client-side service instance for making outbound requests */
  clientService: SATPService;
  /** Bridge client interface for cross-chain communication */
  bridgeClient: BridgeManagerClientInterface;
  /** Public keys mapped by gateway identifier for signature verification */
  pubkeys: Map<string, string>;
  /** Unique identifier for this gateway instance */
  gatewayId: string;
  /** Logger configuration options */
  loggerOptions: ILoggerOptions;
  /** SATP protocol stage this handler manages */
  stage: string;
  /** Monitoring service for metrics and health checks */
  monitorService: MonitorService;
}
export { SATPService, SATPServiceType };
