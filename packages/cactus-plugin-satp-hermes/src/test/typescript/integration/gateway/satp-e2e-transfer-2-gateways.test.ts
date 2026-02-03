import "jest-extended";
import { LogLevelDesc, LoggerProvider } from "@hyperledger-cacti/cactus-common";
import {
  pruneDockerContainersIfGithubAction,
  Containers,
} from "@hyperledger-cacti/cactus-test-tooling";
import {
  SATPGatewayConfig,
  SATPGateway,
  PluginFactorySATPGateway,
  TokenType,
} from "../../../../main/typescript";
import {
  Address,
  GatewayIdentity,
} from "../../../../main/typescript/core/types";
import {
  IPluginFactoryOptions,
  LedgerType,
  PluginImportType,
} from "@hyperledger-cacti/cactus-core-api";
import { ClaimFormat } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import {
  BesuTestEnvironment,
  EthereumTestEnvironment,
  FabricTestEnvironment,
  getTransactRequest,
} from "../../test-utils";
import {
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../../main/typescript/core/constants";

import { Knex, knex } from "knex";
import { PluginRegistry } from "@hyperledger-cacti/cactus-core";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { createMigrationSource } from "../../../../main/typescript/database/knex-migration-source";
import { knexRemoteInstance } from "../../../../main/typescript/database/knexfile-remote";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";

import { TokenType as TokenTypeMain } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { SupportedContractTypes as SupportedEthereumContractTypes } from "../../environments/ethereum-test-environment";
import { SupportedContractTypes as SupportedBesuContractTypes } from "../../environments/ethereum-test-environment";

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "SATP - Hermes",
});
const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});

let knexSourceRemoteClient: Knex;
let knexTargetRemoteClient: Knex;
let fabricEnv: FabricTestEnvironment;
let besuEnv: BesuTestEnvironment;
let ethereumEnv: EthereumTestEnvironment;
let gateway1: SATPGateway;
let gateway2: SATPGateway;

async function shutdownGateways() {
  if (gateway1) {
    await gateway1.shutdown();
  }
  if (gateway2) {
    await gateway2.shutdown();
  }
}

const TIMEOUT = 900000; // 15 minutes
afterAll(async () => {
  if (gateway1) {
    if (knexSourceRemoteClient) {
      await knexSourceRemoteClient.destroy();
    }
  }

  if (gateway2) {
    if (knexTargetRemoteClient) {
      await knexTargetRemoteClient.destroy();
    }
  }

  await gateway1.shutdown();
  await gateway2.shutdown();
  await besuEnv.tearDown();
  await fabricEnv.tearDown();
  await ethereumEnv.tearDown();

  await pruneDockerContainersIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
  pruneDockerContainersIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
}, TIMEOUT);

beforeEach(() => {
  pruneDockerContainersIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
}, TIMEOUT);

beforeAll(async () => {
  {
    const satpContractName = "satp-contract";
    fabricEnv = await FabricTestEnvironment.setupTestEnvironment({
      contractName: satpContractName,
      logLevel,
      claimFormat: ClaimFormat.BUNGEE,
    });
    log.info("Fabric Ledger started successfully");

    await fabricEnv.deployAndSetupContracts();
  }

  {
    const erc20TokenContract = "SATPContract";
    const erc721TokenContract = "SATPNonFungibleContract";
    besuEnv = await BesuTestEnvironment.setupTestEnvironment(
      {
        logLevel,
      },
      [
        {
          assetType: SupportedBesuContractTypes.FUNGIBLE,
          contractName: erc20TokenContract,
        },
        {
          assetType: SupportedBesuContractTypes.NONFUNGIBLE,
          contractName: erc721TokenContract,
        },
      ],
    );
    log.info("Besu Ledger started successfully");

    await besuEnv.deployAndSetupContracts(ClaimFormat.BUNGEE);
  }
  {
    const erc20TokenContract = "SATPContract";
    const erc721TokenContract = "SATPNonFungibleContract";
    ethereumEnv = await EthereumTestEnvironment.setupTestEnvironment(
      {
        logLevel,
      },
      [
        {
          assetType: SupportedEthereumContractTypes.FUNGIBLE,
          contractName: erc20TokenContract,
        },
        {
          assetType: SupportedEthereumContractTypes.NONFUNGIBLE,
          contractName: erc721TokenContract,
        },
      ],
    );
    log.info("Ethereum Ledger started successfully");
    await ethereumEnv.deployAndSetupContracts(ClaimFormat.BUNGEE);
  }
}, TIMEOUT);

