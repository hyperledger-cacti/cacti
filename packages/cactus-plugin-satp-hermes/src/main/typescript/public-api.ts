/**
 * SATP-Hermes Public API - Secure Asset Transfer Protocol Implementation
 *
 * @fileoverview
 * Public API exports for the SATP-Hermes plugin, implementing the IETF SATP v2 core specification
 * for fault-tolerant cross-chain asset transfers. Provides gateway-based interoperability with
 * crash recovery mechanisms and atomic transaction guarantees.
 *
 * **SATP Protocol Context:**
 * - Transfer Initiation: Gateway authentication and asset definition exchange
 * - Lock-Evidence Verification: Asset locking with cryptographic proof generation
 * - Commitment Establishment: Atomic asset burn/mint operations across networks
 *
 * **Architecture Integration:**
 * - Gateway-to-gateway communication model for cross-chain interoperability
 * - Fault-tolerant middleware with crash recovery and rollback capabilities
 * - ACID properties enforcement for distributed blockchain transactions
 * - Bridge mechanisms for heterogeneous blockchain network integration
 *
 * @module SatpHermesPublicAPI
 *
 * @example
 * Basic gateway setup and asset transfer:
 * ```typescript
 * import {
 *   SATPGateway,
 *   SATPGatewayConfig,
 *   DEFAULT_PORT_GATEWAY_SERVER
 * } from '@hyperledger/cactus-plugin-satp-hermes';
 *
 * const gateway = new SATPGateway({
 *   gatewayId: 'gateway-fabric',
 *   networkId: 'fabric-network-1',
 *   serverPort: DEFAULT_PORT_GATEWAY_SERVER
 * });
 * ```
 *
 * @example
 * Cross-chain bridge configuration:
 * ```typescript
 * import { IBesuLeafNeworkOptions, INetworkOptions } from '@hyperledger/cactus-plugin-satp-hermes';
 *
 * const besuConfig: IBesuLeafNeworkOptions = {
 *   networkId: 'besu-testnet',
 *   rpcEndpoint: 'http://localhost:8545'
 * };
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @see {@link https://www.sciencedirect.com/science/article/abs/pii/S0167739X21004337} Hermes Research Paper
 * @see {@link SATPGateway} for main gateway implementation
 * @see {@link PluginFactorySATPGateway} for gateway factory and instantiation
 */

/**
 * Gateway Client API - Auto-generated TypeScript client for SATP gateway communication.
 *
 * @description
 * Provides client-side interfaces and APIs for communicating with SATP gateways,
 * including REST endpoints for transfer initiation, lock evidence, and commitment phases.
 * Generated from OpenAPI specifications to ensure protocol compliance.
 *
 * Key exported types include:
 * - GetApproveAddressRequest: Request interface for address approval operations
 * - GetApproveAddressResponse: Response interface for address approval operations
 * - All other auto-generated gateway client types and interfaces
 *
 * @see {@link SATPGateway} for server-side gateway implementation
 * @see {@link PluginFactorySATPGateway} for gateway creation and configuration
 */
export * from "./generated/gateway-client/typescript-axios";

/**
 * SATP Protocol Message Format - Claim format definitions for cryptographic proofs.
 *
 * @description
 * Defines claim formats used in SATP protocol messages for asset ownership proofs,
 * transfer evidence, and cryptographic attestations during cross-chain operations.
 * Based on IETF SATP v2 common message protobuf definitions.
 *
 * @see {@link sign} for claim signing operations
 * @see {@link verifySignature} for claim verification
 */
export { ClaimFormat } from "./generated/proto/cacti/satp/v02/common/message_pb";

/**
 * SATP Gateway Core Implementation - Main gateway class and configuration.
 *
 * @description
 * Core SATP gateway implementation providing fault-tolerant cross-chain asset transfer
 * capabilities. Implements the complete IETF SATP v2 protocol with crash recovery,
 * session management, and atomic transaction guarantees across blockchain networks.
 *
 * @see {@link PluginFactorySATPGateway} for gateway instantiation
 * @see {@link GatewayIdentity} for gateway identification and discovery
 * @see {@link INetworkOptions} for network configuration
 */
