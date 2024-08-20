import "jest-extended";
import { CrashRecoveryManager } from "../../../../main/typescript/gol/crash-manager";
import {
  LogLevelDesc,
  Secp256k1Keys,
  JsObjectSigner,
  IJsObjectSignerOptions,
} from "@hyperledger/cactus-common";
import { ICrashRecoveryManagerOptions } from "../../../../main/typescript/gol/crash-manager";
import { Knex, knex } from "knex";
import {
  LocalLog,
  SupportedChain,
  GatewayIdentity,
  Address,
} from "../../../../main/typescript/core/types";
import {
  AssetSchema,
  CredentialProfile,
  LockType,
  SignatureAlgorithm,
} from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { v4 as uuidv4 } from "uuid";
import { SATP_VERSION } from "../../../../main/typescript/core/constants";
import { SATPSession } from "../../../../main/typescript/core/satp-session";
import { knexClientConnection, knexRemoteConnection1 } from "../../knex.config";
import {
  bufArray2HexStr,
  getSatpLogKey,
} from "../../../../main/typescript/gateway-utils";
import { TokenType } from "../../../../main/typescript/core/stage-services/satp-bridge/types/asset";
import {
  GatewayOrchestrator,
  IGatewayOrchestratorOptions,
} from "../../../../main/typescript/gol/gateway-orchestrator";
import {
  ISATPBridgesOptions,
  SATPBridgesManager,
} from "../../../../main/typescript/gol/satp-bridges-manager";
import { create } from "@bufbuild/protobuf";
import { KnexLocalLogRepository } from "../../../../main/typescript/repository/knex-local-log-repository";
import { KnexRemoteLogRepository } from "../../../../main/typescript/repository/knex-remote-log-repository";
import {
  ILocalLogRepository,
  IRemoteLogRepository,
} from "../../../../main/typescript/repository/interfaces/repository";
import {
  SATP_ARCHITETURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../../main/typescript/core/constants";
import { stringify as safeStableStringify } from "safe-stable-stringify";

let crashManager: CrashRecoveryManager;

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

  const sessionData = mockSession.getClientSessionData();

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

  return mockSession;
};

let knexInstanceClient: Knex;
let knexInstanceRemote: Knex;
let localRepository: ILocalLogRepository;
let remoteRepository: IRemoteLogRepository;
beforeAll(async () => {
  knexInstanceClient = knex(knexClientConnection);
  await knexInstanceClient.migrate.latest();
  knexInstanceRemote = knex(knexRemoteConnection1);
  await knexInstanceRemote.migrate.latest();

  localRepository = new KnexLocalLogRepository(knexClientConnection);
  remoteRepository = new KnexRemoteLogRepository(knexClientConnection);

  const keyPairs = Secp256k1Keys.generateKeyPairsBuffer();
  const signerOptions: IJsObjectSignerOptions = {
    privateKey: bufArray2HexStr(keyPairs.privateKey),
    logLevel: "debug",
  };
  const signer = new JsObjectSigner(signerOptions);

  const gatewayIdentity = {
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
    address: "http://localhost" as Address,
  } as GatewayIdentity;

  const orchestratorOptions: IGatewayOrchestratorOptions = {
    logLevel: "DEBUG",
    localGateway: gatewayIdentity,
    counterPartyGateways: [],
    signer: signer,
  };
  const gatewayOrchestrator = new GatewayOrchestrator(orchestratorOptions);

  const bridgesManagerOptions: ISATPBridgesOptions = {
    logLevel: "DEBUG",
    supportedDLTs: gatewayIdentity.supportedDLTs,
    networks: [],
  };
  const bridgesManager = new SATPBridgesManager(bridgesManagerOptions);

  const crashOptions: ICrashRecoveryManagerOptions = {
    instanceId: "test-instance",
    logLevel: "DEBUG" as LogLevelDesc,
    bridgeConfig: bridgesManager,
    orchestrator: gatewayOrchestrator,
    localRepository: localRepository,
    remoteRepository: remoteRepository,
    signer: signer,
    pubKey: bufArray2HexStr(keyPairs.publicKey),
  };
  crashManager = new CrashRecoveryManager(crashOptions);
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
    crashManager.localRepository.destroy();
    crashManager.remoteRepository.destroy();
  }
  if (knexInstanceClient || knexInstanceRemote) {
    await knexInstanceClient.destroy();
    await knexInstanceRemote.destroy();
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
      sessionId: sessionId,
      type: "type",
      key: key,
      operation: "operation",
      timestamp: new Date().toISOString(),
      data: safeStableStringify(sessionData),
      sequenceNumber: Number(sessionData.lastSequenceNumber),
    };
    const mockLogRepository = crashManager["localRepository"];

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
