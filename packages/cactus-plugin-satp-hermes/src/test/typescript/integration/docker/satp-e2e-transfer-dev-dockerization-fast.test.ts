import "jest-extended";
import {
  LogLevelDesc,
  LoggerProvider,
  Secp256k1Keys,
} from "@hyperledger/cactus-common";
import {
  pruneDockerAllIfGithubAction,
  Containers,
  SATPGatewayRunner,
  ISATPGatewayRunnerConstructorOptions,
} from "@hyperledger/cactus-test-tooling";
import {
  Address,
  GatewayIdentity,
} from "../../../../main/typescript/core/types";
import {
  setupGatewayDockerFiles,
  BesuTestEnvironment,
  getTransactRequest,
  EthereumTestEnvironment,
  createPGDatabase,
  setupDBTable,
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
import { DOCKER_IMAGE_VERSION, DOCKER_IMAGE_NAME } from "../../constants";

const logLevel: LogLevelDesc = "TRACE";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "SATP - Hermes",
});

let besuEnv: BesuTestEnvironment;
let ethereumEnv: EthereumTestEnvironment;

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
let gatewayRunner2: SATPGatewayRunner | undefined;

const testNetwork = "test-network";
const gateway1Address = "gateway1.satp-hermes";
const gateway2Address = "gateway2.satp-hermes";

const TIMEOUT = 900000; // 15 minutes

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

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
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
    port: 5432,
    network: testNetwork,
    postgresUser: "user123123",
    postgresPassword: "password",
  }));

  ({ config: db_remote_config1, container: db_remote1 } =
    await createPGDatabase({
      port: 5450,
      network: testNetwork,
      postgresUser: "user123123",
      postgresPassword: "password",
    }));

  ({ config: db_local_config2, container: db_local2 } = await createPGDatabase({
    port: 5433,
    network: testNetwork,
    postgresUser: "user123123",
    postgresPassword: "password",
  }));

  ({ config: db_remote_config2, container: db_remote2 } =
    await createPGDatabase({
      port: 5451,
      network: testNetwork,
      postgresUser: "user123123",
      postgresPassword: "password",
    }));
  await setupDBTable(db_remote_config1);
  await setupDBTable(db_remote_config2);

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

  // feeding the owner account with 200 tokens in Besu that will be used in the various transfers
  await besuEnv.mintTokens("200");
  await besuEnv.checkBalance(
    besuEnv.getTestContractName(),
    besuEnv.getTestContractAddress(),
    besuEnv.getTestContractAbi(),
    besuEnv.getTestOwnerAccount(),
    "200",
    besuEnv.getTestOwnerSigningCredential(),
  );
}, TIMEOUT);

