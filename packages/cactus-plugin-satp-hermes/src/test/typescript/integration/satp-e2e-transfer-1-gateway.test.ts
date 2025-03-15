import "jest-extended";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { FabricContractInvocationType } from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import {
  pruneDockerAllIfGithubAction,
  Containers,
} from "@hyperledger/cactus-test-tooling";
import {
  EthContractInvocationType,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import {
  SATPGatewayConfig,
  SATPGateway,
  PluginFactorySATPGateway,
} from "../../../main/typescript";
import { Address, GatewayIdentity } from "../../../main/typescript/core/types";
import {
  IPluginFactoryOptions,
  LedgerType,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import { ClaimFormat } from "../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import {
  BesuTestEnvironment,
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
  knexSourceRemoteConnection,
} from "../knex.config";
import { Knex, knex } from "knex";

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "SATP - Hermes",
});

let knexInstanceClient: Knex;
let knexSourceRemoteInstance: Knex;
let fabricEnv: FabricTestEnvironment;
let besuEnv: BesuTestEnvironment;
let gateway: SATPGateway;
const bridge_id =
  "x509::/OU=org2/OU=client/OU=department1/CN=bridge::/C=UK/ST=Hampshire/L=Hursley/O=org2.example.com/CN=ca.org2.example.com";

afterAll(async () => {
  await gateway.shutdown();

  if (gateway) {
    if (knexInstanceClient) {
      await knexInstanceClient.destroy();
    }
    if (knexSourceRemoteInstance) {
      await knexSourceRemoteInstance.destroy();
    }
    await gateway.shutdown();
  }
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
    fabricEnv = await FabricTestEnvironment.setupTestEnvironment(
      satpContractName,
      bridge_id,
      logLevel,
    );
    log.info("Fabric Ledger started successfully");

    await fabricEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);
  }

  {
    const erc20TokenContract = "SATPContract";
    const contractNameWrapper = "SATPWrapperContract";

    besuEnv = await BesuTestEnvironment.setupTestEnvironment(
      erc20TokenContract,
      contractNameWrapper,
      logLevel,
    );
    log.info("Besu Ledger started successfully");

    await besuEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);
  }
});

