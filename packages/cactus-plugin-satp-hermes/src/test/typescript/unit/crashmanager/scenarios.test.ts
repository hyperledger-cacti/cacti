import "jest-extended";
import {
  LogLevelDesc,
  Secp256k1Keys,
  JsObjectSigner,
  IJsObjectSignerOptions,
} from "@hyperledger/cactus-common";
import {
  CrashRecoveryManager,
  CrashStatus,
} from "../../../../main/typescript/core/crash-management/crash-manager";
import { ICrashRecoveryManagerOptions } from "../../../../main/typescript/core/crash-management/crash-manager";
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
import { SessionData } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/session_pb";
import { SATP_VERSION } from "../../../../main/typescript/core/constants";
import { SATPSession } from "../../../../main/typescript/core/satp-session";
import { knexClientConnection } from "../../knex.config";
import { getSatpLogKey } from "../../../../main/typescript/gateway-utils";
import { TokenType } from "../../../../main/typescript/core/stage-services/satp-bridge/types/asset";
import { RecoverUpdateMessage } from "../../../../main/typescript/generated/proto/cacti/satp/v02/crash_recovery_pb";
import {
  GatewayOrchestrator,
  IGatewayOrchestratorOptions,
} from "../../../../main/typescript/gol/gateway-orchestrator";
import {
  ISATPBridgesOptions,
  SATPBridgesManager,
} from "../../../../main/typescript/gol/satp-bridges-manager";

const logLevel: LogLevelDesc = "DEBUG";

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
let crashManager: CrashRecoveryManager;
let knexInstance: Knex;

