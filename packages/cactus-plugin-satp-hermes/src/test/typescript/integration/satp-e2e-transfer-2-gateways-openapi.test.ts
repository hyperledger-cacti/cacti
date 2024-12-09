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
} from "@hyperledger/cactus-test-tooling";
import {
  EthContractInvocationType,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import SATPContract from "../../solidity/generated/satp-erc20.sol/SATPContract.json";
import {
  SATPGatewayConfig,
  SATPGateway,
  PluginFactorySATPGateway,
  TransactRequest,
} from "../../../main/typescript";
import {
  Address,
  GatewayIdentity,
  SupportedChain,
} from "../../../main/typescript/core/types";
import {
  IPluginFactoryOptions,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import {
  BesuTestEnvironment,
  createClient,
  FabricTestEnvironment,
  getTransactRequest,
} from "../test-utils";
import { bufArray2HexStr } from "../../../main/typescript/gateway-utils";
import { ClaimFormat } from "../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import {
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../main/typescript/core/constants";

const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "BUNGEE - Hermes",
});

let fabricEnv: FabricTestEnvironment;
let besuEnv: BesuTestEnvironment;
let gateway1: SATPGateway;
let gateway2: SATPGateway;
const bridge_id =
  "x509::/OU=org2/OU=client/OU=department1/CN=bridge::/C=UK/ST=Hampshire/L=Hursley/O=org2.example.com/CN=ca.org2.example.com";

afterAll(async () => {
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

describe("2 SATPGateway sending a token from Besu to Fabric using openApi to request transact method", () => {
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
      supportedDLTs: [SupportedChain.BESU],
      proofID: "mockProofID10",
      address: "http://localhost" as Address,
    } as GatewayIdentity;

    const gateway1KeyPair = Secp256k1Keys.generateKeyPairsBuffer();

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
      supportedDLTs: [SupportedChain.FABRIC],
      proofID: "mockProofID11",
      address: "http://localhost" as Address,
      gatewayServerPort: 3110,
      gatewayClientPort: 3111,
      gatewayOpenAPIPort: 4110,
    } as GatewayIdentity;

    const gateway2KeyPair = Secp256k1Keys.generateKeyPairsBuffer();

    const options1: SATPGatewayConfig = {
      logLevel: "DEBUG",
      gid: gatewayIdentity1,
      counterPartyGateways: [
        // this need to be like this because the shared memory was being altered
        {
          id: "mockID-2",
          name: "CustomGateway",
          pubKey: bufArray2HexStr(gateway2KeyPair.publicKey),
          version: [
            {
              Core: SATP_CORE_VERSION,
              Architecture: SATP_ARCHITECTURE_VERSION,
              Crash: SATP_CRASH_VERSION,
            },
          ],
          supportedDLTs: [SupportedChain.FABRIC],
          proofID: "mockProofID11",
          address: "http://localhost" as Address,
          gatewayServerPort: 3110,
          gatewayClientPort: 3111,
          gatewayOpenAPIPort: 4110,
        },
      ],
      bridgesConfig: [besuEnv.besuConfig],
      keyPair: gateway1KeyPair,
    };

    const options2: SATPGatewayConfig = {
      logLevel: "DEBUG",
      gid: gatewayIdentity2,
      counterPartyGateways: [
        {
          id: "mockID-1",
          name: "CustomGateway",
          pubKey: bufArray2HexStr(gateway1KeyPair.publicKey),
          version: [
            {
              Core: SATP_CORE_VERSION,
              Architecture: SATP_ARCHITECTURE_VERSION,
              Crash: SATP_CRASH_VERSION,
            },
          ],
          supportedDLTs: [SupportedChain.BESU],
          proofID: "mockProofID10",
          address: "http://localhost" as Address,
        },
      ],
      bridgesConfig: [fabricEnv.fabricConfig],
      keyPair: gateway2KeyPair,
    };
    gateway1 = await factory.create(options1);
    expect(gateway1).toBeInstanceOf(SATPGateway);

    const identity1 = gateway1.Identity;
    // default servers
    expect(identity1.gatewayServerPort).toBe(3010);
    expect(identity1.gatewayClientPort).toBe(3011);
    expect(identity1.gatewayOpenAPIPort).toBe(4010);
    expect(identity1.address).toBe("http://localhost");
    await gateway1.startup();

    gateway2 = await factory.create(options2);
    expect(gateway2).toBeInstanceOf(SATPGateway);

    const identity2 = gateway2.Identity;
    // default servers
    expect(identity2.gatewayServerPort).toBe(3110);
    expect(identity2.gatewayClientPort).toBe(3111);
    expect(identity2.gatewayOpenAPIPort).toBe(4110);
    expect(identity2.address).toBe("http://localhost");
    await gateway2.startup();

    const dispatcher = gateway1.getBLODispatcher();

    expect(dispatcher).toBeTruthy();
    const req = getTransactRequest(
      "mockContext",
      besuEnv,
      fabricEnv,
      "100",
      "1",
    );

    const address = options1.gid!.address!;
    const port = options1.gid!.gatewayOpenAPIPort!;

    const transactionApiClient = createClient(
      "TransactionApi",
      address,
      port,
      log,
    );
    const adminApi = createClient("AdminApi", address, port, log);

    const res = await transactionApiClient.transact(req as TransactRequest);
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