export { SATPGateway, SATPGatewayConfig } from "./plugin-satp-hermes-gateway";

/**
 * Gateway Factory - Plugin factory for SATP gateway creation and orchestration.
 *
 * @description
 * Factory class for creating and configuring SATP gateway instances with proper
 * initialization, dependency injection, and lifecycle management. Supports multiple
 * blockchain network types and crash recovery configurations.
 *
 * @see {@link SATPGateway} for the main gateway implementation
 * @see {@link SATPGatewayConfig} for configuration options
 * @see {@link GatewayIdentity} for gateway identity management
 */
export { PluginFactorySATPGateway } from "./factory/plugin-factory-gateway-orchestrator";

/**
 * Network Options Interface - General blockchain network configuration interface.
 *
 * @description
 * Common interface for configuring blockchain network connections in SATP gateways.
 * Provides abstraction layer for different DLT types while maintaining consistent
 * configuration patterns across supported blockchain platforms.
 *
 * @see {@link IBesuLeafNeworkOptions} for Besu-specific network options
 * @see {@link SATPGateway} for gateway implementation using network configurations
 */
export { INetworkOptions } from "./cross-chain-mechanisms/bridge/bridge-types";

/**
 * Network Identification Types - Types for blockchain network identification and validation.
 *
 * @description
 * Type definitions for network identification including network ID structures,
 * address validation, and SATP draft version compatibility. These types support
 * multi-chain interoperability and protocol version negotiation.
 *
 * @see {@link SATPGateway} for gateway identity and network configuration
 * @see {@link GatewayIdentity} for gateway identification using these types
 */
export { NetworkId } from "./services/network-identification/chainid-list";
export {
  Address,
  DraftVersions,
  CurrentDrafts,
  Log,
  SATPRemoteLog,
  ShutdownHook,
} from "./core/types";

/**
 * Gateway Port Constants - Default port configurations for SATP gateway services.
 *
 * @description
 * Standard port definitions for SATP gateway server, client, and OpenAPI endpoints.
 * Ensures consistent networking configuration across gateway deployments and
 * facilitates gateway-to-gateway discovery and communication.
 *
 * **Port Usage:**
 * - `DEFAULT_PORT_GATEWAY_SERVER`: Main gateway server endpoint (3010)
 * - `DEFAULT_PORT_GATEWAY_CLIENT`: Client communication port (3011)
 * - `DEFAULT_PORT_GATEWAY_OAPI`: OpenAPI documentation and testing (4010)
 *
 * @see {@link SATPGatewayConfig} for gateway configuration using these ports
 * @see {@link GatewayIdentity} for gateway network identity and addressing
 */
export {
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_SERVER,
  DEFAULT_PORT_GATEWAY_OAPI,
} from "./core/constants";

/**
 * Besu Network Configuration - Ethereum-compatible blockchain integration options.
 *
 * @description
 * Configuration interface for connecting SATP gateways to Hyperledger Besu networks,
 * enabling cross-chain asset transfers between Ethereum-compatible blockchains and
 * other supported networks like Hyperledger Fabric.
 *
 * @see {@link INetworkOptions} for general network configuration interface
 * @see {@link SATPGateway} for gateway implementation supporting multiple DLTs
 */
export { IBesuNetworkConfig } from "./cross-chain-mechanisms/bridge/bridge-types";

/**
 * Gateway Identity Management - Gateway identification and network discovery.
 *
 * @description
 * Defines gateway identity structure for SATP network participation, including
 * cryptographic keys, network addresses, supported DLT systems, and protocol
 * versions. Essential for gateway-to-gateway authentication and discovery.
 *
 * @see {@link SATPGateway} for gateway implementation using identity
 * @see {@link PluginFactorySATPGateway} for gateway creation with identity
 * @see {@link SATPGatewayConfig} for identity configuration options
 */
export { GatewayIdentity } from "./core/types";

/**
 * Fabric Network Validation - Hyperledger Fabric configuration validation utilities.
 *
 * @description
 * Configuration validation functions and type definitions for Hyperledger Fabric
 * network integration with SATP gateways. Ensures proper fabric network setup
 * including organization details, channel configuration, and chaincode definitions.
 *
 * @see {@link INetworkOptions} for general network configuration interface
 * @see {@link SATPGateway} for gateway implementation supporting Fabric networks
 */
