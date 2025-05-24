import express, { type Express } from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import bodyParser from "body-parser";
import { Knex } from "knex";

import {
  Logger,
  Checks,
  LogLevelDesc,
  LoggerProvider,
  Secp256k1Keys,
} from "@hyperledger/cactus-common";
import {
  Configuration,
  GetApproveAddressApi,
  SATPGatewayConfig,
  TokenType,
} from "@hyperledger/cactus-plugin-satp-hermes";
import { IWebServiceEndpoint, LedgerType } from "@hyperledger/cactus-core-api";
import { GatewayIdentity } from "@hyperledger/cactus-plugin-satp-hermes";
import { SessionReference } from "../types";

import { ApproveEndpointV1 } from "../web-services/approve-endpoint";
import { GetSessionsDataEndpointV1 } from "../web-services/get-all-session-data-endpoints";
import { GetBalanceEndpointV1 } from "../web-services/get-balance-endpoint";
import { MintEndpointV1 } from "../web-services/mint-endpoint";
import { TransactEndpointV1 } from "../web-services/transact-endpoint";
import { TransferEndpointV1 } from "../web-services/transfer-endpoint";
import { GetAmountApprovedEndpointV1 } from "../web-services/get-amount-approved-endpoint";

import {
  AdminApi,
  TransactionApi,
  TransactRequest,
} from "@hyperledger/cactus-plugin-satp-hermes";
import { FabricEnvironment } from "./cbdc-fabric-environment";
import { BesuEnvironment } from "./cbdc-besu-environment";
import { Container } from "dockerode";
import { createPGDatabase, setupDBTable } from "./db-infrastructure";
import {
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_SERVER,
  DEFAULT_PORT_GATEWAY_OAPI,
} from "@hyperledger/cactus-plugin-satp-hermes";
import { setupGatewayDockerFiles } from "./utils";
import {
  ISATPGatewayRunnerConstructorOptions,
  SATPGatewayRunner,
} from "@hyperledger/cactus-test-tooling";
import http from "node:http";

export interface ICbdcBridgingAppDummyInfrastructureOptions {
  logLevel?: LogLevelDesc;
}

export class CbdcBridgingAppDummyInfrastructure {
  public static readonly CLASS_NAME = "CbdcBridgingAppDummyInfrastructure";

  private static readonly networkName = "CDBC_Network";

  private static readonly DOCKER_IMAGE_VERSION = "918079c5a-2025-04-29";
  private static readonly DOCKER_IMAGE_NAME =
    "kubaya/cacti-satp-hermes-gateway";

  private readonly log: Logger;
  private readonly logLevel: LogLevelDesc;

  private readonly besuEnvironment: BesuEnvironment;
  private readonly fabricEnvironment: FabricEnvironment;

  private db_local_config1?: Knex.Config;
  private db_remote_config1?: Knex.Config;
  private db_local_config2?: Knex.Config;
  private db_remote_config2?: Knex.Config;
  private db_local1?: Container;
  private db_remote1?: Container;
  private db_local2?: Container;
  private db_remote2?: Container;

  private besuGatewayRunner?: SATPGatewayRunner;
  private fabricGatewayRunner?: SATPGatewayRunner;

  private besuGatewayAddress = "besu-gateway.satp-hermes";
  private fabricGatewayAddress = "fabric-gateway.satp-hermes";

  private besuGatewayApproveAddress?: string;
  private fabricGatewayApproveAddress?: string;

  private besuGatewayTransactApi?: TransactionApi;
  private besuGatewayAdminApi?: AdminApi;
  private fabricGatewayTransactApi?: TransactionApi;
  private fabricGatewayAdminApi?: AdminApi;

  private endpoints?: IWebServiceEndpoint[];

  private webApplication?: Express;
  private webServer?: http.Server;

  public get className(): string {
    return CbdcBridgingAppDummyInfrastructure.CLASS_NAME;
  }

