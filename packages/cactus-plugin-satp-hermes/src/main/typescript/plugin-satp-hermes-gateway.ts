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
  SupportedGatewayImplementations,
} from "./core/types";
import { GatewayOrchestrator, IGatewayOrchestratorOptions } from "./gol/gateway-orchestrator";
export { SATPGatewayConfig };
import express, { Express } from "express";
import http from "http";
import { configureRoutes } from "./web-services/router";
import {
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_GRPC,
  DEFAULT_PORT_GATEWAY_SERVER,
} from "./core/constants";
import { SessionData } from "./generated/proto/cacti/satp/v02/common/session_pb";
import { expressConnectMiddleware } from "@connectrpc/connect-express";
import { bufArray2HexStr } from "./gateway-utils";
import {
  ILocalLogRepository,
  IRemoteLogRepository,
} from "./repository/interfaces/repository";
import { SATPLedgerConnector } from "./types/blockchain-interaction";
import { BLODispatcher, BLODispatcherOptions } from "./blo/dispatcher";
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import { SATPSession } from "./core/satp-session";

export class SATPGateway {
  // todo more checks; example port from config is between 3000 and 9000
  @IsDefined()
  @IsNotEmptyObject()
  @IsObject()
  private readonly logger: Logger;

  @IsDefined()
  @IsNotEmptyObject()
  @IsObject()
  // todo add decorators that check all fields are defined
  private readonly config: SATPGatewayConfig;

  @IsString()
  @Contains("Gateway")
  public readonly label = "SATPGateway";

  private readonly shutdownHooks: ShutdownHook[];
  private gatewayConnectionManager: GatewayOrchestrator;

  private gatewayApplication?: Express;
  private gatewayServer?: http.Server;
  private BLOApplication?: Express;
  private BLOServer?: http.Server;
  private BLODispatcher?: BLODispatcher;
  public OAPIServerEnabled: boolean = false;

  private objectSigner: JsObjectSigner;

  // Instantiate connectors based on supported implementations
  private supportedDltIDs: SupportedGatewayImplementations[];
  private connectors: SATPLedgerConnector[] = [];

  // TODO!: add logic to manage sessions (parallelization, user input, freeze, unfreeze, rollback, recovery)
  private sessions: Map<string, SATPSession> = new Map();
  private _pubKey: string;

  public localRepository?: ILocalLogRepository;
  public remoteRepository?: IRemoteLogRepository;

  constructor(public readonly options: SATPGatewayConfig) {
    const fnTag = `${this.label}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);
    this.config = SATPGateway.ProcessGatewayCoordinatorConfig(options);
    this.shutdownHooks = [];
    const level = options.logLevel || "INFO";
    const logOptions: ILoggerOptions = {
      level: level,
      label: this.label,
    };
    this.logger = LoggerProvider.getOrCreate(logOptions);
    this.logger.info("Initializing Gateway Coordinator");

    if (this.config.keyPair == undefined) {
      throw new Error("Key pair is undefined");
    }

    this._pubKey = bufArray2HexStr(this.config.keyPair.publicKey);

    this.logger.info(`Gateway's public key: ${this._pubKey}`);

    const objectSignerOptions: IJsObjectSignerOptions = {
      privateKey: bufArray2HexStr(this.config.keyPair.privateKey),
      logLevel: "debug",
    };
    this.objectSigner = new JsObjectSigner(objectSignerOptions);

    const gatewayOrchestratorOptions: IGatewayOrchestratorOptions = {
      logLevel: this.config.logLevel,
      ourGateway: this.config.gid!,
      counterPartyGateways: this.config.counterPartyGateways,
      signer: this.objectSigner!,
    };

    if (this.config.gid) { 
      this.logger.info("Initializing gateway connection manager with seed gateways");
      this.gatewayConnectionManager = new GatewayOrchestrator(gatewayOrchestratorOptions);
    } else {
      throw new Error("GatewayIdentity is not defined");
    }

    const dispatcherOps: BLODispatcherOptions = {
      logger: this.logger,
      logLevel: this.config.logLevel,
      instanceId: this.config.gid!.id,
    };


    this.supportedDltIDs = this.config.gid!.supportedChains;

    if (!this.config.gid || !dispatcherOps.instanceId) {
      throw new Error("Invalid configuration");
    }

    this.BLODispatcher = new BLODispatcher(dispatcherOps);
    this.OAPIServerEnabled = this.config.enableOpenAPI ?? true;
  }

  public get Signer(): JsObjectSigner {
    return this.objectSigner;
  }
  
  public getSupportedDltIDs(): string[] {
    return this.supportedDltIDs;
  }


  public get gatewaySigner(): JsObjectSigner {
    return this.objectSigner;
  }

  public get pubKey(): string {
    return this._pubKey;
  }

