import "jest-extended";
import { CrashRecoveryHandler } from "../../../../main/typescript/core/recovery/crash-recovery-handler";
import { CrashRecoveryService } from "../../../../main/typescript/core/recovery/crash-utils";
import {
  RecoverMessage,
  RecoverUpdateMessage,
} from "../../../../main/typescript/generated/proto/cacti/satp/v02/crash_recovery_pb";
import { ILocalLogRepository } from "../../../../main/typescript/repository/interfaces/repository";
import { SATPSession } from "../../../../main/typescript/core/satp-session";
import { LogLevelDesc } from "@hyperledger/cactus-common";
import { Knex, knex } from "knex";
import { knexClientConnection } from "../../knex.config";
import { v4 as uuidv4 } from "uuid";
import { getSatpLogKey } from "../../../../main/typescript/gateway-utils";

const logLevel: LogLevelDesc = "DEBUG";

describe("CrashRecoveryHandler Tests", () => {
  let handler: CrashRecoveryHandler;
  let mockService: jest.Mocked<CrashRecoveryService>;
  let mockLogRepository: jest.Mocked<ILocalLogRepository>;
  let sessions: Map<string, SATPSession>;
  let knexInstance: Knex;
  const sessionId = uuidv4();

  beforeAll(async () => {
    knexInstance = knex(knexClientConnection);
    await knexInstance.migrate.latest();
  });

  afterAll(async () => {
    if (knexInstance) {
      await knexInstance.destroy();
    }
  });

  beforeEach(() => {
    // change
    mockService = {
      createRecoverUpdateMessage: jest.fn(),
      createRollbackAckMessage: jest.fn(),
    } as unknown as jest.Mocked<CrashRecoveryService>;

    // change
    mockLogRepository = {
      create: jest.fn(),
      readLastestLog: jest.fn(),
      readLogsBySessionId: jest.fn(),
      readLogsNotProofs: jest.fn(),
      deleteAllLogs: jest.fn(),
      destroy: jest.fn(),
    } as unknown as jest.Mocked<ILocalLogRepository>;

    sessions = new Map<string, SATPSession>();
    const mockSession = new SATPSession({
      contextID: "test-context-id",
      server: false,
      client: true,
    });
    sessions.set(sessionId, mockSession);

    handler = new CrashRecoveryHandler({
      crashService: mockService,
      loggerOptions: {
        level: logLevel,
        label: "CrashRecoveryHandlerTest",
      },
      sessions: sessions,
      logRepository: mockLogRepository,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should handle recover message and return RecoverUpdateMessage", async () => {
    const recoverMessage = new RecoverMessage({
      sessionId: sessionId,
      messageType: "urn:ietf:SATP-2pc:msgtype:recover-msg",
      satpPhase: "phase-1",
      sequenceNumber: 1,
      isBackup: false,
      newIdentityPublicKey: "",
      lastEntryTimestamp: BigInt(Date.now()),
      senderSignature: "",
    });

    const expectedRecoverUpdateMessage = new RecoverUpdateMessage({
      sessionId: sessionId,
      messageType: "urn:ietf:SATP-2pc:msgtype:recover-update-msg",
      hashRecoverMessage: "",
      recoveredLogs: [],
      senderSignature: "",
    });

    mockService.createRecoverUpdateMessage.mockResolvedValue(
      expectedRecoverUpdateMessage,
    );

    const result = await handler.handleRecover(recoverMessage);

    expect(result).toEqual(expectedRecoverUpdateMessage);
    expect(mockService.createRecoverUpdateMessage).toHaveBeenCalledWith(
      recoverMessage,
    );

    expect(mockLogRepository.create).toHaveBeenCalled();
    const logEntryArg = mockLogRepository.create.mock.calls[0][0];

    expect(logEntryArg.sessionID).toBe(sessionId);
    expect(logEntryArg.type).toBe("RECOVER");
    expect(logEntryArg.operation).toBe("init");
    expect(logEntryArg.key).toBe(getSatpLogKey(sessionId, "RECOVER", "init"));
    expect(logEntryArg.timestamp).toBeDefined();
    expect(logEntryArg.data).toBeDefined();
  });
});
