import "jest-extended";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { FabricContractInvocationType } from "@hyperledger/cactus-plugin-ledger-connector-fabric";
import {
  pruneDockerAllIfGithubAction,
  Containers,
  SATPGatewayRunner,
  ISATPGatewayRunnerConstructorOptions,
} from "@hyperledger/cactus-test-tooling";
import {
  EthContractInvocationType,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import SATPContract from "../../solidity/generated/satp-erc20.sol/SATPContract.json";
import { Address, GatewayIdentity } from "../../../main/typescript/core/types";
import {
  createClient,
  setupGatewayDockerFiles,
  BesuTestEnvironment,
  FabricTestEnvironment,
  getTransactRequest,
  EthereumTestEnvironment,
  createPGDatabase,
  setupDBTable,
} from "../test-utils";
import {
  DEFAULT_PORT_GATEWAY_API,
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_SERVER,
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../main/typescript/core/constants";
import { ClaimFormat } from "../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { WHALE_ACCOUNT_ADDRESS } from "@hyperledger/cactus-test-geth-ledger";
import { Container } from "dockerode";
import { Knex } from "knex";
import { LedgerType } from "@hyperledger/cactus-core-api";

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "SATP - Hermes",
});

let besuEnv: BesuTestEnvironment;
let ethereumEnv: EthereumTestEnvironment;
let fabricEnv: FabricTestEnvironment;
const erc20TokenContract = "SATPContract";
const contractNameWrapper = "SATPWrapperContract";
const bridge_id =
  "x509::/OU=org2/OU=client/OU=department1/CN=bridge::/C=UK/ST=Hampshire/L=Hursley/O=org2.example.com/CN=ca.org2.example.com";

let db_local_config: Knex.Config;
let db_remote_config: Knex.Config;
let db_local: Container;
let db_remote: Container;

afterAll(async () => {
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

  ({ config: db_local_config, container: db_local } = await createPGDatabase(
    5432,
    "user123123",
    "password",
  ));

  ({ config: db_remote_config, container: db_remote } = await createPGDatabase(
    5450,
    "user123123",
    "password",
  ));

  await setupDBTable(db_local_config);
  await setupDBTable(db_remote_config);

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
    besuEnv = await BesuTestEnvironment.setupTestEnvironment(
      erc20TokenContract,
      contractNameWrapper,
      logLevel,
    );
    log.info("Besu Ledger started successfully");

    await besuEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);
  }
  {
    ethereumEnv = await EthereumTestEnvironment.setupTestEnvironment(
      erc20TokenContract,
      contractNameWrapper,
      logLevel,
    );
    log.info("Ethereum Ledger started successfully");

    await ethereumEnv.deployAndSetupContracts(ClaimFormat.DEFAULT);
  }
});

