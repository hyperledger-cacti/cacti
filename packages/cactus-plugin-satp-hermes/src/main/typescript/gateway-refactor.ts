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
import { GatewayOrchestrator } from "./gol/gateway-orchestrator";
export { SATPGatewayConfig };
import express, { Express } from "express";
import http from "http";
import { configureRoutes } from "./web-services/router";
import {
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_GRPC,
  DEFAULT_PORT_GATEWAY_SERVER,
} from "./core/constants";
import { BLODispatcher, BLODispatcherOptions } from "./blo/dispatcher";
import { SessionData } from "./generated/proto/cacti/satp/v02/common/session_pb";
import { expressConnectMiddleware } from "@connectrpc/connect-express";
import { bufArray2HexStr } from "./gateway-utils";
import { COREDispatcher } from "./core/dispatcher";
import {
  ILocalLogRepository,
  IRemoteLogRepository,
} from "./repository/interfaces/repository";
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
  private gRPCServer?: http.Server;
  private gRPCApplication?: Express;
  private COREDispatcher?: COREDispatcher;

  private objectSigner: JsObjectSigner;

  // TODO!: add logic to manage sessions (parallelization, user input, freeze, unfreeze, rollback, recovery)
  private supportedDltIDs: SupportedGatewayImplementations[];
  private sessions: Map<string, SessionData> = new Map();
  private _pubKey: string;
  private _privKey: string;

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
    this._privKey = bufArray2HexStr(this.config.keyPair.privateKey);

    this.logger.info(`Gateway's public key: ${this._pubKey}`);

    const objectSignerOptions: IJsObjectSignerOptions = {
      privateKey: this._privKey,
      logLevel: "debug",
    };
    this.objectSigner = new JsObjectSigner(objectSignerOptions);

    if (options.enableOpenAPI) {
      this.setupOpenAPI();
    }
    this.logger.info("Gateway Coordinator initialized");
    const seedGateways = this.getGatewaySeeds();
    this.logger.info(
      `Initializing gateway connection manager with ${seedGateways} seed gateways`,
    );
    this.gatewayConnectionManager = new GatewayOrchestrator(seedGateways, {
      logger: this.logger,
    });

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
  }

  public getSessions(): Map<string, SessionData> {
    return this.sessions;
  }

  public getSession(sessionId: string): SessionData | undefined {
    return this.sessions.get(sessionId);
  }

  public getSupportedDltIDs(): string[] {
    return this.supportedDltIDs;
  }

  public addSession(sessionId: string, sessionData: SessionData): void {
    this.sessions.set(sessionId, sessionData);
  }

  public get gatewaySigner(): JsObjectSigner {
    return this.objectSigner;
  }

  public get pubKey(): string {
    return this._pubKey;
  }

  // todo load docs for gateway coordinator and expose them in a http gatewayApplication
  setupOpenAPI(): void {
    const fnTag = `${this.label}#setupOpenAPI()`;
    this.logger.trace(`Entering ${fnTag}`);

    this.logger.error("OpenAPI setup not implemented");
    return;
    const specPath = path.join(__dirname, "../../", "/json", "openapi.json");
    this.logger.debug(`Loading OpenAPI specification from ${specPath}`);

    /*const OpenAPISpec = JSON.parse(fs.readFileSync(specPath).toString());
    this.logger.info(
      `OpenAPI docs and documentation set up at 📖: \n ${this.config.gid?.address}:${this.config.gid?.gatewayServerPort}/api-docs`,
    );
    */
    // todo bind to grpc gateway
    //      this._app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(OpenAPISpec));
  }

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
      // grpc server does not start correctly
      // this.startupGRPCServer(),
      this.startupGatewayServer(),
      this.startupBOLServer(),
    ]);

    this.logger.info("Both GatewayServer and BLOServer have started");
  }

  async startupGRPCServer(): Promise<void> {
    const fnTag = `${this.label}#startupGRPCServer()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.info("Starting gRPC server");
    const port = this.options.gid?.gatewayGrpcPort ?? DEFAULT_PORT_GATEWAY_GRPC;

    return new Promise(async (resolve, reject) => {
      if (this.gRPCApplication || !this.gRPCServer) {
        if (!this.COREDispatcher) {
          throw new Error("COREDispatcher is not defined");
        }

        this.gRPCApplication = express();

        try {
          const gRPCServices = await this.COREDispatcher.getOrCreateServices();
          for (const service of gRPCServices) {
            this.logger.debug(`Registering web service: ${service.getPath()}`);
            await service.registerExpress(this.COREDispatcher);
          }
        } catch (error) {
          throw new Error(`Failed to register web services: ${error}`);
        }

        this.gRPCServer = http.createServer(this.gRPCApplication);

        this.gRPCServer.listen(port, () => {
          this.logger.info(`gRPC server started and listening on port ${port}`);
          resolve();
        });

        this.gRPCServer.on("error", (error) => {
          this.logger.error(`gRPC server failed to start: ${error}`);
          reject(error);
        });
      } else {
        this.logger.warn("Server already running");
        resolve();
      }
    });
  }

  async startupGatewayServer(): Promise<void> {
    const fnTag = `${this.label}#startupGatewayServer()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.info("Starting gateway server");
    const port =
      this.options.gid?.gatewayServerPort ?? DEFAULT_PORT_GATEWAY_SERVER;

    return new Promise((resolve, reject) => {
      if (!this.gatewayApplication || !this.gatewayServer) {
        this.gatewayApplication = express();
        this.gatewayApplication.use(
          expressConnectMiddleware({ routes: configureRoutes }),
        );
        this.gatewayServer = http.createServer(this.gatewayApplication);

        this.gatewayServer.listen(port, () => {
          this.logger.info(
            `Gateway server started and listening on port ${port}`,
          );
          resolve();
        });

        this.gatewayServer.on("error", (error) => {
          this.logger.error(`Gateway server failed to start: ${error}`);
          reject(error);
        });
      } else {
        this.logger.warn("Server already running");
        resolve();
      }
    });
  }

  async startupBOLServer(): Promise<void> {
    const fnTag = `${this.label}#startupBOLServer()`;
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

  // TODO: addGateways as an admin endpoint
  public async addGateways(IDs: string[]): Promise<void> {
    const fnTag = `${this.label}#addGateways()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.info("Connecting to gateway");
    const gatewaysToAdd: GatewayIdentity[] = [];
    const thisID = this.config.gid!.id;
    const otherIDs = IDs.filter((id) => id !== thisID);

    for (const id of otherIDs) {
      gatewaysToAdd.push(this.resolveGatewayID(id));
    }

    this.gatewayConnectionManager.addGateways(gatewaysToAdd);

    // todo connect to gateway
  }

  // gets an ID, queries a repository, returns an address, port, and proof of identity
  private resolveGatewayID(ID: string): GatewayIdentity {
    const fnTag = `${this.label}#resolveGatewayID()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.info(`Resolving gateway with ID: ${ID}`);

    const mockGatewayIdentity: GatewayIdentity[] = [
      {
        id: "1",
        name: "Gateway1",
        version: [
          {
            Core: "1.0",
            Architecture: "1.0",
            Crash: "1.0",
          },
        ],
        supportedChains: [
          SupportedGatewayImplementations.FABRIC,
          SupportedGatewayImplementations.BESU,
        ],
        proofID: "mockProofID1",
        gatewayServerPort: 3011,
        address: "http://localhost",
      },
      {
        id: "2",
        name: "Gateway2",
        version: [
          {
            Core: "1.0",
            Architecture: "1.0",
            Crash: "1.0",
          },
        ],
        supportedChains: [
          SupportedGatewayImplementations.FABRIC,
          SupportedGatewayImplementations.BESU,
        ],
        proofID: "mockProofID1",
        gatewayServerPort: 3012,
        address: "http://localhost",
      },
    ];
    return mockGatewayIdentity.filter((gateway) => gateway.id === ID)[0];
  }

  private getGatewaySeeds(): GatewayIdentity[] {
    const fnTag = `${this.label}#getGatewaySeeds()`;
    this.logger.trace(`Entering ${fnTag}`);

    const mockGatewayIdentity: GatewayIdentity[] = [
      {
        id: "1",
        name: "Gateway1",
        version: [
          {
            Core: "1.0",
            Architecture: "1.0",
            Crash: "1.0",
          },
        ],
        supportedChains: [
          SupportedGatewayImplementations.FABRIC,
          SupportedGatewayImplementations.BESU,
        ],
        proofID: "mockProofID1",
        gatewayServerPort: 3011,
        address: "http://localhost",
      },
      {
        id: "2",
        name: "Gateway2",
        version: [
          {
            Core: "1.0",
            Architecture: "1.0",
            Crash: "1.0",
          },
        ],
        supportedChains: [
          SupportedGatewayImplementations.FABRIC,
          SupportedGatewayImplementations.BESU,
        ],
        proofID: "mockProofID1",
        gatewayServerPort: 3014,
        address: "http://localhost",
      },
    ];
    return mockGatewayIdentity;
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

    this.logger.info("Shutting down Node server - gRPC");
    await this.shutdownGRPCServer();

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

  private async shutdownGRPCServer(): Promise<void> {
    const fnTag = `${this.label}#shutdownGRPCServer()`;
    this.logger.debug(`Entering ${fnTag}`);
    if (this.gRPCServer) {
      try {
        await this.gRPCServer.close();
        this.gRPCServer = undefined;
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
