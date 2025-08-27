import "jest-extended";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import {
  pruneDockerAllIfGithubAction,
  Containers,
} from "@hyperledger/cactus-test-tooling";
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
  PluginImportType,
} from "@hyperledger/cactus-core-api";
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
import { PluginRegistry } from "@hyperledger/cactus-core";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { createMigrationSource } from "../../../../main/typescript/database/knex-migration-source";
import { knexLocalInstance } from "../../../../main/typescript/database/knexfile";
import { knexRemoteInstance } from "../../../../main/typescript/database/knexfile-remote";
import { SATPManager } from "../../../../main/typescript/services/gateway/satp-manager";
import { MonitorService } from "../../../../main/typescript/services/monitoring/monitor";
import { GatewayRetryOperationFailedError } from "../../../../main/typescript/api1/gateway-errors";

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "SATP - Hermes",
});
const monitorService = MonitorService.createOrGetMonitorService({
  enabled: false,
});

let knexSourceRemoteClient: Knex;
let knexLocalClient: Knex;
let fabricEnv: FabricTestEnvironment;
let besuEnv: BesuTestEnvironment;
let ethereumEnv: EthereumTestEnvironment;
let gateway: SATPGateway;

const TIMEOUT = 900000; // 15 minutes

afterAll(async () => {
  await gateway.shutdown();
  await besuEnv.tearDown();
  await fabricEnv.tearDown();
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
    besuEnv = await BesuTestEnvironment.setupTestEnvironment({
      contractName: erc20TokenContract,
      logLevel,
    });
    log.info("Besu Ledger started successfully");

    await besuEnv.deployAndSetupContracts(ClaimFormat.BUNGEE);
  }
  {
    const erc20TokenContract = "SATPContract";
    ethereumEnv = await EthereumTestEnvironment.setupTestEnvironment({
      contractName: erc20TokenContract,
      logLevel,
    });
    log.info("Ethereum Ledger started successfully");
    await ethereumEnv.deployAndSetupContracts(ClaimFormat.BUNGEE);
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
  it("should fail a transfer because of limited time and retries", async () => {
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
    const fabricNetworkOptions = fabricEnv.createFabricConfig();
    const besuNetworkOptions = besuEnv.createBesuConfig();
    const ontologiesPath = path.join(__dirname, "../../../ontologies");

    const options: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity,
      ccConfig: {
        bridgeConfig: [fabricNetworkOptions, besuNetworkOptions],
      },
      localRepository: knexLocalInstance.default,
      remoteRepository: knexRemoteInstance.default,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
      monitorService: monitorService,
    };
    gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);
    const identity = gateway.Identity;
    // default servers
    expect(identity.gatewayServerPort).toBe(3010);
    expect(identity.gatewayClientPort).toBe(3011);
    expect(identity.address).toBe("http://localhost");
    await gateway.startup();

    const dispatcher = gateway.BLODispatcherInstance;
    expect(dispatcher).toBeTruthy();

    const reqApproveBesuAddress = await dispatcher?.GetApproveAddress({
      networkId: besuEnv.network,
      tokenType: TokenType.NonstandardFungible,
    });
    expect(reqApproveBesuAddress?.approveAddress).toBeDefined();

    if (!reqApproveBesuAddress?.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    await besuEnv.giveRoleToBridge(reqApproveBesuAddress?.approveAddress);

    if (reqApproveBesuAddress?.approveAddress) {
      await besuEnv.approveAmount(reqApproveBesuAddress.approveAddress, "100");
    } else {
      throw new Error("Approve address is undefined");
    }
    log.info("Approved 100 amount to the Besu Bridge Address");

    const reqApproveFabricAddress = await dispatcher?.GetApproveAddress({
      networkId: fabricEnv.network,
      tokenType: TokenType.NonstandardFungible,
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

    // This mock intercepts the getOrCreateSession call, and modifies the session
    // data directly with the desired maxRetries and maxTimeout values for the test
    // to simulate a timeout.
    const originalGetOrCreateSession = (dispatcher as any)["manager"]
      .getOrCreateSession;
    jest
      .spyOn((dispatcher as any)["manager"], "getOrCreateSession")
      .mockImplementation(function (this: SATPManager, ...args: any[]) {
        const session = originalGetOrCreateSession.apply(this, args);
        if (session.clientSessionData) {
          session.clientSessionData.maxRetries = "3";
          session.clientSessionData.maxTimeout = "5000";
        }
        return session;
      });

    try {
      await dispatcher?.Transact(req);
      // If the try catch block does not throw, the test fails
      // because the transfer should have failed
      fail("Transfer should have failed due to limited retries and timeout");
    } catch (error) {
      log.info("Transfer failed as expected");
      expect(error).toBeInstanceOf(GatewayRetryOperationFailedError);
      expect((error as GatewayRetryOperationFailedError).message).toContain(
        "Transact operation failed after all retries",
      );

      const manager: SATPManager = (dispatcher as any)["manager"];
      // Checking the active sessions
      const sessions = manager.getSessions();
      // Deleting the session
      sessions.clear();
      expect(sessions.has("mockContext")).toBe(false);
    }
  });

  // This test is similar to the previous one, but the failure is due to
  // wrong amount of tokens in the transaction request
  it("should fail a transfer because of wrong amount of tokens", async () => {
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
    const fabricNetworkOptions = fabricEnv.createFabricConfig();
    const besuNetworkOptions = besuEnv.createBesuConfig();
    const ontologiesPath = path.join(__dirname, "../../../ontologies");

    const options: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity,
      ccConfig: {
        bridgeConfig: [fabricNetworkOptions, besuNetworkOptions],
      },
      localRepository: knexLocalInstance.default,
      remoteRepository: knexRemoteInstance.default,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
      monitorService: monitorService,
    };
    gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);
    const identity = gateway.Identity;
    // default servers
    expect(identity.gatewayServerPort).toBe(3010);
    expect(identity.gatewayClientPort).toBe(3011);
    expect(identity.address).toBe("http://localhost");
    await gateway.startup();

    const dispatcher = gateway.BLODispatcherInstance;
    expect(dispatcher).toBeTruthy();

    const reqApproveBesuAddress = await dispatcher?.GetApproveAddress({
      networkId: besuEnv.network,
      tokenType: TokenType.NonstandardFungible,
    });
    expect(reqApproveBesuAddress?.approveAddress).toBeDefined();

    if (!reqApproveBesuAddress?.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    await besuEnv.giveRoleToBridge(reqApproveBesuAddress?.approveAddress);

    if (reqApproveBesuAddress?.approveAddress) {
      await besuEnv.approveAmount(reqApproveBesuAddress.approveAddress, "100");
    } else {
      throw new Error("Approve address is undefined");
    }
    log.info("Approved 100 amount to the Besu Bridge Address");

    const reqApproveFabricAddress = await dispatcher?.GetApproveAddress({
      networkId: fabricEnv.network,
      tokenType: TokenType.NonstandardFungible,
    });
    expect(reqApproveFabricAddress?.approveAddress).toBeDefined();

    if (!reqApproveFabricAddress?.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    await fabricEnv.giveRoleToBridge("Org2MSP");

    // Making a transfer request with a balance greater than the approved amount
    // to force a failure due to wrong amount of tokens in the transaction request
    const req = getTransactRequest(
      "mockContext",
      besuEnv,
      fabricEnv,
      "500",
      "100",
    );

    // This mock intercepts the getOrCreateSession call, and modifies the session
    // data directly with the desired maxRetries and maxTimeout values for the test.
    const originalGetOrCreateSession = (dispatcher as any)["manager"]
      .getOrCreateSession;
    jest
      .spyOn((dispatcher as any)["manager"], "getOrCreateSession")
      .mockImplementation(function (this: SATPManager, ...args: any[]) {
        const session = originalGetOrCreateSession.apply(this, args);
        // In this case, the maxTimeout is set high enough to avoid timeout, so the failure
        // is due to wrong amount of tokens.
        if (session.clientSessionData) {
          session.clientSessionData.maxRetries = "3";
          session.clientSessionData.maxTimeout = "35000";
        }
        return session;
      });

    try {
      await dispatcher?.Transact(req);
      // If the try catch block does not throw, the test fails
      // because the transfer should have failed
      fail("Transfer should have failed due to wrong amount of tokens");
    } catch (error) {
      log.info("Transfer failed as expected");
      expect(error).toBeInstanceOf(GatewayRetryOperationFailedError);
      expect((error as GatewayRetryOperationFailedError).message).toContain(
        "Transact operation failed after all retries",
      );
      const manager: SATPManager = (dispatcher as any)["manager"];
      // Checking the active sessions
      const sessions = manager.getSessions();
      // Deleting the session
      sessions.clear();
      expect(sessions.has("mockContext")).toBe(false);
    }
  });
});

describe("SATPGateway sending a token from Fabric to Besu", () => {
  jest.setTimeout(TIMEOUT);
  it("should fail a transfer because of limited time and retries", async () => {
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

    const fabricNetworkOptions = fabricEnv.createFabricConfig();
    const besuNetworkOptions = besuEnv.createBesuConfig();

    const ontologiesPath = path.join(__dirname, "../../../ontologies");

    const options: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity,
      ccConfig: {
        bridgeConfig: [fabricNetworkOptions, besuNetworkOptions],
      },
      localRepository: knexLocalInstance.default,
      remoteRepository: knexRemoteInstance.default,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
      monitorService: monitorService,
    };
    gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.Identity;
    // default servers
    expect(identity.gatewayServerPort).toBe(3010);
    expect(identity.gatewayClientPort).toBe(3011);
    expect(identity.address).toBe("http://localhost");
    await gateway.startup();

    const dispatcher = gateway.BLODispatcherInstance;

    await fabricEnv.giveRoleToBridge("Org2MSP");

    expect(dispatcher).toBeTruthy();

    const reqApproveFabricAddress = await dispatcher?.GetApproveAddress({
      networkId: fabricEnv.network,
      tokenType: TokenType.NonstandardFungible,
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
    log.debug("Approved 100 amount to the Besu Bridge Address");

    const reqApproveBesuAddress = await dispatcher?.GetApproveAddress({
      networkId: besuEnv.network,
      tokenType: TokenType.NonstandardFungible,
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

    // This mock intercepts the getOrCreateSession call, and modifies the session
    // data directly with the desired maxRetries and maxTimeout values for the test
    // to simulate a timeout.
    const originalGetOrCreateSession = (dispatcher as any)["manager"]
      .getOrCreateSession;
    jest
      .spyOn((dispatcher as any)["manager"], "getOrCreateSession")
      .mockImplementation(function (this: SATPManager, ...args: any[]) {
        const session = originalGetOrCreateSession.apply(this, args);
        if (session.clientSessionData) {
          session.clientSessionData.maxRetries = "3";
          session.clientSessionData.maxTimeout = "5000";
        }
        return session;
      });
    try {
      await dispatcher?.Transact(req);
      // If the try catch block does not throw, the test fails
      // because the transfer should have failed
      fail("Transfer should have failed due to limited retries and timeout");
    } catch (error) {
      log.info("Transfer failed as expected");
      expect(error).toBeInstanceOf(GatewayRetryOperationFailedError);
      expect((error as GatewayRetryOperationFailedError).message).toContain(
        "Transact operation failed after all retries",
      );

      const manager: SATPManager = (dispatcher as any)["manager"];
      // Checking the active sessions
      const sessions = manager.getSessions();
      // Deleting the session
      sessions.clear();
      expect(sessions.has("mockContext")).toBe(false);
    }
  });
  // This test is similar to the previous one, but the failure is due to
  // wrong amount of tokens in the transaction request
  it("should fail a transfer because of wrong amount of tokens", async () => {
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

    const fabricNetworkOptions = fabricEnv.createFabricConfig();
    const besuNetworkOptions = besuEnv.createBesuConfig();

    const ontologiesPath = path.join(__dirname, "../../../ontologies");

    const options: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity,
      ccConfig: {
        bridgeConfig: [fabricNetworkOptions, besuNetworkOptions],
      },
      localRepository: knexLocalInstance.default,
      remoteRepository: knexRemoteInstance.default,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
      monitorService: monitorService,
    };
    gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.Identity;
    // default servers
    expect(identity.gatewayServerPort).toBe(3010);
    expect(identity.gatewayClientPort).toBe(3011);
    expect(identity.address).toBe("http://localhost");
    await gateway.startup();

    const dispatcher = gateway.BLODispatcherInstance;

    await fabricEnv.giveRoleToBridge("Org2MSP");

    expect(dispatcher).toBeTruthy();

    const reqApproveFabricAddress = await dispatcher?.GetApproveAddress({
      networkId: fabricEnv.network,
      tokenType: TokenType.NonstandardFungible,
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
    log.debug("Approved 100 amount to the Besu Bridge Address");

    const reqApproveBesuAddress = await dispatcher?.GetApproveAddress({
      networkId: besuEnv.network,
      tokenType: TokenType.NonstandardFungible,
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
      "500",
      "100",
    );

    // This mock intercepts the getOrCreateSession call, and modifies the session
    // data directly with the desired maxRetries and maxTimeout values for the test.
    const originalGetOrCreateSession = (dispatcher as any)["manager"]
      .getOrCreateSession;
    jest
      .spyOn((dispatcher as any)["manager"], "getOrCreateSession")
      .mockImplementation(function (this: SATPManager, ...args: any[]) {
        const session = originalGetOrCreateSession.apply(this, args);
        // In this case, the maxTimeout is set high enough to avoid timeout, so the failure
        // is due to wrong amount of tokens.
        if (session.clientSessionData) {
          session.clientSessionData.maxRetries = "3";
          session.clientSessionData.maxTimeout = "35000";
        }
        return session;
      });
    try {
      await dispatcher?.Transact(req);
      // If the try catch block does not throw, the test fails
      // because the transfer should have failed
      fail("Transfer should have failed due to wrong amount of tokens");
    } catch (error) {
      log.info("Transfer failed as expected");
      expect(error).toBeInstanceOf(GatewayRetryOperationFailedError);
      expect((error as GatewayRetryOperationFailedError).message).toContain(
        "Transact operation failed after all retries",
      );

      const manager: SATPManager = (dispatcher as any)["manager"];
      // Checking the active sessions
      const sessions = manager.getSessions();
      // Deleting the session
      sessions.clear();
      expect(sessions.has("mockContext")).toBe(false);
    }
  });
});

describe("SATPGateway sending a token from Besu to Ethereum", () => {
  jest.setTimeout(TIMEOUT);
  it("should fail a transfer because of limited time and retries", async () => {
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

    const besuNetworkOptions = besuEnv.createBesuConfig();
    const ethereumNetworkOptions = ethereumEnv.createEthereumConfig();

    const ontologiesPath = path.join(__dirname, "../../../ontologies");

    const options: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity,
      ccConfig: {
        bridgeConfig: [besuNetworkOptions, ethereumNetworkOptions],
      },
      localRepository: knexLocalInstance.default,
      remoteRepository: knexRemoteInstance.default,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
      monitorService: monitorService,
    };
    gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.Identity;
    // default servers
    expect(identity.gatewayServerPort).toBe(3010);
    expect(identity.gatewayClientPort).toBe(3011);
    expect(identity.address).toBe("http://localhost");
    await gateway.startup();

    const dispatcher = gateway.BLODispatcherInstance;

    expect(dispatcher).toBeTruthy();
    const reqApproveBesuAddress = await dispatcher?.GetApproveAddress({
      networkId: besuEnv.network,
      tokenType: TokenType.NonstandardFungible,
    });

    if (!reqApproveBesuAddress?.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    expect(reqApproveBesuAddress?.approveAddress).toBeDefined();

    await besuEnv.giveRoleToBridge(reqApproveBesuAddress?.approveAddress);

    if (reqApproveBesuAddress?.approveAddress) {
      await besuEnv.approveAmount(reqApproveBesuAddress.approveAddress, "100");
    } else {
      throw new Error("Approve address is undefined");
    }

    log.debug("Approved 100 amount to the Besu Bridge Address");

    const reqApproveEthereumAddress = await dispatcher?.GetApproveAddress({
      networkId: ethereumEnv.network,
      tokenType: TokenType.NonstandardFungible,
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
    // This mock intercepts the getOrCreateSession call, and modifies the session
    // data directly with the desired maxRetries and maxTimeout values for the test
    // to simulate a timeout.
    const originalGetOrCreateSession = (dispatcher as any)["manager"]
      .getOrCreateSession;
    jest
      .spyOn((dispatcher as any)["manager"], "getOrCreateSession")
      .mockImplementation(function (this: SATPManager, ...args: any[]) {
        const session = originalGetOrCreateSession.apply(this, args);
        if (session.clientSessionData) {
          session.clientSessionData.maxRetries = "3";
          session.clientSessionData.maxTimeout = "5000";
        }
        return session;
      });

    try {
      await dispatcher?.Transact(req);
      // If the try catch block does not throw, the test fails
      // because the transfer should have failed
      fail("Transfer should have failed due to limited retries and timeout");
    } catch (error) {
      log.info("Transfer failed as expected");
      expect(error).toBeInstanceOf(GatewayRetryOperationFailedError);
      expect((error as GatewayRetryOperationFailedError).message).toContain(
        "Transact operation failed after all retries",
      );

      const manager: SATPManager = (dispatcher as any)["manager"];
      // Checking the active sessions
      const sessions = manager.getSessions();
      // Deleting the session
      sessions.clear();
      expect(sessions.has("mockContext")).toBe(false);
    }
  });
  // This test is similar to the previous one, but the failure is due to
  // wrong amount of tokens in the transaction request
  it("should fail a transfer because of wrong amount of tokens", async () => {
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

    const besuNetworkOptions = besuEnv.createBesuConfig();
    const ethereumNetworkOptions = ethereumEnv.createEthereumConfig();

    const ontologiesPath = path.join(__dirname, "../../../ontologies");

    const options: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity,
      ccConfig: {
        bridgeConfig: [besuNetworkOptions, ethereumNetworkOptions],
      },
      localRepository: knexLocalInstance.default,
      remoteRepository: knexRemoteInstance.default,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
      monitorService: monitorService,
    };
    gateway = await factory.create(options);
    expect(gateway).toBeInstanceOf(SATPGateway);

    const identity = gateway.Identity;
    // default servers
    expect(identity.gatewayServerPort).toBe(3010);
    expect(identity.gatewayClientPort).toBe(3011);
    expect(identity.address).toBe("http://localhost");
    await gateway.startup();

    const dispatcher = gateway.BLODispatcherInstance;

    expect(dispatcher).toBeTruthy();
    const reqApproveBesuAddress = await dispatcher?.GetApproveAddress({
      networkId: besuEnv.network,
      tokenType: TokenType.NonstandardFungible,
    });

    if (!reqApproveBesuAddress?.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    expect(reqApproveBesuAddress?.approveAddress).toBeDefined();

    await besuEnv.giveRoleToBridge(reqApproveBesuAddress?.approveAddress);

    if (reqApproveBesuAddress?.approveAddress) {
      await besuEnv.approveAmount(reqApproveBesuAddress.approveAddress, "100");
    } else {
      throw new Error("Approve address is undefined");
    }

    log.debug("Approved 100 amount to the Besu Bridge Address");

    const reqApproveEthereumAddress = await dispatcher?.GetApproveAddress({
      networkId: ethereumEnv.network,
      tokenType: TokenType.NonstandardFungible,
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
      "500",
      "100",
    );
    // This mock intercepts the getOrCreateSession call, and modifies the session
    // data directly with the desired maxRetries and maxTimeout values for the test.
    const originalGetOrCreateSession = (dispatcher as any)["manager"]
      .getOrCreateSession;
    jest
      .spyOn((dispatcher as any)["manager"], "getOrCreateSession")
      .mockImplementation(function (this: SATPManager, ...args: any[]) {
        const session = originalGetOrCreateSession.apply(this, args);
        // In this case, the maxTimeout is set high enough to avoid timeout, so the failure
        // is due to wrong amount of tokens.
        if (session.clientSessionData) {
          session.clientSessionData.maxRetries = "3";
          session.clientSessionData.maxTimeout = "35000";
        }
        return session;
      });

    try {
      await dispatcher?.Transact(req);
      // If the try catch block does not throw, the test fails
      // because the transfer should have failed
      fail("Transfer should have failed due to wrong amount of tokens");
    } catch (error) {
      log.info("Transfer failed as expected");
      expect(error).toBeInstanceOf(GatewayRetryOperationFailedError);
      expect((error as GatewayRetryOperationFailedError).message).toContain(
        "Transact operation failed after all retries",
      );

      const manager: SATPManager = (dispatcher as any)["manager"];
      // Checking the active sessions
      const sessions = manager.getSessions();
      // Deleting the session
      sessions.clear();
      expect(sessions.has("mockContext")).toBe(false);
    }
  });
});
