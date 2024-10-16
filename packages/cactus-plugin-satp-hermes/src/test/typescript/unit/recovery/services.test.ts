import "jest-extended";
import { LogLevelDesc, Secp256k1Keys } from "@hyperledger/cactus-common";
import {
  CrashRecoveryManager,
  ICrashRecoveryManagerOptions,
} from "../../../../main/typescript/core/recovery/crash-manager";
import knex from "knex";
import { SATPSession } from "../../../../main/typescript/core/satp-session";
import { knexClientConnection } from "../../knex.config";
import { SupportedChain } from "../../../../main/typescript/core/types";
import {
  Asset,
  CredentialProfile,
  LockType,
  SignatureAlgorithm,
} from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { SATP_VERSION } from "../../../../main/typescript/core/constants";
import { TokenType } from "../../../../main/typescript/core/stage-services/satp-bridge/types/asset";
import { v4 as uuidv4 } from "uuid";
import { getSatpLogKey } from "../../../../main/typescript/gateway-utils";

const logLevel: LogLevelDesc = "DEBUG";
const keyPairs = Secp256k1Keys.generateKeyPairsBuffer();

let crashRecoveryManager: CrashRecoveryManager;
let mockSession: SATPSession;
const sessionId = uuidv4();
const createMockSession = () => {
  const mockSession = new SATPSession({
    contextID: "MOCK_CONTEXT_ID",
    server: false,
    client: true,
  });

  const sessionData = mockSession.hasClientSessionData()
    ? mockSession.getClientSessionData()
    : mockSession.getServerSessionData();

  sessionData.id = sessionId;
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

  return mockSession;
};

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

  crashRecoveryManager = new CrashRecoveryManager(crashManagerOptions);
});

describe("Crash Recovery Services Testing", () => {
  it("handle reover function test", async () => {
    mockSession = createMockSession();

    const testData = mockSession.hasClientSessionData()
      ? mockSession.getClientSessionData()
      : mockSession.getServerSessionData();

    const key = getSatpLogKey(sessionId, "type", "operation");
    const mockLogEntry = {
      sessionID: sessionId,
      type: "type",
      key: key,
      operation: "operation",
      timestamp: new Date().toISOString(),
      data: JSON.stringify(testData),
    };

    const mockLogRepository = crashRecoveryManager["logRepository"];

    await mockLogRepository.create(mockLogEntry);
    await crashRecoveryManager.recoverSessions();

    const result = await crashRecoveryManager.handleRecovery(mockSession);
    expect(result).toBe(true);
  });

  /*it("intitiate rollback function test", async () => {
    mockSession = createMockSession();

    const testData = mockSession.hasClientSessionData()
      ? mockSession.getClientSessionData()
      : mockSession.getServerSessionData();

    const key = getSatpLogKey(sessionId, "type1", "operation1");
    const mockLogEntry = {
      sessionID: sessionId,
      type: "type1",
      key: key,
      operation: "operation1",
      timestamp: new Date().toISOString(),
      data: JSON.stringify(testData),
    };

    const mockLogRepository = crashRecoveryManager["logRepository"];

    await mockLogRepository.create(mockLogEntry);
    await crashRecoveryManager.recoverSessions();

    const result = await crashRecoveryManager.initiateRollback(
      mockSession,
      true,
    );
    expect(result).toBe(true);
  });*/
});