  // todo load docs for gateway coordinator and expose them in a http gatewayApplication
  
  setupOpenAPI(): void {
    if (!this.OAPIServerEnabled) {
      this.logger.debug("OpenAPI server is disabled");
      return;
    }

    if (!this.BLOApplication) {
      this.logger.debug("BLOApplication is not defined. Not initializing OpenAPI server");
      return;
    }
    
    const specPath = path.join(__dirname, "../json/openapi-blo-bundled.json");
    const OpenAPISpec = JSON.parse(fs.readFileSync(specPath, 'utf8'));

    // Type assertion here
    this.BLOApplication.use(
      "/api-docs",
      swaggerUi.serve as express.RequestHandler[],
      swaggerUi.setup(OpenAPISpec) as express.RequestHandler
    );
  }

  // use builder pattern?
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
        supportedChains: [
          SupportedGatewayImplementations.FABRIC,
          SupportedGatewayImplementations.BESU,
        ],
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

      if (!pluginOptions.gid.supportedChains) {
        pluginOptions.gid.supportedChains = [
          SupportedGatewayImplementations.FABRIC,
          SupportedGatewayImplementations.BESU,
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
   * This section includes methods responsible for starting up the server and its associated services.
   * It ensures that both the GatewayServer and BLOServer are initiated concurrently for efficient launch.
   */
  async startup(): Promise<void> {
    const fnTag = `${this.label}#startup()`;
    this.logger.trace(`Entering ${fnTag}`);

    await Promise.all([
      this.startupGatewayServer(),
      this.setupOpenAPI(),
    ]);

    this.logger.info("Both GatewayServer and BLOServer have started");
  }

  async startupGatewayServer(): Promise<void> {
    // starts BOL
     const fnTag = `${this.label}#startupGatewayServer()`;
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

  /**
   * Gateway Connection Methods
   * --------------------------
   * This section encompasses methods dedicated to establishing connections with gateways.
   * It includes functionalities to add gateways based on provided IDs and resolve specific gateway identities.
   * These operations are fundamental for setting up and managing gateway connections within the system.
   */

  // TODO: addGateways as an admin endpoint, simply calls orchestrator
  public async resolveAndAddGateways(IDs: string[]): Promise<void> {
    const fnTag = `${this.label}#resolveAndAddGateways()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.info("Connecting to gateway");
    this.gatewayConnectionManager.resolveAndAddGateways(IDs);

    // todo connect to gateway
  }

  public async addGateways(gateways: GatewayIdentity[]): Promise<void> {
    const fnTag = `${this.label}#addGateways()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.info("Connecting to gateway");
    this.gatewayConnectionManager.addGateways(gateways);

    // todo connect to gateway
  }


  // TODO: keep getter; add an admin endpoint to get identity of connected gateway to BLO
  public get Identity(): GatewayIdentity {
    const fnTag = `${this.label}#getIdentity()`;
    this.logger.trace(`Entering ${fnTag}`);
    if (!this.config.gid) {
      throw new Error("GatewayIdentity is not defined");
    }
    return this.config.gid!;
  }

  /**
   * Shutdown Methods
   * -----------------
   * This section includes methods responsible for cleanly shutting down the server and its associated services.
   */
  public onShutdown(hook: ShutdownHook): void {
    const fnTag = `${this.label}#onShutdown()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.debug(`Adding shutdown hook: ${hook.name}`);
    this.shutdownHooks.push(hook);
  }

  public async shutdown(): Promise<number> {
    const fnTag = `${this.label}#getGatewaySeeds()`;
    this.logger.debug(`Entering ${fnTag}`);

    this.logger.info("Shutting down Node server - Gateway");
    await this.shutdownGatewayServer();

    this.logger.info("Shutting down Node server - BOL");
    await this.shutdownBLOServer();

    this.logger.debug("Running shutdown hooks");
    for (const hook of this.shutdownHooks) {
      this.logger.debug(`Running shutdown hook: ${hook.name}`);
      await hook.hook();
    }

    this.logger.info("Shutting down Gateway Connection Manager");
    const connectionsClosed =
      await this.gatewayConnectionManager.disconnectAll();

    this.logger.info(`Closed ${connectionsClosed} connections`);
    this.logger.info("Gateway Coordinator shut down");
    return connectionsClosed;
  }

  private async shutdownGatewayServer(): Promise<void> {
    const fnTag = `${this.label}#shutdownServer()`;
    this.logger.debug(`Entering ${fnTag}`);
    if (this.gatewayServer) {
      try {
        await this.gatewayServer.close();
        this.gatewayServer = undefined;
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

  private async shutdownBLOServer(): Promise<void> {
    const fnTag = `${this.label}#shutdownBLOServer()`;
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
