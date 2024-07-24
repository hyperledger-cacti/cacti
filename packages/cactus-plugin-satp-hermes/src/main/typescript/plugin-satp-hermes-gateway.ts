import {
  Secp256k1Keys,
  Logger,
  Checks,
  LoggerProvider,
  ILoggerOptions,
  JsObjectSigner,
  IJsObjectSignerOptions,
} from "@hyperledger/cactus-common";
import { v4 as uuidv4 } from "uuid";

import {
  IsDefined,
  IsNotEmptyObject,
  IsObject,
  IsString,
  Contains,
} from "class-validator";

import path from "path";

import {
  SATPGatewayConfig,
  GatewayIdentity,
  ShutdownHook,
  SupportedChain,
} from "./core/types";
import {
  GatewayOrchestrator,
  IGatewayOrchestratorOptions,
} from "./gol/gateway-orchestrator";
export { SATPGatewayConfig };
import express, { Express } from "express";
import http from "http";
import {
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_SERVER,
} from "./core/constants";
import { bufArray2HexStr } from "./gateway-utils";
import {
  ILocalLogRepository,
  IRemoteLogRepository,
} from "./repository/interfaces/repository";
import { BLODispatcher, BLODispatcherOptions } from "./blo/dispatcher";
import fs from "fs";
import swaggerUi, { JsonObject } from "swagger-ui-express";
import {
  IPluginWebService,
  ICactusPlugin,
  IWebServiceEndpoint,
} from "@hyperledger/cactus-core-api";
import {
  ISATPBridgesOptions,
  SATPBridgesManager,
} from "./gol/satp-bridges-manager";

export class SATPGateway implements IPluginWebService, ICactusPlugin {
  // todo more checks; example port from config is between 3000 and 9000
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
  private supportedDltIDs: SupportedChain[];
  private gatewayOrchestrator: GatewayOrchestrator;
  private bridgesManager: SATPBridgesManager;

  private BLOApplication?: Express;
  private BLOServer?: http.Server;
  private BLODispatcher?: BLODispatcher;
  private readonly OAS: JsonObject;
  public OAPIServerEnabled: boolean = false;

  private signer: JsObjectSigner;
  private _pubKey: string;

  public localRepository?: ILocalLogRepository;
  public remoteRepository?: IRemoteLogRepository;
  private readonly shutdownHooks: ShutdownHook[];

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

    if (this.config.keyPair == undefined) {
      throw new Error("Key pair is undefined");
    }

    this._pubKey = bufArray2HexStr(this.config.keyPair.publicKey);

    this.logger.info(`Gateway's public key: ${this._pubKey}`);

    const signerOptions: IJsObjectSignerOptions = {
      privateKey: bufArray2HexStr(this.config.keyPair.privateKey),
      logLevel: "debug",
    };
    this.signer = new JsObjectSigner(signerOptions);

    const gatewayOrchestratorOptions: IGatewayOrchestratorOptions = {
      logLevel: this.config.logLevel,
      localGateway: this.config.gid!,
      counterPartyGateways: this.config.counterPartyGateways,
      signer: this.signer!,
    };

    const bridgesManagerOptions: ISATPBridgesOptions = {
      logLevel: this.config.logLevel,
      supportedDLTs: this.config.gid!.supportedDLTs,
      // networks: [], //todo add networks
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

    this.bridgesManager = new SATPBridgesManager(bridgesManagerOptions);

    if (!this.bridgesManager) {
      throw new Error("BridgesManager is not defined");
    }

    this.instanceId = uuidv4();
    const dispatcherOps: BLODispatcherOptions = {
      logger: this.logger,
      logLevel: this.config.logLevel,
      instanceId: this.config.gid!.id,
      orchestrator: this.gatewayOrchestrator,
      signer: this.signer,
      bridgesManager: this.bridgesManager,
    };

    this.supportedDltIDs = this.config.gid!.supportedDLTs;

    if (!this.config.gid || !dispatcherOps.instanceId) {
      throw new Error("Invalid configuration");
    }

    this.BLODispatcher = new BLODispatcher(dispatcherOps);
    this.OAPIServerEnabled = this.config.enableOpenAPI ?? true;

    const specPath = path.join(__dirname, "../json/openapi-blo-bundled.json");
    this.OAS = JSON.parse(fs.readFileSync(specPath, "utf8"));
    if (!this.OAS) {
      this.logger.warn("Error loading OAS");
    }
  }

  /* ICactus Plugin methods */

  public getInstanceId(): string {
    return this.instanceId;
  }

  public getPackageName(): string {
    return `@hyperledger/cactus-plugin-satp-hermes`;
  }

  public async onPluginInit(): Promise<unknown> {
    const fnTag = `${this.className}#onPluginInit()`;
    this.logger.trace(`Entering ${fnTag}`);
    // resolve gateways on init
    throw new Error("Not implemented");
  }

  /* IPluginWebService methods */
  async registerWebServices(app: Express): Promise<IWebServiceEndpoint[]> {
    const webServices = await this.getOrCreateWebServices();
    webServices.forEach((ws) => {
      this.logger.debug(`Registering service ${ws.getPath()}`);
      ws.registerExpress(app);
    });
    return webServices;
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    const fnTag = `${this.className}#getOrCreateWebServices()`;
    this.logger.trace(`Entering ${fnTag}`);
    if (!this.BLODispatcher) {
      throw new Error(`Cannot ${fnTag} because BLODispatcher is erroneous`);
    }
    return this.BLODispatcher?.getOrCreateWebServices();
  }