describe("SATPGateway sending a token from Besu to Fabric", () => {
  it("should realize a transfer", async () => {
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
      connectedDLTs: [
        {
          id: BesuTestEnvironment.BESU_NETWORK_ID,
          ledgerType: LedgerType.Besu2X,
        },
        {
          id: FabricTestEnvironment.FABRIC_NETWORK_ID,
          ledgerType: LedgerType.Fabric2,
        },
      ],
      proofID: "mockProofID10",
      address: "http://localhost" as Address,
    } as GatewayIdentity;

    knexInstanceClient = knex(knexClientConnection);
    await knexInstanceClient.migrate.latest();

    knexSourceRemoteInstance = knex(knexSourceRemoteConnection);
    await knexSourceRemoteInstance.migrate.latest();

    const options: SATPGatewayConfig = {
      logLevel: "DEBUG",
      gid: gatewayIdentity,
      counterPartyGateways: [], //only knows itself
      bridgesConfig: [besuEnv.besuConfig, fabricEnv.fabricConfig],
      knexLocalConfig: knexClientConnection,
      knexRemoteConfig: knexSourceRemoteConnection,
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
    const req = getTransactRequest(
      "mockContext",
      besuEnv,
      fabricEnv,
      "100",
      "1",
    );

    const res = await dispatcher?.Transact(req);
    log.info(res?.statusResponse);

    const responseBalanceOwner = await besuEnv.connector.invokeContract({
      contractName: besuEnv.erc20TokenContract,
      keychainId: besuEnv.keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [besuEnv.firstHighNetWorthAccount],
      signingCredential: {
        ethAccount: besuEnv.firstHighNetWorthAccount,
        secret: besuEnv.besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceOwner).toBeTruthy();
    expect(responseBalanceOwner.success).toBeTruthy();
    expect(responseBalanceOwner.callOutput).toBe("0");
    log.info("Amount was transfer correctly from the Owner account");

    const responseBalanceBridge = await besuEnv.connector.invokeContract({
      contractName: besuEnv.erc20TokenContract,
      keychainId: besuEnv.keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [besuEnv.wrapperContractAddress],
      signingCredential: {
        ethAccount: besuEnv.firstHighNetWorthAccount,
        secret: besuEnv.besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceBridge).toBeTruthy();
    expect(responseBalanceBridge.success).toBeTruthy();
    expect(responseBalanceBridge.callOutput).toBe("0");
    log.info("Amount was transfer correctly to the Wrapper account");

    const responseBalance1 = await fabricEnv.apiClient.runTransactionV1({
      contractName: fabricEnv.satpContractName,
      channelName: fabricEnv.fabricChannelName,
      params: [fabricEnv.bridge_id],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricEnv.fabricSigningCredential,
    });

    expect(responseBalance1).not.toBeUndefined();
    expect(responseBalance1.status).toBeGreaterThan(199);
    expect(responseBalance1.status).toBeLessThan(300);
    expect(responseBalance1.data).not.toBeUndefined();
    expect(responseBalance1.data.functionOutput).toBe("0");
    log.info("Amount was transfer correctly from the Bridge account");

    const responseBalance2 = await fabricEnv.apiClient.runTransactionV1({
      contractName: fabricEnv.satpContractName,
      channelName: fabricEnv.fabricChannelName,
      params: [fabricEnv.clientId],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricEnv.fabricSigningCredential,
    });
    expect(responseBalance2).not.toBeUndefined();
    expect(responseBalance2.status).toBeGreaterThan(199);
    expect(responseBalance2.status).toBeLessThan(300);
    expect(responseBalance2.data).not.toBeUndefined();
    expect(responseBalance2.data.functionOutput).toBe("1");
    log.info("Amount was transfer correctly to the Owner account");
  });
});

describe("SATPGateway sending a token from Fabric to Besu", () => {
  it("should realize a transfer", async () => {
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
      connectedDLTs: [
        {
          id: FabricTestEnvironment.FABRIC_NETWORK_ID,
          ledgerType: LedgerType.Fabric2,
        },
        {
          id: BesuTestEnvironment.BESU_NETWORK_ID,
          ledgerType: LedgerType.Besu2X,
        },
      ],
      proofID: "mockProofID10",
      address: "http://localhost" as Address,
    } as GatewayIdentity;

    knexInstanceClient = knex(knexClientConnection);
    await knexInstanceClient.migrate.latest();

    knexSourceRemoteInstance = knex(knexSourceRemoteConnection);
    await knexSourceRemoteInstance.migrate.latest();

    const options: SATPGatewayConfig = {
      logLevel: "DEBUG",
      gid: gatewayIdentity,
      counterPartyGateways: [], //only knows itself
      bridgesConfig: [fabricEnv.fabricConfig, besuEnv.besuConfig],
      knexLocalConfig: knexClientConnection,
      knexRemoteConfig: knexSourceRemoteConnection,
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

    const responseMint = await fabricEnv.apiClient.runTransactionV1({
      contractName: fabricEnv.satpContractName,
      channelName: fabricEnv.fabricChannelName,
      params: ["2"],
      methodName: "Mint",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricEnv.fabricSigningCredential,
    });
    expect(responseMint).not.toBeUndefined();
    expect(responseMint.status).toBeGreaterThan(199);
    expect(responseMint.status).toBeLessThan(300);
    expect(responseMint.data).not.toBeUndefined();

    log.info(
      `Mint 2 amount asset by the owner response: ${JSON.stringify(responseMint.data)}`,
    );

    const responseApprove = await fabricEnv.apiClient.runTransactionV1({
      contractName: fabricEnv.satpContractName,
      channelName: fabricEnv.fabricChannelName,
      params: [fabricEnv.bridge_id, "2"],
      methodName: "Approve",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricEnv.fabricSigningCredential,
    });

    expect(responseApprove).not.toBeUndefined();
    expect(responseApprove.status).toBeGreaterThan(199);
    expect(responseApprove.status).toBeLessThan(300);
    expect(responseApprove.data).not.toBeUndefined();

    log.info(
      `Approve 2 amount asset by the owner response: ${JSON.stringify(responseApprove.data)}`,
    );

    const req = getTransactRequest(
      "mockContext",
      fabricEnv,
      besuEnv,
      "1",
      "100",
    );
    const res = await dispatcher?.Transact(req);
    log.info(res?.statusResponse);

    const responseBalance1 = await fabricEnv.apiClient.runTransactionV1({
      contractName: fabricEnv.satpContractName,
      channelName: fabricEnv.fabricChannelName,
      params: [fabricEnv.bridge_id],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricEnv.fabricSigningCredential,
    });

    expect(responseBalance1).not.toBeUndefined();
    expect(responseBalance1.status).toBeGreaterThan(199);
    expect(responseBalance1.status).toBeLessThan(300);
    expect(responseBalance1.data).not.toBeUndefined();
    expect(responseBalance1.data.functionOutput).toBe("0");
    log.info("Amount was transfer correctly from the Bridge account");

    const responseBalance2 = await fabricEnv.apiClient.runTransactionV1({
      contractName: fabricEnv.satpContractName,
      channelName: fabricEnv.fabricChannelName,
      params: [fabricEnv.clientId],
      methodName: "ClientIDAccountBalance",
      invocationType: FabricContractInvocationType.Send,
      signingCredential: fabricEnv.fabricSigningCredential,
    });
    expect(responseBalance2).not.toBeUndefined();
    expect(responseBalance2.status).toBeGreaterThan(199);
    expect(responseBalance2.status).toBeLessThan(300);
    expect(responseBalance2.data).not.toBeUndefined();
    expect(responseBalance2.data.functionOutput).toBe("1");
    log.info("Amount was transfer correctly to the Owner account");

    const responseBalanceBridge = await besuEnv.connector.invokeContract({
      contractName: besuEnv.erc20TokenContract,
      keychainId: besuEnv.keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [besuEnv.wrapperContractAddress],
      signingCredential: {
        ethAccount: besuEnv.firstHighNetWorthAccount,
        secret: besuEnv.besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceBridge).toBeTruthy();
    expect(responseBalanceBridge.success).toBeTruthy();
    expect(responseBalanceBridge.callOutput).toBe("0");
    log.info("Amount was transfer correctly from the Wrapper account");

    const responseBalanceOwner = await besuEnv.connector.invokeContract({
      contractName: besuEnv.erc20TokenContract,
      keychainId: besuEnv.keychainPlugin1.getKeychainId(),
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [besuEnv.firstHighNetWorthAccount],
      signingCredential: {
        ethAccount: besuEnv.firstHighNetWorthAccount,
        secret: besuEnv.besuKeyPair.privateKey,
        type: Web3SigningCredentialType.PrivateKeyHex,
      },
      gas: 999999999,
    });
    expect(responseBalanceOwner).toBeTruthy();
    expect(responseBalanceOwner.success).toBeTruthy();
    expect(responseBalanceOwner.callOutput).toBe("200");
    log.info("Amount was transfer correctly to the Owner account");
  });
});
