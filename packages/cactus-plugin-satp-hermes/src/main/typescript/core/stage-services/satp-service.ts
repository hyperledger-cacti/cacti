/**
 * @fileoverview
 * SATP Service Foundation - Abstract Base Classes and Service Architecture
 *
 * @description
 * This module provides the foundational architecture for SATP (Secure Asset Transfer Protocol)
 * services in the Hyperledger Cacti ecosystem. It defines abstract base classes, service
 * interfaces, configuration options, and type definitions that serve as the backbone for
 * implementing SATP protocol stages across both client and server implementations.
 *
 * **Service Architecture:**
 * - **Abstract Base Class**: SATPService provides common functionality and interface
 * - **Service Types**: Distinguishes between Client and Server service implementations
 * - **Stage Support**: Supports all SATP protocol stages (0, 1, 2, 3) with type safety
 * - **Configuration Management**: Comprehensive options for service initialization
 * - **Dependency Injection**: Supports logging, cryptography, monitoring, and persistence
 *
 * **Core Components:**
 * - **SATPService**: Abstract base class for all SATP service implementations
 * - **ISATPServiceOptions**: Configuration interface for service initialization
 * - **SATPServiceType**: Enumeration for Client/Server service distinction
 * - **SATPServiceStatic**: Interface for service class constructors and metadata
 * - **Service Instance Types**: Type-safe definitions for each protocol stage
 *
 * **Implementation Pattern:**
 * Each SATP stage requires both client and server implementations that extend the
 * SATPService base class. This architecture ensures consistent behavior, logging,
 * error handling, and monitoring across all protocol implementations while allowing
 * stage-specific business logic customization.
 *
 * **Dependencies:**
 * - **Cryptography**: JsObjectSigner for digital signatures and verification
 * - **Logging**: SATP-specific logger with monitoring integration
 * - **Persistence**: Database interface for session and state management
 * - **Monitoring**: Service monitoring and metrics collection
 * - **Bridge Management**: Cross-chain bridge integration interface
 *
 * **Usage Patterns:**
 * This module serves as the foundation for concrete service implementations.
 * Stage-specific services inherit from SATPService and implement the required
 * protocol logic while benefiting from shared infrastructure and utilities.
 *
 * @author SATP Development Team
 * @since 0.0.3-beta
 * @version 0.0.3-beta
 * @see {@link https://datatracker.ietf.org/doc/draft-ietf-satp-core/} IETF SATP Core Specification
 * @see {@link SATPService} Abstract base class for service implementations
 * @see {@link ISATPServiceOptions} Service configuration interface
 * @see {@link SATPServiceType} Service type enumeration
 */

import {
  type JsObjectSigner,
  type ILoggerOptions,
} from "@hyperledger/cactus-common";
import { SATPLoggerProvider as LoggerProvider } from "../satp-logger-provider";
import type { SATPLogger as Logger } from "../satp-logger";
import type { SatpStage0Service } from "../../generated/proto/cacti/satp/v02/service/stage_0_pb";
import type { SatpStage1Service } from "../../generated/proto/cacti/satp/v02/service/stage_1_pb";
import type { SatpStage2Service } from "../../generated/proto/cacti/satp/v02/service/stage_2_pb";
import type { SatpStage3Service } from "../../generated/proto/cacti/satp/v02/service/stage_3_pb";
import type { GatewayPersistence } from "../../database/gateway-persistence";
import { BridgeManagerClientInterface } from "../../cross-chain-mechanisms/bridge/interfaces/bridge-manager-client-interface";
import { ClaimFormat } from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { MonitorService } from "../../services/monitoring/monitor";

/**
 * Enumeration of SATP service implementation types.
 *
 * @description
 * Defines the two primary service types in the SATP protocol architecture:
 * - **Server**: Services that handle incoming requests and provide responses
 * - **Client**: Services that initiate requests and process responses
 *
 * This distinction is crucial for proper protocol flow, as SATP operations
 * involve bidirectional communication between client and server gateways
 * across different blockchain networks.
 *
 * @public
 * @enum {string}
 * @since 0.0.3-beta
 */
export enum SATPServiceType {
  /** Server-side service implementation for handling incoming SATP requests */
  Server = "Server",
  /** Client-side service implementation for initiating SATP requests */
  Client = "Client",
}