export {
  TargetOrganization,
  FabricConfigJSON,
} from "./services/validation/config-validating-functions/bridges-config-validating-functions/validate-fabric-config";

/**
 * Configuration Validation Types - Additional validation types for network and credential configuration.
 *
 * @description
 * Extended configuration validation types including Fabric connector options,
 * key pair validation, and network identification structures. Provides
 * comprehensive type safety for SATP gateway configuration and validation.
 *
 * @see {@link FabricConfigJSON} for main Fabric configuration structure
 * @see {@link SATPGateway} for gateway configuration validation
 */
export { FabricOptionsJSON } from "./services/validation/config-validating-functions/bridges-config-validating-functions/validate-fabric-options";
export { KeyPairJSON } from "./services/validation/config-validating-functions/validate-key-pair-json";

/**
 * Gateway Utilities - Core utility functions for SATP protocol operations.
 *
 * @description
 * Essential utility functions supporting SATP gateway operations including cryptographic
 * operations, data format conversions, signature verification, and protocol message
 * handling. Provides foundational functionality for secure cross-chain asset transfers.
 *
 * Key utility functions:
 * - `bufArray2HexStr` - Convert buffer arrays to hexadecimal strings
 * - `sign` - Cryptographic signing operations for SATP messages
 * - `verifySignature` - Verify digital signatures on protocol messages
 * - `getSatpLogKey` - Generate standardized keys for transaction logs
 * - `getHash` - Compute cryptographic hashes for data integrity
 */
export {
  bufArray2HexStr,
  sign,
  verifySignature,
  getSatpLogKey,
  getHash,
} from "./utils/gateway-utils";

/**
 * Gateway Persistence - Fault-tolerant logging and data persistence for crash recovery.
 *
 * @description
 * Comprehensive persistence layer for SATP gateways implementing Hermes fault-tolerant
 * design patterns with local and remote logging capabilities. Provides crash recovery
 * support, data integrity verification, and distributed logging for cross-chain operations.
 * The persistence layer is implemented through repository pattern interfaces that provide
 * abstraction over different database backends (SQLite, PostgreSQL, etc.) using Knex.js.
 *
 * Key Features:
 * - Local log repository for session-scoped SATP protocol logging
 * - Remote log repository for distributed crash recovery mechanisms
 * - Session management with chronological and sequence-based queries
 * - Database schema migrations and version control
 * - Support for multiple database backends via Knex.js
 *
 * @see {@link ILocalLogRepository} for local database persistence interface
 * @see {@link IRemoteLogRepository} for distributed logging interface
 * @see {@link KnexLocalLogRepository} for Knex.js-based local implementation
 * @see {@link KnexRemoteLogRepository} for Knex.js-based remote implementation
 * @see {@link Log} for local log data structure
 * @see {@link SATPRemoteLog} for remote log data structure
 *
 * @since 0.0.3-beta
 */

/**
 * Repository Interfaces - Database repository contracts for SATP gateway persistence.
 *
 * @description
 * Repository pattern interfaces for local and remote log persistence operations.
 * Defines type-safe contracts for database access, session management, and
 * crash recovery support. These interfaces enable consistent data persistence
 * across different storage backends while maintaining SATP protocol compliance.
 *
 * **Local Repository:**
 * Manages session-scoped SATP protocol logs with support for chronological queries,
 * sequence-based recovery, and proof evidence filtering.
 *
 * **Remote Repository:**
 * Handles distributed logging for crash recovery with cryptographic hashes and
 * signatures for data integrity across gateway instances.
 *
 * @see {@link KnexLocalLogRepository} for Knex.js-based local implementation
 * @see {@link KnexRemoteLogRepository} for Knex.js-based remote implementation
 * @see {@link Log} for local log data structure
 * @see {@link SATPRemoteLog} for remote log data structure
 *
 * @since 0.0.3-beta
 */
export {
  ILocalLogRepository,
  IRemoteLogRepository,
} from "./database/repository/interfaces/repository";

