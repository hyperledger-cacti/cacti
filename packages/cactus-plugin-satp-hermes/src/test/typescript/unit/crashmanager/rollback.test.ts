import "jest-extended";
import { Secp256k1Keys } from "@hyperledger/cactus-common";
import { CrashRecoveryManager } from "../../../../main/typescript/gol/crash-manager";
import {
  LocalLog,
  SupportedChain,
  GatewayIdentity,
  Address,
} from "../../../../main/typescript/core/types";
import {
  pruneDockerAllIfGithubAction,
  Containers,
} from "@hyperledger/cactus-test-tooling";
import { BesuTestEnvironment, FabricTestEnvironment } from "../../test-utils";
import {
  AssetSchema,
  CredentialProfile,
  LockType,
  SignatureAlgorithm,
} from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { v4 as uuidv4 } from "uuid";
import { SATP_VERSION } from "../../../../main/typescript/core/constants";
import { SATPSession } from "../../../../main/typescript/core/satp-session";
import { getSatpLogKey } from "../../../../main/typescript/gateway-utils";
import { TokenType } from "../../../../main/typescript/core/stage-services/satp-bridge/types/asset";
import {
  SATPGatewayConfig,
  PluginFactorySATPGateway,
  SATPGateway,
} from "../../../../main/typescript";
import {
  IPluginFactoryOptions,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import { bufArray2HexStr } from "../../../../main/typescript/gateway-utils";
import {
  knexClientConnection,
  knexRemoteConnection1,
  knexRemoteConnection2,
  knexServerConnection,
} from "../../knex.config";
import { LogLevelDesc, LoggerProvider } from "@hyperledger/cactus-common";
import { ClaimFormat } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { Knex, knex } from "knex";
import { create } from "@bufbuild/protobuf";

let fabricEnv: FabricTestEnvironment;
let besuEnv: BesuTestEnvironment;

let knexInstanceClient: Knex;
let knexInstanceServer: Knex;
let knexInstanceRemote1: Knex;
let knexInstanceRemote2: Knex;

let gateway1: SATPGateway;
let gateway2: SATPGateway;
const bridge_id =
  "x509::/OU=org2/OU=client/OU=department1/CN=bridge::/C=UK/ST=Hampshire/L=Hursley/O=org2.example.com/CN=ca.org2.example.com";

let crashManager1: CrashRecoveryManager;
let crashManager2: CrashRecoveryManager;

const keyPairs = Secp256k1Keys.generateKeyPairsBuffer();
const logLevel: LogLevelDesc = "DEBUG";
const log = LoggerProvider.getOrCreate({
  level: logLevel,
  label: "BUNGEE - Hermes",
});

const createMockSession = (
  maxTimeout: string,
  maxRetries: string,
  isClient: boolean,
): SATPSession => {
  const sessionId = uuidv4();
  const mockSession = new SATPSession({
    contextID: "MOCK_CONTEXT_ID",
    server: !isClient,
    client: isClient,
  });

  const sessionData = mockSession.hasClientSessionData()
    ? mockSession.getClientSessionData()
    : mockSession.getServerSessionData();

  sessionData.id = sessionId;
  sessionData.maxTimeout = maxTimeout;
  sessionData.maxRetries = maxRetries;
  sessionData.version = SATP_VERSION;
  sessionData.clientGatewayPubkey = Buffer.from(keyPairs.publicKey).toString(
    "hex",
  );
  sessionData.serverGatewayPubkey = sessionData.clientGatewayPubkey;
  sessionData.originatorPubkey = "MOCK_ORIGINATOR_PUBKEY";
  sessionData.beneficiaryPubkey = "MOCK_BENEFICIARY_PUBKEY";
  sessionData.digitalAssetId = "MOCK_DIGITAL_ASSET_ID";
  sessionData.assetProfileId = "MOCK_ASSET_PROFILE_ID";
  sessionData.receiverGatewayOwnerId = "MOCK_RECEIVER_GATEWAY_OWNER_ID";
  sessionData.senderGatewayOwnerId = "MOCK_SENDER_GATEWAY_OWNER_ID";
  sessionData.signatureAlgorithm = SignatureAlgorithm.RSA;
  sessionData.lockType = LockType.FAUCET;
  sessionData.lockExpirationTime = BigInt(1000);
  sessionData.credentialProfile = CredentialProfile.X509;
  sessionData.loggingProfile = "MOCK_LOGGING_PROFILE";
  sessionData.accessControlProfile = "MOCK_ACCESS_CONTROL_PROFILE";
  sessionData.resourceUrl = "MOCK_RESOURCE_URL";
  sessionData.lockAssertionExpiration = BigInt(99999);
  sessionData.receiverContractOntology = "MOCK_RECEIVER_CONTRACT_ONTOLOGY";
  sessionData.senderContractOntology = "MOCK_SENDER_CONTRACT_ONTOLOGY";
  sessionData.sourceLedgerAssetId = "MOCK_SOURCE_LEDGER_ASSET_ID";
  sessionData.senderAsset = create(AssetSchema, {
    tokenId: "MOCK_TOKEN_ID",
    tokenType: TokenType.ERC20,
    amount: BigInt(100),
    owner: "MOCK_SENDER_ASSET_OWNER",
    ontology: "MOCK_SENDER_ASSET_ONTOLOGY",
    contractName: "MOCK_SENDER_ASSET_CONTRACT_NAME",
    contractAddress: "MOCK_SENDER_ASSET_CONTRACT_ADDRESS",
  });
  sessionData.receiverAsset = create(AssetSchema, {
    tokenType: TokenType.ERC20,
    amount: BigInt(100),
    owner: "MOCK_RECEIVER_ASSET_OWNER",
    ontology: "MOCK_RECEIVER_ASSET_ONTOLOGY",
    contractName: "MOCK_RECEIVER_ASSET_CONTRACT_NAME",
    mspId: "MOCK_RECEIVER_ASSET_MSP_ID",
    channelName: "MOCK_CHANNEL_ID",
  });

  if (isClient) {
    sessionData.senderGatewayNetworkId = SupportedChain.BESU;
    sessionData.recipientGatewayNetworkId = SupportedChain.FABRIC;
  } else {
    sessionData.senderGatewayNetworkId = SupportedChain.FABRIC;
    sessionData.recipientGatewayNetworkId = SupportedChain.BESU;
  }

  return mockSession;
};

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

afterEach(async () => {
  jest.clearAllMocks();
});

afterAll(async () => {
  if (gateway1) await gateway1.shutdown();
  if (gateway2) await gateway2.shutdown();

  if (crashManager1 || crashManager2) {
    crashManager1.stopCrashDetection();
    crashManager1.localRepository.destroy();

    crashManager2.stopCrashDetection();
    crashManager2.localRepository.destroy();
  }
  if (knexInstanceClient || knexInstanceServer) {
    await knexInstanceClient.destroy();
    await knexInstanceServer.destroy();
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

describe("Crash Recovery Manager - Rollback", () => {
  it("should successfully initiate rollback", async () => {
    const factoryOptions: IPluginFactoryOptions = {
      pluginImportType: PluginImportType.Local,
    };
    const factory = new PluginFactorySATPGateway(factoryOptions);

    const gateway1KeyPair = Secp256k1Keys.generateKeyPairsBuffer();
    const gateway2KeyPair = Secp256k1Keys.generateKeyPairsBuffer();

    const gatewayIdentity1: GatewayIdentity = {
      id: "mockID-1",
      name: "CustomGateway1",
      pubKey: bufArray2HexStr(gateway1KeyPair.publicKey),
      version: [
        {
          Core: "v02",
          Architecture: "v02",
          Crash: "v02",
        },
      ],
      supportedDLTs: [SupportedChain.BESU],
      proofID: "mockProofID10",
      address: "http://localhost" as Address,
      gatewayServerPort: 3005,
      gatewayClientPort: 3001,
      gatewayOpenAPIPort: 3002,
    };

    const gatewayIdentity2: GatewayIdentity = {
      id: "mockID-2",
      name: "CustomGateway2",
      pubKey: bufArray2HexStr(gateway2KeyPair.publicKey),
      version: [
        {
          Core: "v02",
          Architecture: "v02",
          Crash: "v02",
        },
      ],
      supportedDLTs: [SupportedChain.FABRIC],
      proofID: "mockProofID11",
      address: "http://localhost" as Address,
      gatewayServerPort: 3225,
      gatewayClientPort: 3211,
      gatewayOpenAPIPort: 4210,
    };

    knexInstanceClient = knex(knexClientConnection);
    await knexInstanceClient.migrate.latest();

    knexInstanceRemote1 = knex(knexRemoteConnection1);
    await knexInstanceRemote1.migrate.latest();

    const options1: SATPGatewayConfig = {
      logLevel: "DEBUG",
      gid: gatewayIdentity1,
      counterPartyGateways: [gatewayIdentity2],
      keyPair: gateway1KeyPair,
      bridgesConfig: [besuEnv.besuConfig],
      knexLocalConfig: knexClientConnection,
      knexRemoteConfig: knexRemoteConnection1,
    };

    knexInstanceServer = knex(knexServerConnection);
    await knexInstanceServer.migrate.latest();

    knexInstanceRemote2 = knex(knexRemoteConnection2);
    await knexInstanceRemote2.migrate.latest();

    const options2: SATPGatewayConfig = {
      logLevel: "DEBUG",
      gid: gatewayIdentity2,
      counterPartyGateways: [gatewayIdentity1],
      keyPair: gateway2KeyPair,
      bridgesConfig: [fabricEnv.fabricConfig],
      knexLocalConfig: knexServerConnection,
      knexRemoteConfig: knexRemoteConnection2,
    };

    gateway1 = (await factory.create(options1)) as SATPGateway;
    expect(gateway1).toBeInstanceOf(SATPGateway);
    await gateway1.startup();

    gateway2 = (await factory.create(options2)) as SATPGateway;
    expect(gateway2).toBeInstanceOf(SATPGateway);
    await gateway2.startup();

    crashManager1 = gateway1["crashManager"] as CrashRecoveryManager;
    expect(crashManager1).toBeInstanceOf(CrashRecoveryManager);

    crashManager2 = gateway2["crashManager"] as CrashRecoveryManager;
    expect(crashManager2).toBeInstanceOf(CrashRecoveryManager);

    const clientSession = createMockSession("1000", "3", true);
    const serverSession = createMockSession("1000", "3", false);
    const clientSessionData = clientSession.getClientSessionData();
    const serverSessionData = serverSession.getServerSessionData();
    const sessionId = clientSessionData.id;

    serverSessionData.id = sessionId;

    // Incomplete logs on gateway1 (client)
    const key1 = getSatpLogKey(sessionId, "type", "operation1");
    const mockLogEntry1: LocalLog = {
      sessionId: sessionId,
      type: "type",
      key: key1,
      operation: "operation1",
      timestamp: new Date().toISOString(),
      data: JSON.stringify(clientSessionData),
      sequenceNumber: Number(clientSessionData.lastSequenceNumber),
    };

    const mockLogRepository1 = crashManager1["localRepository"];
    await mockLogRepository1.create(mockLogEntry1);

    // Logs on gateway2 (server)
    const key2 = getSatpLogKey(sessionId, "type2", "done");
    const mockLogEntry2: LocalLog = {
      sessionId: sessionId,
      type: "type2",
      key: key2,
      operation: "done",
      timestamp: new Date().toISOString(),
      data: JSON.stringify(serverSessionData),
      sequenceNumber: Number(serverSessionData.lastSequenceNumber) + 1,
    };

    const mockLogRepository2 = crashManager2["localRepository"];
    await mockLogRepository2.create(mockLogEntry2);

    await crashManager2.recoverSessions();

    const result = await crashManager1.initiateRollback(clientSession, true);

    expect(result).toBeTrue();
  });
});
