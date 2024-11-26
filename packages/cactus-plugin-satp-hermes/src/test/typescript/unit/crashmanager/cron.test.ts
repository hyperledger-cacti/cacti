import "jest-extended";
import { CrashRecoveryManager } from "../../../../main/typescript/core/recovery/crash-manager";
import {
  LogLevelDesc,
  Secp256k1Keys,
  JsObjectSigner,
  IJsObjectSignerOptions,
} from "@hyperledger/cactus-common";
import { ICrashRecoveryManagerOptions } from "../../../../main/typescript/core/recovery/crash-manager";
import { Knex, knex } from "knex";
import {
  LocalLog,
  SupportedChain,
  GatewayIdentity,
  Address,
} from "../../../../main/typescript/core/types";
import {
  Asset,
  CredentialProfile,
  LockType,
  SignatureAlgorithm,
} from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { v4 as uuidv4 } from "uuid";
import { SATP_VERSION } from "../../../../main/typescript/core/constants";
import { SATPSession } from "../../../../main/typescript/core/satp-session";
import { knexClientConnection } from "../../knex.config";
import { getSatpLogKey } from "../../../../main/typescript/gateway-utils";
import { TokenType } from "../../../../main/typescript/core/stage-services/satp-bridge/types/asset";
import {
  GatewayOrchestrator,
  IGatewayOrchestratorOptions,
} from "../../../../main/typescript/gol/gateway-orchestrator";
import {
  ISATPBridgesOptions,
  SATPBridgesManager,
} from "../../../../main/typescript/gol/satp-bridges-manager";

const logLevel: LogLevelDesc = "DEBUG";

let crashManager: CrashRecoveryManager;
let knexInstance: Knex;
const keyPairs = Secp256k1Keys.generateKeyPairsBuffer();
const createMockSession = (
  sessionId: string,
  maxTimeout: string,
  maxRetries: string,
) => {
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
  const keyPairs = Secp256k1Keys.generateKeyPairsBuffer();
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

beforeAll(async () => {
  knexInstance = knex(knexClientConnection);
  await knexInstance.migrate.latest();

  const privateKeyHex = Buffer.from(keyPairs.privateKey).toString("hex");

  const signerOptions: IJsObjectSignerOptions = {
    privateKey: privateKeyHex,
    logLevel: logLevel,
  };

  const signer = new JsObjectSigner(signerOptions);

  const gatewayIdentity1 = {
    id: "mockID-1",
    name: "CustomGateway",
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
  } as GatewayIdentity;

  const gatewayIdentity2 = {
    id: "mockID-2",
    name: "CustomGateway",
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
  } as GatewayIdentity;

  const localGateway: GatewayIdentity = gatewayIdentity1;
  const counterPartyGateways: GatewayIdentity[] = [gatewayIdentity2];

  const gatewayOrchestratorOptions: IGatewayOrchestratorOptions = {
    logLevel: logLevel,
    localGateway: localGateway,
    counterPartyGateways: counterPartyGateways,
    signer: signer,
  };
  const bridgesManagerOptions: ISATPBridgesOptions = {
    logLevel: logLevel,
    supportedDLTs: [SupportedChain.BESU, SupportedChain.FABRIC],
    networks: [],
  };

  const bridgesManager = new SATPBridgesManager(bridgesManagerOptions);

  const crashManagerOptions: ICrashRecoveryManagerOptions = {
    instanceId: uuidv4(),
    logLevel: logLevel,
    knexConfig: knexClientConnection,
    bridgeConfig: bridgesManager,
    orchestrator: new GatewayOrchestrator(gatewayOrchestratorOptions),
  };

  crashManager = new CrashRecoveryManager(crashManagerOptions);
});

beforeEach(async () => {
  crashManager["sessions"].clear();
});

afterEach(async () => {
  jest.clearAllMocks();
  jest.useRealTimers();
  crashManager["sessions"].clear();
});

afterAll(async () => {
  if (crashManager) {
    crashManager.stopCrashDetection();
    crashManager.logRepository.destroy();
  }
  if (knexInstance) {
    await knexInstance.destroy();
  }
});

describe("CrashRecoveryManager Tests", () => {
  it("should trigger checkAndResolveCrashes via cron schedule every 15 seconds for 75 seconds", async () => {
    jest.useFakeTimers();

    const sessionId = uuidv4();
    const mockSession = createMockSession(sessionId, "10000", "3");
    const sessionData = mockSession.hasClientSessionData()
      ? mockSession.getClientSessionData()
      : mockSession.getServerSessionData();

    const key = getSatpLogKey(sessionId, "type", "operation");
    const mockLogEntry: LocalLog = {
      sessionID: sessionId,
      type: "type",
      key: key,
      operation: "operation",
      timestamp: new Date().toISOString(),
      data: JSON.stringify(sessionData),
    };
    const mockLogRepository = crashManager["logRepository"];

    await mockLogRepository.create(mockLogEntry);

    const mockCheckAndResolveCrash = jest
      .spyOn(CrashRecoveryManager.prototype, "checkAndResolveCrash")
      .mockImplementation(() => Promise.resolve());

    await crashManager.recoverSessions();

    for (let i = 1; i <= 5; i++) {
      jest.advanceTimersByTime(15000);
      await Promise.resolve();
    }

    expect(mockCheckAndResolveCrash).toHaveBeenCalledTimes(5);
    expect(mockCheckAndResolveCrash).toHaveBeenCalledWith(
      expect.any(SATPSession),
    );

    mockCheckAndResolveCrash.mockRestore();
    jest.useRealTimers();
  });
});
