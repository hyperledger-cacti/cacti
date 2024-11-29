import "jest-extended";
import { RollbackStrategyFactory } from "../../../../main/typescript/core/crash-management/rollback/rollback-strategy-factory";
import { Stage0RollbackStrategy } from "../../../../main/typescript/core/crash-management/rollback/stage0-rollback-strategy";
import { Stage1RollbackStrategy } from "../../../../main/typescript/core/crash-management/rollback/stage1-rollback-strategy";
import { Stage2RollbackStrategy } from "../../../../main/typescript/core/crash-management/rollback/stage2-rollback-strategy";
import { Stage3RollbackStrategy } from "../../../../main/typescript/core/crash-management/rollback/stage3-rollback-strategy";
import { ILocalLogRepository } from "../../../../main/typescript/repository/interfaces/repository";
import { SATPBridgesManager } from "../../../../main/typescript/gol/satp-bridges-manager";
import { Secp256k1Keys } from "@hyperledger/cactus-common";
import {
  Asset,
  CredentialProfile,
  LockType,
  SignatureAlgorithm,
} from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import {
  MessageStagesHashes,
  Stage1Hashes,
  Stage2Hashes,
  Stage3Hashes,
} from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/session_pb";
import { v4 as uuidv4 } from "uuid";
import { SATP_VERSION } from "../../../../main/typescript/core/constants";
import { SATPSession } from "../../../../main/typescript/core/satp-session";
import { SupportedChain } from "../../../../main/typescript/core/types";
import { TokenType } from "../../../../main/typescript/core/stage-services/satp-bridge/types/asset";
import { Knex } from "knex";
import { knexClientConnection } from "../../knex.config";
import { KnexLocalLogRepository as LocalLogRepository } from "../../../../main/typescript/repository/knex-local-log-repository";

const createMockSession = (maxTimeout: string, maxRetries: string) => {
  const sessionId = uuidv4();
  const keyPairs = Secp256k1Keys.generateKeyPairsBuffer();

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

describe("RollbackStrategyFactory Tests", () => {
  let factory: RollbackStrategyFactory;
  let mockLogRepository: ILocalLogRepository;
  let bridgesManager: SATPBridgesManager;
  let knexInstance: Knex;

  beforeAll(async () => {
    mockLogRepository = new LocalLogRepository(knexClientConnection);

    bridgesManager = new SATPBridgesManager({
      logLevel: "DEBUG",
      networks: [],
      supportedDLTs: [SupportedChain.BESU, SupportedChain.FABRIC],
    });

    factory = new RollbackStrategyFactory(bridgesManager, mockLogRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    if (knexInstance) {
      await knexInstance.destroy();
    }
  });

  it("should create Stage0RollbackStrategy when no hashes are present", () => {
    const mockSession = createMockSession("1000", "3");
    const sessionData = mockSession.getClientSessionData();
    sessionData.hashes = undefined;
    const strategy = factory.createStrategy(mockSession);
    expect(strategy).toBeInstanceOf(Stage0RollbackStrategy);
  });

  it("should create Stage1RollbackStrategy when stage1 hashes are present", () => {
    const mockSession = createMockSession("1000", "3");
    const sessionData = mockSession.getClientSessionData();
    sessionData.hashes = new MessageStagesHashes();
    sessionData.hashes.stage1 = new Stage1Hashes();
    const strategy = factory.createStrategy(mockSession);
    expect(strategy).toBeInstanceOf(Stage1RollbackStrategy);
  });

  it("should create Stage2RollbackStrategy when stage2 hashes are present", () => {
    const mockSession = createMockSession("1000", "3");
    const sessionData = mockSession.getClientSessionData();
    sessionData.hashes = new MessageStagesHashes();
    sessionData.hashes.stage2 = new Stage2Hashes();
    const strategy = factory.createStrategy(mockSession);
    expect(strategy).toBeInstanceOf(Stage2RollbackStrategy);
  });

  it("should create Stage3RollbackStrategy when all hashes are present", () => {
    const mockSession = createMockSession("1000", "3");
    const sessionData = mockSession.getClientSessionData();
    sessionData.hashes = new MessageStagesHashes();
    sessionData.hashes.stage1 = new Stage1Hashes();
    sessionData.hashes.stage2 = new Stage2Hashes();
    sessionData.hashes.stage3 = new Stage3Hashes();

    const strategy = factory.createStrategy(mockSession);

    expect(strategy).toBeInstanceOf(Stage3RollbackStrategy);
  });
});
