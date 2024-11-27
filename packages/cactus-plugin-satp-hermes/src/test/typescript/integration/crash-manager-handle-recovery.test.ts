import "jest-extended";
import { Secp256k1Keys } from "@hyperledger/cactus-common";
import { CrashRecoveryManager } from "../../../main/typescript/core/crash-management/crash-manager";
//import { Knex, knex } from "knex";
import {
  LocalLog,
  SupportedChain,
  GatewayIdentity,
  Address,
} from "../../../main/typescript/core/types";
import {
  Asset,
  CredentialProfile,
  LockType,
  SignatureAlgorithm,
} from "../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { v4 as uuidv4 } from "uuid";
import { SATP_VERSION } from "../../../main/typescript/core/constants";
import { SATPSession } from "../../../main/typescript/core/satp-session";
//import { knexClientConnection } from "../../knex.config";
import { getSatpLogKey } from "../../../main/typescript/gateway-utils";
import { TokenType } from "../../../main/typescript/core/stage-services/satp-bridge/types/asset";
import {
  SATPGatewayConfig,
  PluginFactorySATPGateway,
  SATPGateway,
} from "../../../main/typescript";
import {
  IPluginFactoryOptions,
  PluginImportType,
} from "@hyperledger/cactus-core-api";
import { bufArray2HexStr } from "../../../main/typescript/gateway-utils";

let mockSession: SATPSession;
const keyPairs = Secp256k1Keys.generateKeyPairsBuffer();

const createMockSession = (maxTimeout: string, maxRetries: string) => {
  const sessionId = uuidv4();
  const mockSession = new SATPSession({
    contextID: "MOCK_CONTEXT_ID",
    server: false,
    client: true,
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
  sessionData.recipientGatewayNetworkId = SupportedChain.FABRIC;
  sessionData.senderGatewayOwnerId = "MOCK_SENDER_GATEWAY_OWNER_ID";
  sessionData.senderGatewayNetworkId = SupportedChain.BESU;
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
  sessionData.senderAsset = new Asset();
  sessionData.senderAsset.tokenId = "MOCK_TOKEN_ID";
  sessionData.senderAsset.tokenType = TokenType.ERC20;
  sessionData.senderAsset.amount = BigInt(0);
  sessionData.senderAsset.owner = "MOCK_SENDER_ASSET_OWNER";
  sessionData.senderAsset.ontology = "MOCK_SENDER_ASSET_ONTOLOGY";
  sessionData.senderAsset.contractName = "MOCK_SENDER_ASSET_CONTRACT_NAME";
  sessionData.senderAsset.contractAddress =
    "MOCK_SENDER_ASSET_CONTRACT_ADDRESS";
  sessionData.receiverAsset = new Asset();

  sessionData.receiverAsset.tokenType = TokenType.ERC20;
  sessionData.receiverAsset.amount = BigInt(0);
  sessionData.receiverAsset.owner = "MOCK_RECEIVER_ASSET_OWNER";
  sessionData.receiverAsset.ontology = "MOCK_RECEIVER_ASSET_ONTOLOGY";
  sessionData.receiverAsset.contractName = "MOCK_RECEIVER_ASSET_CONTRACT_NAME";
  sessionData.receiverAsset.mspId = "MOCK_RECEIVER_ASSET_MSP_ID";
  sessionData.receiverAsset.channelName = "MOCK_CHANNEL_ID";
  sessionData.lastSequenceNumber = BigInt(4);

  return mockSession;
};

let gateway1: SATPGateway;
let gateway2: SATPGateway;

beforeAll(async () => {
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
    gatewayServerPort: 3110,
    gatewayClientPort: 3111,
    gatewayOpenAPIPort: 4110,
  };

  const options1: SATPGatewayConfig = {
    logLevel: "DEBUG",
    gid: gatewayIdentity1,
    counterPartyGateways: [
      {
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
        gatewayServerPort: 3110,
        gatewayClientPort: 3111,
        gatewayOpenAPIPort: 4110,
      },
    ],
    keyPair: gateway1KeyPair,
  };

  const options2: SATPGatewayConfig = {
    logLevel: "DEBUG",
    gid: gatewayIdentity2,
    counterPartyGateways: [
      {
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
        gatewayServerPort: 3000,
        gatewayClientPort: 3001,
        gatewayOpenAPIPort: 3002,
      },
    ],
    keyPair: gateway2KeyPair,
  };

  gateway1 = (await factory.create(options1)) as SATPGateway;
  expect(gateway1).toBeInstanceOf(SATPGateway);
  await gateway1.startup();

  gateway2 = (await factory.create(options2)) as SATPGateway;
  expect(gateway2).toBeInstanceOf(SATPGateway);
  await gateway2.startup();
});

afterAll(async () => {
  await gateway1.shutdown();
  await gateway2.shutdown();
});

describe("Crash Recovery Services Testing", () => {
  it("handle recover function test", async () => {
    const crashRecoveryManager1 = gateway1[
      "crashManager"
    ] as CrashRecoveryManager;
    expect(crashRecoveryManager1).toBeInstanceOf(CrashRecoveryManager);
    gateway2["crashManager"] as CrashRecoveryManager;

    mockSession = createMockSession("1000", "3");

    const testData = mockSession.hasClientSessionData()
      ? mockSession.getClientSessionData()
      : mockSession.getServerSessionData();

    const sessionId = testData.id;

    const key = getSatpLogKey(sessionId, "type", "operation");
    const mockLogEntry: LocalLog = {
      sessionID: sessionId,
      type: "type",
      key: key,
      operation: "operation",
      timestamp: new Date().toISOString(),
      data: JSON.stringify(testData),
    };

    const mockLogRepository = crashRecoveryManager1["logRepository"];
    await mockLogRepository.create(mockLogEntry);

    await crashRecoveryManager1.recoverSessions();

    const result = await crashRecoveryManager1.handleRecovery(mockSession);
    expect(result).toBe(true);
  });
});
