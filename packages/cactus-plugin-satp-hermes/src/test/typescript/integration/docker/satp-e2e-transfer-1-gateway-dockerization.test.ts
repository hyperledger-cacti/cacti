import "jest-extended";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
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
  FabricTestEnvironment,
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
import { Configuration } from "@hyperledger/cactus-core-api";
import {
  GetApproveAddressApi,
  TokenType,
  TransactionApi,
} from "../../../../main/typescript";
import { DOCKER_IMAGE_NAME, DOCKER_IMAGE_VERSION } from "../../constants";

const logLevel: LogLevelDesc = "TRACE";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "SATP - Hermes",
});

let besuEnv: BesuTestEnvironment;
let ethereumEnv: EthereumTestEnvironment;
let fabricEnv: FabricTestEnvironment;

const erc20TokenContract = "SATPContract";

let db_local_config: Knex.Config;
let db_remote_config: Knex.Config;
let db_local: Container;
let db_remote: Container;
let gatewayRunner: SATPGatewayRunner;

const testNetwork = "test-network";

const gatewayAddress = "gateway.satp-hermes";

const TIMEOUT = 900000; // 15 minutes
afterEach(async () => {
  if (gatewayRunner) {
    await gatewayRunner.stop();
    await gatewayRunner.destroy();
  }
}, TIMEOUT);

afterAll(async () => {
  await db_local.stop();
  await db_local.remove();
  await db_remote.stop();
  await db_remote.remove();

  await besuEnv.tearDown();
  await ethereumEnv.tearDown();
  await fabricEnv.tearDown();

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

  ({ config: db_local_config, container: db_local } = await createPGDatabase({
    port: 5432,
    network: testNetwork,
    postgresUser: "user123123",
    postgresPassword: "password",
  }));

  ({ config: db_remote_config, container: db_remote } = await createPGDatabase({
    port: 5450,
    network: testNetwork,
    postgresUser: "user123123",
    postgresPassword: "password",
  }));

  await setupDBTable(db_remote_config);

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
}, TIMEOUT);

