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
  GetApproveAddressApi,
  GetApproveAddressRequest,
  TransactionApi,
} from "../../../main/typescript";
import { Address, GatewayIdentity } from "../../../main/typescript/core/types";
import {
  Configuration,
  IPluginFactoryOptions,
  LedgerType,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import { ClaimFormat } from "../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import {
  BesuTestEnvironment,
  EthereumTestEnvironment,
  FabricTestEnvironment,
  getTransactRequest,
} from "../test-utils";
import {
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../main/typescript/core/constants";
import {
  knexClientConnection,
  knexServerConnection,
  knexSourceRemoteConnection,
  knexTargetRemoteConnection,
} from "../knex.config";
import { Knex, knex } from "knex";
import { PluginRegistry } from "@hyperledger/cactus-core";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { ApiServer } from "@hyperledger/cactus-cmd-api-server";

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "SATP - Hermes",
});

let knexSourceRemoteInstance: Knex;
let knexTargetRemoteInstance: Knex;
let fabricEnv: FabricTestEnvironment;
let besuEnv: BesuTestEnvironment;
let ethereumEnv: EthereumTestEnvironment;
let gateway1: SATPGateway;
let gateway2: SATPGateway;

afterAll(async () => {
  if (gateway1) {
    if (knexSourceRemoteInstance) {
      await knexSourceRemoteInstance.destroy();
    }
  }

  if (gateway2) {
    if (knexTargetRemoteInstance) {
      await knexTargetRemoteInstance.destroy();
    }
  }

  await gateway1.shutdown();
  await gateway2.shutdown();
  await besuEnv.tearDown();
  await fabricEnv.tearDown();

  await pruneDockerAllIfGithubAction({ logLevel })
    .then(() => {
      log.info("Pruning throw OK");
    })
    .catch(async () => {
      await Containers.logDiagnostics({ logLevel });
      fail("Pruning didn't throw OK");
    });
});

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
      satpContractName,
      logLevel,
      claimFormat: ClaimFormat.BUNGEE,
    });
    log.info("Fabric Ledger started successfully");

    await fabricEnv.deployAndSetupContracts();
  }

  {
    const erc20TokenContract = "SATPContract";
    besuEnv = await BesuTestEnvironment.setupTestEnvironment({
      satpContractName: erc20TokenContract,
      logLevel,
    });
    log.info("Besu Ledger started successfully");

    await besuEnv.deployAndSetupContracts(ClaimFormat.BUNGEE);
  }
  {
    const erc20TokenContract = "SATPContract";
    ethereumEnv = await EthereumTestEnvironment.setupTestEnvironment({
      satpContractName: erc20TokenContract,
      logLevel,
    });
    log.info("Ethereum Ledger started successfully");
    await ethereumEnv.deployAndSetupContracts(ClaimFormat.BUNGEE);
  }
});

