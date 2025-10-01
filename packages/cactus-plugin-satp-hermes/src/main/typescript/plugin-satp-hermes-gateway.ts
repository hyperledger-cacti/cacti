import {
  Secp256k1Keys,
  Checks,
  type ILoggerOptions,
  JsObjectSigner,
  type IJsObjectSignerOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";

import { type SATPLogger as Logger } from "./core/satp-logger";
import { SATPLoggerProvider as LoggerProvider } from "./core/satp-logger-provider";
import { v4 as uuidv4 } from "uuid";

import { ValidatorOptions } from "class-validator";

import {
  IsDefined,
  IsNotEmptyObject,
  IsObject,
  IsString,
  Contains,
} from "class-validator";

import { type GatewayIdentity, type ShutdownHook } from "./core/types";
import {
  GatewayOrchestrator,
  type IGatewayOrchestratorOptions,
} from "./services/gateway/gateway-orchestrator";
import express, { type Express } from "express";
import http from "node:http";
import {
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_OAPI,
  DEFAULT_PORT_GATEWAY_SERVER,
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "./core/constants";
import { bufArray2HexStr } from "./utils/gateway-utils";
import type {
  ILocalLogRepository,
  IRemoteLogRepository,
} from "./database/repository/interfaces/repository";
import { KnexRemoteLogRepository as RemoteLogRepository } from "./database/repository/knex-remote-log-repository";
import { KnexLocalLogRepository as LocalLogRepository } from "./database/repository/knex-local-log-repository";
import { BLODispatcher, type BLODispatcherOptions } from "./api1/dispatcher";
import { type JsonObject } from "swagger-ui-express";
import type {
  IPluginWebService,
  ICactusPlugin,
  IWebServiceEndpoint,
  ICactusPluginOptions,
} from "@hyperledger/cactus-core-api";
import {
  ICrossChainMechanismsOptions,
  type ISATPCrossChainManagerOptions,
  SATPCrossChainManager,
} from "./cross-chain-mechanisms/satp-cc-manager";
import {
  CrashManager,
  type ICrashRecoveryManagerOptions,
} from "./services/gateway/crash-manager";

import * as OAS from "../json/openapi-blo-bundled.json";
import { knexLocalInstance } from "./database/knexfile";
import schedule, { Job } from "node-schedule";
import { BLODispatcherErraneousError } from "./core/errors/satp-errors";
import { ClaimFormat } from "./generated/proto/cacti/satp/v02/common/message_pb";
import { getEnumKeyByValue, getEnumValueByKey } from "./services/utils";
import { ISignerKeyPair } from "@hyperledger/cactus-common";
import { IPrivacyPolicyValue } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/view-creation/privacy-policies";
import { IMergePolicyValue } from "@hyperledger/cactus-plugin-bungee-hermes/dist/lib/main/typescript/view-merging/merge-policies";
import knex, { Knex } from "knex";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { NetworkId } from "./public-api";
import {
  ApiServer,
  AuthorizationProtocol,
  ConfigService,
} from "@hyperledger/cactus-cmd-api-server";
import { AddressInfo } from "node:net";
import { createMigrationSource } from "./database/knex-migration-source";
import { ExtensionsManager } from "./extensions/extensions-manager";
import { MonitorService } from "./services/monitoring/monitor";
import { Context, context, Span, SpanStatusCode } from "@opentelemetry/api";
import { SATPManager } from "./services/gateway/satp-manager";
import { ExtensionConfig } from "./services/validation/config-validating-functions/validate-extensions";

/**
 * SATP Gateway Configuration Interface - Complete configuration for fault-tolerant gateway.
 *
 * @description
 * Configuration interface for SATP gateway instances implementing the IETF SATP v2 specification
 * with Hermes crash recovery mechanisms. Provides comprehensive setup for cross-chain asset
 * transfers with gateway-to-gateway communication, persistence, and fault tolerance.
 *
 * **SATP Protocol Implementation:**
 * - Gateway identity and cryptographic key management
 * - Cross-chain mechanism configuration for bridge operations
 * - Crash recovery and persistence configuration
 * - Privacy and merge policy definitions for data handling
 * - Monitoring and validation options for protocol compliance
 *
 * **Crash Recovery Context:**
 * The configuration supports both local and remote repository options for implementing
 * the Hermes fault-tolerant design with primary-backup mechanisms and log replication.
 *
 * @interface SATPGatewayConfig
 * @extends ICactusPluginOptions
 *
 * @example
 * Basic gateway configuration:
 * ```typescript
 * const config: SATPGatewayConfig = {
 *   instanceId: 'gateway-fabric-besu',
 *   gid: {
 *     id: 'gateway-1',
 *     pubKey: '0x...',
 *     connectedDLTs: ['fabric-network', 'besu-testnet'],
 *     gatewayServerPort: 3010
 *   },
 *   keyPair: generatedKeyPair,
 *   enableCrashRecovery: true,
 *   pluginRegistry: new PluginRegistry({ plugins: [] })
 * };
 * ```
 *
 * @example
 * Production configuration with crash recovery:
 * ```typescript
 * const prodConfig: SATPGatewayConfig = {
 *   instanceId: 'prod-gateway-1',
 *   environment: 'production',
 *   enableCrashRecovery: true,
 *   localRepository: knexPostgresConfig,
 *   remoteRepository: knexRemoteConfig,
 *   ccConfig: {
 *     bridgeConfig: [fabricBridge, besuBridge]
 *   },
 *   pluginRegistry: registry
 * };
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @see {@link SATPGateway} for the main gateway implementation
 * @see {@link GatewayIdentity} for gateway identity structure
 * @see {@link ICrossChainMechanismsOptions} for bridge configuration
 * @see {@link CrashManager} for crash recovery implementation
 *
 * @since 2.0.0
 */
export interface SATPGatewayConfig extends ICactusPluginOptions {
  /**
   * Gateway identity configuration for SATP network participation.
   * @description
   * Defines the gateway's identity including cryptographic public key, supported DLT systems,
   * network addresses, and protocol version information. Essential for gateway discovery
   * and authentication in SATP protocol operations.
   *
   * @see {@link GatewayIdentity} for identity structure details
   */
  gid?: GatewayIdentity;

  /**
   * Counter-party gateway configurations for cross-chain communications.
   * @description
   * Array of known gateway identities that this gateway can communicate with for
   * cross-chain asset transfers. Used for gateway discovery and establishing
   * secure communication channels between SATP gateways.
   *
   * @see {@link GatewayIdentity} for gateway identity structure
   */
  counterPartyGateways?: GatewayIdentity[];

  /**
   * Cryptographic key pair for gateway signing operations.
   * @description
   * SECP256k1 key pair used for signing SATP protocol messages, asset transfer proofs,
   * and establishing gateway identity. Essential for cryptographic integrity and
   * non-repudiation in cross-chain transactions.
   *
   * @see {@link ISignerKeyPair} for key pair structure
   * @see {@link JsObjectSigner} for signing implementation
   */
  keyPair?: ISignerKeyPair;

  /**
   * Deployment environment configuration for gateway behavior.
   * @description
   * Specifies runtime environment affecting logging levels, validation strictness,
   * and error handling behavior. Production mode enables stricter validation and
   * optimized performance settings.
   */
  environment?: "development" | "production";

  /**
   * Class-validator options for message validation.
   * @description
   * Validation configuration for SATP protocol messages and data structures.
   * Ensures compliance with IETF SATP specification and prevents malformed
   * messages from compromising gateway operations.
   *
   * @see {@link ValidatorOptions} for validation configuration options
   */
  validationOptions?: ValidatorOptions;

  /**
   * Privacy policies for sensitive data handling.
   * @description
   * Defines privacy policies applied to cross-chain transaction data, including
   * data minimization and access control policies for SATP
   * protocol messages and asset transfer information.
   *
   * @see {@link IPrivacyPolicyValue} for privacy policy structure
   */
  privacyPolicies?: IPrivacyPolicyValue[];

  /**
   * Merge policies for data consolidation across chains.
   * @description
   * Policies for merging and consolidating data from multiple blockchain networks
   * during cross-chain asset transfers. Ensures consistent data representation
   * and conflict resolution in multi-chain environments.
   *
   * @see {@link IMergePolicyValue} for merge policy structure
   */
  mergePolicies?: IMergePolicyValue[];

  /**
   * Cross-chain mechanism configuration for bridge operations.
   * @description
   * Configuration for blockchain bridges and cross-chain mechanisms supporting
   * asset transfers between different DLT systems. Includes bridge-specific
   * settings for Fabric, Besu, and other supported blockchain networks.
   *
   * @see {@link ICrossChainMechanismsOptions} for bridge configuration
   * @see {@link SATPCrossChainManager} for bridge management
   */
  ccConfig?: ICrossChainMechanismsOptions;

  /**
   * Local database configuration for persistence.
   * @description
   * Knex.js configuration for local database persistence of SATP session data,
   * transaction logs, and recovery checkpoints. Essential for crash recovery
   * and maintaining gateway state across restarts.
   *
   * @see {@link Knex.Config} for database configuration options
   * @see {@link LocalLogRepository} for local persistence implementation
   */
  localRepository?: Knex.Config;

  /**
   * Remote database configuration for distributed logging.
   * @description
   * Knex.js configuration for remote database persistence supporting distributed
   * logging and primary-backup crash recovery mechanisms. Enables fault-tolerant
   * operation with log replication across gateway instances.
   *
   * @see {@link Knex.Config} for database configuration options
   * @see {@link RemoteLogRepository} for remote persistence implementation
   */
  remoteRepository?: Knex.Config;

  /**
   * Enable crash recovery mechanisms.
   * @description
   * Activates Hermes crash recovery features including checkpoint logging,
   * session recovery, and rollback mechanisms. When enabled, the gateway
   * can recover from crashes and continue interrupted asset transfers.
   *
   * @see {@link CrashManager} for crash recovery implementation
   */
  enableCrashRecovery?: boolean;

  /**
   * Monitoring service for observability and tracing.
   * @description
   * Service for collecting metrics, traces, and logs from gateway operations.
   * Provides observability into SATP protocol execution, performance monitoring,
   * and debugging capabilities for cross-chain asset transfers.
   *
   * @see {@link MonitorService} for monitoring implementation
   */
  monitorService?: MonitorService;

  /**
   * Claim format for cryptographic proofs.
   * @description
   * Specifies the format for cryptographic claims and proofs used in SATP
   * protocol messages. Supports different claim formats as defined in the
   * IETF SATP specification for asset ownership and transfer evidence.
   *
   * @see {@link ClaimFormat} for supported claim formats
   */
  claimFormat?: string;

  /**
   * Path to ontology files for semantic interoperability.
   * @description
   * File system path to ontology definitions supporting semantic interoperability
   * between different blockchain networks. Enables consistent asset representation
   * and meaning preservation across heterogeneous DLT systems.
   */
  ontologyPath?: string;
  extensions?: ExtensionConfig[];

  /**
   * Plugin registry for extensibility.
   * @description
   * Registry of Hyperledger Cacti plugins extending gateway functionality.
   * Enables modular architecture and integration with additional blockchain
   * connectors, security modules, and protocol extensions.
   *
   * @see {@link PluginRegistry} for plugin management
   */
  pluginRegistry: PluginRegistry;

  /**
   * Logging level for gateway operations.
   * @description
   * Configures the verbosity of gateway logging for debugging, monitoring,
   * and operational visibility. Higher verbosity levels provide detailed
   * protocol execution traces for development and troubleshooting.
   *
   * @see {@link LogLevelDesc} for available logging levels
   */
  logLevel?: LogLevelDesc;
}

/**
 * SATP Gateway - Fault-Tolerant Cross-Chain Asset Transfer Gateway Implementation
 *
 * @description
 * Core implementation of the Secure Asset Transfer Protocol (SATP) gateway following the
 * IETF SATP v2 specification with Hermes crash recovery mechanisms. Provides fault-tolerant
 * cross-chain asset transfers through gateway-to-gateway communication with atomic transaction
 * guarantees and crash recovery capabilities.
 *
 * **SATP Protocol Implementation:**
 * - **Phase 1**: Transfer Initiation with gateway authentication and asset definition
 * - **Phase 2**: Lock-Evidence Verification with cryptographic proof generation
 * - **Phase 3**: Commitment Establishment with atomic burn/mint operations
 * - **Recovery**: Crash fault tolerance with checkpoint logging and rollback mechanisms
 *
 * **Gateway Architecture:**
 * - Gateway-to-gateway communication model for cross-chain interoperability
 * - Multi-DLT support through pluggable blockchain connector architecture
 * - Distributed logging with local and remote persistence for fault tolerance
 * - Session management with recovery checkpoints and state consistency
 * - Cryptographic signing and verification for message integrity
 *
 * **Hermes Crash Recovery Features:**
 * - Primary-backup mechanisms with log replication
 * - Checkpoint-based recovery for interrupted asset transfers
 * - Rollback capabilities for failed or inconsistent transactions
 * - Session state reconstruction from persistent logs
 * - Automatic recovery initiation on gateway restart
 *
 * @class SATPGateway
 * @implements {IPluginWebService}
 * @implements {ICactusPlugin}
 *
 * @example
 * Basic gateway initialization:
 * ```typescript
 * const config: SATPGatewayConfig = {
 *   instanceId: 'gateway-1',
 *   gid: { id: 'gateway-1', connectedDLTs: ['fabric', 'besu'] },
 *   keyPair: Secp256k1Keys.generateKeyPairsBuffer(),
 *   pluginRegistry: new PluginRegistry({ plugins: [] }),
 *   enableCrashRecovery: true
 * };
 *
 * const gateway = new SATPGateway(config);
 * await gateway.onPluginInit();
 * ```
 *
 * @example
 * Gateway with cross-chain bridge configuration:
 * ```typescript
 * const gateway = new SATPGateway({
 *   instanceId: 'multi-chain-gateway',
 *   ccConfig: {
 *     bridgeConfig: [
 *       { sourceNetwork: 'fabric-network', targetNetwork: 'besu-testnet' }
 *     ]
 *   },
 *   localRepository: postgresConfig,
 *   remoteRepository: remoteDbConfig,
 *   pluginRegistry: registry
 * });
 *
 * // Start gateway services
 * await gateway.startup();
 *
 * // Register web service endpoints
 * const app = express();
 * await gateway.registerWebServices(app);
 * ```
 *
 * @example
 * Gateway shutdown with session verification:
 * ```typescript
 * // Graceful shutdown ensuring all sessions complete
 * gateway.onShutdown({
 *   name: 'session-cleanup',
 *   hook: async () => {
 *     await gateway.verifySessionsState();
 *   }
 * });
 *
 * await gateway.shutdown();
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @see {@link https://www.sciencedirect.com/science/article/abs/pii/S0167739X21004337} Hermes Research Paper
 * @see {@link SATPGatewayConfig} for configuration options
 * @see {@link BLODispatcher} for protocol message dispatching
 * @see {@link SATPCrossChainManager} for cross-chain bridge management
 * @see {@link CrashManager} for crash recovery mechanisms
 * @see {@link GatewayOrchestrator} for gateway coordination
 * @see {@link MonitorService} for observability and monitoring
 *
 * @since 2.0.0
 */
export class SATPGateway implements IPluginWebService, ICactusPlugin {
  @IsDefined()
  @IsNotEmptyObject()
  @IsObject()
  private readonly logger: Logger;

  @IsDefined()
  @IsNotEmptyObject()
  @IsObject()
  private readonly config: SATPGatewayConfig;

  @IsString()
  @Contains("Gateway")
  public readonly className = "SATPGateway";

  @IsString()
  public readonly instanceId: string;
  private connectedDLTs: NetworkId[];
  private gatewayOrchestrator?: GatewayOrchestrator;
  private SATPCCManager?: SATPCrossChainManager;

  private extensionsManager?: ExtensionsManager;

  private BLODispatcher?: BLODispatcher;
  private GOLApplication?: Express;
  private GOLServer?: http.Server;
  private readonly OAS: JsonObject;
  private OApiServer?: ApiServer;

  private signer: JsObjectSigner;
  private _pubKey: string;

  private isShutdown: boolean = false;

  public claimFormat?: ClaimFormat;
  public localRepository?: ILocalLogRepository;
  public remoteRepository?: IRemoteLogRepository;
  private readonly shutdownHooks: ShutdownHook[];
  private crashManager?: CrashManager;
  private readonly monitorService: MonitorService;
  private sessionVerificationJob: Job | null = null;
  private activeJobs: Set<schedule.Job> = new Set();
  private initialSpanContext: { span: Span; context: Context };

  /**
   * SATPGateway Constructor - Initialize fault-tolerant cross-chain gateway.
   *
   * @description
   * Constructs a new SATP gateway instance with complete initialization of all subsystems
   * including cryptographic signing, database repositories, cross-chain managers, protocol
   * dispatchers, and crash recovery mechanisms. Validates configuration and establishes
   * gateway identity for SATP network participation.
   *
   * **Initialization Sequence:**
   * 1. Configuration validation and default value processing
   * 2. Cryptographic key pair setup and signer initialization
   * 3. Database repository configuration (local/remote persistence)
   * 4. Gateway orchestration and cross-chain manager setup
   * 5. Protocol dispatcher and web service endpoint creation
   * 6. Crash recovery manager initialization (if enabled)
   * 7. Monitoring service integration and telemetry setup
   *
   * **Crash Recovery Setup:**
   * When crash recovery is enabled, initializes checkpoint logging, session state
   * persistence, and recovery mechanisms following Hermes fault-tolerant design patterns.
   *
   * @param options - Complete gateway configuration including identity, repositories, and features
   *
   * @throws {Error} When required configuration options are missing or invalid
   * @throws {Error} When cryptographic key pair initialization fails
   * @throws {Error} When database repository setup fails
   * @throws {Error} When gateway identity configuration is invalid
   *
   * @example
   * Minimal gateway construction:
   * ```typescript
   * const gateway = new SATPGateway({
   *   instanceId: 'gateway-1',
   *   pluginRegistry: new PluginRegistry({ plugins: [] })
   * });
   * ```
   *
   * @example
   * Full production gateway construction:
   * ```typescript
   * const gateway = new SATPGateway({
   *   instanceId: 'prod-gateway',
   *   gid: {
   *     id: 'gateway-fabric-besu',
   *     connectedDLTs: ['fabric-mainnet', 'ethereum-mainnet'],
   *     gatewayServerPort: 3010
   *   },
   *   keyPair: existingKeyPair,
   *   environment: 'production',
   *   enableCrashRecovery: true,
   *   localRepository: postgresConfig,
   *   remoteRepository: distributedDbConfig,
   *   ccConfig: { bridgeConfig: [fabricBridge, ethereumBridge] },
   *   pluginRegistry: productionRegistry,
   *   logLevel: 'INFO'
   * });
   * ```
   *
   * @see {@link SATPGatewayConfig} for configuration options
   * @see {@link ProcessGatewayCoordinatorConfig} for configuration processing
   * @see {@link GatewayOrchestrator} for gateway coordination setup
   * @see {@link BLODispatcher} for protocol message handling
   * @see {@link CrashManager} for crash recovery initialization
   * @see {@link MonitorService} for observability setup
   *
   * @since 2.0.0
   */
  constructor(public readonly options: SATPGatewayConfig) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    this.config = SATPGateway.ProcessGatewayCoordinatorConfig(options);
    this.shutdownHooks = [];
    const level = this.config.logLevel;
    const logOptions: ILoggerOptions = {
      level: level,
      label: this.className,
    };
    this.monitorService =
      options.monitorService ||
      MonitorService.createOrGetMonitorService({
        logLevel: this.config.logLevel,
        enabled: true,
      });
    this.initializeMonitorService();
    this.logger = LoggerProvider.getOrCreate(logOptions, this.monitorService);

    this.logger.info("Initializing Gateway Coordinator");
    this.instanceId = uuidv4();

    if (this.config.localRepository) {
      this.localRepository = new LocalLogRepository(
        this.config.localRepository,
      );
    } else {
      this.logger.info("Local repository is not defined");
      this.localRepository = new LocalLogRepository(knexLocalInstance.default);
    }

    if (this.config.remoteRepository) {
      this.remoteRepository = new RemoteLogRepository(
        this.config.remoteRepository,
      );
    } else {
      this.logger.info("Remote repository is not defined");
    }

    if (this.config.keyPair === undefined) {
      throw new Error("Key pair is undefined");
    }

    this._pubKey = bufArray2HexStr(this.config.keyPair.publicKey);

    this.logger.info(`Gateway's public key: ${this._pubKey}`);

    const signerOptions: IJsObjectSignerOptions = {
      privateKey: bufArray2HexStr(this.config.keyPair.privateKey),
      logLevel: this.config.logLevel,
    };
    this.signer = new JsObjectSigner(signerOptions);

    if (!this.signer) {
      throw new Error("Signer is not defined");
    }

    if (!this.config.gid) {
      throw new Error("GatewayIdentity is not defined");
    }

    this.claimFormat = getEnumValueByKey(
      ClaimFormat,
      options.claimFormat || "",
    );

    if (
      this.claimFormat === undefined ||
      this.claimFormat === ClaimFormat.UNSPECIFIED
    )
      this.claimFormat = ClaimFormat.DEFAULT;

    this.logger.info(
      `Gateway's claim format: ${getEnumKeyByValue(ClaimFormat, this.claimFormat)}`,
    );

    this.connectedDLTs = this.config.gid.connectedDLTs || [];

    this.OAS = OAS;

    this.initialSpanContext = this.monitorService.startSpan(
      fnTag + "#startup()",
    );

    context.with(this.initialSpanContext.context, () => {
      try {
        if (this.config.gid) {
          const gatewayOrchestratorOptions: IGatewayOrchestratorOptions = {
            logLevel: this.config.logLevel,
            localGateway: this.config.gid,
            counterPartyGateways: this.config.counterPartyGateways,
            signer: this.signer,
            enableCrashRecovery: this.config.enableCrashRecovery,
            monitorService: this.monitorService,
          };
          this.logger.info(
            "Initializing gateway connection manager with seed gateways",
          );
          this.gatewayOrchestrator = new GatewayOrchestrator(
            gatewayOrchestratorOptions,
          );
        } else {
          throw new Error("GatewayIdentity is not defined");
        }

        const SATPCCManagerOptions: ISATPCrossChainManagerOptions = {
          orquestrator: this.gatewayOrchestrator,
          ontologyOptions: {
            ontologiesPath: this.config.ontologyPath,
          },
          logLevel: this.config.logLevel,
          monitorService: this.monitorService,
        };

        this.SATPCCManager = new SATPCrossChainManager(SATPCCManagerOptions);

        this.extensionsManager = new ExtensionsManager({
          logLevel: this.config.logLevel,
          extensionsConfig: this.config.extensions || [],
        });

        if (!this.SATPCCManager) {
          throw new Error("SATPCCManager is not defined");
        }

        if (!this.localRepository) {
          throw new Error("Local repository is not defined");
        }
        const dispatcherOps: BLODispatcherOptions = {
          logger: this.logger,
          logLevel: this.config.logLevel,
          instanceId: this.config.gid.id,
          orchestrator: this.gatewayOrchestrator,
          signer: this.signer,
          ccManager: this.SATPCCManager,
          pubKey: this.pubKey,
          localRepository: this.localRepository,
          remoteRepository: this.remoteRepository,
          claimFormat: this.claimFormat,
          monitorService: this.monitorService,
        };

        if (!this.config.gid || !dispatcherOps.instanceId) {
          throw new Error("Invalid configuration");
        }

        this.BLODispatcher = new BLODispatcher(dispatcherOps);

        if (this.config.enableCrashRecovery) {
          const crashOptions: ICrashRecoveryManagerOptions = {
            instanceId: this.instanceId,
            logLevel: this.config.logLevel,
            ccManager: this.SATPCCManager,
            orchestrator: this.gatewayOrchestrator,
            localRepository: this.localRepository,
            remoteRepository: this.remoteRepository,
            signer: this.signer,
            monitorService: this.monitorService,
          };
          this.crashManager = new CrashManager(crashOptions);
          this.logger.info("CrashManager has been initialized.");
        } else {
          this.logger.info("CrashManager is disabled!");
        }
      } catch (err) {
        this.initialSpanContext.span.setStatus({
          code: SpanStatusCode.ERROR,
          message: String(err),
        });
        this.initialSpanContext.span.recordException(err);
        throw err;
      } finally {
        this.initialSpanContext.span.end();
      }
    });
  }

  /* ICactus Plugin methods */
  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return "@hyperledger/cactus-plugin-satp-hermes";
  }

  public async onPluginInit(): Promise<undefined> {
    const fnTag = `${this.className}#onPluginInit()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        this.logger.trace(`Entering ${fnTag}`);
        await Promise.all([this.startup()]);
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

  /* IPluginWebService methods */
  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const fnTag = `${this.className}#registerWebServices()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        const webServices = await this.getOrCreateWebServices();
        for (const ws of webServices) {
          this.logger.debug(`Registering service ${ws.getPath()}`);
          ws.registerExpress(app);
        }
        return webServices;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    const fnTag = `${this.className}#getOrCreateWebServices()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.logger.trace(`Entering ${fnTag}`);
        if (!this.BLODispatcher) {
          throw new BLODispatcherErraneousError(fnTag);
        }
        return await this.BLODispatcher?.getOrCreateWebServices();
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  /* Getters */
  public get BLODispatcherInstance(): BLODispatcher | undefined {
    return this.BLODispatcher;
  }

  public get SignerInstance(): JsObjectSigner {
    return this.signer;
  }

  public get ConnectedDLTs(): NetworkId[] {
    return this.connectedDLTs;
  }
  public get gatewaySigner(): JsObjectSigner {
    return this.signer;
  }

  public get pubKey(): string {
    return this._pubKey;
  }

  public getOpenApiSpec(): unknown {
    return undefined; //this.OAS;
    /*
    This needs to be fixed. api-server installs some validation middleware using this
    and it was breaking the integration of the plugin with the api-server.
      Error: 404 not found - on all api requests when the middleware is installed.
    */
  }

  public get Identity(): GatewayIdentity {
    const fnTag = `${this.className}#getIdentity()`;
    this.logger.trace(`Entering ${fnTag}`);
    if (!this.config.gid) {
      throw new Error("GatewayIdentity is not defined");
    }
    return this.config.gid;
  }

  /* Gateway configuration helpers */
  static ProcessGatewayCoordinatorConfig(
    pluginOptions: SATPGatewayConfig,
  ): SATPGatewayConfig {
    if (!pluginOptions.monitorService) {
      pluginOptions.monitorService = MonitorService.createOrGetMonitorService({
        logLevel: pluginOptions.logLevel || "INFO",
        enabled: true,
      });
    }
    if (!pluginOptions.keyPair) {
      pluginOptions.keyPair = Secp256k1Keys.generateKeyPairsBuffer();
    }

    const id = uuidv4();
    if (!pluginOptions.gid) {
      pluginOptions.gid = {
        id: id,
        pubKey: bufArray2HexStr(pluginOptions.keyPair.publicKey),
        name: id,
        version: [
          {
            Core: SATP_CORE_VERSION,
            Architecture: SATP_ARCHITECTURE_VERSION,
            Crash: SATP_CRASH_VERSION,
          },
        ],
        connectedDLTs: [],
        proofID: "mockProofID1",
        gatewayServerPort: DEFAULT_PORT_GATEWAY_SERVER,
        gatewayClientPort: DEFAULT_PORT_GATEWAY_CLIENT,
        address: "http://localhost",
      };
    } else {
      if (!pluginOptions.gid.id) {
        pluginOptions.gid.id = id;
      }

      if (!pluginOptions.gid.name) {
        pluginOptions.gid.name = id;
      }

      if (!pluginOptions.gid.pubKey) {
        pluginOptions.gid.pubKey = bufArray2HexStr(
          pluginOptions.keyPair.publicKey,
        );
      }

      if (!pluginOptions.gid.version) {
        pluginOptions.gid.version = [
          {
            Core: SATP_CORE_VERSION,
            Architecture: SATP_ARCHITECTURE_VERSION,
            Crash: SATP_CRASH_VERSION,
          },
        ];
      }

      if (!pluginOptions.gid.connectedDLTs) {
        pluginOptions.gid.connectedDLTs = [];
      }

      if (!pluginOptions.gid.proofID) {
        pluginOptions.gid.proofID = "mockProofID1";
      }

      if (!pluginOptions.gid.gatewayServerPort) {
        pluginOptions.gid.gatewayServerPort = DEFAULT_PORT_GATEWAY_SERVER;
      }

      if (!pluginOptions.gid.gatewayClientPort) {
        pluginOptions.gid.gatewayClientPort = DEFAULT_PORT_GATEWAY_CLIENT;
      }

      if (!pluginOptions.gid.gatewayOapiPort) {
        pluginOptions.gid.gatewayOapiPort = DEFAULT_PORT_GATEWAY_OAPI;
      }

      if (!pluginOptions.gid.gatewayUIPort) {
        //TODO
      }
    }

    if (!pluginOptions.counterPartyGateways) {
      pluginOptions.counterPartyGateways = [];
    }

    if (!pluginOptions.logLevel) {
      pluginOptions.logLevel = "INFO";
    }

    if (!pluginOptions.environment) {
      pluginOptions.environment = "development";
    }

    if (!pluginOptions.validationOptions) {
      pluginOptions.validationOptions = {};
    }

    if (!pluginOptions.privacyPolicies) {
      pluginOptions.privacyPolicies = [];
    }

    if (!pluginOptions.mergePolicies) {
      pluginOptions.mergePolicies = [];
    }

    if (!pluginOptions.ccConfig) {
      pluginOptions.ccConfig = {
        bridgeConfig: [],
        oracleConfig: [],
      } as ICrossChainMechanismsOptions;
    }

    if (!pluginOptions.enableCrashRecovery) {
      pluginOptions.enableCrashRecovery = false;
    }
    return pluginOptions;
  }

  /**
   * Gateway Startup - Initialize all gateway services and cross-chain mechanisms.
   *
   * @description
   * Comprehensive startup sequence for SATP gateway services independent of Hyperledger Cacti
   * node infrastructure. Initializes database repositories, deploys cross-chain mechanisms,
   * and starts the Gateway Operations Layer (GOL) server for protocol communication.
   *
   * **Startup Sequence:**
   * 1. **Database Repository Creation**: Initialize local and remote persistence layers
   * 2. **Cross-Chain Mechanism Deployment**: Deploy bridge configurations for supported DLTs
   * 3. **GOL Server Startup**: Launch gateway communication server for SATP protocol
   * 4. **Service Registration**: Register web service endpoints for protocol phases
   * 5. **Monitoring Activation**: Initialize telemetry and observability features
   *
   * **Concurrent Initialization:**
   * Database and cross-chain mechanism setup run concurrently for efficient startup,
   * while GOL server initialization waits for completion to ensure all dependencies
   * are ready before accepting SATP protocol messages.
   *
   * **Crash Recovery Integration:**
   * If crash recovery is enabled, startup includes recovery checkpoint validation
   * and potential session restoration from persistent logs following Hermes
   * fault-tolerant design patterns.
   *
   * @returns Promise resolving when all gateway services are fully operational
   *
   * @throws {Error} When database repository initialization fails
   * @throws {Error} When cross-chain mechanism deployment fails
   * @throws {Error} When GOL server startup encounters configuration issues
   * @throws {Error} When monitoring service initialization fails
   *
   * @example
   * Basic gateway startup:
   * ```typescript
   * const gateway = new SATPGateway(config);
   * await gateway.startup();
   * console.log('Gateway ready for SATP protocol operations');
   * ```
   *
   * @example
   * Startup with error handling:
   * ```typescript
   * try {
   *   await gateway.startup();
   *   logger.info('Gateway services started successfully');
   * } catch (error) {
   *   logger.error('Gateway startup failed:', error);
   *   await gateway.shutdown();
   *   throw error;
   * }
   * ```
   *
   * @see {@link createDBRepository} for database initialization
   * @see {@link SATPCrossChainManager.deployCCMechanisms} for bridge deployment
   * @see {@link startupGOLServer} for protocol server initialization
   * @see {@link MonitorService} for observability and tracing
   * @see {@link CrashManager} for crash recovery integration
   *
   * @since 2.0.0
   */
  public async startup(): Promise<void> {
    const fnTag = `${this.className}#startup()`;
    this.logger.trace(`Entering ${fnTag}`);

    await context.with(this.initialSpanContext.context, async () => {
      try {
        await Promise.all([
          this.createDBRepository(),
          this.SATPCCManager?.deployCCMechanisms(this.options.ccConfig!),
        ]);

        // start everything before starting the GOL server
        await this.startupGOLServer();
        this.initialSpanContext.span.setStatus({ code: SpanStatusCode.OK });
      } catch (err) {
        this.initialSpanContext.span.setStatus({
          code: SpanStatusCode.ERROR,
          message: String(err),
        });
        this.initialSpanContext.span.recordException(err);
        throw err;
      } finally {
        this.initialSpanContext.span.end();
      }
    });
  }

  public async getOrCreateHttpServer(): Promise<ApiServer> {
    const fnTag = `${this.className}#getOrCreateHttpServer()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);

    return context.with(ctx, async () => {
      try {
        this.logger.trace(`Entering ${fnTag}`);

        if (this.OApiServer) {
          this.logger.info("Returning existing OApiServer instance.");
          return this.OApiServer;
        }

        this.logger.info("Loading all gateway extensions (Cacti Plugins)...");
        const extensions =
          this.extensionsManager?.getExtensions().values() || [];

        const pluginRegistry = new PluginRegistry({
          plugins: [this, ...extensions],
        });

        if (!this.config.gid) {
          throw new Error("GatewayIdentity is not defined");
        }

        if (!this.config.gid.gatewayOapiPort) {
          throw new Error("Gateway OAPI port is not defined");
        }

        const address =
          this.options.gid?.address?.includes("localhost") ||
          this.options.gid?.address?.includes("127.0.0.1")
            ? "localhost"
            : "0.0.0.0";

        const httpApiA = await Servers.startOnPort(
          this.config.gid?.gatewayOapiPort,
          address,
        );

        const addressInfoApi = httpApiA.address() as AddressInfo;

        //TODO FIX THIS WHEN DOING AUTH CONFIG
        const configService = new ConfigService();
        const apiServerOptions = await configService.newExampleConfig();
        apiServerOptions.authorizationProtocol = AuthorizationProtocol.NONE;
        apiServerOptions.configFile = "";
        apiServerOptions.apiCorsDomainCsv = "*";
        apiServerOptions.apiPort = addressInfoApi.port;
        apiServerOptions.apiHost = addressInfoApi.address;
        apiServerOptions.logLevel = this.config.logLevel || "INFO";
        apiServerOptions.apiTlsEnabled = false;
        apiServerOptions.grpcPort = 0;
        apiServerOptions.crpcPort = 0;
        const config =
          await configService.newExampleConfigConvict(apiServerOptions);
        const prop = config.getProperties();
        this.OApiServer = new ApiServer({
          httpServerApi: httpApiA,
          config: prop,
          pluginRegistry: pluginRegistry,
        });
        await this.OApiServer.start();

        return this.OApiServer;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public getAddressOApiAddress(): string {
    const fnTag = `${this.className}#getAddressOApiAddress()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);

    return context.with(ctx, () => {
      try {
        return (this.config.gid?.address +
          ":" +
          this.config.gid?.gatewayOapiPort) as string;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  public async createDBRepository(): Promise<void> {
    const fnTag = `${this.className}#createDBRepository()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);

    await context.with(ctx, async () => {
      try {
        if (!this.config.localRepository) {
          this.logger.info(`${fnTag}: Local repository is not defined`);
          this.logger.info(`${fnTag}: Using default local repository`);
          this.config.localRepository = knexLocalInstance.default;
        }
        this.logger.info(`${fnTag}: Creating migration source`);
        const migrationSource = await createMigrationSource();
        this.logger.info(
          `${fnTag}: Created migration source: ${JSON.stringify(migrationSource)}`,
        );
        const database = knex({
          ...this.config.localRepository,
          migrations: {
            // This removes the problem with the migration source being in the file system
            migrationSource: migrationSource,
          },
        });

        await database.migrate.latest();
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  protected async startupGOLServer(): Promise<void> {
    const fnTag = `${this.className}#startupGOLServer()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);

    await context.with(ctx, () => {
      try {
        this.logger.trace(`Entering ${fnTag}`);
        this.logger.info("Starting GOL server");

        const port =
          this.options.gid?.gatewayServerPort ?? DEFAULT_PORT_GATEWAY_SERVER;

        return new Promise<void>((resolve, reject) => {
          if (!this.GOLServer) {
            this.GOLApplication = express();

            this.gatewayOrchestrator?.addGOLServer(this.GOLApplication);
            this.gatewayOrchestrator?.startServices();

            this.GOLServer = http.createServer(this.GOLApplication);
            const address =
              this.options.gid?.address?.includes("localhost") || // When running a gateway in localhost we don't want to bind it to 0.0.0.0 because if we do it will be accessible from the outside network
              this.options.gid?.address?.includes("127.0.0.1")
                ? "localhost"
                : "0.0.0.0";

            this.GOLServer.listen(port, address, () => {
              this.logger.info(
                `GOL server started and listening on ${address}:${port}`,
              );
              resolve();
            });

            this.GOLServer.on("error", (error) => {
              this.logger.error(`GOL server failed to start: ${error}`);
              reject(error);
            });
            span.setStatus({ code: SpanStatusCode.OK });
          } else {
            this.logger.warn("GOL Server already running.");
            span.setStatus({ code: SpanStatusCode.OK });
            resolve();
          }
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
   * Gateway Connection Methods
   * --------------------------
   * This section encompasses methods dedicated to establishing connections with gateways.
   * It includes functionalities to add gateways based on provided IDs and resolve specific gateway identities.
   * These operations are fundamental for setting up and managing gateway connections within the system.
   */

  // todo connect to gateway - stage 0
  public async resolveAndAddGateways(IDs: string[]): Promise<void> {
    const fnTag = `${this.className}#resolveAndAddGateways()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    context.with(ctx, () => {
      try {
        this.logger.trace(`Entering ${fnTag}`);
        this.logger.info("Connecting to gateway");
        this.gatewayOrchestrator?.resolveAndAddGateways(IDs);
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  // todo connect to gateway - stage 0
  public async addGateways(gateways: GatewayIdentity[]): Promise<void> {
    const fnTag = `${this.className}#addGateways()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    context.with(ctx, () => {
      try {
        this.logger.trace(`Entering ${fnTag}`);
        this.logger.info("Connecting to gateway");
        this.gatewayOrchestrator?.addGateways(gateways);
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
   * Shutdown Methods
   * -----------------
   * This section includes methods responsible for cleanly shutting down the server and its associated services.
   */
  public onShutdown(hook: ShutdownHook): void {
    const fnTag = `${this.className}#onShutdown()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);

    return context.with(ctx, () => {
      try {
        this.logger.trace(`Entering ${fnTag}`);
        this.logger.debug(`Adding shutdown hook: ${hook.name}`);
        this.shutdownHooks.push(hook);
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
   * Gateway Shutdown - Graceful termination with session verification and cleanup.
   *
   * @description
   * Performs graceful shutdown of all gateway services with proper session verification,
   * resource cleanup, and crash recovery checkpoint finalization. Ensures all active
   * SATP sessions are completed or safely persisted before termination to maintain
   * protocol consistency and enable recovery.
   *
   * **Shutdown Sequence:**
   * 1. **Session State Verification**: Verify all active SATP sessions are concluded
   * 2. **OpenAPI Server Shutdown**: Terminate HTTP server and web service endpoints
   * 3. **GOL Server Shutdown**: Stop Gateway Operations Layer communication server
   * 4. **Database Cleanup**: Finalize local and remote repository connections
   * 5. **Scheduled Job Cancellation**: Stop all background monitoring and verification jobs
   * 6. **Shutdown Hook Execution**: Execute registered cleanup hooks in sequence
   * 7. **Resource Cleanup**: Release cryptographic resources and network connections
   *
   * **Session Verification:**
   * Before shutdown, verifies that all SATP sessions have reached terminal states
   * (completed, failed, or rolled back) to prevent inconsistent cross-chain states.
   * Active sessions trigger scheduled verification jobs until completion.
   *
   * **Crash Recovery Integration:**
   * Finalizes crash recovery checkpoints and ensures all persistent logs are
   * flushed to enable proper recovery on restart. Follows Hermes fault-tolerant
   * shutdown procedures for data consistency.
   *
   * @returns Promise resolving when gateway shutdown is complete
   *
   * @throws {Error} When critical shutdown operations fail (logged but not propagated)
   *
   * @example
   * Graceful gateway shutdown:
   * ```typescript
   * // Register cleanup hooks before shutdown
   * gateway.onShutdown({
   *   name: 'custom-cleanup',
   *   hook: async () => {
   *     await customCleanupLogic();
   *   }
   * });
   *
   * await gateway.shutdown();
   * console.log('Gateway shutdown complete');
   * ```
   *
   * @example
   * Shutdown with session monitoring:
   * ```typescript
   * try {
   *   console.log('Initiating gateway shutdown...');
   *   await gateway.shutdown();
   *   console.log('All sessions completed, gateway terminated');
   * } catch (error) {
   *   console.error('Shutdown encountered issues:', error);
   *   // Gateway still shuts down, errors are logged
   * }
   * ```
   *
   * @see {@link verifySessionsState} for session verification process
   * @see {@link onShutdown} for registering cleanup hooks
   * @see {@link shutdownGOLServer} for GOL server termination
   * @see {@link ShutdownHook} for cleanup hook interface
   * @see {@link CrashManager} for crash recovery finalization
   *
   * @since 2.0.0
   */
  public async shutdown(): Promise<void> {
    const fnTag = `${this.className}#shutdown()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);

    await context.with(ctx, async () => {
      try {
        this.logger.debug(`Entering ${fnTag}`);

        this.logger.debug("Shutting down Gateway Application");
        if (this.isShutdown) {
          this.OApiServer = undefined; // without this, this will be a recursive loop, OAPI server will call shutdown on the gateway
        }

        this.isShutdown = true;

        try {
          this.logger.debug("Shutting down BLO");
          await this.verifySessionsState();
        } catch (error) {
          this.logger.error(
            `Error verifying sessions state: ${error}. Proceeding with shutdown.`,
          );
        }

        if (this.OApiServer) {
          this.logger.debug("Shutting down OpenAPI server");
          await this.OApiServer?.shutdown();
          this.logger.debug("OpenAPI server shut down");
          return;
        }

        this.logger.debug("Shutting down Gateway Coordinator");
        await this.shutdownGOLServer();
        this.logger.debug("Running shutdown hooks");
        for (const hook of this.shutdownHooks) {
          this.logger.debug(`Running shutdown hook: ${hook.name}`);
          await hook.hook();
        }

        this.logger.debug("Oracle Manager shut down");
        await this.SATPCCManager?.getOracleManager().shutdown();

        this.logger.info("Shutting down Gateway Connection Manager");
        const connectionsClosed =
          await this.gatewayOrchestrator?.disconnectAll();

        this.logger.info(`Closed ${connectionsClosed} connections`);
        this.logger.info("Gateway Coordinator shut down");

        if (this.monitorService) {
          this.logger.debug("Shutting down monitor service");
          await this.monitorService.shutdown();
        }
        return;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  private async shutdownGOLServer(): Promise<void> {
    const fnTag = `${this.className}#shutdownGOLServer()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);

    await context.with(ctx, async () => {
      try {
        this.logger.debug(`Entering ${fnTag}`);
        if (this.GOLServer) {
          try {
            await this.GOLServer?.closeAllConnections();
            await this.GOLServer?.close();
            this.logger.info("GOL server shut down");
          } catch (error) {
            this.logger.error(
              `Error shutting down the gatewayApplication: ${error}`,
            );
          }
        } else {
          this.logger.warn("Server is not running.");
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

  public async kill(): Promise<void> {
    const fnTag = `${this.className}#kill()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        this.logger.debug(`Entering ${fnTag}`);
        this.logger.debug("Killing Gateway Application");

        this.isShutdown = true;

        if (this.OApiServer) {
          this.logger.debug("Shutting down OpenAPI server");
          await this.OApiServer?.shutdown();
          this.logger.debug("OpenAPI server shut down");
          return;
        }

        if (this.monitorService) {
          this.logger.debug("Shutting down monitor service");
          await this.monitorService.shutdown();
          this.logger.debug("Monitor service shut down");
        }

        this.logger.debug("Shutting down Gateway Coordinator");
        this.logger.debug("Running shutdown hooks");
        for (const hook of this.shutdownHooks) {
          this.logger.debug(`Running shutdown hook: ${hook.name}`);
          await hook.hook();
        }

        this.logger.debug("Oracle Manager shut down");
        await this.SATPCCManager?.getOracleManager().shutdown();

        this.logger.info("Shutting down Gateway Connection Manager");
        const connectionsClosed =
          await this.gatewayOrchestrator?.disconnectAll();

        this.logger.info(`Closed ${connectionsClosed} connections`);
        this.logger.info("Gateway Coordinator shut down");
        return;
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
   * Verify the state of the sessions before shutting down the server.
   * This method is called before the server is shut down and awaits ensure that
   * all sessions are concluded before the server is terminated.
   * After all sessions are concluded, the job is cancelled.
   */
  private async verifySessionsState(): Promise<void> {
    const fnTag = `${this.className}#verifySessionsState()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        this.logger.trace(`Entering ${fnTag}`);
        if (!this.BLODispatcher) {
          throw new BLODispatcherErraneousError(fnTag);
        }
        this.BLODispatcher.setInitiateShutdown();
        const manager = await this.BLODispatcher.getManager();
        await this.startSessionVerificationJob(manager);
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
   * Verifies if the sessions are concluded before shutting down the server.
   * If they aren't starts a scheduled job to verify session states.
   * The job runs every 20 seconds until all sessions are concluded.
   */
  // Define an interface for the manager with the required method

  private cleanupRegistered = false;

  private async startSessionVerificationJob(
    manager: SATPManager,
  ): Promise<void> {
    const fnTag = `${this.className}#startSessionVerificationJob()`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        const cleanup = () => {
          if (this.sessionVerificationJob) {
            this.sessionVerificationJob.cancel();
            this.activeJobs.delete(this.sessionVerificationJob);
            this.sessionVerificationJob = null;
          }

          if (this.cleanupRegistered) {
            process.removeListener("exit", cleanup);
            process.removeListener("SIGINT", cleanup);
            process.removeListener("SIGTERM", cleanup);
            this.cleanupRegistered = false;
          }
        };

        const status = await manager.getSATPSessionState();
        if (status) {
          this.logger.info("All sessions already concluded");
          cleanup();
          return;
        }

        this.logger.info("Initial check: sessions pending");

        this.sessionVerificationJob = schedule.scheduleJob(
          "*/20 * * * * *",
          async () => {
            try {
              const status = await manager.getSATPSessionState();
              if (status) {
                this.logger.info("All sessions concluded");
                cleanup();
              } else {
                this.logger.info("Sessions still pending");
              }
            } catch (error) {
              this.logger.error(`Session check failed: ${error}`);
            }
          },
        );

        if (this.sessionVerificationJob) {
          this.activeJobs.add(this.sessionVerificationJob);
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

  private async initializeMonitorService(): Promise<void> {
    const fnTag = `${this.className}#initializeMonitorService()`;

    try {
      if (!this.monitorService.getSDK()) {
        await this.monitorService.init();
      }
    } catch (err) {
      this.logger.warn(
        `${fnTag} Failed to initialize monitoring service: ${err}`,
      );
      throw new Error(`Failed to initialize monitoring service: ${err}`);
    }
  }
}
