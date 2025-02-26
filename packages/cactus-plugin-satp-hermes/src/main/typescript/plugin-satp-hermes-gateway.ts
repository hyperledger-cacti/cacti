import {
  Secp256k1Keys,
  type Logger,
  Checks,
  LoggerProvider,
  type ILoggerOptions,
  JsObjectSigner,
  type IJsObjectSignerOptions,
} from "@hyperledger/cactus-common";
import { v4 as uuidv4 } from "uuid";

import {
  IsDefined,
  IsNotEmptyObject,
  IsObject,
  IsString,
  Contains,
} from "class-validator";

import {
  SATPGatewayConfig,
  type GatewayIdentity,
  type ShutdownHook,
} from "./core/types";
import {
  GatewayOrchestrator,
  type IGatewayOrchestratorOptions,
} from "./services/gateway/gateway-orchestrator";
export { SATPGatewayConfig };
import express, { type Express } from "express";
import http from "node:http";
import {
  DEFAULT_PORT_GATEWAY_API,
  DEFAULT_PORT_GATEWAY_CLIENT,
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
import swaggerUi, { type JsonObject } from "swagger-ui-express";
import type {
  IPluginWebService,
  ICactusPlugin,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import {
  type ISATPBridgesOptions,
  SATPCrossChainManager,
} from "./cross-chain-mechanisms/satp-cc-manager";
import bodyParser from "body-parser";
import {
  CrashManager,
  type ICrashRecoveryManagerOptions,
} from "./services/gateway/crash-manager";
import cors from "cors";

import * as OAS from "../json/openapi-blo-bundled.json";
import type { NetworkId } from "./services/network-identification/chainid-list";
import { knexLocalInstance } from "./database/knexfile";

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
  private bridgesManager: SATPCrossChainManager;

  private BLOApplication?: Express;
  private BLOServer?: http.Server;
  private BLODispatcher?: BLODispatcher;
  private GOLApplication?: Express;
  private GOLServer?: http.Server;
  private readonly OAS: JsonObject;
  public OAPIServerEnabled = false;

  private signer: JsObjectSigner;
  private _pubKey: string;

  // Flag to create a db repository when not givenx
  public defaultRepository = true;
  public localRepository?: ILocalLogRepository;
  public remoteRepository?: IRemoteLogRepository;
  private readonly shutdownHooks: ShutdownHook[];
  private crashManager?: CrashManager;

  constructor(public readonly options: SATPGatewayConfig) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    this.config = SATPGateway.ProcessGatewayCoordinatorConfig(options);
    this.shutdownHooks = [];
    const level = options.logLevel || "INFO";
    const logOptions: ILoggerOptions = {
      level: level,
      label: this.className,
    };
    this.logger = LoggerProvider.getOrCreate(logOptions);
    this.logger.info("Initializing Gateway Coordinator");

    if (this.config.knexLocalConfig) {
      this.defaultRepository = false;
      this.localRepository = new LocalLogRepository(
        this.config.knexLocalConfig,
      );
    } else {
      this.logger.info("Local repository is not defined");
      this.localRepository = new LocalLogRepository(knexLocalInstance.default);
    }

    if (this.config.knexRemoteConfig) {
      this.remoteRepository = new RemoteLogRepository(
        this.config.knexRemoteConfig,
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
      logLevel: "debug",
    };
    this.signer = new JsObjectSigner(signerOptions);

    if (!this.signer) {
      throw new Error("Signer is not defined");
    }

    if (!this.config.gid) {
      throw new Error("GatewayIdentity is not defined");
    }

    const gatewayOrchestratorOptions: IGatewayOrchestratorOptions = {
      logLevel: this.config.logLevel,
      localGateway: this.config.gid,
      counterPartyGateways: this.config.counterPartyGateways,
      signer: this.signer,
      enableCrashRecovery: this.config.enableCrashRecovery,
    };

    const bridgesManagerOptions: ISATPBridgesOptions = {
      logLevel: this.config.logLevel,
      connectedDLTs: this.config.gid.connectedDLTs,
      networks: options.bridgesConfig ? options.bridgesConfig : [],
    };

    this.bridgesManager = new SATPCrossChainManager(bridgesManagerOptions);

    if (!this.bridgesManager) {
      throw new Error("BridgesManager is not defined");
    }

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

    this.instanceId = uuidv4();
    const dispatcherOps: BLODispatcherOptions = {
      logger: this.logger,
      logLevel: this.config.logLevel,
      instanceId: this.config.gid.id,
      orchestrator: this.gatewayOrchestrator,
      signer: this.signer,
      bridgesManager: this.bridgesManager,
      pubKey: this.pubKey,
      defaultRepository: this.defaultRepository,
      localRepository: this.localRepository,
      remoteRepository: this.remoteRepository,
    };

    this.connectedDLTs = this.config.gid.connectedDLTs;

    if (!this.config.gid || !dispatcherOps.instanceId) {
      throw new Error("Invalid configuration");
    }

    this.BLODispatcher = new BLODispatcher(dispatcherOps);
    this.OAPIServerEnabled = this.config.enableOpenAPI ?? true;

    this.OAS = OAS;

    if (this.config.enableCrashRecovery) {
      const crashOptions: ICrashRecoveryManagerOptions = {
        instanceId: this.instanceId,
        logLevel: this.config.logLevel,
        bridgeConfig: this.bridgesManager,
        orchestrator: this.gatewayOrchestrator,
        defaultRepository: this.defaultRepository,
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
    await Promise.all([this.startupGOLServer()]);
  }

  /* IPluginWebService methods */
  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    for (const ws of webServices) {
      this.logger.debug(`Registering service ${ws.getPath()}`);
      ws.registerExpress(app);
    }
    this.BLOApplication = app;
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    const fnTag = `${this.className}#getOrCreateWebServices()`;
    this.logger.trace(`Entering ${fnTag}`);
    if (!this.BLODispatcher) {
      throw new Error(`Cannot ${fnTag} because BLODispatcher is erroneous`);
    }
    let webServices = await this.BLODispatcher?.getOrCreateWebServices();
    if (this.OAPIServerEnabled) {
      webServices = webServices.concat(
        await this.BLODispatcher?.getOrCreateOAPIWebServices(),
      );
    }
    return webServices;
  }

  /* Getters */
  public get BLODispatcherInstance(): BLODispatcher | undefined {
    return this.BLODispatcher;
  }

  public get BLOServerInstance(): http.Server | undefined {
    return this.BLOServer;
  }

  public get BLOApplicationInstance(): Express | undefined {
    return this.BLOApplication;
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
        gatewayOpenAPIPort: DEFAULT_PORT_GATEWAY_API,
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

      if (!pluginOptions.gid.gatewayOpenAPIPort) {
        pluginOptions.gid.gatewayOpenAPIPort = DEFAULT_PORT_GATEWAY_API;
      }
    }

    if (!pluginOptions.counterPartyGateways) {
      pluginOptions.counterPartyGateways = [];
    }

    if (!pluginOptions.logLevel) {
      pluginOptions.logLevel = "DEBUG";
    }

    if (!pluginOptions.environment) {
      pluginOptions.environment = "development";
    }

    if (!pluginOptions.enableOpenAPI) {
      pluginOptions.enableOpenAPI = true;
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

    if (!pluginOptions.bridgesConfig) {
      pluginOptions.bridgesConfig = [];
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
   * It ensures that both the GatewayServer and BLOServer are initiated concurrently for efficient launch.
   */
  public async startup(): Promise<void> {
    const fnTag = `${this.className}#startup()`;
    this.logger.trace(`Entering ${fnTag}`);

    await Promise.all([this.startupBLOServer(), this.startupGOLServer()]);
  }

  protected async startupBLOServer(): Promise<void> {
    const fnTag = `${this.className}#startupBLOServer()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.info("Starting BOL server");
    const port =
      this.options.gid?.gatewayOpenAPIPort ?? DEFAULT_PORT_GATEWAY_API;

    if (!this.BLOApplication || !this.BLOServer) {
      if (!this.BLODispatcher) {
        throw new Error("BLODispatcher is not defined");
      }
      this.BLOApplication = express();
      this.BLOApplication.use(bodyParser.json({ limit: "250mb" }));
      this.BLOApplication.use(cors());
      try {
        const webServices = await this.BLODispatcher.getOrCreateWebServices();
        for (const service of webServices) {
          this.logger.debug(`Registering web service: ${service.getPath()}`);
          await service.registerExpress(this.BLOApplication);
        }
      } catch (error) {
        throw new Error(`Failed to register web services: ${error}`);
      }

      if (this.OAPIServerEnabled) {
        this.logger.debug("OpenAPI server is enabled");

        try {
          const webServices =
            await this.BLODispatcher.getOrCreateOAPIWebServices();
          for (const service of webServices) {
            this.logger.debug(
              `Registering OpenAPI web service: ${service.getPath()}`,
            );
            await service.registerExpress(this.BLOApplication);
          }
          this.BLOApplication.use(
            "/api-docs",
            swaggerUi.serve as express.RequestHandler[],
            swaggerUi.setup(this.OAS) as express.RequestHandler,
          );
        } catch (error) {
          throw new Error(`Error to register OpenAPI web services: ${error}`);
        }
      }

      this.BLOServer = http.createServer(this.BLOApplication);

      await new Promise<void>((resolve, reject) => {
        if (!this.BLOServer) {
          throw new Error("BLOServer is not defined");
        }
        this.BLOServer.listen(port, () => {
          this.logger.info(`BLO server started and listening on port ${port}`);
          resolve();
        });
        this.BLOServer.on("error", (error) => {
          this.logger.error(`BLO server failed to start: ${error}`);
          reject(error);
        });
      });
    } else {
      this.logger.warn("BLO Server already running.");
    }
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

        this.GOLServer.listen(port, () => {
          this.logger.info(`GOL server started and listening on port ${port}`);
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
    const fnTag = `${this.className}#getGatewaySeeds()`;
    this.logger.debug(`Entering ${fnTag}`);

    this.logger.info("Shutting down Node server - BOL");
    await this.shutdownBLOServer();
    await this.shutdownGOLServer();
    this.logger.debug("Running shutdown hooks");
    for (const hook of this.shutdownHooks) {
      this.logger.debug(`Running shutdown hook: ${hook.name}`);
      await hook.hook();
    }

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

  private async shutdownBLOServer(): Promise<void> {
    const fnTag = `${this.className}#shutdownBLOServer()`;
    this.logger.debug(`Entering ${fnTag}`);
    if (this.BLOServer) {
      try {
        await this.BLOServer.closeAllConnections();
        await this.BLOServer.close();
        this.BLOServer = undefined;
        this.logger.info("Server shut down");
      } catch (error) {
        this.logger.error(
          `Error shutting down the gatewayApplication: ${error}`,
        );
      }
    } else {
      this.logger.warn("Server is not running.");
    }
  }

  private async shutdownGOLServer(): Promise<void> {
    const fnTag = `${this.className}#shutdownBLOServer()`;
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
}