describe("2 SATPGateways sending a token from Besu to Fabric", () => {
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
    // Setup SATP gateways
    const factoryOptions: IPluginFactoryOptions = {
      pluginImportType: PluginImportType.Local,
    };
    const factory = new PluginFactorySATPGateway(factoryOptions);

    const gatewayIdentity1 = {
      id: "mockID-1",
      name: "CustomGateway1",
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
      name: "CustomGateway2",
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

    knexSourceRemoteInstance = knex(knexSourceRemoteConnection);
    await knexSourceRemoteInstance.migrate.latest();

    knexTargetRemoteInstance = knex(knexTargetRemoteConnection);
    await knexTargetRemoteInstance.migrate.latest();

    const fabricNetworkOptions = fabricEnv.createFabricConfig();
    const besuNetworkOptions = besuEnv.createBesuConfig();

    const ontologiesPath = path.join(__dirname, "../../ontologies");

    const options1: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity1,
      ccConfig: {
        bridgeConfig: [besuNetworkOptions],
      },
      counterPartyGateways: [gatewayIdentity2],
      localRepository: knexClientConnection,
      remoteRepository: knexSourceRemoteConnection,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
    };

    const options2: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity2,
      ccConfig: {
        bridgeConfig: [fabricNetworkOptions],
      },
      counterPartyGateways: [gatewayIdentity1],
      localRepository: knexServerConnection,
      remoteRepository: knexTargetRemoteConnection,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
    };

    gateway1 = await factory.create(options1);
    expect(gateway1).toBeInstanceOf(SATPGateway);
    await gateway1.onPluginInit();

    gateway2 = await factory.create(options2);
    expect(gateway2).toBeInstanceOf(SATPGateway);
    await gateway2.onPluginInit();

    const identity1 = gateway1.Identity;
    expect(identity1.gatewayServerPort).toBe(3010);
    expect(identity1.gatewayClientPort).toBe(3011);
    expect(identity1.gatewayOapiPort).toBe(4010);
    expect(identity1.address).toBe("http://localhost");

    const identity2 = gateway2.Identity;
    expect(identity2.gatewayServerPort).toBe(3012);
    expect(identity2.gatewayClientPort).toBe(3013);
    expect(identity2.gatewayOapiPort).toBe(4011);
    expect(identity2.address).toBe("http://localhost");

    const apiServer1 = await gateway1.getOrCreateHttpServer();
    expect(apiServer1).toBeInstanceOf(ApiServer);

    const apiServer2 = await gateway2.getOrCreateHttpServer();
    expect(apiServer2).toBeInstanceOf(ApiServer);

    const approveAddressApi1 = new GetApproveAddressApi(
      new Configuration({ basePath: gateway1.getAddressOApiAddress() }),
    );

    const approveAddressApi2 = new GetApproveAddressApi(
      new Configuration({ basePath: gateway2.getAddressOApiAddress() }),
    );

    const reqApproveBesuAddress = await approveAddressApi1.getApproveAddress({
      networkId: besuEnv.network,
      tokenType: TokenType.NonstandardFungible,
    } as GetApproveAddressRequest);

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
    log.debug("Approved 100 amount to the Besu Bridge Address");

    const reqApproveFabricAddress = await approveAddressApi2.getApproveAddress({
      networkId: fabricEnv.network,
      tokenType: TokenType.NonstandardFungible,
    } as GetApproveAddressRequest);
    expect(reqApproveFabricAddress?.data.approveAddress).toBeDefined();

    if (!reqApproveFabricAddress?.data.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    await fabricEnv.giveRoleToBridge("Org2MSP");

    const satpApi1 = new TransactionApi(
      new Configuration({ basePath: gateway1.getAddressOApiAddress() }),
    );

    const req = getTransactRequest(
      "mockContext",
      besuEnv,
      fabricEnv,
      "100",
      "100",
    );

    const res = await satpApi1.transact(req);
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
    log.info("Amount was transferred correctly from the Owner account");

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      reqApproveBesuAddress?.data.approveAddress,
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transferred correctly to the Wrapper account");

    await fabricEnv.checkBalance(
      fabricEnv.getTestContractName(),
      fabricEnv.getTestChannelName(),
      reqApproveFabricAddress?.data.approveAddress,
      "0",
      fabricEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transferred correctly from the Bridge account");

    await fabricEnv.checkBalance(
      fabricEnv.getTestContractName(),
      fabricEnv.getTestChannelName(),
      fabricEnv.getTestOwnerAccount(),
      "100",
      fabricEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transferred correctly to the Owner account");
  });
});
describe("2 SATPGateways sending a token from Fabric to Besu", () => {
  it("should mint 100 tokens to the owner account", async () => {
    await fabricEnv.mintTokens("100");
    await fabricEnv.checkBalance(
      fabricEnv.getTestContractName(),
      fabricEnv.getTestChannelName(),
      fabricEnv.getTestOwnerAccount(),
      "100",
      fabricEnv.getTestOwnerSigningCredential(),
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

    knexSourceRemoteInstance = knex(knexSourceRemoteConnection);
    await knexSourceRemoteInstance.migrate.latest();

    knexTargetRemoteInstance = knex(knexTargetRemoteConnection);
    await knexTargetRemoteInstance.migrate.latest();

    const fabricNetworkOptions = fabricEnv.createFabricConfig();
    const besuNetworkOptions = besuEnv.createBesuConfig();

    const ontologiesPath = path.join(__dirname, "../../ontologies");

    const options1: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity1,
      ccConfig: {
        bridgeConfig: [fabricNetworkOptions],
      },
      counterPartyGateways: [gatewayIdentity2],
      localRepository: knexClientConnection,
      remoteRepository: knexSourceRemoteConnection,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
    };

    const options2: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity2,
      ccConfig: {
        bridgeConfig: [besuNetworkOptions],
      },
      counterPartyGateways: [gatewayIdentity1],
      localRepository: knexServerConnection,
      remoteRepository: knexTargetRemoteConnection,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
    };

    gateway1 = await factory.create(options1);
    expect(gateway1).toBeInstanceOf(SATPGateway);
    await gateway1.onPluginInit();

    gateway2 = await factory.create(options2);
    expect(gateway2).toBeInstanceOf(SATPGateway);
    await gateway2.onPluginInit();

    const identity1 = gateway1.Identity;
    expect(identity1.gatewayServerPort).toBe(3010);
    expect(identity1.gatewayClientPort).toBe(3011);
    expect(identity1.gatewayOapiPort).toBe(4010);
    expect(identity1.address).toBe("http://localhost");

    const identity2 = gateway2.Identity;
    expect(identity2.gatewayServerPort).toBe(3012);
    expect(identity2.gatewayClientPort).toBe(3013);
    expect(identity2.gatewayOapiPort).toBe(4011);
    expect(identity2.address).toBe("http://localhost");

    const apiServer1 = await gateway1.getOrCreateHttpServer();
    expect(apiServer1).toBeInstanceOf(ApiServer);

    const apiServer2 = await gateway2.getOrCreateHttpServer();
    expect(apiServer2).toBeInstanceOf(ApiServer);

    const approveAddressApi1 = new GetApproveAddressApi(
      new Configuration({ basePath: gateway1.getAddressOApiAddress() }),
    );

    const approveAddressApi2 = new GetApproveAddressApi(
      new Configuration({ basePath: gateway2.getAddressOApiAddress() }),
    );

    const reqApproveFabricAddress = await approveAddressApi1.getApproveAddress({
      networkId: fabricEnv.network,
      tokenType: TokenType.NonstandardFungible,
    });
    expect(reqApproveFabricAddress?.data.approveAddress).toBeDefined();

    if (!reqApproveFabricAddress?.data.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    if (reqApproveFabricAddress?.data.approveAddress) {
      await fabricEnv.approveAmount(
        reqApproveFabricAddress?.data.approveAddress,
        "100",
      );
    } else {
      throw new Error("Approve address is undefined");
    }
    log.debug("Approved 100 amout to the Besu Bridge Address");

    const reqApproveBesuAddress = await approveAddressApi2.getApproveAddress({
      networkId: besuEnv.network,
      tokenType: TokenType.NonstandardFungible,
    });

    expect(reqApproveBesuAddress?.data.approveAddress).toBeDefined();

    if (!reqApproveBesuAddress?.data.approveAddress) {
      throw new Error("Approve address is undefined");
    }
    await besuEnv.giveRoleToBridge(reqApproveBesuAddress?.data.approveAddress);

    const satpApi1 = new TransactionApi(
      new Configuration({ basePath: gateway1.getAddressOApiAddress() }),
    );

    const req = getTransactRequest(
      "mockContext",
      fabricEnv,
      besuEnv,
      "100",
      "100",
    );

    const res = await satpApi1.transact(req);
    log.info(res?.status);
    log.info(res.data.statusResponse);
    expect(res?.status).toBe(200);

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
      "0",
      fabricEnv.getTestOwnerSigningCredential(),
    );

    log.info("Amount was transfer correctly from the Owner account");

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      besuEnv.getTestOwnerAccount(),
      "100",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Owner account");

    await besuEnv.checkBalance(
      besuEnv.getTestContractName(),
      besuEnv.getTestContractAddress(),
      besuEnv.getTestContractAbi(),
      reqApproveBesuAddress?.data.approveAddress,
      "0",
      besuEnv.getTestOwnerSigningCredential(),
    );
    log.info("Amount was transfer correctly to the Wrapper account");
  });
});

