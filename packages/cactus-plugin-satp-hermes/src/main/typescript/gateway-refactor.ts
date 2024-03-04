import {
  Secp256k1Keys,
  Logger,
  Checks,
  LoggerProvider,
  ILoggerOptions,
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
import express, { Express } from 'express';
import { expressConnectMiddleware } from "@connectrpc/connect-express";
import http from "http";
import { configureRoutes } from "./web-services/router";
import { DEFAULT_PORT_GATEWAY_CLIENT, DEFAULT_PORT_GATEWAY_SERVER } from "./core/constants";

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
  private BOLApplication?: Express;
  private BOLServer?: http.Server;

  // TODO!: add logic to manage sessions (parallelization, user input, freeze, unfreeze, rollback, recovery)
  // private sessions: Map<string, Session> = new Map();

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
    if (!pluginOptions.keys) {
      pluginOptions.keys = Secp256k1Keys.generateKeyPairsBuffer();
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
   * It ensures that both the GatewayServer and BOLServer are initiated concurrently for efficient launch.
   */
  async startup(): Promise<void> {
    const fnTag = `${this.label}#startup()`;
    this.logger.trace(`Entering ${fnTag}`);

    await Promise.all([
      this.startupGatewayServer(),
      this.startupBOLServer(),
    ]);

    this.logger.info("Both GatewayServer and BOLServer have started");
  }

  async startupGatewayServer(): Promise<void> {
    const fnTag = `${this.label}#startupGatewayServer()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.info("Starting gateway server");
    const port = this.options.gid?.gatewayServerPort ?? DEFAULT_PORT_GATEWAY_SERVER;

    if (!this.gatewayApplication || !this.gatewayServer) {
      this.gatewayApplication = express();
      this.gatewayApplication.use(expressConnectMiddleware({ routes: configureRoutes }));
      this.gatewayServer = http.createServer(this.gatewayApplication).listen(port);
    } else {
      this.logger.warn("Server already running");
    }
  }

  
  async startupBOLServer(): Promise<void> {
    const fnTag = `${this.label}#startupBOLServer()`;
    this.logger.trace(`Entering ${fnTag}`);
    this.logger.info("Starting BOL server");
    const port = (this.options.gid?.gatewayClientPort ?? DEFAULT_PORT_GATEWAY_CLIENT);

    if (!this.BOLApplication || !this.BOLServer) {
      this.BOLApplication = express();
      // todo
      // this.BOLApplication.use(expressConnectMiddleware());
      this.BOLServer = http.createServer(this.BOLApplication).listen(port);
    } else {
      this.logger.warn("Server already running");
    }
  }

  /**
   * Gateway Connection Methods
   * --------------------------
   * This section encompasses methods dedicated to establishing connections with gateways.
   * It includes functionalities to add gateways based on provided IDs and resolve specific gateway identities.
   * These operations are fundamental for setting up and managing gateway connections within the system.
   */

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

  public getIdentity(): GatewayIdentity {
    const fnTag = `${this.label}#getIdentity()`;
    this.logger.trace(`Entering ${fnTag}`);
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
    await this.shutdownBOLServer();

    this.logger.debug("Running shutdown hooks");
    for (const hook of this.shutdownHooks) {  
      this.logger.debug(`Running shutdown hook: ${hook.name}`);
      await hook.hook();
    }

    this.logger.info("Shutting down Gateway Connection Manager")
    const connectionsClosed = await this.gatewayConnectionManager.disconnectAll();

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
        this.logger.error(`Error shutting down the gatewayApplication: ${error}`);
      }
    } else {
      this.logger.warn("Server is not running.");
    }
  }
  
  private async shutdownBOLServer(): Promise<void> {
    const fnTag = `${this.label}#shutdownBOLServer()`;
    this.logger.debug(`Entering ${fnTag}`);
    if (this.BOLServer) {
      try {
        await this.BOLServer.close();
        this.BOLServer = undefined;
        this.logger.info("Server shut down");
      } catch (error) {
        this.logger.error(`Error shutting down the gatewayApplication: ${error}`);
      }
    } else {
      this.logger.warn("Server is not running.");
    }
  }

} 