  /* Getters */

  public get Signer(): JsObjectSigner {
    return this.signer;
  }

  public getSupportedDltIDs(): string[] {
    return this.supportedDltIDs;
  }

  public get gatewaySigner(): JsObjectSigner {
    return this.signer;
  }

  public get pubKey(): string {
    return this._pubKey;
  }

  public getOpenApiSpec(): unknown {
    return this.OAS;
  }

  // TODO: keep getter; add an admin endpoint to get identity of connected gateway to BLO
  public get Identity(): GatewayIdentity {
    const fnTag = `${this.className}#getIdentity()`;
    this.logger.trace(`Entering ${fnTag}`);
    if (!this.config.gid) {
      throw new Error("GatewayIdentity is not defined");
    }
    return this.config.gid!;
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
        name: id,
        version: [
          {
            Core: "v02",
            Architecture: "v02",
            Crash: "v02",
          },
        ],
        supportedDLTs: [SupportedChain.FABRIC, SupportedChain.BESU],
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

      if (!pluginOptions.gid.version) {
        pluginOptions.gid.version = [
          {
            Core: "v02",
            Architecture: "v02",
            Crash: "v02",
          },
        ];
      }

      if (!pluginOptions.gid.supportedDLTs) {
        pluginOptions.gid.supportedDLTs = [
          SupportedChain.FABRIC,
          SupportedChain.BESU,
        ];
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
        // do nothing
      }
    }
    return pluginOptions;
  }

  /**
   * Startup Methods
   * ----------------
   * This section includes methods responsible for starting up the server and its associated services independently of the existance of a Hyperledger Cacti Node.
   * It ensures that both the GatewayServer and BLOServer are initiated concurrently for efficient launch.
   */
  public async startup(): Promise<void> {
    const fnTag = `${this.className}#startup()`;
    this.logger.trace(`Entering ${fnTag}`);

    await Promise.all([this.startupBLOServer(), this.setupOpenAPIServer()]);
  }

  protected async startupBLOServer(): Promise<void> {
    // starts BOL
    const fnTag = `${this.className}#startupBLOServer()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.info("Starting BOL server");
    const port =
      this.options.gid?.gatewayClientPort ?? DEFAULT_PORT_GATEWAY_CLIENT;

    return new Promise(async (resolve, reject) => {
      if (!this.BLOApplication || !this.BLOServer) {
        if (!this.BLODispatcher) {
          throw new Error("BLODispatcher is not defined");
        }
        this.BLOApplication = express();
        try {
          const webServices = await this.BLODispatcher.getOrCreateWebServices();
          for (const service of webServices) {
            this.logger.debug(`Registering web service: ${service.getPath()}`);
            await service.registerExpress(this.BLOApplication);
          }
        } catch (error) {
          throw new Error(`Failed to register web services: ${error}`);
        }

        this.BLOServer = http.createServer(this.BLOApplication);

        this.BLOServer.listen(port, () => {
          this.logger.info(`BOL server started and listening on port ${port}`);
          resolve();
        });

        this.BLOServer.on("error", (error) => {
          this.logger.error(`BOL server failed to start: ${error}`);
          reject(error);
        });
      } else {
        this.logger.warn("BOL Server already running.");
        resolve();
      }
    });
  }

  public setupOpenAPIServer(): void {
    if (!this.OAPIServerEnabled) {
      this.logger.debug("OpenAPI server is disabled");
      return;
    }

    if (!this.BLOApplication) {
      this.logger.debug(
        "BLOApplication is not defined. Not initializing OpenAPI server",
      );
      return;
    }

    if (!this.OAS) {
      throw new Error("OpenAPI spec is not set");
    }
    // Type assertion here
    this.BLOApplication.use(
      "/api-docs",
      swaggerUi.serve as express.RequestHandler[],
      swaggerUi.setup(this.OAS) as express.RequestHandler,
    );
  }
  /**
   * Gateway Connection Methods
   * --------------------------
   * This section encompasses methods dedicated to establishing connections with gateways.
   * It includes functionalities to add gateways based on provided IDs and resolve specific gateway identities.
   * These operations are fundamental for setting up and managing gateway connections within the system.
   */

  // TODO: addGateways as an admin endpoint, simply calls orchestrator
  public async resolveAndAddGateways(IDs: string[]): Promise<void> {
    const fnTag = `${this.className}#resolveAndAddGateways()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.info("Connecting to gateway");
    this.gatewayOrchestrator.resolveAndAddGateways(IDs);

    // todo connect to gateway
  }

  public async addGateways(gateways: GatewayIdentity[]): Promise<void> {
    const fnTag = `${this.className}#addGateways()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.info("Connecting to gateway");
    this.gatewayOrchestrator.addGateways(gateways);

    // todo connect to gateway
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

    this.logger.debug("Running shutdown hooks");
    for (const hook of this.shutdownHooks) {
      this.logger.debug(`Running shutdown hook: ${hook.name}`);
      await hook.hook();
    }

    this.logger.info("Shutting down Gateway Connection Manager");
    const connectionsClosed = await this.gatewayOrchestrator.disconnectAll();

    this.logger.info(`Closed ${connectionsClosed} connections`);
    this.logger.info("Gateway Coordinator shut down");
    return;
  }

  private async shutdownBLOServer(): Promise<void> {
    const fnTag = `${this.className}#shutdownBLOServer()`;
    this.logger.debug(`Entering ${fnTag}`);
    if (this.BLOServer) {
      try {
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
}