/**
 * Type definition for supported SATP protocol stages.
 *
 * @description
 * Defines the four stages of the SATP v0.2 protocol specification:
 * - **Stage 0**: Transfer initiation and negotiation
 * - **Stage 1**: Lock assertion and asset proof
 * - **Stage 2**: Commitment and completion preparation
 * - **Stage 3**: Asset transfer commitment and finalization
 *
 * @public
 * @since 0.0.3-beta
 */
export type SATPStagesV02 = "0" | "1" | "2" | "3";

/**
 * Configuration options for SATP service initialization.
 *
 * @description
 * Comprehensive configuration interface that defines all required and optional
 * parameters for initializing SATP services. This interface ensures consistent
 * service configuration across all protocol stages and service types while
 * providing flexibility for stage-specific customizations.
 *
 * **Required Configuration:**
 * - **serviceName**: Human-readable service identifier for logging and monitoring
 * - **stage**: SATP protocol stage (0-3) this service handles
 * - **loggerOptions**: Logging configuration with level and output settings
 * - **signer**: Cryptographic signer for message authentication
 * - **serviceType**: Client or Server service designation
 * - **dbLogger**: Database persistence interface for session management
 * - **monitorService**: Service monitoring and metrics collection
 *
 * **Optional Configuration:**
 * - **bridgeManager**: Cross-chain bridge integration (when applicable)
 * - **claimFormat**: Asset claim format specification (stage-dependent)
 *
 * @public
 * @interface ISATPServiceOptions
 * @since 0.0.3-beta
 * @see {@link SATPService} for service implementation
 * @see {@link SATPServiceType} for service type options
 * @see {@link SATPStagesV02} for supported protocol stages
 */
export type ISATPServiceOptions = {
  /** Human-readable service name for identification and logging */
  serviceName: string;
  /** SATP protocol stage (0-3) this service implementation handles */
  stage: SATPStagesV02;
  /** Logger configuration options including level and output settings */
  loggerOptions: ILoggerOptions;
  /** Cryptographic signer instance for message signing and verification */
  signer: JsObjectSigner;
  /** Service type designation (Client or Server) */
  serviceType: SATPServiceType;
  /** Optional cross-chain bridge manager interface for bridge operations */
  bridgeManager?: BridgeManagerClientInterface;
  /** Database persistence interface for session and state management */
  dbLogger: GatewayPersistence;
  /** Optional asset claim format specification for claim processing */
  claimFormat?: ClaimFormat;
  /** Service monitoring and metrics collection instance */
  monitorService: MonitorService;
};

/**
 * Static interface for SATP service class constructors and metadata.
 *
 * @description
 * Defines the static properties and constructor signature that all SATP service
 * classes must implement. This interface ensures consistent class-level metadata
 * and construction patterns across all service implementations, enabling runtime
 * service discovery, type checking, and factory pattern implementations.
 *
 * **Static Properties:**
 * - **SERVICE_TYPE**: Immutable service type (Client/Server) designation
 * - **SATP_STAGE**: Protocol stage identifier for service classification
 * - **SATP_SERVICE_INTERNAL_NAME**: Internal service name for system identification
 *
 * **Constructor Signature:**
 * - **new()**: Constructor accepting ISATPServiceOptions and returning SATPService instance
 *
 * **Accessor Methods:**
 * - **ServiceType**: Getter for accessing the service type at class level
 *
 * @public
 * @interface SATPServiceStatic
 * @since 0.0.3-beta
 * @see {@link ISATPServiceOptions} for constructor parameter structure
 * @see {@link SATPService} for instance interface
 */
export interface SATPServiceStatic {
  /** Constructor signature for creating new service instances */
  new (options: ISATPServiceOptions): SATPService;
  /** Immutable service type designation (Client or Server) */
  readonly SERVICE_TYPE: SATPServiceType;
  /** SATP protocol stage identifier (0-3) */
  readonly SATP_STAGE: string;
  /** Internal service name for system identification and debugging */
  readonly SATP_SERVICE_INTERNAL_NAME: string;
  /** Static accessor for service type */
  get ServiceType(): SATPServiceType;
}