/**
 * Gateway Persistence - Unified persistence layer for SATP protocol logging.
 *
 * @description
 * Provides a high-level persistence interface that coordinates between local and
 * remote repositories for SATP gateway operations. Includes configuration interface
 * for initializing persistence with repository instances and cryptographic components.
 *
 * @see {@link ILocalLogRepository} for local repository interface
 * @see {@link IRemoteLogRepository} for remote repository interface
 */
export {
  GatewayPersistence,
  IGatewayPersistenceConfig,
} from "./database/gateway-persistence";

/**
 * Repository Implementations - Concrete implementations of SATP repository interfaces.
 *
 * @description
 * Knex-based repository implementations for local and remote log persistence.
 * Provides SQL database storage for SATP gateway operations with support for
 * SQLite, PostgreSQL, MySQL, and other databases supported by Knex.js.
 *
 * @see {@link ILocalLogRepository} for local repository interface
 * @see {@link IRemoteLogRepository} for remote repository interface
 */
export { KnexLocalLogRepository } from "./database/repository/knex-satp-local-log-repository";
export { KnexRemoteLogRepository } from "./database/repository/knex-remote-log-repository";

/**
 * Monitoring Service - Gateway monitoring and telemetry service for SATP operations.
 *
 * @description
 * Provides comprehensive monitoring capabilities for SATP gateway operations
 * including transaction tracking, performance metrics, and error reporting.
 * Integrates with OpenTelemetry for distributed tracing and observability.
 *
 * **Key Features:**
 * - OpenTelemetry integration for metrics, traces, and logs
 * - Performance monitoring and metrics collection
 * - Distributed tracing for cross-chain operations
 * - Error tracking and reporting capabilities
 * - Configurable exporters for OTLP-compatible backends
 *
 * @see {@link ILocalLogRepository} for persistence layer integration
 * @see {@link IRemoteLogRepository} for distributed logging integration
 * @see {@link SATPGateway} for gateway monitoring setup
 * @see {@link SATPLogger} for logging integration with monitoring
 *
 * @since 0.0.3-beta
 */
export {
  MonitorService,
  MonitorServiceOptions,
} from "./services/monitoring/monitor";

/**
 * Cross-Chain Configuration - Configuration interfaces for cross-chain mechanisms.
 *
 * @description
 * Configuration types for setting up cross-chain asset transfer mechanisms
 * across different blockchain networks. Supports multiple DLT types including
 * Hyperledger Fabric, Ethereum/Besu, and other supported blockchain platforms.
 *
 * @see {@link SATPGateway} for gateway configuration using these types
 * @see {@link INetworkOptions} for network-specific configuration
 */
export {
  ICrossChainMechanismsOptions,
  SATPCrossChainManager,
} from "./cross-chain-mechanisms/satp-cc-manager";

/**
 * Core Services - Essential service classes for SATP gateway operations.
 *
 * @description
 * Core service implementations including logging, gateway orchestration,
 * session management, and oracle operations. These services provide the
 * foundational functionality for SATP protocol execution and management.
 *
 * @see {@link SATPGateway} for gateway implementation using these services
 * @see {@link BLODispatcher} for business logic dispatcher integration
 */
export { SATPLogger } from "./core/satp-logger";
export { GatewayOrchestrator } from "./services/gateway/gateway-orchestrator";
export { SATPManager } from "./services/gateway/satp-manager";
export { CrashManager } from "./services/gateway/crash-manager";
export { OracleManager } from "./cross-chain-mechanisms/oracle/oracle-manager";

/**
 * Business Logic Operations Dispatcher - Central dispatcher for SATP business logic operations.
 *
 * @description
 * Main dispatcher class handling SATP protocol business logic operations including
 * session management, transaction processing, and cross-chain communication.
 * Coordinates between different SATP protocol phases and manages gateway operations.
 *
 * @see {@link SATPGateway} for gateway integration with dispatcher
 * @see {@link ILocalLogRepository} for persistence integration
 * @see {@link IRemoteLogRepository} for distributed logging
 */
export { BLODispatcher, BLODispatcherOptions } from "./api1/dispatcher";
