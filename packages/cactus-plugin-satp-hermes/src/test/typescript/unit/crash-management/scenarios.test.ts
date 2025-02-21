import "jest-extended";
import {
  type LogLevelDesc,
  Secp256k1Keys,
  JsObjectSigner,
  type IJsObjectSignerOptions,
} from "@hyperledger/cactus-common";
import { CrashManager } from "../../../../main/typescript/gateway/crash-manager";
import { CrashStatus } from "../../../../main/typescript/core/types";
import type { ICrashRecoveryManagerOptions } from "../../../../main/typescript/gateway/crash-manager";
import { type Knex, knex } from "knex";
import type {
  LocalLog,
  GatewayIdentity,
  Address,
} from "../../../../main/typescript/core/types";
import { AssetSchema } from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/message_pb";
import { v4 as uuidv4 } from "uuid";
import {
  Type,
  type SessionData,
} from "../../../../main/typescript/generated/proto/cacti/satp/v02/common/session_pb";
import { SATP_VERSION } from "../../../../main/typescript/core/constants";
import { SATPSession } from "../../../../main/typescript/core/satp-session";
import {
  knexClientConnection,
  knexSourceRemoteConnection,
} from "../../knex.config";
import {
  bufArray2HexStr,
  getSatpLogKey,
} from "../../../../main/typescript/gateway-utils";
import { TokenType } from "../../../../main/typescript/cross-chain-mechanisms/satp-bridge/types/asset";
import {
  GatewayOrchestrator,
  type IGatewayOrchestratorOptions,
} from "../../../../main/typescript/gateway/gateway-orchestrator";
import {
  type ISATPBridgesOptions,
  SATPCrossChainManager,
} from "../../../../main/typescript/cross-chain-mechanisms/satp-cc-manager";
import { create } from "@bufbuild/protobuf";

import {
  SATP_ARCHITECTURE_VERSION,
  SATP_CORE_VERSION,
  SATP_CRASH_VERSION,
} from "../../../../main/typescript/core/constants";
import { KnexLocalLogRepository } from "../../../../main/typescript/repository/knex-local-log-repository";
import { KnexRemoteLogRepository } from "../../../../main/typescript/repository/knex-remote-log-repository";
import type {
  ILocalLogRepository,
  IRemoteLogRepository,
} from "../../../../main/typescript/repository/interfaces/repository";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import { LedgerType } from "@hyperledger/cactus-core-api";

let mockSession: SATPSession;

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
  sessionData.role = Type.CLIENT;
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
let crashManager: CrashManager;
let knexInstanceClient: Knex;
let knexInstanceRemote: Knex;
let localRepository: ILocalLogRepository;
let remoteRepository: IRemoteLogRepository;

beforeAll(async () => {
  knexInstanceClient = knex(knexClientConnection);
  await knexInstanceClient.migrate.latest();
  knexInstanceRemote = knex(knexSourceRemoteConnection);
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
        Architecture: SATP_ARCHITECTURE_VERSION,
        Crash: SATP_CRASH_VERSION,
      },
    ],
    connectedDLTs: [
      {
        id: "BESU",
        ledgerType: LedgerType.Besu2X,
      },
    ],
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
    connectedDLTs: gatewayIdentity.connectedDLTs,
    networks: [],
  };
  const bridgesManager = new SATPCrossChainManager(bridgesManagerOptions);

  const crashOptions: ICrashRecoveryManagerOptions = {
    instanceId: "test-instance",
    logLevel: "DEBUG" as LogLevelDesc,
    bridgeConfig: bridgesManager,
    orchestrator: gatewayOrchestrator,
    defaultRepository: false,
    localRepository: localRepository,
    remoteRepository: remoteRepository,
    signer: signer,
  };
  crashManager = new CrashManager(crashOptions);
});

afterEach(async () => {
  crashManager["sessions"].clear();
  jest.clearAllMocks();
});

afterAll(async () => {
  if (crashManager) {
    crashManager.stopScheduler();
    crashManager.localRepository.destroy();
    crashManager.remoteRepository!.destroy();
  }
  if (knexInstanceClient || knexInstanceRemote) {
    await knexInstanceClient.destroy();
    await knexInstanceRemote.destroy();
  }
});

describe("CrashManager Tests", () => {
  it("should reconstruct session by fetching logs", async () => {
    mockSession = createMockSession("1000", "3");

    const testData = mockSession.hasClientSessionData()
      ? mockSession.getClientSessionData()
      : mockSession.getServerSessionData();
    const sessionId = testData.id;

    // load sample log in database
    const key = getSatpLogKey(sessionId, "type", "operation");
    const mockLogEntry: LocalLog = {
      sessionId: sessionId,
      type: "type",
      key: key,
      operation: "operation",
      timestamp: new Date().toISOString(),
      data: safeStableStringify(testData),
      sequenceNumber: Number(testData.lastSequenceNumber),
    };
    const mockLogRepository = crashManager["localRepository"];

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

  it("should invoke rollback when session timeout occurs", async () => {
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
      sessionId: sessionId,
      type: "type_o",
      key: key,
      operation: "done",
      timestamp: pastTime,
      data: safeStableStringify(testData),
      sequenceNumber: Number(testData.lastSequenceNumber),
    };

    const mockLogRepository = crashManager["localRepository"];

    await mockLogRepository.create(mockLogEntry);

    await crashManager.checkAndResolveCrash(mockSession);

    expect(handleRollbackSpy).toHaveBeenCalled();

    handleRollbackSpy.mockRestore();
  });

  it("should not recover if no crash is detected", async () => {
    mockSession = createMockSession("10000", "3");

    const testData = mockSession.hasClientSessionData()
      ? mockSession.getClientSessionData()
      : mockSession.getServerSessionData();

    const mockLogEntry: LocalLog = {
      sessionId: testData.id,
      type: "type",
      key: getSatpLogKey(testData.id, "type", "done"),
      operation: "done",
      timestamp: new Date().toISOString(),
      data: safeStableStringify(testData),
      sequenceNumber: Number(testData.lastSequenceNumber),
    };

    await crashManager.localRepository.create(mockLogEntry);

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
    crashManager.sessions.set(
      mockSession.getClientSessionData().id,
      mockSession,
    );
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
      sessionId: sessionId,
      type: "type",
      key: key,
      operation: "init", // operation!=done
      timestamp: new Date().toISOString(),
      data: safeStableStringify(testData),
      sequenceNumber: Number(testData.lastSequenceNumber),
    };

    const mockLogRepository = crashManager["localRepository"];

    await mockLogRepository.create(mockLogEntry);
    crashManager.sessions.set(testData.id, mockSession);
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
      sessionId: sessionId,
      type: "type3",
      key: key,
      operation: "init", // operation!=done
      timestamp: new Date().toISOString(),
      data: safeStableStringify(testData),
      sequenceNumber: Number(testData.lastSequenceNumber),
    };

    const mockLogRepository = crashManager["localRepository"];

    await mockLogRepository.create(mockLogEntry);

    await crashManager.checkAndResolveCrash(mockSession);

    expect(handleRecoverySpy).toHaveBeenCalled();
    expect(handleInitiateRollBackSpy).toHaveBeenCalled();

    handleRecoverySpy.mockRestore();
    handleInitiateRollBackSpy.mockRestore();
  });
});