describe("1 SATPGateway sending a token from Besu to Ethereum", () => {
  jest.setTimeout(TIMEOUT);
  it("should realize a transfer", async () => {
    const address: Address = `http://${gateway1Address}`;

    // gateway setup:
    const gatewayIdentity = {
      id: "mockID",
      name: "CustomGateway",
      version: [
        {
          Core: SATP_CORE_VERSION,
          Architecture: SATP_ARCHITECTURE_VERSION,
          Crash: SATP_CRASH_VERSION,
        },
      ],
      proofID: "mockProofID10",
      address,
    } as GatewayIdentity;

    // besuConfig Json object setup:
    const besuConfig = await besuEnv.createBesuDockerConfig();

    // fabricConfig Json object setup:
    const ethereumConfig = await ethereumEnv.createEthereumDockerConfig();

    const files = setupGatewayDockerFiles({
      gatewayIdentity: gatewayIdentity,
      logLevel,
      counterPartyGateways: [],
      enableCrashRecovery: false, // Crash recovery disabled
      ccConfig: { bridgeConfig: [besuConfig, ethereumConfig] },
      localRepository: db_local_config1,
      remoteRepository: db_remote_config1,
      gatewayId: "gateway-1",
    });

    // gatewayRunner setup:
    const gatewayRunnerOptions: ISATPGatewayRunnerConstructorOptions = {
      containerImageVersion: DOCKER_IMAGE_VERSION,
      containerImageName: DOCKER_IMAGE_NAME,
      clientPort: DEFAULT_PORT_GATEWAY_CLIENT,
      serverPort: DEFAULT_PORT_GATEWAY_SERVER,
      oapiPort: DEFAULT_PORT_GATEWAY_OAPI,
      logLevel,
      emitContainerLogs: true,
      configFilePath: files.configFilePath,
      logsPath: files.logsPath,
      ontologiesPath: files.ontologiesPath,
      networkName: testNetwork,
      url: gateway1Address,
    };

    gatewayRunner1 = new SATPGatewayRunner(gatewayRunnerOptions);
    log.debug("starting gatewayRunner...");
    await gatewayRunner1.start();
    log.debug("gatewayRunner started sucessfully");

    log.debug(`http://${await gatewayRunner1.getOApiHost()}`);

    const approveAddressApi = new GetApproveAddressApi(
      new Configuration({
        basePath: `http://${await gatewayRunner1.getOApiHost()}`,
      }),
    );

    const reqApproveBesuAddress = await approveAddressApi.getApproveAddress(
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

    const reqApproveEthereumAddress = await approveAddressApi.getApproveAddress(
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

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "100",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Owner account");

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuEnv.getBridgeEthAccount(),
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
      configFilePath: files1.configFilePath,
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
      configFilePath: files2.configFilePath,
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
      besuEnv.getBridgeEthAccount(),
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
      "200",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Owner account");
  });
});

describe("2 SATPGateways sending a token from Ethereum to Besu", () => {
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
          id: EthereumTestEnvironment.ETH_NETWORK_ID,
          ledgerType: LedgerType.Ethereum,
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

    // besuConfig Json object setup:
    const besuConfig = await besuEnv.createBesuDockerConfig();

    // fabricConfig Json object setup:
    const ethereumConfig = await ethereumEnv.createEthereumDockerConfig();

    const files1 = setupGatewayDockerFiles({
      gatewayIdentity: gatewayIdentity1,
      logLevel,
      counterPartyGateways: [gatewayIdentity2],
      enableCrashRecovery: false, // Crash recovery disabled
      ccConfig: { bridgeConfig: [ethereumConfig] },
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
      ccConfig: { bridgeConfig: [besuConfig] },
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
      configFilePath: files1.configFilePath,
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
      configFilePath: files2.configFilePath,
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

    const reqApproveEthereumAddress =
      await approveAddressApi1.getApproveAddress(
        ethereumEnv.network,
        TokenType.NonstandardFungible,
      );

    if (!reqApproveEthereumAddress?.data.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    expect(reqApproveEthereumAddress?.data.approveAddress).toBeDefined();

    await ethereumEnv.giveRoleToBridge(
      reqApproveEthereumAddress?.data.approveAddress,
    );

    if (reqApproveEthereumAddress?.data.approveAddress) {
      await ethereumEnv.approveAmount(
        reqApproveEthereumAddress.data.approveAddress,
        "200",
      );
    } else {
      throw new Error("Approve address is undefined");
    }
    log.debug("Approved 200 amout to the Ethereum Bridge Address");

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

    const satpApi1 = new TransactionApi(
      new Configuration({
        basePath: `http://${await gatewayRunner1.getOApiHost()}`,
      }),
    );

    const integrations1 = await satpApi1.getIntegrations();

    expect(integrations1?.data.integrations).toBeDefined();
    expect(integrations1?.data.integrations.length).toEqual(1);

    const integration = integrations1?.data.integrations[0];
    expect(integration).toBeDefined();
    expect(integration.environment).toBe("testnet");
    expect(integration.id).toBe("EthereumLedgerTestNetwork");
    expect(integration.name).toBe("Ethereum");
    expect(integration.type).toBe("ETHEREUM");

    log.info("Integration 1 is correct");

    const satpApi2 = new TransactionApi(
      new Configuration({
        basePath: `http://${await gatewayRunner2.getOApiHost()}`,
      }),
    );

    const integrations2 = await satpApi2.getIntegrations();
    expect(integrations2?.data.integrations).toBeDefined();
    expect(integrations2?.data.integrations.length).toEqual(1);

    const integration2 = integrations2?.data.integrations[0];
    expect(integration2).toBeDefined();
    expect(integration2.environment).toBe("testnet");
    expect(integration2.id).toBe("BesuLedgerTestNetwork");
    expect(integration2.name).toBe("Hyperledger Besu");
    expect(integration2.type).toBe("BESU_2X");
    log.info("Integration 2 is correct");

    const req = getTransactRequest(
      "mockContext",
      ethereumEnv,
      besuEnv,
      "200",
      "200",
    );

    const res = await satpApi1.transact(req);
    log.info(res?.status);
    log.info(res.data.statusResponse);
    expect(res?.status).toBe(200);

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestContractName(),
      ethereumEnv.getTestContractAddress(),
      ethereumEnv.getTestContractAbi(),
      ethereumEnv.getTestOwnerAccount(),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Owner account");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestContractName(),
      ethereumEnv.getTestContractAddress(),
      ethereumEnv.getTestContractAbi(),
      ethereumEnv.getBridgeEthAccount(),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Wrapper account");

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      reqApproveEthereumAddress?.data.approveAddress,
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Bridge account");

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "200",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Owner account");

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