describe("SATPGateway sending a token from Besu to Fabric", () => {
  jest.setTimeout(TIMEOUT);
  it("should mint 100 tokens to the owner account", async () => {
    await besuEnv.mintTokens("100");
    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "100",
      besuEnv.getTestOwnerSigningCredential(),
    );
  });
  it("should realize a transfer", async () => {
    const address: Address = `http://${gatewayAddress}`;

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
      gatewayClientPort: DEFAULT_PORT_GATEWAY_CLIENT,
      gatewayServerPort: DEFAULT_PORT_GATEWAY_SERVER,
      gatewayOapiPort: DEFAULT_PORT_GATEWAY_OAPI,
    } as GatewayIdentity;

    // besuConfig Json object setup:
    const besuConfigJSON = await besuEnv.createBesuDockerConfig();

    // fabricConfig Json object setup:
    const fabricConfigJSON = await fabricEnv.createFabricDockerConfig();

    // gateway configuration setup:
    const files = setupGatewayDockerFiles({
      gatewayIdentity,
      logLevel,
      counterPartyGateways: [], //only knows itself
      enableCrashRecovery: false, // Crash recovery disabled
      ccConfig: { bridgeConfig: [besuConfigJSON, fabricConfigJSON] },
      localRepository: db_local_config,
      remoteRepository: db_remote_config,
    });

    // gatewayRunner setup:
    const gatewayRunnerOptions: ISATPGatewayRunnerConstructorOptions = {
      containerImageVersion: DOCKER_IMAGE_VERSION,
      containerImageName: DOCKER_IMAGE_NAME,
      logLevel,
      emitContainerLogs: true,
      configFilePath: files.configFilePath,
      logsPath: files.logsPath,
      ontologiesPath: files.ontologiesPath,
      networkName: testNetwork,
      url: gatewayAddress,
    };

    gatewayRunner = new SATPGatewayRunner(gatewayRunnerOptions);
    log.debug("starting gatewayRunner...");
    await gatewayRunner.start(false);
    log.debug("gatewayRunner started sucessfully");

    const approveAddressApi = new GetApproveAddressApi(
      new Configuration({
        basePath: `http://${await gatewayRunner.getOApiHost()}`,
      }),
    );

    const reqApproveBesuAddress = await approveAddressApi.getApproveAddress(
      besuEnv.network,
      TokenType.NonstandardFungible,
    );

    expect(reqApproveBesuAddress?.data.approveAddress).toBeDefined();

    if (!reqApproveBesuAddress?.data.approveAddress) {
      throw new Error("Approve address is undefined");
    }

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

    const reqApproveFabricAddress = await approveAddressApi.getApproveAddress(
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
        basePath: `http://${await gatewayRunner.getOApiHost()}`,
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
    const address: Address = `http://${gatewayAddress}`;

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

    // ethereumConfig Json object setup:
    const besuConfigJSON = await besuEnv.createBesuDockerConfig();

    // fabricConfig Json object setup:
    const fabricConfigJSON = await fabricEnv.createFabricDockerConfig();

    // gateway configuration setup:
    const files = setupGatewayDockerFiles({
      gatewayIdentity,
      logLevel,
      counterPartyGateways: [], //only knows itself
      enableCrashRecovery: false, // Crash recovery disabled
      ccConfig: { bridgeConfig: [besuConfigJSON, fabricConfigJSON] },
      localRepository: db_local_config,
      remoteRepository: db_remote_config,
    });

    // gatewayRunner setup:
    const gatewayRunnerOptions: ISATPGatewayRunnerConstructorOptions = {
      containerImageVersion: DOCKER_IMAGE_VERSION,
      containerImageName: DOCKER_IMAGE_NAME,
      logLevel,
      emitContainerLogs: true,
      configFilePath: files.configFilePath,
      logsPath: files.logsPath,
      ontologiesPath: files.ontologiesPath,
      networkName: testNetwork,
      url: gatewayAddress,
    };

    gatewayRunner = new SATPGatewayRunner(gatewayRunnerOptions);
    log.debug("starting gatewayRunner...");
    await gatewayRunner.start(true);
    log.debug("gatewayRunner started sucessfully");

    const approveAddressApi = new GetApproveAddressApi(
      new Configuration({
        basePath: `http://${await gatewayRunner.getOApiHost()}`,
      }),
    );

    const reqApproveFabricAddress = await approveAddressApi.getApproveAddress(
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

    const reqApproveBesuAddress = await approveAddressApi.getApproveAddress(
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
        basePath: `http://${await gatewayRunner.getOApiHost()}`,
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
  });
});

describe("SATPGateway sending a token from Besu to Ethereum", () => {
  jest.setTimeout(TIMEOUT);
  it("should realize a transfer", async () => {
    const address: Address = `http://${gatewayAddress}`;

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
      gatewayClientPort: DEFAULT_PORT_GATEWAY_CLIENT,
      gatewayServerPort: DEFAULT_PORT_GATEWAY_SERVER,
      gatewayOapiPort: DEFAULT_PORT_GATEWAY_OAPI,
    } as GatewayIdentity;

    // besuConfig Json object setup:
    const besuConfig = await besuEnv.createBesuDockerConfig();

    // fabricConfig Json object setup:
    const ethereumConfig = await ethereumEnv.createEthereumDockerConfig();

    // gateway configuration setup:
    const files = setupGatewayDockerFiles({
      gatewayIdentity,
      logLevel,
      counterPartyGateways: [], //only knows itself
      enableCrashRecovery: false, // Crash recovery disabled
      ccConfig: { bridgeConfig: [besuConfig, ethereumConfig] },
      localRepository: db_local_config,
      remoteRepository: db_remote_config,
    });

    // gatewayRunner setup:
    const gatewayRunnerOptions: ISATPGatewayRunnerConstructorOptions = {
      containerImageVersion: DOCKER_IMAGE_VERSION,
      containerImageName: DOCKER_IMAGE_NAME,
      logLevel,
      emitContainerLogs: true,
      configFilePath: files.configFilePath,
      logsPath: files.logsPath,
      ontologiesPath: files.ontologiesPath,
      networkName: testNetwork,
      url: gatewayAddress,
    };

    gatewayRunner = new SATPGatewayRunner(gatewayRunnerOptions);
    log.debug("starting gatewayRunner...");
    await gatewayRunner.start(true);
    log.debug("gatewayRunner started sucessfully");

    const approveAddressApi = new GetApproveAddressApi(
      new Configuration({
        basePath: `http://${await gatewayRunner.getOApiHost()}`,
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
        basePath: `http://${await gatewayRunner.getOApiHost()}`,
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
      "100",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Owner account");
  });
});
