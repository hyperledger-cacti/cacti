import {
  Secp256k1Keys,
  type Logger,
  Checks,
  LoggerProvider,
  type ILoggerOptions,
  JsObjectSigner,
  type IJsObjectSignerOptions,
  LogLevelDesc,
  Servers,
} from "@hyperledger/cactus-common";
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
import { bufArray2HexStr } from "./gateway-utils";
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

export interface SATPGatewayConfig extends ICactusPluginOptions {
  gid?: GatewayIdentity;
  counterPartyGateways?: GatewayIdentity[];
  keyPair?: ISignerKeyPair;
  environment?: "development" | "production";
  validationOptions?: ValidatorOptions;
  privacyPolicies?: IPrivacyPolicyValue[];
  mergePolicies?: IMergePolicyValue[];
  ccConfig?: ICrossChainMechanismsOptions;
  localRepository?: Knex.Config;
  remoteRepository?: Knex.Config;
  enableCrashRecovery?: boolean;
  claimFormat?: string;
  ontologyPath?: string;
  pluginRegistry: PluginRegistry;
  logLevel?: LogLevelDesc;
}

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
  private gatewayOrchestrator: GatewayOrchestrator;
  private SATPCCManager: SATPCrossChainManager;

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
  private sessionVerificationJob: Job | null = null;
  private activeJobs: Set<schedule.Job> = new Set();

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
    this.logger = LoggerProvider.getOrCreate(logOptions);
    this.logger.info("Initializing Gateway Coordinator");

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

    const gatewayOrchestratorOptions: IGatewayOrchestratorOptions = {
      logLevel: this.config.logLevel,
      localGateway: this.config.gid,
      counterPartyGateways: this.config.counterPartyGateways,
      signer: this.signer,
      enableCrashRecovery: this.config.enableCrashRecovery,
    };

    if (this.config.gid) {
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
    };

    this.SATPCCManager = new SATPCrossChainManager(SATPCCManagerOptions);

    if (!this.SATPCCManager) {
      throw new Error("SATPCCManager is not defined");
    }

    this.instanceId = uuidv4();
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
    };

    this.connectedDLTs = this.config.gid.connectedDLTs || [];

    if (!this.config.gid || !dispatcherOps.instanceId) {
      throw new Error("Invalid configuration");
    }

    this.BLODispatcher = new BLODispatcher(dispatcherOps);

    this.OAS = OAS;

    if (this.config.enableCrashRecovery) {
      const crashOptions: ICrashRecoveryManagerOptions = {
        instanceId: this.instanceId,
        logLevel: this.config.logLevel,
        ccManager: this.SATPCCManager,
        orchestrator: this.gatewayOrchestrator,
        localRepository: this.localRepository,
        remoteRepository: this.remoteRepository,
        signer: this.signer,
      };
      this.crashManager = new CrashManager(crashOptions);
      this.logger.info("CrashManager has been initialized.");
    } else {
      this.logger.info("CrashManager is disabled!");
    }
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
    this.logger.trace(`Entering ${fnTag}`);
    await Promise.all([this.startup()]);
  }

  /* IPluginWebService methods */
  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    for (const ws of webServices) {
      this.logger.debug(`Registering service ${ws.getPath()}`);
      ws.registerExpress(app);
    }
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    const fnTag = `${this.className}#getOrCreateWebServices()`;
    this.logger.trace(`Entering ${fnTag}`);
    if (!this.BLODispatcher) {
      throw new BLODispatcherErraneousError(fnTag);
    }
    return await this.BLODispatcher?.getOrCreateWebServices();
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
      } as ICrossChainMechanismsOptions;
    }

    if (!pluginOptions.enableCrashRecovery) {
      pluginOptions.enableCrashRecovery = false;
    }

    return pluginOptions;
  }

  /**
   * Startup Methods
   * ----------------
   * This section includes methods responsible for starting up the server and its associated services independently of the existence of a Hyperledger Cacti Node.
   * It ensures that both the GatewayServer and Bridges are initiated concurrently for efficient launch.
   */
  public async startup(): Promise<void> {
    const fnTag = `${this.className}#startup()`;
    this.logger.trace(`Entering ${fnTag}`);

    await Promise.all([
      this.createDBRepository(),
      this.SATPCCManager.deployCCMechanisms(this.options.ccConfig!),
      this.startupGOLServer(),
    ]);
  }

  public async getOrCreateHttpServer(): Promise<ApiServer> {
    const fnTag = `${this.className}#getOrCreateHttpServer()`;
    this.logger.trace(`Entering ${fnTag}`);

    if (this.OApiServer) {
      this.logger.info("Returning existing OApiServer instance.");
      return this.OApiServer;
    }

    const pluginRegistry = new PluginRegistry({ plugins: [this] });

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
  }

  public getAddressOApiAddress(): string {
    return (this.config.gid?.address +
      ":" +
      this.config.gid?.gatewayOapiPort) as string;
  }

  public async createDBRepository(): Promise<void> {
    const fnTag = `${this.className}#createDBRepository()`;

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
  }

  protected async startupGOLServer(): Promise<void> {
    const fnTag = `${this.className}#startupGOLServer()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.info("Starting GOL server");

    const port =
      this.options.gid?.gatewayServerPort ?? DEFAULT_PORT_GATEWAY_SERVER;

    return new Promise((resolve, reject) => {
      if (!this.GOLServer) {
        this.GOLApplication = express();

        this.gatewayOrchestrator.addGOLServer(this.GOLApplication);
        this.gatewayOrchestrator.startServices();

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
      } else {
        this.logger.warn("GOL Server already running.");
        resolve();
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
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.info("Connecting to gateway");
    this.gatewayOrchestrator.resolveAndAddGateways(IDs);
  }

  // todo connect to gateway - stage 0
  public async addGateways(gateways: GatewayIdentity[]): Promise<void> {
    const fnTag = `${this.className}#addGateways()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.info("Connecting to gateway");
    this.gatewayOrchestrator.addGateways(gateways);
  }

  /**
   * Shutdown Methods
   * -----------------
   * This section includes methods responsible for cleanly shutting down the server and its associated services.
   */
  public onShutdown(hook: ShutdownHook): void {
    const fnTag = `${this.className}#onShutdown()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.debug(`Adding shutdown hook: ${hook.name}`);
    this.shutdownHooks.push(hook);
  }

  public async shutdown(): Promise<void> {
    const fnTag = `${this.className}#shutdown()`;
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

    const satpManager = await this.BLODispatcher?.getManager();

    const monitorService = satpManager?.getMonitorService() || undefined;
    if (monitorService) {
      this.logger.debug("Shutting down monitor service");
      await monitorService.shutdown();
      this.logger.debug("Monitor service shut down");
    }

    this.logger.debug("Shutting down Gateway Coordinator");
    await this.shutdownGOLServer();
    this.logger.debug("Running shutdown hooks");
    for (const hook of this.shutdownHooks) {
      this.logger.debug(`Running shutdown hook: ${hook.name}`);
      await hook.hook();
    }

    this.logger.debug("Oracle Manager shut down");
    this.SATPCCManager.getOracleManager().shutdown();

    this.logger.info("Shutting down Gateway Connection Manager");
    const connectionsClosed = await this.gatewayOrchestrator.disconnectAll();

    this.logger.info(`Closed ${connectionsClosed} connections`);
    this.logger.info("Gateway Coordinator shut down");

    if (this.localRepository) {
      this.logger.debug("Destroying local repository...");
      await this.localRepository.destroy();
      this.logger.info("Local repository destroyed");
    }

    if (this.remoteRepository) {
      this.logger.debug("Destroying remote repository...");
      await this.remoteRepository.destroy();
      this.logger.info("Remote repository destroyed");
    }
    return;
  }

  private async shutdownGOLServer(): Promise<void> {
    const fnTag = `${this.className}#shutdownGOLServer()`;
    this.logger.debug(`Entering ${fnTag}`);
    if (this.GOLServer) {
      try {
        await this.GOLServer?.close();
        await this.GOLServer?.closeAllConnections();
        this.logger.info("GOL server shut down");
      } catch (error) {
        this.logger.error(
          `Error shutting down the gatewayApplication: ${error}`,
        );
      }
    } else {
      this.logger.warn("Server is not running.");
    }
  }

  public async kill(): Promise<void> {
    const fnTag = `${this.className}#kill()`;
    this.logger.debug(`Entering ${fnTag}`);
    this.logger.debug("Killing Gateway Application");

    this.isShutdown = true;

    if (this.OApiServer) {
      this.logger.debug("Shutting down OpenAPI server");
      await this.OApiServer?.shutdown();
      this.logger.debug("OpenAPI server shut down");
      return;
    }

    const satpManager = await this.BLODispatcher?.getManager();

    const monitorService = satpManager?.getMonitorService() || undefined;
    if (monitorService) {
      this.logger.debug("Shutting down monitor service");
      await monitorService.shutdown();
      this.logger.debug("Monitor service shut down");
    }

    this.logger.debug("Shutting down Gateway Coordinator");
    this.logger.debug("Running shutdown hooks");
    for (const hook of this.shutdownHooks) {
      this.logger.debug(`Running shutdown hook: ${hook.name}`);
      await hook.hook();
    }

    this.logger.debug("Oracle Manager shut down");
    this.SATPCCManager.getOracleManager().shutdown();

    this.logger.info("Shutting down Gateway Connection Manager");
    const connectionsClosed = await this.gatewayOrchestrator.disconnectAll();

    this.logger.info(`Closed ${connectionsClosed} connections`);
    this.logger.info("Gateway Coordinator shut down");

    if (this.localRepository) {
      this.logger.debug("Destroying local repository...");
      await this.localRepository.destroy();
      this.logger.info("Local repository destroyed");
    }

    if (this.remoteRepository) {
      this.logger.debug("Destroying remote repository...");
      await this.remoteRepository.destroy();
      this.logger.info("Remote repository destroyed");
    }
    return;
  }

  /**
   * Verify the state of the sessions before shutting down the server.
   * This method is called before the server is shut down and awaits ensure that
   * all sessions are concluded before the server is terminated.
   * After all sessions are concluded, the job is cancelled.
   */
  private async verifySessionsState(): Promise<void> {
    const fnTag = `${this.className}#verifySessionsState()`;
    this.logger.trace(`Entering ${fnTag}`);
    if (!this.BLODispatcher) {
      throw new BLODispatcherErraneousError(fnTag);
    }
    this.BLODispatcher.setInitiateShutdown();
    const manager = await this.BLODispatcher.getManager();

    await this.startSessionVerificationJob(manager);
  }

  /**
   * Verifies if the sessions are concluded before shutting down the server.
   * If they aren't starts a scheduled job to verify session states.
   * The job runs every 20 seconds until all sessions are concluded.
   */
  private async startSessionVerificationJob(manager: any): Promise<void> {
    return new Promise<void>((resolve) => {
      const cleanup = () => {
        if (this.sessionVerificationJob) {
          this.sessionVerificationJob.cancel();
          this.activeJobs.delete(this.sessionVerificationJob);
          this.sessionVerificationJob = null;
        }
      };

      const initialCheck = async () => {
        try {
          const status = await manager.getSATPSessionState();
          if (status) {
            this.logger.info("All sessions already concluded");
            cleanup();
            resolve();
            return false;
          }
          this.logger.info("Initial check: sessions pending");
        } catch (error) {
          this.logger.error(`Session check failed: ${error}`);
        }
        return true;
      };

      initialCheck().then((needsRecurring) => {
        if (needsRecurring) {
          this.sessionVerificationJob = schedule.scheduleJob(
            "*/20 * * * * *",
            async () => {
              try {
                const status = await manager.getSATPSessionState();
                if (status) {
                  this.logger.info("All sessions concluded");
                  cleanup();
                  resolve();
                } else {
                  this.logger.info("Sessions still pending");
                }
              } catch (error) {
                this.logger.error(`Session check failed: ${error}`);
              }
            },
          );
          this.activeJobs.add(this.sessionVerificationJob);
        }
      });
    });
  }
}
