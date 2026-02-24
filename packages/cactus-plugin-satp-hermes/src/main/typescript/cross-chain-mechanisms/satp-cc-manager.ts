/**
 * @fileoverview SATP Cross-Chain Manager
 *
 * This module provides the main cross-chain coordination manager for the SATP
 * gateway system. It orchestrates bridge operations, oracle interactions, and
 * ontology management to enable secure asset transfers across different
 * blockchain networks following the IETF SATP v2 specification.
 *
 * @group Cross-Chain Mechanisms
 * @module cross-chain-mechanisms/satp-cc-manager
 * @since 0.0.3-beta
 *
 * The manager coordinates:
 * - Bridge deployment and lifecycle management
 * - Oracle task execution and monitoring
 * - Cross-chain asset ontology mapping
 * - Network configuration and validation
 * - Distributed tracing and monitoring
 *
 * @example
 * ```typescript
 * import { SATPCrossChainManager } from './satp-cc-manager';
 *
 * const ccManager = new SATPCrossChainManager({
 *   orquestrator: gatewayOrchestrator,
 *   logLevel: 'info',
 *   ontologyOptions: { enableValidation: true },
 *   monitorService: monitoringService
 * });
 *
 * await ccManager.deployCrossChainMechanisms({
 *   bridgeConfig: [{ networkId: 'besu-network', ledgerType: LedgerType.Besu2X }],
 *   oracleConfig: [{ networkId: 'oracle-network', ledgerType: LedgerType.Ethereum }]
 * });
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @author Hyperledger Cacti Contributors
 * @since 0.0.3-beta
 */

import { type LogLevelDesc, JsObjectSigner } from "@hyperledger/cactus-common";
import type { SATPLogger as Logger } from "../core/satp-logger";
import { SATPLoggerProvider as LoggerProvider } from "../core/satp-logger-provider";
import { BridgeManager } from "./bridge/bridge-manager";
import { BridgeManagerClientInterface } from "./bridge/interfaces/bridge-manager-client-interface";
import { IOntologyManagerOptions } from "./bridge/ontology/ontology-manager";
import { INetworkOptions } from "./bridge/bridge-types";
import { GatewayOrchestrator } from "../services/gateway/gateway-orchestrator";
import { OracleManager } from "./oracle/oracle-manager";
import { MonitorService } from "../services/monitoring/monitor";
import { context, SpanStatusCode } from "@opentelemetry/api";
import {
  ILocalLogRepository,
  IRemoteLogRepository,
} from "../database/repository/interfaces/repository";

/**
 * Configuration options for the SATP Cross-Chain Manager.
 *
 * Defines the core dependencies and settings required to initialize
 * the cross-chain coordination system including orchestrator reference,
 * logging configuration, and monitoring services.
 *
 * @since 0.0.3-beta
 */
export interface ISATPCrossChainManagerOptions {
  /** Gateway orchestrator instance for coordination */
  orquestrator: GatewayOrchestrator;
  /** Logging level for cross-chain operations */
  logLevel?: LogLevelDesc;
  /** Ontology manager configuration options */
  ontologyOptions?: IOntologyManagerOptions;
  localRepository: ILocalLogRepository;
  remoteRepository?: IRemoteLogRepository;
  /** Monitoring service for telemetry and metrics */
  monitorService: MonitorService;
  signer: JsObjectSigner;
  pubKey: string;
}

/**
 * Configuration options for cross-chain mechanisms.
 *
 * Specifies the network configurations for bridge and oracle
 * deployments across different blockchain networks.
 *
 * @since 0.0.3-beta
 */
export interface ICrossChainMechanismsOptions {
  /** Bridge network configuration array */
  bridgeConfig?: INetworkOptions[];
  /** Oracle network configuration array */
  oracleConfig?: INetworkOptions[];
}

/**
 * SATP Cross-Chain Manager for coordinating cross-chain mechanisms.
 *
 * The main coordination class responsible for managing cross-chain mechanisms
 * within the SATP (Secure Asset Transfer Protocol) framework. Provides methods
 * to deploy cross-chain mechanisms and bridges based on the provided configuration,
 * orchestrate oracle operations, and manage asset ontology mappings.
 *
 * @todo Extend to accommodate oracle functionality fully
 * @since 0.0.3-beta
 * @example
 * ```typescript
 * const manager = new SATPCrossChainManager({
 *   orquestrator: orchestrator,
 *   logLevel: 'debug',
 *   monitorService: monitoring
 * });
 *
 * // Deploy bridge mechanisms
 * await manager.deployCrossChainMechanisms({
 *   bridgeConfig: bridgeConfigs,
 *   oracleConfig: oracleConfigs
 * });
 *
 * // Access bridge manager
 * const bridgeManager = manager.getBridgeManager();
 * ```
 */