/**
 * Union type for all supported SATP service instances.
 *
 * @description
 * Comprehensive type definition that encompasses all possible SATP service
 * implementations across all protocol stages. This union type combines the
 * generated Protocol Buffer service definitions with the static service
 * interface, ensuring type safety for service factory patterns and runtime
 * service management.
 *
 * **Supported Services:**
 * - **SatpStage0Service**: Transfer initiation and negotiation services
 * - **SatpStage1Service**: Lock assertion and asset proof services
 * - **SatpStage2Service**: Commitment and completion preparation services
 * - **SatpStage3Service**: Asset transfer commitment and finalization services
 *
 * Each service type includes both the Protocol Buffer generated interface
 * and the static service metadata interface for complete type coverage.
 *
 * @since 0.0.3-beta
 * @see {@link SATPServiceStatic} for static interface requirements
 */
export type SATPServiceInstance =
  | (typeof SatpStage0Service & SATPServiceStatic)
  | (typeof SatpStage1Service & SATPServiceStatic)
  | (typeof SatpStage2Service & SATPServiceStatic)
  | (typeof SatpStage3Service & SATPServiceStatic);

/**
 * Configuration options specifically for SATP server services.
 *
 * @description
 * Type alias for server-specific service configuration. Currently identical
 * to the base ISATPServiceOptions interface but provides semantic clarity
 * and extensibility for server-specific configuration requirements in future
 * versions.
 *
 * @public
 * @type ISATPServerServiceOptions
 * @since 0.0.3-beta
 * @see {@link ISATPServiceOptions} for detailed configuration options
 */
export type ISATPServerServiceOptions = ISATPServiceOptions;

/**
 * Configuration options specifically for SATP client services.
 *
 * @description
 * Type alias for client-specific service configuration. Currently identical
 * to the base ISATPServiceOptions interface but provides semantic clarity
 * and extensibility for client-specific configuration requirements in future
 * versions.
 *
 * @public
 * @type ISATPClientServiceOptions
 * @since 0.0.3-beta
 * @see {@link ISATPServiceOptions} for detailed configuration options
 */
export type ISATPClientServiceOptions = ISATPServiceOptions;

/**
 * Abstract base class for all SATP protocol service implementations.
 *
 * @description
 * Provides the foundational structure and common functionality for all SATP
 * (Secure Asset Transfer Protocol) services across both client and server
 * implementations. This abstract class ensures consistent behavior, logging,
 * error handling, and monitoring capabilities while serving as the base for
 * stage-specific service implementations.
 *
 * **Core Responsibilities:**
 * - **Service Identity**: Manages service naming, type, and stage identification
 * - **Logging Infrastructure**: Provides SATP-specific logging with monitoring integration
 * - **Cryptographic Support**: Manages digital signing capabilities for message authentication
 * - **Database Integration**: Provides persistence layer access for session management
 * - **Monitoring Integration**: Supports metrics collection and service monitoring
 * - **Configuration Management**: Handles service-specific configuration and options
 *
 * **Implementation Requirements:**
 * All concrete service implementations must:
 * - Extend this abstract class
 * - Implement stage-specific protocol logic
 * - Ensure compliance with SATP protocol specifications
 * - Follow asynchronous patterns for non-blocking operations
 * - Provide proper error handling and logging
 *
 * **Service Architecture:**
 * Services are organized by protocol stage (0-3) and service type (Client/Server):
 * - **Stage 0**: Transfer initiation and negotiation services
 * - **Stage 1**: Lock assertion and asset proof services
 * - **Stage 2**: Commitment and completion preparation services
 * - **Stage 3**: Asset transfer commitment and finalization services
 *
 * **Usage Pattern:**
 * ```typescript
 * class MyStageService extends SATPService {
 *   constructor(options: ISATPServiceOptions) {
 *     super(options);
 *   }
 *
 *   async processMessage(message: SomeMessage): Promise<Response> {
 *     this.logger.debug('Processing message', { stage: this.stage });
 *     // Implementation logic here
 *   }
 * }
 * ```
 *
 * @public
 * @abstract
 * @class SATPService
 * @since 0.0.3-beta
 * @see {@link ISATPServiceOptions} for constructor options
 * @see {@link SATPServiceType} for service type enumeration
 * @see {@link SATPStagesV02} for supported protocol stages
 */