  constructor(
    public readonly options: ICbdcBridgingAppDummyInfrastructureOptions,
  ) {
    const fnTag = `${this.className}#constructor()`;
    Checks.truthy(options, `${fnTag} arg options`);

    this.logLevel = (this.options.logLevel || "INFO") as LogLevelDesc;
    const label = this.className;

    this.log = LoggerProvider.getOrCreate({ level: this.logLevel, label });

    this.besuEnvironment = new BesuEnvironment(
      this.logLevel,
      CbdcBridgingAppDummyInfrastructure.networkName,
    );
    this.fabricEnvironment = new FabricEnvironment(
      this.logLevel,
      CbdcBridgingAppDummyInfrastructure.networkName,
    );
  }

  public async start(): Promise<void> {
    try {
      this.log.info(`Starting dummy infrastructure... (this can take a while)`);
      this.log.info(`Starting Ledgers...`);
      await Promise.all([
        this.besuEnvironment.init(),
        this.fabricEnvironment.init(),
      ]);
      this.log.info(`Deploying contracts...`);
      await Promise.all([
        this.besuEnvironment.deployAndSetupContracts(),
        this.fabricEnvironment.deployAndSetupContracts(),
      ]);
      this.log.info(`Creating databases...`);
      await this.createDBs();
      this.log.info(`Creating SATP Gateways...`);
      await this.createSATPGateways();
      this.log.debug("creating api server...");
      await this.createApiServer();
      this.log.debug("api server created sucessfully");
    } catch (ex) {
      this.log.error(`Starting of dummy infrastructure crashed: `, ex);
      throw ex;
    }
  }

  public async stop(): Promise<void> {
    try {
      this.log.info(`Stopping...`);
      await Promise.all([
        this.besuGatewayRunner?.stop(),
        this.fabricGatewayRunner?.stop(),
      ]);
      await Promise.all([
        this.besuGatewayRunner?.destroy(),
        this.fabricGatewayRunner?.destroy(),
      ]);

      await this.db_local1?.stop();
      await this.db_local1?.remove();
      await this.db_remote1?.stop();
      await this.db_remote1?.remove();
      await this.db_local2?.stop();
      await this.db_local2?.remove();
      await this.db_remote2?.stop();
      await this.db_remote2?.remove();

      await Promise.all([
        this.besuEnvironment.tearDown(),
        this.fabricEnvironment.tearDown(),
      ]);

      if (this.webServer) {
        await new Promise<void>((resolve, reject) => {
          this.webServer?.close((err) => {
            if (err) {
              this.log.error(`Failed to close web server: ${err}`);
              reject(err);
            } else {
              this.log.info(`Web server closed`);
              resolve();
            }
          });
        });
      }

      this.log.info(`Stopped OK`);
    } catch (ex) {
      this.log.error(`Stopping crashed: `, ex);
      throw ex;
    }
  }

  public async createDBs() {
    ({ config: this.db_local_config1, container: this.db_local1 } =
      await createPGDatabase({
        port: 5432,
        network: CbdcBridgingAppDummyInfrastructure.networkName,
        postgresUser: "user123123",
        postgresPassword: "password",
      }));

    ({ config: this.db_remote_config1, container: this.db_remote1 } =
      await createPGDatabase({
        port: 5450,
        network: CbdcBridgingAppDummyInfrastructure.networkName,
        postgresUser: "user123123",
        postgresPassword: "password",
      }));

    ({ config: this.db_local_config2, container: this.db_local2 } =
      await createPGDatabase({
        port: 5433,
        network: CbdcBridgingAppDummyInfrastructure.networkName,
        postgresUser: "user123123",
        postgresPassword: "password",
      }));

    ({ config: this.db_remote_config2, container: this.db_remote2 } =
      await createPGDatabase({
        port: 5451,
        network: CbdcBridgingAppDummyInfrastructure.networkName,
        postgresUser: "user123123",
        postgresPassword: "password",
      }));

    await setupDBTable(this.db_remote_config1);
    await setupDBTable(this.db_remote_config2);
  }