export class SATPCrossChainManager {
  /**
   * The class name identifier for logging and debugging purposes.
   *
   * @readonly
   * @since 0.0.3-beta
   */
  public static readonly CLASS_NAME = "SATPCrossChainManager";

  /**
   * Logger instance for cross-chain operation logging and debugging.
   *
   * @private
   * @readonly
   * @since 0.0.3-beta
   */
  private readonly log: Logger;

  /**
   * Configured logging level for cross-chain operations.
   *
   * @private
   * @readonly
   * @since 0.0.3-beta
   */
  private readonly logLevel: LogLevelDesc;

  /**
   * Bridge manager instance for coordinating cross-chain bridge operations.
   *
   * Manages deployment, configuration, and lifecycle of bridges across
   * different blockchain networks for asset transfer operations.
   *
   * @private
   * @since 0.0.3-beta
   */
  private bridgeManager?: BridgeManager;

  /**
   * Gateway orchestrator instance for coordinating SATP protocol operations.
   *
   * Manages the overall coordination of gateway operations including
   * session management, protocol state transitions, and inter-gateway
   * communication.
   *
   * @private
   * @since 0.0.3-beta
   */
  private gatewayOrchestrator?: GatewayOrchestrator;

  /**
   * Oracle manager instance for coordinating off-chain computation tasks.
   *
   * Manages oracle deployment, task execution, and result verification
   * for complex cross-chain operations requiring external computation
   * or data validation.
   *
   * @private
   * @since 0.0.3-beta
   */
  private oracleManager?: OracleManager;

  /**
   * Instance of the local log repository.
   */
  private readonly localRepository: ILocalLogRepository;

  /**
   * Instance of the remote log repository.
   */
  private readonly remoteRepository?: IRemoteLogRepository;

  /**
   * Monitoring service for telemetry, metrics collection, and observability.
   *
   * Provides distributed tracing, performance metrics, and operational
   * monitoring for cross-chain operations and system health tracking.
   *
   * @private
   * @readonly
   * @since 0.0.3-beta
   */
  private readonly monitorService: MonitorService;


  /**
   * Instance of the signer to handle signing operations.
   */
  private readonly signer: JsObjectSigner;

  /**
   * Instance of the public key to handle signing operations.
   */
  private readonly pubKey: string;