export abstract class SATPService {
  /** SATP protocol stage identifier (0-3) this service handles */
  readonly stage: string;
  /** SATP-specific logger instance with monitoring integration */
  readonly logger: Logger;
  /** Service type designation (Client or Server) */
  readonly serviceType: SATPServiceType;
  /** Cryptographic signer for message authentication and digital signatures */
  private readonly signer: JsObjectSigner;
  /** Human-readable service name for identification and logging */
  readonly serviceName: string;
  /** Database persistence interface for session and state management */
  public dbLogger: GatewayPersistence;
  /** Service monitoring and metrics collection instance */
  public monitorService: MonitorService;

  /**
   * Constructs a new SATP service instance.
   *
   * @description
   * Initializes the service with all required dependencies and configuration.
   * Validates required options and sets up logging, monitoring, cryptographic
   * signing, and database persistence capabilities.
   *
   * **Initialization Process:**
   * 1. **Monitoring Setup**: Configures service monitoring and metrics collection
   * 2. **Logger Creation**: Creates SATP-specific logger with monitoring integration
   * 3. **Service Configuration**: Sets service name, type, and protocol stage
   * 4. **Cryptographic Setup**: Configures digital signing capabilities
   * 5. **Database Validation**: Ensures database persistence layer is available
   * 6. **Validation Logging**: Logs signer configuration for debugging
   *
   * @protected
   * @param ops - Service configuration options
   * @throws {Error} When dbLogger is not provided (required dependency)
   * @since 0.0.3-beta
   */
  constructor(ops: ISATPServiceOptions) {
    this.monitorService = ops.monitorService;
    this.logger = LoggerProvider.getOrCreate(
      ops.loggerOptions,
      this.monitorService,
    );
    this.serviceName = ops.serviceName;
    this.serviceType = ops.serviceType;
    this.stage = ops.stage;
    this.signer = ops.signer;
    if (!ops.dbLogger) {
      throw new Error("dbLogger is required for SATPService");
    }
    this.dbLogger = ops.dbLogger;
    this.logger.trace(`Signer logger level: ${this.signer.options.logLevel}`);
  }

  /**
   * Generates a unique service identifier.
   *
   * @description
   * Creates a composite identifier combining service type and stage for
   * unique service identification across the SATP ecosystem. This identifier
   * is used for logging, monitoring, and service registry operations.
   *
   * @public
   * @returns Service identifier in format "ServiceType#Stage"
   * @example
   * ```typescript
   * const service = new MyStageService({ ... });
   * console.log(service.getServiceIdentifier()); // "Client#1" or "Server#2"
   * ```
   * @since 0.0.3-beta
   */
  public getServiceIdentifier(): string {
    return `${this.serviceType}#${this.stage}`;
  }

  /**
   * Gets the SATP protocol stage this service handles.
   *
   * @public
   * @readonly
   * @returns {string} Protocol stage identifier (0-3)
   * @since 0.0.3-beta
   */
  public get Stage(): string {
    return this.stage;
  }

  /**
   * Gets the service logger instance.
   *
   * @public
   * @readonly
   * @returns {Logger} SATP-specific logger with monitoring integration
   * @since 0.0.3-beta
   */
  public get Log(): Logger {
    return this.logger;
  }

  /**
   * Gets the service type (Client or Server).
   *
   * @public
   * @readonly
   * @returns {SATPServiceType} Service type designation
   * @since 0.0.3-beta
   */
  public get ServiceType(): SATPServiceType {
    return this.serviceType;
  }

  /**
   * Gets the human-readable service name.
   *
   * @public
   * @readonly
   * @returns {string} Service name for identification and logging
   * @since 0.0.3-beta
   */
  public get ServiceName(): string {
    return this.serviceName;
  }

  /**
   * Gets the cryptographic signer instance.
   *
   * @description
   * Provides access to the cryptographic signer used for message
   * authentication and digital signature operations. This signer
   * is essential for SATP protocol security requirements.
   *
   * @public
   * @readonly
   * @returns {JsObjectSigner} Cryptographic signer instance
   * @since 0.0.3-beta
   */
  public get Signer(): JsObjectSigner {
    return this.signer;
  }
}