  public async createSATPGateways(): Promise<void> {
    const fnTag = `${this.className}#createSATPGateways()`;
    this.log.info(`${fnTag} Creating SATP Gateways...`);

    const fabricGatewayKeyPair = Secp256k1Keys.generateKeyPairsBuffer();
    const besuGatewayKeyPair = Secp256k1Keys.generateKeyPairsBuffer();

    const fabricGatewayIdentity = {
      id: "mockID-1",
      name: "CustomGateway",
      version: [
        {
          Core: "v02",
          Architecture: "v02",
          Crash: "v02",
        },
      ],
      connectedDLTs: [
        {
          id: FabricEnvironment.FABRIC_NETWORK_ID,
          ledgerType: LedgerType.Fabric2,
        },
      ],
      proofID: "mockProofID10",
      address: `http://${this.fabricGatewayAddress}`,
      gatewayClientPort: DEFAULT_PORT_GATEWAY_CLIENT,
      gatewayServerPort: DEFAULT_PORT_GATEWAY_SERVER,
      gatewayOapiPort: DEFAULT_PORT_GATEWAY_OAPI,
      pubKey: Buffer.from(fabricGatewayKeyPair.publicKey).toString("hex"),
    } as GatewayIdentity;

    const besuGatewayIdentity = {
      id: "mockID-2",
      name: "CustomGateway",
      version: [
        {
          Core: "v02",
          Architecture: "v02",
          Crash: "v02",
        },
      ],
      connectedDLTs: [
        {
          id: BesuEnvironment.BESU_NETWORK_ID,
          ledgerType: LedgerType.Besu2X,
        },
      ],
      proofID: "mockProofID11",
      address: `http://${this.besuGatewayAddress}`,
      gatewayClientPort: DEFAULT_PORT_GATEWAY_CLIENT,
      gatewayServerPort: DEFAULT_PORT_GATEWAY_SERVER,
      gatewayOapiPort: DEFAULT_PORT_GATEWAY_OAPI,
      pubKey: Buffer.from(besuGatewayKeyPair.publicKey).toString("hex"),
    } as GatewayIdentity;

    const fabricConfig =
      await this.fabricEnvironment.createFabricDockerConfig();

    const besuConfig = await this.besuEnvironment.createBesuDockerConfig();

    const besuGatewayOptions: Partial<SATPGatewayConfig> = {
      gid: besuGatewayIdentity,
      logLevel: this.logLevel,
      counterPartyGateways: [fabricGatewayIdentity],
      localRepository: this.db_local_config1
        ? ({
            client: this.db_local_config1.client,
            connection: this.db_local_config1.connection,
          } as Knex.Config)
        : undefined,
      remoteRepository: this.db_remote_config1
        ? ({
            client: this.db_remote_config1.client,
            connection: this.db_remote_config1.connection,
          } as Knex.Config)
        : undefined,
      environment: "production",
      ccConfig: {
        bridgeConfig: [besuConfig],
      },
      enableCrashRecovery: false,
      keyPair: {
        publicKey: Buffer.from(besuGatewayKeyPair.publicKey).toString("hex"),
        privateKey: Buffer.from(besuGatewayKeyPair.privateKey).toString("hex"),
      },
      ontologyPath: "/opt/cacti/satp-hermes/ontologies",
    };

    const fabricGatewayOptions: Partial<SATPGatewayConfig> = {
      gid: fabricGatewayIdentity,
      logLevel: this.logLevel,
      counterPartyGateways: [besuGatewayIdentity],
      localRepository: this.db_local_config2
        ? ({
            client: this.db_local_config2.client,
            connection: this.db_local_config2.connection,
          } as Knex.Config)
        : undefined,
      remoteRepository: this.db_remote_config2
        ? ({
            client: this.db_remote_config2.client,
            connection: this.db_remote_config2.connection,
          } as Knex.Config)
        : undefined,
      environment: "production",
      ccConfig: {
        bridgeConfig: [fabricConfig],
      },
      enableCrashRecovery: false,
      keyPair: {
        publicKey: Buffer.from(fabricGatewayKeyPair.publicKey).toString("hex"),
        privateKey: Buffer.from(fabricGatewayKeyPair.privateKey).toString(
          "hex",
        ),
      },
      ontologyPath: "/opt/cacti/satp-hermes/ontologies",
    };

    const besuGatewayDockerFiles = setupGatewayDockerFiles(
      besuGatewayOptions,
      "besu-gateway",
    );
    const fabricGatewayDockerFiles = setupGatewayDockerFiles(
      fabricGatewayOptions,
      "fabric-gateway",
    );

    const besuGatewayRunnerOptions: ISATPGatewayRunnerConstructorOptions = {
      containerImageVersion:
        CbdcBridgingAppDummyInfrastructure.DOCKER_IMAGE_VERSION,
      containerImageName: CbdcBridgingAppDummyInfrastructure.DOCKER_IMAGE_NAME,
      serverPort: DEFAULT_PORT_GATEWAY_SERVER,
      clientPort: DEFAULT_PORT_GATEWAY_CLIENT,
      oapiPort: DEFAULT_PORT_GATEWAY_OAPI,
      logLevel: this.logLevel,
      emitContainerLogs: true,
      configFilePath: besuGatewayDockerFiles.configFilePath,
      logsPath: besuGatewayDockerFiles.logsPath,
      ontologiesPath: besuGatewayDockerFiles.ontologiesPath,
      networkName: CbdcBridgingAppDummyInfrastructure.networkName,
      url: this.besuGatewayAddress,
    };

    const fabricGatewayRunnerOptions: ISATPGatewayRunnerConstructorOptions = {
      containerImageVersion:
        CbdcBridgingAppDummyInfrastructure.DOCKER_IMAGE_VERSION,
      containerImageName: CbdcBridgingAppDummyInfrastructure.DOCKER_IMAGE_NAME,
      serverPort: DEFAULT_PORT_GATEWAY_SERVER + 100,
      clientPort: DEFAULT_PORT_GATEWAY_CLIENT + 100,
      oapiPort: DEFAULT_PORT_GATEWAY_OAPI + 100,
      logLevel: this.logLevel,
      emitContainerLogs: true,
      configFilePath: fabricGatewayDockerFiles.configFilePath,
      logsPath: fabricGatewayDockerFiles.logsPath,
      ontologiesPath: fabricGatewayDockerFiles.ontologiesPath,
      networkName: CbdcBridgingAppDummyInfrastructure.networkName,
      url: this.fabricGatewayAddress,
    };

    this.besuGatewayRunner = new SATPGatewayRunner(besuGatewayRunnerOptions);
    this.log.debug("starting gatewayRunner...");
    await this.besuGatewayRunner.start();
    this.log.debug("gatewayRunner started sucessfully");

    this.fabricGatewayRunner = new SATPGatewayRunner(
      fabricGatewayRunnerOptions,
    );
    this.log.debug("starting gatewayRunner...");
    await this.fabricGatewayRunner.start();
    this.log.debug("gatewayRunner started sucessfully");

    const besuGatewayApproveAddressApi = new GetApproveAddressApi(
      new Configuration({
        basePath: `http://${await this.besuGatewayRunner.getOApiHost()}`,
      }),
    );

    const reqApproveBesuAddress =
      await besuGatewayApproveAddressApi.getApproveAddress(
        {
          id: BesuEnvironment.BESU_NETWORK_ID,
          ledgerType: LedgerType.Besu2X,
        },
        TokenType.NonstandardFungible,
      );

    if (!reqApproveBesuAddress?.data.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    this.besuGatewayApproveAddress = reqApproveBesuAddress.data.approveAddress;

    this.besuEnvironment.setApproveAddress(this.besuGatewayApproveAddress);

    const fabricGatewayApproveAddressApi = new GetApproveAddressApi(
      new Configuration({
        basePath: `http://${await this.fabricGatewayRunner.getOApiHost()}`,
      }),
    );
    const reqApproveFabricAddress =
      await fabricGatewayApproveAddressApi.getApproveAddress(
        {
          id: FabricEnvironment.FABRIC_NETWORK_ID,
          ledgerType: LedgerType.Fabric2,
        },
        TokenType.NonstandardFungible,
      );

    if (!reqApproveFabricAddress?.data.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    this.fabricGatewayApproveAddress =
      reqApproveFabricAddress.data.approveAddress;

    this.fabricEnvironment.setApproveAddress(this.fabricGatewayApproveAddress);

    await this.besuEnvironment.giveRoleToBridge(this.besuGatewayApproveAddress);

    await this.fabricEnvironment.giveRoleToBridge("Org2MSP");

    this.besuGatewayTransactApi = new TransactionApi(
      new Configuration({
        basePath: `http://${await this.besuGatewayRunner.getOApiHost()}`,
      }),
    );
    this.besuGatewayAdminApi = new AdminApi(
      new Configuration({
        basePath: `http://${await this.besuGatewayRunner.getOApiHost()}`,
      }),
    );
    this.fabricGatewayTransactApi = new TransactionApi(
      new Configuration({
        basePath: `http://${await this.fabricGatewayRunner.getOApiHost()}`,
      }),
    );
    this.fabricGatewayAdminApi = new AdminApi(
      new Configuration({
        basePath: `http://${await this.fabricGatewayRunner.getOApiHost()}`,
      }),
    );

    this.log.info(`SATP Gateways created`);
  }

  public getFabricEnvironment(): FabricEnvironment {
    return this.fabricEnvironment;
  }
  public getBesuEnvironment(): BesuEnvironment {
    return this.besuEnvironment;
  }

  private async createApiServer(): Promise<void> {
    this.webApplication = express();
    this.webApplication.use(bodyParser.json({ limit: "250mb" }));
    this.webApplication.use(cors());
    const webServices = await this.getOrCreateWebServices();

    try {
      for (const service of webServices) {
        this.log.debug(`Registering web service: ${service.getPath()}`);
        await service.registerExpress(this.webApplication);
      }
    } catch (ex) {
      this.log.error(`Failed to register web services: `, ex);
      throw ex;
    }
    this.webServer = http.createServer(this.webApplication);

    await new Promise<void>((resolve, reject) => {
      if (!this.webServer) {
        throw new Error("web server is not defined");
      }
      this.webServer.listen(9999, () => {
        this.log.info(`web server started and listening on port ${9999}`);
        resolve();
      });
      this.webServer.on("error", (error) => {
        this.log.error(`web server failed to start: ${error}`);
        reject(error);
      });
    });
  }

  public async getOrCreateWebServices(): Promise<IWebServiceEndpoint[]> {
    const fnTag = `${CbdcBridgingAppDummyInfrastructure.CLASS_NAME}#getOrCreateWebServices()`;
    this.log.info(`${fnTag}, Registering webservices`);

    if (Array.isArray(this.endpoints)) {
      return this.endpoints;
    }

    const approveEndpointV1 = new ApproveEndpointV1({
      infrastructure: this,
      logLevel: this.options.logLevel,
    });

    const gelAllSessionDataEndpointV1 = new GetSessionsDataEndpointV1({
      infrastructure: this,
      logLevel: this.options.logLevel,
    });

    const getBalanceEndpointV1 = new GetBalanceEndpointV1({
      infrastructure: this,
      logLevel: this.options.logLevel,
    });

    const mintEndpointV1 = new MintEndpointV1({
      infrastructure: this,
      logLevel: this.options.logLevel,
    });

    const transactEndpointV1 = new TransactEndpointV1({
      infrastructure: this,
      logLevel: this.options.logLevel,
    });

    const transferEndpointV1 = new TransferEndpointV1({
      infrastructure: this,
      logLevel: this.options.logLevel,
    });

    const getApprovedEndpointV1 = new GetAmountApprovedEndpointV1({
      infrastructure: this,
      logLevel: this.options.logLevel,
    });

    const theEndpoints = [
      approveEndpointV1,
      gelAllSessionDataEndpointV1,
      getBalanceEndpointV1,
      mintEndpointV1,
      transactEndpointV1,
      transferEndpointV1,
      getApprovedEndpointV1,
    ];
    this.endpoints = theEndpoints;

    return theEndpoints;
  }

  public async getSessionsData(gateway: string): Promise<SessionReference[]> {
    this.log.debug(`Getting sessions data from ${gateway}`);
    let api;
    if (gateway === "FABRIC") {
      api = this.fabricGatewayAdminApi;
    } else {
      api = this.besuGatewayAdminApi;
    }
    try {
      if (api === undefined) {
        throw new Error("API is undefined");
      }
      const response = await api.getSessionIds();

      if (response.status !== 200) {
        return [
          {
            id: "MockID",
            status: "undefined",
            substatus: "undefined",
            sourceLedger: "undefined",
            receiverLedger: "undefined",
          },
        ];
      }

      const ids = response.data;

      const sessionsData = [];
      for (const id of ids) {
        try {
          const sessionData = await api.getStatus(id);
          const data: SessionReference = {
            id,
            status: sessionData.data.status,
            substatus: sessionData.data.substatus,
            sourceLedger: sessionData.data.originNetwork.dltProtocol,
            receiverLedger: sessionData.data.destinationNetwork.dltProtocol,
          };

          sessionsData.push(data);
        } catch (error) {
          sessionsData.push({
            id: "MockID",
            status: "undefined",
            substatus: "undefined",
            sourceLedger: "undefined",
            receiverLedger: "undefined",
          });
        }
      }
      return sessionsData;
    } catch (error) {
      console.log(error);
      return [
        {
          id: "MockID",
          status: "undefined",
          substatus: "undefined",
          sourceLedger: "undefined",
          receiverLedger: "undefined",
        },
      ];
    }
  }

  public async bridgeTokens(
    sender: string,
    recipient: string,
    sourceChain: string,
    destinationChain: string,
    amount: number,
  ) {
    this.log.debug(
      `Bridging tokens from ${sourceChain} to ${destinationChain}`,
    );
    let senderAddress;
    let receiverAddress;
    let sourceAsset;
    let receiverAsset;

    let api;

    if (sourceChain === "FABRIC") {
      senderAddress = this.fabricEnvironment.getFabricId(sender);
      sourceAsset = this.fabricEnvironment.getFabricAsset(
        senderAddress as string,
        amount.toString(),
      );
      api = this.fabricGatewayTransactApi;
    } else {
      senderAddress = this.besuEnvironment.getEthAddress(sender);
      sourceAsset = this.besuEnvironment.getBesuAsset(
        senderAddress as string,
        amount.toString(),
      );
      api = this.besuGatewayTransactApi;
    }

    if (destinationChain === "BESU") {
      receiverAddress = this.besuEnvironment.getEthAddress(recipient);
      receiverAsset = this.besuEnvironment.getBesuAsset(
        receiverAddress as string,
        amount.toString(),
      );
    } else {
      receiverAddress = this.fabricEnvironment.getFabricId(recipient);
      receiverAsset = this.fabricEnvironment.getFabricAsset(
        receiverAddress as string,
        amount.toString(),
      );
    }

    if (api === undefined) {
      throw new Error("API is undefined");
    }

    try {
      const request: TransactRequest = {
        contextID: uuidv4(),
        originatorPubkey: senderAddress,
        beneficiaryPubkey: receiverAddress,
        sourceAsset,
        receiverAsset,
      };
      await api.transact(request);
    } catch (error) {
      this.log.error(
        `Error bridging tokens from ${sourceChain} to ${destinationChain}`,
      );
      throw error;
    }
  }
}
