import "jest-extended";
import { CrashRecoveryManager } from "../../../../main/typescript/core/recovery/crash-manager";
import { LogLevelDesc, Secp256k1Keys } from "@hyperledger/cactus-common";
import { ICrashRecoveryManagerOptions } from "../../../../main/typescript/core/recovery/crash-manager";
import knex from "knex";
import {
  LocalLog,
  SupportedChain,
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

const logLevel: LogLevelDesc = "DEBUG";

let mockSession: SATPSession;
const keyPairs = Secp256k1Keys.generateKeyPairsBuffer();
const sessionId = uuidv4();

const createMockSession = (maxTimeout: string, maxRetries: string) => {
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
let crashManager: CrashRecoveryManager;

beforeAll(async () => {
  const knexInstance = knex(knexClientConnection);
  await knexInstance.migrate.latest();

  const crashManagerOptions: ICrashRecoveryManagerOptions = {
    instanceId: uuidv4(),
    logLevel: logLevel,
    knexConfig: knexClientConnection,
    bridgeConfig: {
      logLevel: logLevel,
      networks: [],
      supportedDLTs: [SupportedChain.BESU, SupportedChain.FABRIC],
    },
  };

  crashManager = new CrashRecoveryManager(crashManagerOptions);
});

afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});

describe("CrashRecoveryManager Tests", () => {
  it("should trigger checkAndResolveCrashes via cron schedule every 10 seconds for 30 seconds", async () => {
    jest.useFakeTimers();

    mockSession = createMockSession("10000", "3");
    const sessionData = mockSession.hasClientSessionData()
      ? mockSession.getClientSessionData()
      : mockSession.getServerSessionData();

    const sessionId = sessionData.id;
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

    for (let i = 1; i <= 3; i++) {
      jest.advanceTimersByTime(10000);
      await Promise.resolve();
    }

    expect(mockCheckAndResolveCrash).toHaveBeenCalledTimes(3);
    expect(mockCheckAndResolveCrash).toHaveBeenCalledWith(
      expect.any(SATPSession),
    );

    mockCheckAndResolveCrash.mockRestore();
    jest.useRealTimers();
  });
});
