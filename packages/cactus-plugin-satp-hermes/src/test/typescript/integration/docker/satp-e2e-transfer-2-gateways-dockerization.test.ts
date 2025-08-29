import "jest-extended";
import {
  LogLevelDesc,
  Secp256k1Keys,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  pruneDockerAllIfGithubAction,
  Containers,
  SATPGatewayRunner,
  ISATPGatewayRunnerConstructorOptions,
} from "@hyperledger/cactus-test-tooling";
import { GatewayIdentity } from "../../../../main/typescript/core/types";
import {
  setupGatewayDockerFiles,
  BesuTestEnvironment,
  FabricTestEnvironment,
  getTransactRequest,
  EthereumTestEnvironment,
  createPGDatabase,
  setupDBTable,
  getTestConfigFilesDirectory,
} from "../../test-utils";
import {
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_OAPI,
  DEFAULT_PORT_GATEWAY_SERVER,
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../../main/typescript/core/constants";
import { ClaimFormat } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { Container } from "dockerode";
import { Knex } from "knex";
import { Configuration, LedgerType } from "@hyperledger/cactus-core-api";
import {
  AdminApi,
  GetApproveAddressApi,
  TokenType,
  TransactionApi,
} from "../../../../main/typescript";
import { DOCKER_IMAGE_NAME, DOCKER_IMAGE_VERSION } from "../../constants";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";

const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});
monitorService.init();
const logLevel: LogLevelDesc = "TRACE";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "SATP - Hermes",
});

let besuEnv: BesuTestEnvironment;
let ethereumEnv: EthereumTestEnvironment;
let fabricEnv: FabricTestEnvironment;

const erc20TokenContract = "SATPContract";

let db_local_config1: Knex.Config;
let db_remote_config1: Knex.Config;
let db_local_config2: Knex.Config;
let db_remote_config2: Knex.Config;
let db_local1: Container;
let db_remote1: Container;
let db_local2: Container;
let db_remote2: Container;
let gatewayRunner1: SATPGatewayRunner;
let gatewayRunner2: SATPGatewayRunner;

const testNetwork = "test-network";

const gateway1Address = "gateway1.satp-hermes";
const gateway2Address = "gateway2.satp-hermes";

const TIMEOUT = 900000; // 15 minutes
afterAll(async () => {
  await db_local1.stop();
  await db_local1.remove();
  await db_remote1.stop();
  await db_remote1.remove();
  await db_local2.stop();
  await db_local2.remove();
  await db_remote2.stop();
  await db_remote2.remove();

  await besuEnv.tearDown();
  await ethereumEnv.tearDown();
  await fabricEnv.tearDown();

  monitorService.shutdown();

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
}, TIMEOUT);

afterEach(async () => {
  if (gatewayRunner1) {
    log.debug("Stopping gatewayRunner1...");
    await gatewayRunner1.stop();
    await gatewayRunner1.destroy();
  }

  if (gatewayRunner2) {
    log.debug("Stopping gatewayRunner2...");
    await gatewayRunner2.stop();
    await gatewayRunner2.destroy();
  }
}, TIMEOUT);