describe("2 SATPGateways sending a token from Besu to Fabric", () => {
  jest.setTimeout(TIMEOUT);
  it("should mint 100 tokens to the owner account", async () => {
    await besuEnv.mintTokens("100", TokenTypeMain.NONSTANDARD_FUNGIBLE);
    await besuEnv.checkBalance(
      besuEnv.getTestFungibleContractName(),
      besuEnv.getTestFungibleContractAddress(),
      besuEnv.getTestFungibleContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "100",
      besuEnv.getTestOwnerSigningCredential(),
    );
  });
  it("should realize a transfer", async () => {
    //setup satp gateway
    const factoryOptions: IPluginFactoryOptions = {
      pluginImportType: PluginImportType.Local,
    };
    const factory = new PluginFactorySATPGateway(factoryOptions);

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
      address: "http://localhost" as Address,
      gatewayOapiPort: 4010,
      gatewayServerPort: 3010,
      gatewayClientPort: 3011,
    } as GatewayIdentity;

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
      address: "http://localhost" as Address,
      gatewayOapiPort: 4011,
      gatewayServerPort: 3012,
      gatewayClientPort: 3013,
    } as GatewayIdentity;

    const migrationSource = await createMigrationSource();
    knexSourceRemoteClient = knex({
      ...knexRemoteInstance.default,
      migrations: {
        migrationSource: migrationSource,
      },
    });
    await knexSourceRemoteClient.migrate.latest();

    knexTargetRemoteClient = knex({
      ...knexRemoteInstance.default,
      migrations: {
        migrationSource: migrationSource,
      },
    });
    await knexSourceRemoteClient.migrate.latest();

    const fabricNetworkOptions = fabricEnv.createFabricConfig();
    const besuNetworkOptions = besuEnv.createBesuConfig();

    const ontologiesPath = path.join(__dirname, "../../../ontologies");

    const options1: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity1,
      ccConfig: {
        bridgeConfig: [besuNetworkOptions],
      },
      counterPartyGateways: [gatewayIdentity2],
      remoteRepository: knexRemoteInstance.default,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
      monitorService: monitorService,
    };

    const options2: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity2,
      ccConfig: {
        bridgeConfig: [fabricNetworkOptions],
      },
      counterPartyGateways: [gatewayIdentity1],
      remoteRepository: knexRemoteInstance.default,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
      monitorService: monitorService,
    };

    gateway1 = await factory.create(options1);
    expect(gateway1).toBeInstanceOf(SATPGateway);

    gateway2 = await factory.create(options2);
    expect(gateway2).toBeInstanceOf(SATPGateway);

    const identity1 = gateway1.Identity;
    expect(identity1.gatewayServerPort).toBe(3010);
    expect(identity1.gatewayClientPort).toBe(3011);
    expect(identity1.address).toBe("http://localhost");
    await gateway1.startup();

    const identity2 = gateway2.Identity;
    expect(identity2.gatewayServerPort).toBe(3012);
    expect(identity2.gatewayClientPort).toBe(3013);
    expect(identity2.address).toBe("http://localhost");
    await gateway2.startup();

    const dispatcher1 = gateway1.BLODispatcherInstance;
    const dispatcher2 = gateway2.BLODispatcherInstance;

    expect(dispatcher1).toBeTruthy();
    expect(dispatcher2).toBeTruthy();

    const reqApproveBesuAddress = await dispatcher1?.GetApproveAddress({
      networkId: besuEnv.network,
      tokenType: TokenType.Fungible,
    });
    expect(reqApproveBesuAddress?.approveAddress).toBeDefined();

    if (!reqApproveBesuAddress?.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    await besuEnv.giveRoleToBridge(reqApproveBesuAddress?.approveAddress);

    if (reqApproveBesuAddress?.approveAddress) {
      await besuEnv.approveAssets(
        reqApproveBesuAddress.approveAddress,
        "100",
        TokenTypeMain.NONSTANDARD_FUNGIBLE,
      );
    } else {
      throw new Error("Approve address is undefined");
    }
    log.debug("Approved 100 amout to the Besu Bridge Address");

    const reqApproveFabricAddress = await dispatcher2?.GetApproveAddress({
      networkId: fabricEnv.network,
      tokenType: TokenType.Fungible,
    });
    expect(reqApproveFabricAddress?.approveAddress).toBeDefined();

    if (!reqApproveFabricAddress?.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    await fabricEnv.giveRoleToBridge("Org2MSP");

    const req = getTransactRequest(
      "mockContext",
      besuEnv,
      fabricEnv,
      "100",
      "100",
    );

    const res = await dispatcher1?.Transact(req);
    log.info(res?.statusResponse);

    await besuEnv.checkBalance(
      besuEnv.getTestFungibleContractName(),
      besuEnv.getTestFungibleContractAddress(),
      besuEnv.getTestFungibleContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Owner account");

    await besuEnv.checkBalance(
      besuEnv.getTestFungibleContractName(),
      besuEnv.getTestFungibleContractAddress(),
      besuEnv.getTestFungibleContractAbi(),
      reqApproveBesuAddress?.approveAddress,
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Wrapper account");

    await fabricEnv.checkBalance(
      fabricEnv.getTestContractName(),
      fabricEnv.getTestChannelName(),
      reqApproveFabricAddress?.approveAddress,
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

    await shutdownGateways();
  });
});

describe("2 SATPGateways sending a token from Fabric to Besu", () => {
  jest.setTimeout(TIMEOUT);
  it("should realize a transfer", async () => {
    //setup satp gateway
    const factoryOptions: IPluginFactoryOptions = {
      pluginImportType: PluginImportType.Local,
    };
    const factory = new PluginFactorySATPGateway(factoryOptions);

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
      address: "http://localhost" as Address,
      gatewayOapiPort: 4010,
      gatewayServerPort: 3010,
      gatewayClientPort: 3011,
    } as GatewayIdentity;

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
      address: "http://localhost" as Address,
      gatewayOapiPort: 4011,
      gatewayServerPort: 3012,
      gatewayClientPort: 3013,
    } as GatewayIdentity;

    const migrationSource = await createMigrationSource();
    knexSourceRemoteClient = knex({
      ...knexRemoteInstance.default,
      migrations: {
        migrationSource: migrationSource,
      },
    });
    await knexSourceRemoteClient.migrate.latest();

    knexTargetRemoteClient = knex({
      ...knexRemoteInstance.default,
      migrations: {
        migrationSource: migrationSource,
      },
    });
    await knexSourceRemoteClient.migrate.latest();

    const fabricNetworkOptions = fabricEnv.createFabricConfig();
    const besuNetworkOptions = besuEnv.createBesuConfig();

    const ontologiesPath = path.join(__dirname, "../../../ontologies");

    const options1: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity1,
      ccConfig: {
        bridgeConfig: [fabricNetworkOptions],
      },
      counterPartyGateways: [gatewayIdentity2],
      remoteRepository: knexRemoteInstance.default,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
      monitorService: monitorService,
    };

    const options2: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity2,
      ccConfig: {
        bridgeConfig: [besuNetworkOptions],
      },
      counterPartyGateways: [gatewayIdentity1],
      remoteRepository: knexRemoteInstance.default,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
      monitorService: monitorService,
    };

    gateway1 = await factory.create(options1);
    expect(gateway1).toBeInstanceOf(SATPGateway);

    gateway2 = await factory.create(options2);
    expect(gateway2).toBeInstanceOf(SATPGateway);

    const identity1 = gateway1.Identity;
    expect(identity1.gatewayServerPort).toBe(3010);
    expect(identity1.gatewayClientPort).toBe(3011);
    expect(identity1.address).toBe("http://localhost");
    await gateway1.startup();

    const identity2 = gateway2.Identity;
    expect(identity2.gatewayServerPort).toBe(3012);
    expect(identity2.gatewayClientPort).toBe(3013);
    expect(identity2.address).toBe("http://localhost");
    await gateway2.startup();

    const dispatcher1 = gateway1.BLODispatcherInstance;
    const dispatcher2 = gateway2.BLODispatcherInstance;

    expect(dispatcher1).toBeTruthy();
    expect(dispatcher2).toBeTruthy();

    await fabricEnv.giveRoleToBridge("Org2MSP");

    const reqApproveFabricAddress = await dispatcher1?.GetApproveAddress({
      networkId: fabricEnv.network,
      tokenType: TokenType.Fungible,
    });
    expect(reqApproveFabricAddress?.approveAddress).toBeDefined();

    if (!reqApproveFabricAddress?.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    if (reqApproveFabricAddress?.approveAddress) {
      await fabricEnv.approveAmount(
        reqApproveFabricAddress?.approveAddress,
        "100",
      );
    } else {
      throw new Error("Approve address is undefined");
    }
    log.debug("Approved 100 amout to the Besu Bridge Address");

    const reqApproveBesuAddress = await dispatcher2?.GetApproveAddress({
      networkId: besuEnv.network,
      tokenType: TokenType.Fungible,
    });

    expect(reqApproveBesuAddress?.approveAddress).toBeDefined();

    if (!reqApproveBesuAddress?.approveAddress) {
      throw new Error("Approve address is undefined");
    }
    await besuEnv.giveRoleToBridge(reqApproveBesuAddress?.approveAddress);

    const req = getTransactRequest(
      "mockContext",
      fabricEnv,
      besuEnv,
      "100",
      "100",
    );

    const res = await dispatcher1?.Transact(req);
    log.info(res?.statusResponse);

    await fabricEnv.checkBalance(
      fabricEnv.getTestContractName(),
      fabricEnv.getTestChannelName(),
      reqApproveFabricAddress?.approveAddress,
      "0",
      fabricEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Bridge account");

    await fabricEnv.checkBalance(
      fabricEnv.getTestContractName(),
      fabricEnv.getTestChannelName(),
      fabricEnv.getTestOwnerAccount(),
      "0",
      fabricEnv.getTestOwnerSigningCredential(),
    );

    log.info("Amount was transfer correctly from the Owner account");

    await besuEnv.checkBalance(
      besuEnv.getTestFungibleContractName(),
      besuEnv.getTestFungibleContractAddress(),
      besuEnv.getTestFungibleContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "100",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Owner account");

    await besuEnv.checkBalance(
      besuEnv.getTestFungibleContractName(),
      besuEnv.getTestFungibleContractAddress(),
      besuEnv.getTestFungibleContractAbi(),
      reqApproveBesuAddress?.approveAddress,
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Wrapper account");

    await shutdownGateways();
  });
});

describe("2 SATPGateways sending a token from Besu to Ethereum", () => {
  jest.setTimeout(TIMEOUT);
  it("should realize a transfer", async () => {
    //setup satp gateway
    const factoryOptions: IPluginFactoryOptions = {
      pluginImportType: PluginImportType.Local,
    };
    const factory = new PluginFactorySATPGateway(factoryOptions);

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
      address: "http://localhost" as Address,
      gatewayOapiPort: 4010,
      gatewayServerPort: 3010,
      gatewayClientPort: 3011,
    } as GatewayIdentity;

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
      address: "http://localhost" as Address,
      gatewayOapiPort: 4011,
      gatewayServerPort: 3012,
      gatewayClientPort: 3013,
    } as GatewayIdentity;

    const migrationSource = await createMigrationSource();
    knexSourceRemoteClient = knex({
      ...knexRemoteInstance.default,
      migrations: {
        migrationSource: migrationSource,
      },
    });
    await knexSourceRemoteClient.migrate.latest();

    knexTargetRemoteClient = knex({
      ...knexRemoteInstance.default,
      migrations: {
        migrationSource: migrationSource,
      },
    });
    await knexSourceRemoteClient.migrate.latest();

    const besuNetworkOptions = besuEnv.createBesuConfig();
    const ethereumNetworkOptions = ethereumEnv.createEthereumConfig();

    const ontologiesPath = path.join(__dirname, "../../../ontologies");

    const options1: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity1,
      ccConfig: {
        bridgeConfig: [besuNetworkOptions],
      },
      counterPartyGateways: [gatewayIdentity2],
      remoteRepository: knexRemoteInstance.default,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
      monitorService: monitorService,
    };

    const options2: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity2,
      ccConfig: {
        bridgeConfig: [ethereumNetworkOptions],
      },
      counterPartyGateways: [gatewayIdentity1],
      remoteRepository: knexRemoteInstance.default,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
      monitorService: monitorService,
    };

    gateway1 = await factory.create(options1);
    expect(gateway1).toBeInstanceOf(SATPGateway);

    gateway2 = await factory.create(options2);
    expect(gateway2).toBeInstanceOf(SATPGateway);

    const identity1 = gateway1.Identity;
    expect(identity1.gatewayServerPort).toBe(3010);
    expect(identity1.gatewayClientPort).toBe(3011);
    expect(identity1.address).toBe("http://localhost");
    await gateway1.startup();

    const identity2 = gateway2.Identity;
    expect(identity2.gatewayServerPort).toBe(3012);
    expect(identity2.gatewayClientPort).toBe(3013);
    expect(identity2.address).toBe("http://localhost");
    await gateway2.startup();

    const dispatcher1 = gateway1.BLODispatcherInstance;
    const dispatcher2 = gateway2.BLODispatcherInstance;

    expect(dispatcher1).toBeTruthy();
    expect(dispatcher2).toBeTruthy();

    const reqApproveBesuAddress = await dispatcher1?.GetApproveAddress({
      networkId: besuEnv.network,
      tokenType: TokenType.Fungible,
    });

    if (!reqApproveBesuAddress?.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    expect(reqApproveBesuAddress?.approveAddress).toBeDefined();

    await besuEnv.giveRoleToBridge(reqApproveBesuAddress?.approveAddress);

    if (reqApproveBesuAddress?.approveAddress) {
      await besuEnv.approveAssets(
        reqApproveBesuAddress.approveAddress,
        "100",
        TokenTypeMain.NONSTANDARD_FUNGIBLE,
      );
    } else {
      throw new Error("Approve address is undefined");
    }

    log.debug("Approved 100 amout to the Besu Bridge Address");

    const reqApproveEthereumAddress = await dispatcher2?.GetApproveAddress({
      networkId: ethereumEnv.network,
      tokenType: TokenType.Fungible,
    });

    expect(reqApproveEthereumAddress?.approveAddress).toBeDefined();

    if (!reqApproveEthereumAddress?.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    await ethereumEnv.giveRoleToBridge(
      reqApproveEthereumAddress?.approveAddress,
    );

    const req = getTransactRequest(
      "mockContext",
      besuEnv,
      ethereumEnv,
      "100",
      "100",
    );

    const res = await dispatcher1?.Transact(req);
    log.info(res?.statusResponse);

    await besuEnv.checkBalance(
      besuEnv.getTestFungibleContractName(),
      besuEnv.getTestFungibleContractAddress(),
      besuEnv.getTestFungibleContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Owner account");

    await besuEnv.checkBalance(
      besuEnv.getTestFungibleContractName(),
      besuEnv.getTestFungibleContractAddress(),
      besuEnv.getTestFungibleContractAbi(),
      reqApproveBesuAddress?.approveAddress,
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Wrapper account");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestFungibleContractName(),
      ethereumEnv.getTestFungibleContractAddress(),
      ethereumEnv.getTestFungibleContractAbi(),
      reqApproveEthereumAddress?.approveAddress,
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly from the Bridge account");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestFungibleContractName(),
      ethereumEnv.getTestFungibleContractAddress(),
      ethereumEnv.getTestFungibleContractAbi(),
      ethereumEnv.getTestOwnerAccount(),
      "100",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Owner account");

    await shutdownGateways();
  });
});

describe("2 SATPGateways sending a non fungible token from Besu to Ethereum", () => {
  jest.setTimeout(TIMEOUT);
  it("should mint a non fungible token on Besu and transfer it to Ethereum", async () => {
    await besuEnv.mintTokens("1001", TokenTypeMain.NONSTANDARD_NONFUNGIBLE);
    await besuEnv.checkBalance(
      besuEnv.getTestNonFungibleContractName(),
      besuEnv.getTestNonFungibleContractAddress(),
      besuEnv.getTestNonFungibleContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "1",
      besuEnv.getTestOwnerSigningCredential(),
    );

    //setup satp gateway
    const factoryOptions: IPluginFactoryOptions = {
      pluginImportType: PluginImportType.Local,
    };
    const factory = new PluginFactorySATPGateway(factoryOptions);

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
      address: "http://localhost" as Address,
      gatewayOapiPort: 4010,
      gatewayServerPort: 3010,
      gatewayClientPort: 3011,
    } as GatewayIdentity;

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
      address: "http://localhost" as Address,
      gatewayOapiPort: 4011,
      gatewayServerPort: 3012,
      gatewayClientPort: 3013,
    } as GatewayIdentity;

    const migrationSource = await createMigrationSource();
    knexSourceRemoteClient = knex({
      ...knexRemoteInstance.default,
      migrations: {
        migrationSource: migrationSource,
      },
    });
    await knexSourceRemoteClient.migrate.latest();

    knexTargetRemoteClient = knex({
      ...knexRemoteInstance.default,
      migrations: {
        migrationSource: migrationSource,
      },
    });
    await knexSourceRemoteClient.migrate.latest();

    const besuNetworkOptions = besuEnv.createBesuConfig();
    const ethereumNetworkOptions = ethereumEnv.createEthereumConfig();

    const ontologiesPath = path.join(__dirname, "../../../ontologies");

    const options1: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity1,
      ccConfig: {
        bridgeConfig: [besuNetworkOptions],
      },
      counterPartyGateways: [gatewayIdentity2],
      remoteRepository: knexRemoteInstance.default,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
      monitorService: monitorService,
    };

    const options2: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity2,
      ccConfig: {
        bridgeConfig: [ethereumNetworkOptions],
      },
      counterPartyGateways: [gatewayIdentity1],
      remoteRepository: knexRemoteInstance.default,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
      monitorService: monitorService,
    };

    gateway1 = await factory.create(options1);
    expect(gateway1).toBeInstanceOf(SATPGateway);

    gateway2 = await factory.create(options2);
    expect(gateway2).toBeInstanceOf(SATPGateway);

    const identity1 = gateway1.Identity;
    expect(identity1.gatewayServerPort).toBe(3010);
    expect(identity1.gatewayClientPort).toBe(3011);
    expect(identity1.address).toBe("http://localhost");
    await gateway1.startup();

    const identity2 = gateway2.Identity;
    expect(identity2.gatewayServerPort).toBe(3012);
    expect(identity2.gatewayClientPort).toBe(3013);
    expect(identity2.address).toBe("http://localhost");
    await gateway2.startup();

    const dispatcher1 = gateway1.BLODispatcherInstance;
    const dispatcher2 = gateway2.BLODispatcherInstance;

    expect(dispatcher1).toBeTruthy();
    expect(dispatcher2).toBeTruthy();

    const reqApproveBesuAddress = await dispatcher1?.GetApproveAddress({
      networkId: besuEnv.network,
      tokenType: TokenType.Nonfungible,
    });

    if (!reqApproveBesuAddress?.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    expect(reqApproveBesuAddress?.approveAddress).toBeDefined();

    await besuEnv.giveRoleToBridge(reqApproveBesuAddress?.approveAddress);

    if (reqApproveBesuAddress?.approveAddress) {
      await besuEnv.approveAssets(
        reqApproveBesuAddress.approveAddress,
        "1001",
        TokenTypeMain.NONSTANDARD_NONFUNGIBLE,
      );
    } else {
      throw new Error("Approve address is undefined");
    }

    const reqApproveEthereumAddress = await dispatcher2?.GetApproveAddress({
      networkId: ethereumEnv.network,
      tokenType: TokenType.Nonfungible,
    });

    expect(reqApproveEthereumAddress?.approveAddress).toBeDefined();

    if (!reqApproveEthereumAddress?.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    await ethereumEnv.giveRoleToBridge(
      reqApproveEthereumAddress?.approveAddress,
    );

    const req = getTransactRequest(
      "mockContext",
      besuEnv,
      ethereumEnv,
      "1001",
      "1001",
      TokenTypeMain.NONSTANDARD_NONFUNGIBLE,
    );

    const res = await dispatcher1?.Transact(req);
    log.info(res?.statusResponse);

    await besuEnv.checkBalance(
      besuEnv.getTestNonFungibleContractName(),
      besuEnv.getTestNonFungibleContractAddress(),
      besuEnv.getTestNonFungibleContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Token was transferred correctly from the Owner account");

    await besuEnv.checkBalance(
      besuEnv.getTestNonFungibleContractName(),
      besuEnv.getTestNonFungibleContractAddress(),
      besuEnv.getTestNonFungibleContractAbi(),
      reqApproveBesuAddress?.approveAddress,
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Token was transferred correctly from the Wrapper account");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestNonFungibleContractName(),
      ethereumEnv.getTestNonFungibleContractAddress(),
      ethereumEnv.getTestNonFungibleContractAbi(),
      reqApproveEthereumAddress?.approveAddress,
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Token was transfer correctly from the Bridge account");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestNonFungibleContractName(),
      ethereumEnv.getTestNonFungibleContractAddress(),
      ethereumEnv.getTestNonFungibleContractAbi(),
      ethereumEnv.getTestOwnerAccount(),
      "1",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Token was transferred correctly to the Owner account");

    await shutdownGateways();
  });
});

describe("2 SATPGateways sending a non fungible token from Ethereum to Besu", () => {
  it("should realize a transfer to Besu", async () => {
    //setup satp gateway
    const factoryOptions: IPluginFactoryOptions = {
      pluginImportType: PluginImportType.Local,
    };
    const factory = new PluginFactorySATPGateway(factoryOptions);

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
      address: "http://localhost" as Address,
      gatewayOapiPort: 4010,
      gatewayServerPort: 3010,
      gatewayClientPort: 3011,
    } as GatewayIdentity;

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
      address: "http://localhost" as Address,
      gatewayOapiPort: 4011,
      gatewayServerPort: 3012,
      gatewayClientPort: 3013,
    } as GatewayIdentity;

    const migrationSource = await createMigrationSource();
    knexSourceRemoteClient = knex({
      ...knexRemoteInstance.default,
      migrations: {
        migrationSource: migrationSource,
      },
    });
    await knexSourceRemoteClient.migrate.latest();

    knexTargetRemoteClient = knex({
      ...knexRemoteInstance.default,
      migrations: {
        migrationSource: migrationSource,
      },
    });
    await knexSourceRemoteClient.migrate.latest();

    const besuNetworkOptions = besuEnv.createBesuConfig();
    const ethereumNetworkOptions = ethereumEnv.createEthereumConfig();

    const ontologiesPath = path.join(__dirname, "../../../ontologies");

    const options1: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity1,
      ccConfig: {
        bridgeConfig: [ethereumNetworkOptions],
      },
      counterPartyGateways: [gatewayIdentity2],
      remoteRepository: knexRemoteInstance.default,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
      monitorService: monitorService,
    };

    const options2: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity2,
      ccConfig: {
        bridgeConfig: [besuNetworkOptions],
      },
      counterPartyGateways: [gatewayIdentity1],
      remoteRepository: knexRemoteInstance.default,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
      monitorService: monitorService,
    };

    gateway1 = await factory.create(options1);
    expect(gateway1).toBeInstanceOf(SATPGateway);

    gateway2 = await factory.create(options2);
    expect(gateway2).toBeInstanceOf(SATPGateway);

    const identity1 = gateway1.Identity;
    expect(identity1.gatewayServerPort).toBe(3010);
    expect(identity1.gatewayClientPort).toBe(3011);
    expect(identity1.address).toBe("http://localhost");
    await gateway1.startup();

    const identity2 = gateway2.Identity;
    expect(identity2.gatewayServerPort).toBe(3012);
    expect(identity2.gatewayClientPort).toBe(3013);
    expect(identity2.address).toBe("http://localhost");
    await gateway2.startup();

    const dispatcher1 = gateway1.BLODispatcherInstance;
    const dispatcher2 = gateway2.BLODispatcherInstance;

    expect(dispatcher1).toBeTruthy();
    expect(dispatcher2).toBeTruthy();

    const reqApproveBesuAddress = await dispatcher2?.GetApproveAddress({
      networkId: besuEnv.network,
      tokenType: TokenType.Nonfungible,
    });

    if (!reqApproveBesuAddress?.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    expect(reqApproveBesuAddress?.approveAddress).toBeDefined();

    await besuEnv.giveRoleToBridge(reqApproveBesuAddress?.approveAddress);

    const reqApproveEthereumAddress = await dispatcher1?.GetApproveAddress({
      networkId: ethereumEnv.network,
      tokenType: TokenType.Nonfungible,
    });

    expect(reqApproveEthereumAddress?.approveAddress).toBeDefined();

    if (!reqApproveEthereumAddress?.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    if (reqApproveEthereumAddress?.approveAddress) {
      await ethereumEnv.approveAssets(
        reqApproveEthereumAddress.approveAddress,
        "1001",
        TokenTypeMain.NONSTANDARD_NONFUNGIBLE,
      );
    } else {
      throw new Error("Approve address is undefined");
    }

    await ethereumEnv.giveRoleToBridge(
      reqApproveEthereumAddress?.approveAddress,
    );

    const req = getTransactRequest(
      "mockContext",
      ethereumEnv,
      besuEnv,
      "1001",
      "1001",
      TokenTypeMain.NONSTANDARD_NONFUNGIBLE,
    );

    const res = await dispatcher1?.Transact(req);
    log.info(res?.statusResponse);

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestNonFungibleContractName(),
      ethereumEnv.getTestNonFungibleContractAddress(),
      ethereumEnv.getTestNonFungibleContractAbi(),
      ethereumEnv.getTestOwnerAccount(),
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Token was transferred correctly from the Owner account");

    await ethereumEnv.checkBalance(
      ethereumEnv.getTestNonFungibleContractName(),
      ethereumEnv.getTestNonFungibleContractAddress(),
      ethereumEnv.getTestNonFungibleContractAbi(),
      reqApproveBesuAddress?.approveAddress,
      "0",
      ethereumEnv.getTestOwnerSigningCredential(),
    );
    log.info("Token was transferred correctly from the Wrapper account");

    await besuEnv.checkBalance(
      besuEnv.getTestNonFungibleContractName(),
      besuEnv.getTestNonFungibleContractAddress(),
      besuEnv.getTestNonFungibleContractAbi(),
      reqApproveEthereumAddress?.approveAddress,
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Token was transfer correctly from the Bridge account");

    await besuEnv.checkBalance(
      besuEnv.getTestNonFungibleContractName(),
      besuEnv.getTestNonFungibleContractAddress(),
      besuEnv.getTestNonFungibleContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "1",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Token was transferred correctly to the Owner account");

    await shutdownGateways();
  });
});