beforeAll(async () => {
  knexInstance = knex(knexClientConnection);
  await knexInstance.migrate.latest();

  const privateKeyHex = Buffer.from(keyPairs.privateKey).toString("hex");

  const signerOptions: IJsObjectSignerOptions = {
    privateKey: privateKeyHex,
    logLevel: logLevel,
  };

  const signer = new JsObjectSigner(signerOptions);

  const gatewayIdentity1: GatewayIdentity = {
    id: "mockID-1",
    name: "CustomGateway1",
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
  };

  const gatewayIdentity2: GatewayIdentity = {
    id: "mockID-2",
    name: "CustomGateway2",
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
    gatewayServerPort: 3210,
    gatewayClientPort: 3211,
    gatewayOpenAPIPort: 4210,
  };

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

afterEach(async () => {
  crashManager["sessions"].clear();
  jest.clearAllMocks();
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
  it("should invoke rollback based on session timeout", async () => {
    mockSession = createMockSession("1000", "3"); // timeout of 1 sec
    // client-side test
    const testData = mockSession.hasClientSessionData()
      ? mockSession.getClientSessionData()
      : mockSession.getServerSessionData();
    const sessionId = testData.id;

    const handleRollbackSpy = jest
      .spyOn(crashManager, "initiateRollback")
      .mockImplementation(async () => true);

    const key = getSatpLogKey(sessionId, "type_o", "done");

    const pastTime = new Date(Date.now() - 10000).toISOString();

    const mockLogEntry: LocalLog = {
      sessionID: sessionId,
      type: "type_o",
      key: key,
      operation: "done",
      timestamp: pastTime,
      data: JSON.stringify(testData),
      sequenceNumber: Number(testData.lastSequenceNumber),
    };

    const mockLogRepository = crashManager["logRepository"];

    await mockLogRepository.create(mockLogEntry);

    await crashManager.checkAndResolveCrash(mockSession);

    expect(handleRollbackSpy).toHaveBeenCalled();

    handleRollbackSpy.mockRestore();
  });

  it("should reconstruct session by fetching logs", async () => {
    mockSession = createMockSession("1000", "3");

    const testData = mockSession.hasClientSessionData()
      ? mockSession.getClientSessionData()
      : mockSession.getServerSessionData();
    const sessionId = testData.id;

    // load sample log in database
    const key = getSatpLogKey(sessionId, "type", "operation");
    const mockLogEntry: LocalLog = {
      sessionID: sessionId,
      type: "type",
      key: key,
      operation: "operation",
      timestamp: new Date().toISOString(),
      data: JSON.stringify(testData),
      sequenceNumber: Number(testData.lastSequenceNumber),
    };
    const mockLogRepository = crashManager["logRepository"];

    await mockLogRepository.create(mockLogEntry);
    await crashManager.recoverSessions();

    expect(crashManager["sessions"].has(sessionId)).toBeTrue();

    const recoveredSession = crashManager["sessions"].get(sessionId);

    expect(recoveredSession).toBeDefined();

    if (recoveredSession) {
      const parsedSessionData: SessionData = JSON.parse(mockLogEntry.data);
      const sessionData = recoveredSession.hasClientSessionData()
        ? recoveredSession.getClientSessionData()
        : recoveredSession.getServerSessionData();

      expect(sessionData).toEqual(parsedSessionData);
    }
  });

  it("should not recover if no crash is detected", async () => {
    mockSession = createMockSession("10000", "3");

    const testData = mockSession.hasClientSessionData()
      ? mockSession.getClientSessionData()
      : mockSession.getServerSessionData();

    const mockLogEntry: LocalLog = {
      sessionID: testData.id,
      type: "type",
      key: getSatpLogKey(testData.id, "type", "done"),
      operation: "done",
      timestamp: new Date().toISOString(),
      data: JSON.stringify(testData),
      sequenceNumber: Number(testData.lastSequenceNumber),
    };

    await crashManager.logRepository.create(mockLogEntry);

    const handleRecoverySpy = jest.spyOn(crashManager, "handleRecovery");
    const initiateRollbackSpy = jest.spyOn(crashManager, "initiateRollback");

    await crashManager.checkAndResolveCrash(mockSession);

    expect(handleRecoverySpy).not.toHaveBeenCalled();
    expect(initiateRollbackSpy).not.toHaveBeenCalled();
  });

  it("should invoke handleRecovery when crash is initially detected", async () => {
    mockSession = createMockSession("1000", "3");

    const handleRecoverySpy = jest
      .spyOn(crashManager, "handleRecovery")
      .mockImplementation(async () => true);

    jest
      .spyOn(crashManager as any, "checkCrash")
      .mockImplementation(() => Promise.resolve(CrashStatus.IN_RECOVERY));

    await crashManager.checkAndResolveCrash(mockSession);

    expect(handleRecoverySpy).toHaveBeenCalled();

    handleRecoverySpy.mockRestore();
  });

  it("should invoke initiateRollback when recovery attempts are exhausted", async () => {
    mockSession = createMockSession("1000", "3");

    const handleRecoverySpy = jest
      .spyOn(crashManager, "handleRecovery")
      .mockImplementation(async () => false);

    const initiateRollbackSpy = jest
      .spyOn(crashManager, "initiateRollback")
      .mockImplementation(async () => true);

    jest
      .spyOn(crashManager as any, "checkCrash")
      .mockImplementation(() => Promise.resolve(CrashStatus.IN_RECOVERY));

    await crashManager.checkAndResolveCrash(mockSession);

    expect(handleRecoverySpy).toHaveBeenCalled();
    expect(initiateRollbackSpy).toHaveBeenCalled();

    handleRecoverySpy.mockRestore();
    initiateRollbackSpy.mockRestore();
  });

  it("should detect crash based on incomplete operation in logs", async () => {
    mockSession = createMockSession("10000", "3");

    const testData = mockSession.hasClientSessionData()
      ? mockSession.getClientSessionData()
      : mockSession.getServerSessionData();
    const sessionId = testData.id;

    const handleRecoverySpy = jest
      .spyOn(crashManager, "handleRecovery")
      .mockImplementation(async () => true);

    const key = getSatpLogKey(sessionId, "type", "init");

    const mockLogEntry: LocalLog = {
      sessionID: sessionId,
      type: "type",
      key: key,
      operation: "init", // operation!=done
      timestamp: new Date().toISOString(),
      data: JSON.stringify(testData),
      sequenceNumber: Number(testData.lastSequenceNumber),
    };

    const mockLogRepository = crashManager["logRepository"];

    await mockLogRepository.create(mockLogEntry);

    await crashManager.checkAndResolveCrash(mockSession);

    expect(handleRecoverySpy).toHaveBeenCalled();

    handleRecoverySpy.mockRestore();
  });

  it("should detect crash based on incomplete operation in logs and initiate rollback when recovery fails", async () => {
    mockSession = createMockSession("10000", "3");

    const testData = mockSession.hasClientSessionData()
      ? mockSession.getClientSessionData()
      : mockSession.getServerSessionData();
    const sessionId = testData.id;

    const handleRecoverySpy = jest
      .spyOn(crashManager, "handleRecovery")
      .mockImplementation(async () => false);

    const handleInitiateRollBackSpy = jest
      .spyOn(crashManager, "initiateRollback")
      .mockImplementation(async () => true);

    const key = getSatpLogKey(sessionId, "type3", "init");

    const mockLogEntry: LocalLog = {
      sessionID: sessionId,
      type: "type3",
      key: key,
      operation: "init", // operation!=done
      timestamp: new Date().toISOString(),
      data: JSON.stringify(testData),
      sequenceNumber: Number(testData.lastSequenceNumber),
    };

    const mockLogRepository = crashManager["logRepository"];

    await mockLogRepository.create(mockLogEntry);

    await crashManager.checkAndResolveCrash(mockSession);

    expect(handleRecoverySpy).toHaveBeenCalled();
    expect(handleInitiateRollBackSpy).toHaveBeenCalled();

    handleRecoverySpy.mockRestore();
    handleInitiateRollBackSpy.mockRestore();
  });

  it("should process recovered logs and add missing logs", async () => {
    const mockSession = createMockSession("1000", "3");
    const testData = mockSession.hasClientSessionData()
      ? mockSession.getClientSessionData()
      : mockSession.getServerSessionData();
    const sessionId = testData.id;

    const recoveredLogs: LocalLog[] = [
      {
        sessionID: sessionId,
        type: "type_1",
        key: getSatpLogKey(sessionId, "type_1", "init"),
        operation: "init",
        timestamp: new Date().toISOString(),
        data: JSON.stringify(testData),
        sequenceNumber: Number(testData.lastSequenceNumber),
      },
    ];

    const recoverUpdateMessage = {
      sessionId: sessionId,
      messageType: "urn:ietf:SATP-2pc:msgtype:recover-update-msg",
      hashRecoverMessage: "",
      recoveredLogs: recoveredLogs,
      senderSignature: "",
    } as RecoverUpdateMessage;

    const result =
      await crashManager["processRecoverUpdateMessage"](recoverUpdateMessage);

    expect(result).toBeTrue();

    const reconstructedSessionData = crashManager["sessions"].get(sessionId);
    expect(reconstructedSessionData).toBeDefined();
  });

  it("should process logs received from gateway(server)", async () => {
    mockSession = createMockSession("10000", "3");

    const testData = mockSession.hasClientSessionData()
      ? mockSession.getClientSessionData()
      : mockSession.getServerSessionData();
    const sessionId = testData.id;

    // Create an existing log entry for client
    const existingLogEntry: LocalLog = {
      sessionID: sessionId,
      type: "type_client",
      key: getSatpLogKey(sessionId, "type_client", "operation_client"),
      operation: "operation_client",
      timestamp: new Date().toISOString(),
      data: JSON.stringify(testData),
      sequenceNumber: Number(testData.lastSequenceNumber),
    };

    await crashManager.logRepository.create(existingLogEntry);

    // Create the log entry for server
    const extraLogEntry: LocalLog = {
      sessionID: sessionId,
      type: "type_server",
      key: getSatpLogKey(sessionId, "type_server", "operation_server"),
      operation: "operation_server",
      timestamp: new Date().toISOString(),
      data: JSON.stringify(testData),
      sequenceNumber: Number(testData.lastSequenceNumber) + 1,
    };

    // RecoverUpdateMessage to simulate receiving the log from server
    const recoverUpdateMessage = {
      sessionId: sessionId,
      messageType: "urn:ietf:SATP-2pc:msgtype:recover-update-msg",
      hashRecoverMessage: "",
      recoveredLogs: [extraLogEntry],
      senderSignature: "",
    } as RecoverUpdateMessage;

    const result =
      await crashManager["processRecoverUpdateMessage"](recoverUpdateMessage);

    expect(result).toBeTrue();

    const reconstructedSession = crashManager["sessions"].get(sessionId);
    expect(reconstructedSession).toBeDefined();

    if (reconstructedSession) {
      const reconstructedSessionData =
        reconstructedSession.hasClientSessionData()
          ? reconstructedSession.getClientSessionData()
          : reconstructedSession.getServerSessionData();

      expect(reconstructedSessionData).toBeDefined();
      expect(BigInt(reconstructedSessionData.lastSequenceNumber)).toEqual(
        testData.lastSequenceNumber,
      );
    }
  });
});