describe("2 SATPGateways sending a token from Besu to Ethereum", () => {
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

    knexSourceRemoteInstance = knex(knexSourceRemoteConnection);
    await knexSourceRemoteInstance.migrate.latest();

    knexTargetRemoteInstance = knex(knexTargetRemoteConnection);
    await knexTargetRemoteInstance.migrate.latest();

    const besuNetworkOptions = besuEnv.createBesuConfig();
    const ethereumNetworkOptions = ethereumEnv.createEthereumConfig();

    const ontologiesPath = path.join(__dirname, "../../ontologies");

    const options1: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity1,
      ccConfig: {
        bridgeConfig: [besuNetworkOptions],
      },
      counterPartyGateways: [gatewayIdentity2],
      localRepository: knexClientConnection,
      remoteRepository: knexSourceRemoteConnection,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
    };

    const options2: SATPGatewayConfig = {
      instanceId: uuidv4(),
      logLevel: "DEBUG",
      gid: gatewayIdentity2,
      ccConfig: {
        bridgeConfig: [ethereumNetworkOptions],
      },
      counterPartyGateways: [gatewayIdentity1],
      localRepository: knexServerConnection,
      remoteRepository: knexTargetRemoteConnection,
      pluginRegistry: new PluginRegistry({ plugins: [] }),
      ontologyPath: ontologiesPath,
    };

    gateway1 = await factory.create(options1);
    expect(gateway1).toBeInstanceOf(SATPGateway);
    await gateway1.onPluginInit();

    gateway2 = await factory.create(options2);
    expect(gateway2).toBeInstanceOf(SATPGateway);
    await gateway2.onPluginInit();

    const identity1 = gateway1.Identity;
    expect(identity1.gatewayServerPort).toBe(3010);
    expect(identity1.gatewayClientPort).toBe(3011);
    expect(identity1.address).toBe("http://localhost");

    const identity2 = gateway2.Identity;
    expect(identity2.gatewayServerPort).toBe(3012);
    expect(identity2.gatewayClientPort).toBe(3013);
    expect(identity2.address).toBe("http://localhost");

    const apiServer1 = await gateway1.getOrCreateHttpServer();
    expect(apiServer1).toBeInstanceOf(ApiServer);

    const apiServer2 = await gateway2.getOrCreateHttpServer();
    expect(apiServer2).toBeInstanceOf(ApiServer);

    const approveAddressApi1 = new GetApproveAddressApi(
      new Configuration({ basePath: gateway1.getAddressOApiAddress() }),
    );

    const approveAddressApi2 = new GetApproveAddressApi(
      new Configuration({ basePath: gateway2.getAddressOApiAddress() }),
    );

    const reqApproveBesuAddress = await approveAddressApi1.getApproveAddress({
      networkId: besuEnv.network,
      tokenType: TokenType.NonstandardFungible,
    });

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

    const reqApproveEthereumAddress =
      await approveAddressApi2.getApproveAddress({
        networkId: ethereumEnv.network,
        tokenType: TokenType.NonstandardFungible,
      });

    expect(reqApproveEthereumAddress?.data.approveAddress).toBeDefined();

    if (!reqApproveEthereumAddress?.data.approveAddress) {
      throw new Error("Approve address is undefined");
    }

    await ethereumEnv.giveRoleToBridge(
      reqApproveEthereumAddress?.data.approveAddress,
    );

    const satpApi1 = new TransactionApi(
      new Configuration({ basePath: gateway1.getAddressOApiAddress() }),
    );

    const req = getTransactRequest(
      "mockContext",
      besuEnv,
      ethereumEnv,
      "100",
      "100",
    );

    const res = await satpApi1?.transact(req);
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
