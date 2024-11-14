import "jest-extended";
import {
  LogLevelDesc,
  LoggerProvider,
  Secp256k1Keys,
} from "@hyperledger/cactus-common";
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
import {
  Address,
  GatewayIdentity,
  SupportedChain,
} from "../../../main/typescript/core/types";
import {
  createClient,
  setupGatewayDockerFiles,
  BesuTestEnvironment,
  FabricTestEnvironment,
  getTransactRequest,
} from "../test-utils";
import {
  DEFAULT_PORT_GATEWAY_API,
  DEFAULT_PORT_GATEWAY_CLIENT,
  DEFAULT_PORT_GATEWAY_SERVER,
  SATP_CORE_VERSION,
  SATP_ARCHITETURE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../main/typescript/core/constants";
import { ClaimFormat } from "../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { bufArray2HexStr } from "../../../main/typescript/gateway-utils";

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "BUNGEE - Hermes",
});

let fabricEnv: FabricTestEnvironment;
let besuEnv: BesuTestEnvironment;
let gatewayRunner1: SATPGatewayRunner;
let gatewayRunner2: SATPGatewayRunner;
const bridge_id =
  "x509::/OU=org2/OU=client/OU=department1/CN=bridge::/C=UK/ST=Hampshire/L=Hursley/O=org2.example.com/CN=ca.org2.example.com";

afterAll(async () => {
  await gatewayRunner1.stop();
  await gatewayRunner1.destroy();
  await gatewayRunner2.stop();
  await gatewayRunner2.destroy();
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
    // besuConfig Json object setup:
    const besuConfigJSON = await besuEnv.createBesuConfigJSON(logLevel);

    // fabricConfig Json object setup:
    const fabricConfigJSON = await fabricEnv.createFabricConfigJSON(logLevel);

    // gatewayIds setup:
    const gateway1KeyPair = Secp256k1Keys.generateKeyPairsBuffer();
    const gateway2KeyPair = Secp256k1Keys.generateKeyPairsBuffer();
    const address: Address = `http://localhost`;

    const gatewayIdentity1 = {
      id: "mockID-1",
      name: "CustomGateway",
      version: [
        {
          Core: SATP_CORE_VERSION,
          Architecture: SATP_ARCHITETURE_VERSION,
          Crash: SATP_CRASH_VERSION,
        },
      ],
      supportedDLTs: [SupportedChain.BESU],
      proofID: "mockProofID10",
      address,
      gatewayClientPort: DEFAULT_PORT_GATEWAY_CLIENT,
      gatewayServerPort: DEFAULT_PORT_GATEWAY_SERVER,
      gatewayOpenAPIPort: DEFAULT_PORT_GATEWAY_API,
    } as GatewayIdentity;

    const gatewayIdentity2 = {
      id: "mockID-2",
      name: "CustomGateway",
      version: [
        {
          Core: SATP_CORE_VERSION,
          Architecture: SATP_ARCHITETURE_VERSION,
          Crash: SATP_CRASH_VERSION,
        },
      ],
      supportedDLTs: [SupportedChain.FABRIC],
      proofID: "mockProofID11",
      address,
      gatewayServerPort: 3110,
      gatewayClientPort: 3111,
      gatewayOpenAPIPort: 4110,
    } as GatewayIdentity;

    // configFile setup for gateway1:
    console.log("Creating gatewayJSON1...");
    const files1 = setupGatewayDockerFiles(
      gatewayIdentity1,
      logLevel,
      [
        {
          id: "mockID-2",
          name: "CustomGateway",
          pubKey: bufArray2HexStr(gateway2KeyPair.publicKey),
          version: [
            {
              Core: SATP_CORE_VERSION,
              Architecture: SATP_ARCHITETURE_VERSION,
              Crash: SATP_CRASH_VERSION,
            },
          ],
          supportedDLTs: [SupportedChain.FABRIC],
          proofID: "mockProofID11",
          address,
          gatewayServerPort: 3110,
          gatewayClientPort: 3111,
          gatewayOpenAPIPort: 4110,
        },
      ],
      [besuConfigJSON],
      "gateway1",
      {
        privateKey: Buffer.from(gateway1KeyPair.privateKey).toString("hex"),
        publicKey: Buffer.from(gateway1KeyPair.publicKey).toString("hex"),
      },
    );

    // configFile setup for gateway2:
    console.log("Creating gatewayJSON2...");
    const files2 = setupGatewayDockerFiles(
      gatewayIdentity2,
      logLevel,
      [
        {
          id: "mockID-1",
          name: "CustomGateway",
          pubKey: bufArray2HexStr(gateway1KeyPair.publicKey),
          version: [
            {
              Core: SATP_CORE_VERSION,
              Architecture: SATP_ARCHITETURE_VERSION,
              Crash: SATP_CRASH_VERSION,
            },
          ],
          supportedDLTs: [SupportedChain.BESU],
          proofID: "mockProofID10",
          address,
          gatewayClientPort: DEFAULT_PORT_GATEWAY_CLIENT,
          gatewayServerPort: DEFAULT_PORT_GATEWAY_SERVER,
          gatewayOpenAPIPort: DEFAULT_PORT_GATEWAY_API,
        },
      ],
      [fabricConfigJSON],
      "gateway2",
      {
        privateKey: Buffer.from(gateway2KeyPair.privateKey).toString("hex"),
        publicKey: Buffer.from(gateway2KeyPair.publicKey).toString("hex"),
      },
    );

    // gatewayRunner1 setup:
    const gatewayRunnerOptions1: ISATPGatewayRunnerConstructorOptions = {
      containerImageVersion: "2024-10-30T19-54-20-dev-5e06263e0",
      containerImageName: "ghcr.io/hyperledger/cacti-satp-hermes-gateway",
      logLevel,
      emitContainerLogs: true,
      configFile: files1.configFile,
      outputLogFile: files1.outputLogFile,
      errorLogFile: files1.errorLogFile,
      serverPort: gatewayIdentity1.gatewayServerPort,
      clientPort: gatewayIdentity1.gatewayClientPort,
      apiPort: gatewayIdentity1.gatewayOpenAPIPort,
    };

    // gatewayRunner2 setup:
    const gatewayRunnerOptions2: ISATPGatewayRunnerConstructorOptions = {
      containerImageVersion: "2024-10-30T19-54-20-dev-5e06263e0",
      containerImageName: "ghcr.io/hyperledger/cacti-satp-hermes-gateway",
      logLevel,
      emitContainerLogs: true,
      configFile: files2.configFile,
      outputLogFile: files2.outputLogFile,
      errorLogFile: files2.errorLogFile,
      serverPort: gatewayIdentity2.gatewayServerPort,
      clientPort: gatewayIdentity2.gatewayClientPort,
      apiPort: gatewayIdentity2.gatewayOpenAPIPort,
    };

    gatewayRunner1 = new SATPGatewayRunner(gatewayRunnerOptions1);
    gatewayRunner2 = new SATPGatewayRunner(gatewayRunnerOptions2);

    console.log("starting gatewayRunner1...");
    await gatewayRunner1.start();
    console.log("gatewayRunner1 started sucessfully");
    console.log("starting gatewayRunner2...");
    await gatewayRunner2.start();
    console.log("gatewayRunner2 started sucessfully");

    const req = getTransactRequest(
      "mockContext",
      besuEnv,
      fabricEnv,
      "100",
      "1",
    );

    const port = await gatewayRunner1.getHostPort(DEFAULT_PORT_GATEWAY_API);

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
  });
});