  /**
   * Constructs an instance of `ISATPCCManager`.
   *
   * Initializes the cross-chain coordination system with the provided
   * configuration options including orchestrator, logging, and monitoring
   * services. Sets up bridge and oracle managers for cross-chain operations.
   *
   * @param options - Configuration options for the cross-chain manager
   * @throws Error if required dependencies are not provided
   * @since 0.0.3-beta
   * @example
   * ```typescript
   * const manager = new SATPCrossChainManager({
   *   orquestrator: gatewayOrchestrator,
   *   logLevel: 'debug',
   *   ontologyOptions: { enableValidation: true },
   *   monitorService: monitoringService
   * });
   * ```
   */
  constructor(private options: ISATPCrossChainManagerOptions) {
    const fnTag = `${SATPCrossChainManager.CLASS_NAME}#constructor()`;
    const label = SATPCrossChainManager.CLASS_NAME;
    this.logLevel = this.options.logLevel || "INFO";
    this.monitorService = this.options.monitorService;
    this.localRepository = this.options.localRepository;
    this.remoteRepository = this.options.remoteRepository;
    this.monitorService = this.options.monitorService;
    this.signer = this.options.signer;
    this.pubKey = this.options.pubKey;
    this.log = LoggerProvider.getOrCreate(
      { label, level: this.logLevel },
      this.monitorService,
    );

    const { span, context: ctx } = this.monitorService.startSpan(fnTag);

    context.with(ctx, () => {
      try {
        this.bridgeManager = new BridgeManager({
          ontologyOptions: options.ontologyOptions,
          logLevel: this.logLevel,
          monitorService: this.monitorService,
        });

        this.gatewayOrchestrator = options.orquestrator;

        this.oracleManager = new OracleManager({
          logLevel: this.logLevel,
          bungee: undefined,
          initialTasks: [],
          monitorService: this.monitorService,
          localRepository: this.localRepository,
          remoteRepository: this.remoteRepository,
          signer: this.signer,
          pubKey: this.pubKey,
        });
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Deploys cross-chain mechanisms based on the provided bridge configurations.
   *
   * @param config - Cross-chain mechanisms configuration options.
   * @returns A promise that resolves when the deployment is complete.
   */
  public async deployCCMechanisms(
    config: ICrossChainMechanismsOptions,
  ): Promise<void> {
    const fnTag = `${SATPCrossChainManager.CLASS_NAME}#deployCCMechanisms()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Deploying Cross Chain Mechanisms...`);

        if (!config.bridgeConfig && !config.oracleConfig) {
          throw new Error(
            `${fnTag}, Missing bridge or oracle configuration. Cannot deploy cross-chain mechanism.`,
          );
        }

        if (config.bridgeConfig) {
          await this.deployBridgeFromConfig(config.bridgeConfig);
        }

        if (config.oracleConfig) {
          await this.deployOracleFromConfig(config.oracleConfig);
        }

        span.setStatus({ code: SpanStatusCode.OK });
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Deploys bridges based on the provided configuration.
   *
   * @param bridgesNetworkConfig - An array of bridge network configuration options.
   * @returns A promise that resolves when the deployment is complete.
   */
  public async deployBridgeFromConfig(
    bridgesNetworkConfig: INetworkOptions[],
  ): Promise<void> {
    const fnTag = `${SATPCrossChainManager.CLASS_NAME}#deployBridgeFromConfig()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Deploying Bridge...`);

        this.log.debug(
          `${fnTag}, Deploying Bridges with the following configuration: ${JSON.stringify(bridgesNetworkConfig)}`,
        );
        //const deploymentPromises = [];
        for (const config of bridgesNetworkConfig) {
          //deploymentPromises.push(this.bridgeManager.deployLeaf(config));
          await this.bridgeManager?.deployLeaf(config);
        }
        //await Promise.all(deploymentPromises);

        const networkIds = [];
        for (const config of bridgesNetworkConfig) {
          networkIds.push({ ...config.networkIdentification });
        }
        this.gatewayOrchestrator?.addGatewayOwnChannels(networkIds);
        span.setStatus({ code: SpanStatusCode.OK });
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Deploys oracles based on the provided configuration.
   *
   * @param oraclesConfig - An array of oracle configuration options.
   * @returns A promise that resolves when the deployment is complete.
   */
  public async deployOracleFromConfig(
    oraclesConfig: INetworkOptions[],
  ): Promise<void> {
    const fnTag = `${SATPCrossChainManager.CLASS_NAME}#deployOracleFromConfig()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        this.log.debug(`${fnTag}, Deploying Oracles...`);

        for (const config of oraclesConfig) {
          await this.oracleManager?.deployOracle(config);
        }
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Retrieves the Bridge Manager Client Interface.
   *
   * @returns {BridgeManagerClientInterface} The interface for the bridge manager client.
   *
   * @remarks
   * This method logs the action of getting the Bridge Manager Interface and then returns the
   * `bridgeManager` instance.
   *
   * @example
   * ```typescript
   * const bridgeManagerClient = satpCrossChainManager.getClientBridgeManagerInterface();
   * ```
   */
  public getClientBridgeManagerInterface(): BridgeManagerClientInterface {
    const fnTag = `${SATPCrossChainManager.CLASS_NAME}#getClientBridgeManagerInterface()`;
    this.log.debug(`${fnTag}, Getting Bridge Manager Interface...`);
    if (!this.bridgeManager) {
      throw new Error("Bridge Manager is not initialized");
    }
    return this.bridgeManager;
  }

  /**
   * Retrieves the Oracle Manager.
   *
   * @returns {OracleManager} The instance of the Oracle Manager.
   *
   * @remarks
   * This method logs the action of getting the Oracle Manager and then returns the
   * `oracleManager` instance.
   *
   * @example
   * ```typescript
   * const oracleManager = satpCrossChainManager.getOracleManager();
   * ```
   */
  public getOracleManager(): OracleManager {
    const fnTag = `${SATPCrossChainManager.CLASS_NAME}#getOracleManager()`;
    this.log.debug(`${fnTag}, Getting Oracle Manager...`);
    if (!this.oracleManager) {
      throw new Error("Oracle Manager is not initialized");
    }
    return this.oracleManager;
  }
}