beforeAll(async () => {
  pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });

  ({ config: db_local_config1, container: db_local1 } = await createPGDatabase({
    network: testNetwork,
    postgresUser: "user123123",
    postgresPassword: "password",
  }));

  ({ config: db_remote_config1, container: db_remote1 } =
    await createPGDatabase({
      network: testNetwork,
      postgresUser: "user123123",
      postgresPassword: "password",
    }));

  ({ config: db_local_config2, container: db_local2 } = await createPGDatabase({
    network: testNetwork,
    postgresUser: "user123123",
    postgresPassword: "password",
  }));

  ({ config: db_remote_config2, container: db_remote2 } =
    await createPGDatabase({
      network: testNetwork,
      postgresUser: "user123123",
      postgresPassword: "password",
    }));

  await setupDBTable(db_remote_config1);
  await setupDBTable(db_remote_config2);

  {
    const satpContractName = "satp-contract";
    fabricEnv = await FabricTestEnvironment.setupTestEnvironment({
      contractName: satpContractName,
      logLevel,
      network: testNetwork,
      claimFormat: ClaimFormat.DEFAULT,
    });
    log.info("Fabric Ledger started successfully");

    await fabricEnv.deployAndSetupContracts();
  }

  {
    besuEnv = await BesuTestEnvironment.setupTestEnvironment({
      contractName: erc20TokenContract,
      logLevel,
      network: testNetwork,
    });
    log.info("Besu Ledger started successfully");

    await besuEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);
  }
  {
    ethereumEnv = await EthereumTestEnvironment.setupTestEnvironment({
      contractName: erc20TokenContract,
      logLevel,
      network: testNetwork,
    });
    log.info("Ethereum Ledger started successfully");

    await ethereumEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);
  }

  await besuEnv.mintTokens("100");
  await besuEnv.checkBalance(
    besuEnv.getTestContractName(),
    besuEnv.getTestContractAddress(),
    besuEnv.getTestContractAbi(),
    besuEnv.getTestOwnerAccount(),
    "100",
    besuEnv.getTestOwnerSigningCredential(),
  );
}, TIMEOUT);