describe("SATPGateway sending a token from Besu to Fabric", () => {
  it("should realize a transfer", async () => {
    const address: Address = `http://localhost`;

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
      address,
      gatewayClientPort: DEFAULT_PORT_GATEWAY_CLIENT,
      gatewayServerPort: DEFAULT_PORT_GATEWAY_SERVER,
      gatewayOpenAPIPort: DEFAULT_PORT_GATEWAY_API,
    } as GatewayIdentity;

    // besuConfig Json object setup:
    const besuConfigJSON = await besuEnv.createBesuConfigJSON(logLevel);

    // fabricConfig Json object setup:
    const fabricConfigJSON = await fabricEnv.createFabricConfigJSON(logLevel);

    const files = setupGatewayDockerFiles(
      gatewayIdentity,
      logLevel,
      [], //only knows itself
      [besuConfigJSON, fabricConfigJSON],
      false, // Crash recovery disabled
      db_local_config,
      db_remote_config,
    );

    // gatewayRunner setup:
    const gatewayRunnerOptions: ISATPGatewayRunnerConstructorOptions = {
      containerImageVersion: "latest",
      containerImageName: "ghcr.io/hyperledger/cacti-satp-hermes-gateway",
      logLevel,
      emitContainerLogs: true,
      configFile: files.configFile,
      outputLogFile: files.outputLogFile,
      errorLogFile: files.errorLogFile,
    };
    const gatewayRunner = new SATPGatewayRunner(gatewayRunnerOptions);
    console.log("starting gatewayRunner...");
    await gatewayRunner.start();
    console.log("gatewayRunner started sucessfully");

    const req = getTransactRequest(
      "mockContext",
      besuEnv,
      fabricEnv,
      "100",
      "1",
    );

    const port = await gatewayRunner.getHostPort(DEFAULT_PORT_GATEWAY_API);

    const transactionApiClient = createClient(
      "TransactionApi",
      address,
      port,
      log,
    );
    const adminApi = createClient("AdminApi", address, port, log);

    const res = await transactionApiClient.transact(req);
    log.info(res?.data.statusResponse);

    const sessions = await adminApi.getSessionIds({});
    expect(sessions.data).toBeTruthy();
    expect(sessions.data.length).toBe(1);
    expect(sessions.data[0]).toBe(res.data.sessionID);

    const responseBalanceOwner = await besuEnv.connector.invokeContract({
      contractName: besuEnv.erc20TokenContract,
      contractAbi: SATPContract.abi,
      invocationType: EthContractInvocationType.Call,
      contractAddress: besuEnv.assetContractAddress,
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
    console.log(
      `Balance Besu Owner Account: ${responseBalanceOwner.callOutput}`,
    );
    expect(responseBalanceOwner.callOutput).toBe("0");
    log.info("Amount was transfer correctly from the Owner account");

    const responseBalanceBridge = await besuEnv.connector.invokeContract({
      contractName: besuEnv.erc20TokenContract,
      contractAbi: SATPContract.abi,
      invocationType: EthContractInvocationType.Call,
      contractAddress: besuEnv.assetContractAddress,
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
    console.log(
      `Balance Besu Bridge Account: ${responseBalanceBridge.callOutput}`,
    );
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
    console.log(
      `Balance Fabric Bridge Account: ${responseBalance1.data.functionOutput}`,
    );
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
    console.log(
      `Balance Fabric Owner Account: ${responseBalance2.data.functionOutput}`,
    );
    log.info("Amount was transfer correctly to the Owner account");

    await gatewayRunner.stop();
    await gatewayRunner.destroy();
    await db_local.stop();
    await db_local.remove();
    await db_remote.stop();
    await db_remote.remove();
  });
});

describe("SATPGateway sending a token from Ethereum to Fabric", () => {
  it("should realize a transfer", async () => {
    const address: Address = `http://localhost`;

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
      connectedDLTs: [
        {
          id: EthereumTestEnvironment.ETH_NETWORK_ID,
          ledgerType: LedgerType.Ethereum,
        },
        {
          id: FabricTestEnvironment.FABRIC_NETWORK_ID,
          ledgerType: LedgerType.Fabric2,
        },
      ],
      proofID: "mockProofID10",
      address,
      gatewayClientPort: DEFAULT_PORT_GATEWAY_CLIENT,
      gatewayServerPort: DEFAULT_PORT_GATEWAY_SERVER,
      gatewayOpenAPIPort: DEFAULT_PORT_GATEWAY_API,
    } as GatewayIdentity;

    // ethereumConfig Json object setup:
    const ethereumConfigJSON =
      await ethereumEnv.createEthereumConfigJSON(logLevel);

    // fabricConfig Json object setup:
    const fabricConfigJSON = await fabricEnv.createFabricConfigJSON(logLevel);

    // gateway configuration setup:
    const files = setupGatewayDockerFiles(
      gatewayIdentity,
      logLevel,
      [], //only knows itself
      [ethereumConfigJSON, fabricConfigJSON],
      false, // Crash recovery disabled
      db_local_config,
      db_remote_config,
    );

    let initialBalance;
    try {
      initialBalance = await fabricEnv.apiClient.runTransactionV1({
        contractName: fabricEnv.satpContractName,
        channelName: fabricEnv.fabricChannelName,
        params: [fabricEnv.clientId],
        methodName: "ClientIDAccountBalance",
        invocationType: FabricContractInvocationType.Send,
        signingCredential: fabricEnv.fabricSigningCredential,
      });
    } catch (error) {
      initialBalance = { data: { functionOutput: "0" } };
    }

    //TODO: when ready, change to official hyperledger image
    // -- for now use your local image (the name might be different)
    // gatewayRunner setup:
    const gatewayRunnerOptions: ISATPGatewayRunnerConstructorOptions = {
      containerImageVersion: "latest",
      containerImageName: "ghcr.io/hyperledger/cacti-satp-hermes-gateway",
      logLevel,
      emitContainerLogs: true,
      configFile: files.configFile,
      outputLogFile: files.outputLogFile,
      errorLogFile: files.errorLogFile,
    };
    const gatewayRunner = new SATPGatewayRunner(gatewayRunnerOptions);
    console.log("starting gatewayRunner...");
    await gatewayRunner.start(true);
    console.log("gatewayRunner started sucessfully");

    const req = getTransactRequest(
      "mockContext",
      ethereumEnv,
      fabricEnv,
      "100",
      "1",
    );

    const port = await gatewayRunner.getHostPort(DEFAULT_PORT_GATEWAY_API);

    const transactionApiClient = createClient(
      "TransactionApi",
      address,
      port,
      log,
    );
    const adminApi = createClient("AdminApi", address, port, log);

    const res = await transactionApiClient.transact(req);
    log.info(res?.data.statusResponse);

    const sessions = await adminApi.getSessionIds({});
    expect(sessions.data).toBeTruthy();
    expect(sessions.data.length).toBe(1);
    expect(sessions.data[0]).toBe(res.data.sessionID);

    const responseBalanceOwner = await ethereumEnv.connector.invokeContract({
      contract: {
        contractName: ethereumEnv.erc20TokenContract,
        keychainId: ethereumEnv.keychainPlugin1.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [WHALE_ACCOUNT_ADDRESS],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(responseBalanceOwner).toBeTruthy();
    expect(responseBalanceOwner.success).toBeTruthy();
    expect(responseBalanceOwner.callOutput).toBe(BigInt(0));
    log.info("Amount was transfer correctly from the Owner account");

    const responseBalanceBridge = await ethereumEnv.connector.invokeContract({
      contract: {
        contractName: ethereumEnv.erc20TokenContract,
        keychainId: ethereumEnv.keychainPlugin1.getKeychainId(),
      },
      invocationType: EthContractInvocationType.Call,
      methodName: "checkBalance",
      params: [ethereumEnv.wrapperContractAddress],
      web3SigningCredential: {
        ethAccount: WHALE_ACCOUNT_ADDRESS,
        secret: "",
        type: Web3SigningCredentialType.GethKeychainPassword,
      },
    });
    expect(responseBalanceBridge).toBeTruthy();
    expect(responseBalanceBridge.success).toBeTruthy();
    expect(responseBalanceBridge.callOutput).toBe(BigInt(0));
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
    expect(responseBalance2.data.functionOutput).toBe(
      (Number(initialBalance.data.functionOutput) + 1).toString(),
    );
    log.info("Amount was transfer correctly to the Owner account");

    await gatewayRunner.stop();
    await gatewayRunner.destroy();
    await db_local.stop();
    await db_local.remove();
    await db_remote.stop();
    await db_remote.remove();
  });
});
