//When this works, add the test to the
//respective existing
//satp-e2e-transfer-1-gateway.test.ts file
import "jest-extended";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { v4 as uuidv4 } from "uuid";
import {
  pruneDockerAllIfGithubAction,
  Containers,
} from "@hyperledger/cactus-test-tooling";
import {
  SATPGatewayConfig,
  SATPGateway,
  PluginFactorySATPGateway,
  TransactionApi,
  Configuration,
  GetApproveAddressApi,
  TokenType,
} from "../../../../main/typescript";
import {
  Address,
  GatewayIdentity,
} from "../../../../main/typescript/core/types";
import {
  IPluginFactoryOptions,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import { ClaimFormat } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import {
  BesuTestEnvironment,
  EthereumTestEnvironment,
  getTransactRequest,
} from "../../test-utils";
import {
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../../main/typescript/core/constants";
import { Knex, knex } from "knex";
import { ApiServer } from "@hyperledger/cactus-cmd-api-server";
import { PluginRegistry } from "@hyperledger/cactus-core";
import path from "path";
import { createMigrationSource } from "../../../../main/typescript/database/knex-migration-source";
import { knexRemoteInstance } from "../../../../main/typescript/database/knexfile-remote";
import { knexLocalInstance } from "../../../../main/typescript/database/knexfile";
import { TokenType as TokenTypeRaw } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "SATP - Hermes",
});

let knexSourceRemoteClient: Knex;
let knexLocalClient: Knex;
let besuEnv: BesuTestEnvironment;
let ethereumEnv: EthereumTestEnvironment;
let gateway: SATPGateway;

let approveAddressApi: any;
let reqApproveBesuAddress: any;

const uniqueTokenId1 = "1001";

const TIMEOUT = 900000; // 15 minutes
afterAll(async () => {
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

afterEach(async () => {
  if (gateway) {
    await gateway.shutdown();
  }
  if (knexLocalClient) {
    await knexLocalClient.destroy();
  }
  if (knexSourceRemoteClient) {
    await knexSourceRemoteClient.destroy();
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

  {
    const erc721TokenContract = "SATPNonFungibleTokenContract";
    besuEnv = await BesuTestEnvironment.setupTestEnvironment(
      {
        contractName: erc721TokenContract,
        logLevel,
      },
      TokenTypeRaw.NONSTANDARD_NONFUNGIBLE,
    );
    log.info("Besu Ledger started successfully");

    await besuEnv.deployAndSetupContracts(ClaimFormat.BUNGEE);
  }
  {
    const erc20TokenContract = "SATPFungibleTokenContract";
    const erc721TokenContract = "SATPNonFungibleTokenContract";
    ethereumEnv = await EthereumTestEnvironment.setupTestEnvironment({
      contractName: erc20TokenContract,
      contractName2: erc721TokenContract, //TODO: remove when correcting ethEnvironment to not receive a second contract name
      logLevel,
    });
    log.info("Ethereum Ledger started successfully");
    await ethereumEnv.deployAndSetupContracts(ClaimFormat.BUNGEE);
  }
}, TIMEOUT);

describe("SATPGateway sending a token from Besu to Ethereum", () => {
  jest.setTimeout(TIMEOUT);
  it("should start the SATP Gateway", async () => {
    //setup satp gateway
    const factoryOptions: IPluginFactoryOptions = {
      pluginImportType: PluginImportType.Local,
    };
    const factory = new PluginFactorySATPGateway(factoryOptions);

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
      address: "http://localhost" as Address,
    } as GatewayIdentity;

    const migrationSource = await createMigrationSource();
    knexLocalClient = knex({
      ...knexLocalInstance.default,
      migrations: {
        migrationSource: migrationSource,
      },
    });
    knexSourceRemoteClient = knex({
      ...knexRemoteInstance.default,
      migrations: {
        migrationSource: migrationSource,
      },
    });
    await knexSourceRemoteClient.migrate.latest();

    const ethereumNetworkOptions = ethereumEnv.createEthereumConfig();
    const besuNetworkOptions = besuEnv.createBesuConfig();

    const ontologiesPath = path.join(__dirname, "../../../ontologies");

    const options: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity,
      ccConfig: {
        bridgeConfig: [ethereumNetworkOptions, besuNetworkOptions],
      },
      localRepository: knexLocalInstance.default,
      remoteRepository: knexRemoteInstance.default,
      pluginRegistry: new PluginRegistry({
        plugins: [],
      }),
      ontologyPath: ontologiesPath,
    };
    gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);
    await gateway.onPluginInit();

    const identity = gateway.Identity;
    // default servers
    expect(identity.gatewayServerPort).toBe(3010);
    expect(identity.gatewayClientPort).toBe(3011);
    expect(identity.gatewayOapiPort).toBe(4010);
    expect(identity.address).toBe("http://localhost");
  });

  it("should start the API Server", async () => {
    const apiServer = await gateway.getOrCreateHttpServer();
    expect(apiServer).toBeInstanceOf(ApiServer);

    approveAddressApi = new GetApproveAddressApi(
      new Configuration({ basePath: gateway.getAddressOApiAddress() }),
    );
  });

  it("should give the role to the Besu Bridge Address and approve a token", async () => {
    reqApproveBesuAddress = await approveAddressApi.getApproveAddress(
      besuEnv.network,
      TokenType.NonstandardNonfungible,
    );

    if (!reqApproveBesuAddress?.data.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    expect(reqApproveBesuAddress?.data.approveAddress).toBeDefined();
    await besuEnv.giveRoleToBridge(reqApproveBesuAddress?.data.approveAddress);

    if (reqApproveBesuAddress?.data.approveAddress) {
      await besuEnv.approveToken(
        reqApproveBesuAddress.data.approveAddress,
        uniqueTokenId1,
      );
    }

    log.debug(`Approved token ${uniqueTokenId1} to the Besu Bridge Address`);
  });

  it("should give the role to the Ethereum Bridge Address", async () => {
    const reqApproveEthereumAddress = await approveAddressApi.getApproveAddress(
      ethereumEnv.network,
      TokenType.NonstandardNonfungible,
    );

    expect(reqApproveEthereumAddress?.data.approveAddress).toBeDefined();

    if (!reqApproveEthereumAddress?.data.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    await ethereumEnv.giveRoleToBridge(
      reqApproveEthereumAddress.data.approveAddress,
    );
  });

  it("should realize a transfer", async () => {
    const satpApi = new TransactionApi(
      new Configuration({ basePath: gateway.getAddressOApiAddress() }),
    );

    const req = getTransactRequest(
      "mockContext",
      besuEnv,
      ethereumEnv,
      uniqueTokenId1,
      uniqueTokenId1,
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
    log.info(
      `Token ${uniqueTokenId1} was transferred correctly from the Owner account`,
    );

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestContractName(),
      ethereumEnv.getTestContractAddress(),
      ethereumEnv.getTestContractAbi(),
      ethereumEnv.getTestOwnerAccount(),
      "1",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info(
      `Token ${uniqueTokenId1} was transfer correctly to the Owner account`,
    );

    await gateway.shutdown();
  });
});

describe("SATPGateway sending a token from Ethereum to Besu", () => {
  jest.setTimeout(TIMEOUT);
});