describe("SATPGateway sending a token from Besu to Fabric", () => {
  jest.setTimeout(TIMEOUT);
  it("should realize a transfer", async () => {
    // gatewayIds setup:
    const gateway1KeyPair = Secp256k1Keys.generateKeyPairsBuffer();
    const gateway2KeyPair = Secp256k1Keys.generateKeyPairsBuffer();

    const gatewayIdentity1 = {
      id: "mockID-1",
      name: "CustomGateway",
      version: [
        {
          Core: SATP_CORE_VERSION,
          Architecture: SATP_ARCHITECTURE_VERSION,
          Crash: SATP_CRASH_VERSION,
        },
      ],
      connectedDLTs: [
        {
          id: BesuTestEnvironment.BESU_NETWORK_ID,
          ledgerType: LedgerType.Besu2X,
        },
      ],
      proofID: "mockProofID10",
      address: `http://${gateway1Address}`,
      gatewayClientPort: DEFAULT_PORT_GATEWAY_CLIENT,
      gatewayServerPort: DEFAULT_PORT_GATEWAY_SERVER,
      gatewayOapiPort: DEFAULT_PORT_GATEWAY_OAPI,
      pubKey: Buffer.from(gateway1KeyPair.publicKey).toString("hex"),
    } as GatewayIdentity;

    // gateway setup:
    const gatewayIdentity2 = {
      id: "mockID-2",
      name: "CustomGateway",
      version: [
        {
          Core: SATP_CORE_VERSION,
          Architecture: SATP_ARCHITECTURE_VERSION,
          Crash: SATP_CRASH_VERSION,
        },
      ],
      connectedDLTs: [
        {
          id: FabricTestEnvironment.FABRIC_NETWORK_ID,
          ledgerType: LedgerType.Fabric2,
        },
      ],
      proofID: "mockProofID11",
      address: `http://${gateway2Address}`,
      gatewayClientPort: DEFAULT_PORT_GATEWAY_CLIENT,
      gatewayServerPort: DEFAULT_PORT_GATEWAY_SERVER,
      gatewayOapiPort: DEFAULT_PORT_GATEWAY_OAPI,
      pubKey: Buffer.from(gateway2KeyPair.publicKey).toString("hex"),
    } as GatewayIdentity;

    // besuConfig Json object setup:
    const besuConfigJSON = await besuEnv.createBesuDockerConfig();

    // fabricConfig Json object setup:
    const fabricConfigJSON = await fabricEnv.createFabricDockerConfig(
      getTestConfigFilesDirectory(`gateway-info-${gatewayIdentity2.id}`),
    );

    const files1 = setupGatewayDockerFiles({
      gatewayIdentity: gatewayIdentity1,
      logLevel,
      counterPartyGateways: [gatewayIdentity2],
      enableCrashRecovery: false, // Crash recovery disabled
      ccConfig: { bridgeConfig: [besuConfigJSON] },
      localRepository: db_local_config1,
      remoteRepository: db_remote_config1,
      gatewayKeyPair: {
        privateKey: Buffer.from(gateway1KeyPair.privateKey).toString("hex"),
        publicKey: Buffer.from(gateway1KeyPair.publicKey).toString("hex"),
      },
    });

    const files2 = setupGatewayDockerFiles({
      gatewayIdentity: gatewayIdentity2,
      logLevel,
      counterPartyGateways: [gatewayIdentity1],
      enableCrashRecovery: false, // Crash recovery disabled
      ccConfig: { bridgeConfig: [fabricConfigJSON] },
      localRepository: db_local_config2,
      remoteRepository: db_remote_config2,
      gatewayKeyPair: {
        privateKey: Buffer.from(gateway2KeyPair.privateKey).toString("hex"),
        publicKey: Buffer.from(gateway2KeyPair.publicKey).toString("hex"),
      },
    });

    // gatewayRunner setup:
    const gatewayRunnerOptions1: ISATPGatewayRunnerConstructorOptions = {
      containerImageVersion: DOCKER_IMAGE_VERSION,
      containerImageName: DOCKER_IMAGE_NAME,
      serverPort: DEFAULT_PORT_GATEWAY_SERVER,
      clientPort: DEFAULT_PORT_GATEWAY_CLIENT,
      oapiPort: DEFAULT_PORT_GATEWAY_OAPI,
      logLevel,
      emitContainerLogs: true,
      configPath: files1.configPath,
      logsPath: files1.logsPath,
      ontologiesPath: files1.ontologiesPath,
      networkName: testNetwork,
      url: gateway1Address,
    };

    // gatewayRunner setup:
    const gatewayRunnerOptions2: ISATPGatewayRunnerConstructorOptions = {
      containerImageVersion: DOCKER_IMAGE_VERSION,
      containerImageName: DOCKER_IMAGE_NAME,
      serverPort: DEFAULT_PORT_GATEWAY_SERVER + 100,
      clientPort: DEFAULT_PORT_GATEWAY_CLIENT + 100,
      oapiPort: DEFAULT_PORT_GATEWAY_OAPI + 100,
      logLevel,
      emitContainerLogs: true,
      configPath: files2.configPath,
      logsPath: files2.logsPath,
      ontologiesPath: files2.ontologiesPath,
      networkName: testNetwork,
      url: gateway2Address,
    };

    gatewayRunner1 = new SATPGatewayRunner(gatewayRunnerOptions1);
    log.debug("starting gatewayRunner...");
    await gatewayRunner1.start();
    log.debug("gatewayRunner started sucessfully");

    gatewayRunner2 = new SATPGatewayRunner(gatewayRunnerOptions2);
    log.debug("starting gatewayRunner...");
    await gatewayRunner2.start();
    log.debug("gatewayRunner started sucessfully");

    const approveAddressApi1 = new GetApproveAddressApi(
      new Configuration({
        basePath: `http://${await gatewayRunner1.getOApiHost()}`,
      }),
    );

    const reqApproveBesuAddress = await approveAddressApi1.getApproveAddress(
      besuEnv.network,
      TokenType.NonstandardFungible,
    );

    if (!reqApproveBesuAddress?.data.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    expect(reqApproveBesuAddress?.data.approveAddress).toBeDefined();

    await besuEnv.giveRoleToBridge(reqApproveBesuAddress?.data.approveAddress);

    if (reqApproveBesuAddress?.data.approveAddress) {
      await besuEnv.approveAmount(
        reqApproveBesuAddress.data.approveAddress,
        "100",
      );
    } else {
      throw new Error("Approve address is undefined");
    }
    log.debug("Approved 100 amout to the Besu Bridge Address");

    const approveAddressApi2 = new GetApproveAddressApi(
      new Configuration({
        basePath: `http://${await gatewayRunner2.getOApiHost()}`,
      }),
    );

    const reqApproveFabricAddress = await approveAddressApi2.getApproveAddress(
      fabricEnv.network,
      TokenType.NonstandardFungible,
    );
    expect(reqApproveFabricAddress?.data.approveAddress).toBeDefined();

    if (!reqApproveFabricAddress?.data.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    await fabricEnv.giveRoleToBridge("Org2MSP");

    const satpApi = new TransactionApi(
      new Configuration({
        basePath: `http://${await gatewayRunner1.getOApiHost()}`,
      }),
    );

    const req = getTransactRequest(
      "mockContext",
      besuEnv,
      fabricEnv,
      "100",
      "100",
    );

    const res = await satpApi.transact(req);
    log.info(res?.status);
    log.info(res.data.statusResponse);
    expect(res?.status).toBe(200);

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Owner account");

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      reqApproveBesuAddress?.data.approveAddress,
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Wrapper account");

    await fabricEnv.checkBalance(
      fabricEnv.getTestContractName(),
      fabricEnv.getTestChannelName(),
      reqApproveFabricAddress?.data.approveAddress,
      "0",
      fabricEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Bridge account");

    await fabricEnv.checkBalance(
      fabricEnv.getTestContractName(),
      fabricEnv.getTestChannelName(),
      fabricEnv.getTestOwnerAccount(),
      "100",
      fabricEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Owner account");
  });
});

describe("SATPGateway sending a token from Fabric to Besu", () => {
  jest.setTimeout(TIMEOUT);
  it("should realize a transfer", async () => {
    // gatewayIds setup:
    const gateway1KeyPair = Secp256k1Keys.generateKeyPairsBuffer();
    const gateway2KeyPair = Secp256k1Keys.generateKeyPairsBuffer();

    const gatewayIdentity1 = {
      id: "mockID-1",
      name: "CustomGateway",
      version: [
        {
          Core: SATP_CORE_VERSION,
          Architecture: SATP_ARCHITECTURE_VERSION,
          Crash: SATP_CRASH_VERSION,
        },
      ],
      connectedDLTs: [
        {
          id: FabricTestEnvironment.FABRIC_NETWORK_ID,
          ledgerType: LedgerType.Fabric2,
        },
      ],
      proofID: "mockProofID10",
      address: `http://${gateway1Address}`,
      gatewayClientPort: DEFAULT_PORT_GATEWAY_CLIENT,
      gatewayServerPort: DEFAULT_PORT_GATEWAY_SERVER,
      gatewayOapiPort: DEFAULT_PORT_GATEWAY_OAPI,
      pubKey: Buffer.from(gateway1KeyPair.publicKey).toString("hex"),
    } as GatewayIdentity;

    // gateway setup:
    const gatewayIdentity2 = {
      id: "mockID-2",
      name: "CustomGateway",
      version: [
        {
          Core: SATP_CORE_VERSION,
          Architecture: SATP_ARCHITECTURE_VERSION,
          Crash: SATP_CRASH_VERSION,
        },
      ],
      connectedDLTs: [
        {
          id: BesuTestEnvironment.BESU_NETWORK_ID,
          ledgerType: LedgerType.Besu2X,
        },
      ],
      proofID: "mockProofID11",
      address: `http://${gateway2Address}`,
      gatewayClientPort: DEFAULT_PORT_GATEWAY_CLIENT,
      gatewayServerPort: DEFAULT_PORT_GATEWAY_SERVER,
      gatewayOapiPort: DEFAULT_PORT_GATEWAY_OAPI,
      pubKey: Buffer.from(gateway2KeyPair.publicKey).toString("hex"),
    } as GatewayIdentity;

    // fabricConfig Json object setup:
    const fabricConfigJSON = await fabricEnv.createFabricDockerConfig(
      getTestConfigFilesDirectory(`gateway-info-${gatewayIdentity1.id}`),
    );

    // besuConfig Json object setup:
    const besuConfigJSON = await besuEnv.createBesuDockerConfig();

    // gateway configuration setup:
    const files1 = setupGatewayDockerFiles({
      gatewayIdentity: gatewayIdentity1,
      logLevel,
      counterPartyGateways: [gatewayIdentity2],
      enableCrashRecovery: false, // Crash recovery disabled
      ccConfig: { bridgeConfig: [fabricConfigJSON] },
      localRepository: db_local_config1,
      remoteRepository: db_remote_config1,
      gatewayId: "gateway-1",
      gatewayKeyPair: {
        privateKey: Buffer.from(gateway1KeyPair.privateKey).toString("hex"),
        publicKey: Buffer.from(gateway1KeyPair.publicKey).toString("hex"),
      },
    });

    const files2 = setupGatewayDockerFiles({
      gatewayIdentity: gatewayIdentity2,
      logLevel,
      counterPartyGateways: [gatewayIdentity1],
      enableCrashRecovery: false, // Crash recovery disabled
      ccConfig: { bridgeConfig: [besuConfigJSON] },
      localRepository: db_local_config2,
      remoteRepository: db_remote_config2,
      gatewayId: "gateway-2",
      gatewayKeyPair: {
        privateKey: Buffer.from(gateway2KeyPair.privateKey).toString("hex"),
        publicKey: Buffer.from(gateway2KeyPair.publicKey).toString("hex"),
      },
    });

    // gatewayRunner setup:
    const gatewayRunnerOptions1: ISATPGatewayRunnerConstructorOptions = {
      containerImageVersion: DOCKER_IMAGE_VERSION,
      containerImageName: DOCKER_IMAGE_NAME,
      serverPort: DEFAULT_PORT_GATEWAY_SERVER,
      clientPort: DEFAULT_PORT_GATEWAY_CLIENT,
      oapiPort: DEFAULT_PORT_GATEWAY_OAPI,
      logLevel,
      emitContainerLogs: true,
      configPath: files1.configPath,
      logsPath: files1.logsPath,
      ontologiesPath: files1.ontologiesPath,
      networkName: testNetwork,
      url: gateway1Address,
    };

    // gatewayRunner setup:
    const gatewayRunnerOptions2: ISATPGatewayRunnerConstructorOptions = {
      containerImageVersion: DOCKER_IMAGE_VERSION,
      containerImageName: DOCKER_IMAGE_NAME,
      serverPort: DEFAULT_PORT_GATEWAY_SERVER + 100,
      clientPort: DEFAULT_PORT_GATEWAY_CLIENT + 100,
      oapiPort: DEFAULT_PORT_GATEWAY_OAPI + 100,
      logLevel,
      emitContainerLogs: true,
      configPath: files2.configPath,
      logsPath: files2.logsPath,
      ontologiesPath: files2.ontologiesPath,
      networkName: testNetwork,
      url: gateway2Address,
    };

    gatewayRunner1 = new SATPGatewayRunner(gatewayRunnerOptions1);
    log.debug("starting gatewayRunner...");
    await gatewayRunner1.start();
    console.log("gatewayRunner started sucessfully");

    gatewayRunner2 = new SATPGatewayRunner(gatewayRunnerOptions2);
    log.debug("starting gatewayRunner...");
    await gatewayRunner2.start();
    log.debug("gatewayRunner started sucessfully");

    const approveAddressApi1 = new GetApproveAddressApi(
      new Configuration({
        basePath: `http://${await gatewayRunner1.getOApiHost()}`,
      }),
    );

    const reqApproveFabricAddress = await approveAddressApi1.getApproveAddress(
      fabricEnv.network,
      TokenType.NonstandardFungible,
    );

    if (!reqApproveFabricAddress?.data.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    expect(reqApproveFabricAddress?.data.approveAddress).toBeDefined();

    await fabricEnv.giveRoleToBridge("Org2MSP"); //This depend on the Fabric setup

    if (reqApproveFabricAddress?.data.approveAddress) {
      await fabricEnv.approveAmount(
        reqApproveFabricAddress.data.approveAddress,
        "100",
      );
    }

    log.debug("Approved 100 amount to the Fabric Bridge Address");

    const approveAddressApi2 = new GetApproveAddressApi(
      new Configuration({
        basePath: `http://${await gatewayRunner2.getOApiHost()}`,
      }),
    );

    const reqApproveBesuAddress = await approveAddressApi2.getApproveAddress(
      besuEnv.network,
      TokenType.NonstandardFungible,
    );

    expect(reqApproveBesuAddress?.data.approveAddress).toBeDefined();

    if (!reqApproveBesuAddress?.data.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    await besuEnv.giveRoleToBridge(reqApproveBesuAddress.data.approveAddress);

    const satpApi = new TransactionApi(
      new Configuration({
        basePath: `http://${await gatewayRunner1.getOApiHost()}`,
      }),
    );

    const req = getTransactRequest(
      "mockContext",
      fabricEnv,
      besuEnv,
      "100",
      "100",
    );

    const res = await satpApi.transact(req);
    log.info(res?.status);
    log.info(res.data.statusResponse);
    expect(res?.status).toBe(200);

    await fabricEnv.checkBalance(
      fabricEnv.getTestContractName(),
      fabricEnv.getTestChannelName(),
      fabricEnv.getTestOwnerAccount(),
      "0",
      fabricEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transferred correctly from the Owner account");

    await fabricEnv.checkBalance(
      fabricEnv.getTestContractName(),
      fabricEnv.getTestChannelName(),
      reqApproveFabricAddress?.data.approveAddress,
      "0",
      fabricEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transferred correctly to the Wrapper account");

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      reqApproveBesuAddress?.data.approveAddress,
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transferred correctly from the Bridge account");

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "100",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transferred correctly to the Owner account");

    // check audit endpoint and get audit data
    const adminApi = new AdminApi(
      new Configuration({
        basePath: `http://${await gatewayRunner1.getOApiHost()}`,
      }),
    );

    const auditResponse = await adminApi.performAudit(0, Date.now());

    expect(auditResponse?.data.sessions).toBeDefined();
    expect(auditResponse?.data.sessions?.length).toEqual(1);

    log.info(
      `Audit response: ${JSON.stringify(auditResponse?.data.sessions?.[0])}`,
    );

    const json_parsed = JSON.parse(
      auditResponse?.data.sessions?.[0] || "{}",
    ) as { id: string };
    expect(json_parsed).toBeDefined();
    expect(json_parsed.id).toBe(res.data.sessionID);
  });
});

describe("2 SATPGateways sending a token from Besu to Ethereum", () => {
  jest.setTimeout(TIMEOUT);
  it("should realize a transfer", async () => {
    // gatewayIds setup:
    const gateway1KeyPair = Secp256k1Keys.generateKeyPairsBuffer();
    const gateway2KeyPair = Secp256k1Keys.generateKeyPairsBuffer();

    const gatewayIdentity1 = {
      id: "mockID-1",
      name: "CustomGateway",
      version: [
        {
          Core: SATP_CORE_VERSION,
          Architecture: SATP_ARCHITECTURE_VERSION,
          Crash: SATP_CRASH_VERSION,
        },
      ],
      connectedDLTs: [
        {
          id: BesuTestEnvironment.BESU_NETWORK_ID,
          ledgerType: LedgerType.Besu2X,
        },
      ],
      proofID: "mockProofID10",
      address: `http://${gateway1Address}`,
      gatewayClientPort: DEFAULT_PORT_GATEWAY_CLIENT,
      gatewayServerPort: DEFAULT_PORT_GATEWAY_SERVER,
      gatewayOapiPort: DEFAULT_PORT_GATEWAY_OAPI,
      pubKey: Buffer.from(gateway1KeyPair.publicKey).toString("hex"),
    } as GatewayIdentity;

    // gateway setup:
    const gatewayIdentity2 = {
      id: "mockID-2",
      name: "CustomGateway",
      version: [
        {
          Core: SATP_CORE_VERSION,
          Architecture: SATP_ARCHITECTURE_VERSION,
          Crash: SATP_CRASH_VERSION,
        },
      ],
      connectedDLTs: [
        {
          id: EthereumTestEnvironment.ETH_NETWORK_ID,
          ledgerType: LedgerType.Ethereum,
        },
      ],
      proofID: "mockProofID11",
      address: `http://${gateway2Address}`,
      gatewayClientPort: DEFAULT_PORT_GATEWAY_CLIENT,
      gatewayServerPort: DEFAULT_PORT_GATEWAY_SERVER,
      gatewayOapiPort: DEFAULT_PORT_GATEWAY_OAPI,
      pubKey: Buffer.from(gateway2KeyPair.publicKey).toString("hex"),
    } as GatewayIdentity;

    // besuConfig Json object setup:
    const besuConfig = await besuEnv.createBesuDockerConfig();

    // fabricConfig Json object setup:
    const ethereumConfig = await ethereumEnv.createEthereumDockerConfig();

    const files1 = setupGatewayDockerFiles({
      gatewayIdentity: gatewayIdentity1,
      logLevel,
      counterPartyGateways: [gatewayIdentity2],
      enableCrashRecovery: false, // Crash recovery disabled
      ccConfig: { bridgeConfig: [besuConfig] },
      localRepository: db_local_config1,
      remoteRepository: db_remote_config1,
      gatewayId: "gateway-1",
      gatewayKeyPair: {
        privateKey: Buffer.from(gateway1KeyPair.privateKey).toString("hex"),
        publicKey: Buffer.from(gateway1KeyPair.publicKey).toString("hex"),
      },
    });

    const files2 = setupGatewayDockerFiles({
      gatewayIdentity: gatewayIdentity2,
      logLevel,
      counterPartyGateways: [gatewayIdentity1],
      enableCrashRecovery: false, // Crash recovery disabled
      ccConfig: { bridgeConfig: [ethereumConfig] },
      localRepository: db_local_config2,
      remoteRepository: db_remote_config2,
      gatewayId: "gateway-2",
      gatewayKeyPair: {
        privateKey: Buffer.from(gateway2KeyPair.privateKey).toString("hex"),
        publicKey: Buffer.from(gateway2KeyPair.publicKey).toString("hex"),
      },
    });

    // gatewayRunner setup:
    const gatewayRunnerOptions1: ISATPGatewayRunnerConstructorOptions = {
      containerImageVersion: DOCKER_IMAGE_VERSION,
      containerImageName: DOCKER_IMAGE_NAME,
      serverPort: DEFAULT_PORT_GATEWAY_SERVER,
      clientPort: DEFAULT_PORT_GATEWAY_CLIENT,
      oapiPort: DEFAULT_PORT_GATEWAY_OAPI,
      logLevel,
      emitContainerLogs: true,
      configPath: files1.configPath,
      logsPath: files1.logsPath,
      ontologiesPath: files1.ontologiesPath,
      networkName: testNetwork,
      url: gateway1Address,
    };

    // gatewayRunner setup:
    const gatewayRunnerOptions2: ISATPGatewayRunnerConstructorOptions = {
      containerImageVersion: DOCKER_IMAGE_VERSION,
      containerImageName: DOCKER_IMAGE_NAME,
      serverPort: DEFAULT_PORT_GATEWAY_SERVER + 100,
      clientPort: DEFAULT_PORT_GATEWAY_CLIENT + 100,
      oapiPort: DEFAULT_PORT_GATEWAY_OAPI + 100,
      logLevel,
      emitContainerLogs: true,
      configPath: files2.configPath,
      logsPath: files2.logsPath,
      ontologiesPath: files2.ontologiesPath,
      networkName: testNetwork,
      url: gateway2Address,
    };

    gatewayRunner1 = new SATPGatewayRunner(gatewayRunnerOptions1);
    log.debug("starting gatewayRunner...");
    await gatewayRunner1.start();
    log.debug("gatewayRunner started sucessfully");

    gatewayRunner2 = new SATPGatewayRunner(gatewayRunnerOptions2);
    log.debug("starting gatewayRunner...");
    await gatewayRunner2.start();
    log.debug("gatewayRunner started sucessfully");

    const approveAddressApi1 = new GetApproveAddressApi(
      new Configuration({
        basePath: `http://${await gatewayRunner1.getOApiHost()}`,
      }),
    );

    const reqApproveBesuAddress = await approveAddressApi1.getApproveAddress(
      besuEnv.network,
      TokenType.NonstandardFungible,
    );

    if (!reqApproveBesuAddress?.data.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    expect(reqApproveBesuAddress?.data.approveAddress).toBeDefined();

    await besuEnv.giveRoleToBridge(reqApproveBesuAddress?.data.approveAddress);

    if (reqApproveBesuAddress?.data.approveAddress) {
      await besuEnv.approveAmount(
        reqApproveBesuAddress.data.approveAddress,
        "100",
      );
    } else {
      throw new Error("Approve address is undefined");
    }
    log.debug("Approved 100 amout to the Besu Bridge Address");

    const approveAddressApi2 = new GetApproveAddressApi(
      new Configuration({
        basePath: `http://${await gatewayRunner2.getOApiHost()}`,
      }),
    );

    const reqApproveEthereumAddress =
      await approveAddressApi2.getApproveAddress(
        ethereumEnv.network,
        TokenType.NonstandardFungible,
      );

    expect(reqApproveEthereumAddress?.data.approveAddress).toBeDefined();

    if (!reqApproveEthereumAddress?.data.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    await ethereumEnv.giveRoleToBridge(
      reqApproveEthereumAddress.data.approveAddress,
    );

    const satpApi = new TransactionApi(
      new Configuration({
        basePath: `http://${await gatewayRunner1.getOApiHost()}`,
      }),
    );
    const adminApi = new AdminApi(
      new Configuration({
        basePath: `http://${await gatewayRunner1.getOApiHost()}`,
      }),
    );

    const req = getTransactRequest(
      "mockContext",
      besuEnv,
      ethereumEnv,
      "100",
      "100",
    );

    const res = await satpApi.transact(req);
    log.info(res?.status);
    log.info(res.data.statusResponse);
    expect(res?.status).toBe(200);

    const statusResponse = await adminApi.getStatus(res.data.sessionID);

    expect(statusResponse?.data.startTime).toBeDefined();
    expect(statusResponse?.data.status).toBe("DONE");
    expect(statusResponse?.data.substatus).toBe("COMPLETED");
    expect(statusResponse?.data.stage).toBe("SATP_STAGE_3");

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Owner account");

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Wrapper account");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestContractName(),
      ethereumEnv.getTestContractAddress(),
      ethereumEnv.getTestContractAbi(),
      reqApproveEthereumAddress?.data.approveAddress,
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Bridge account");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestContractName(),
      ethereumEnv.getTestContractAddress(),
      ethereumEnv.getTestContractAbi(),
      ethereumEnv.getTestOwnerAccount(),
      "100",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Owner account");
  });
});
