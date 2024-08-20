import { ConnectRouter } from "@connectrpc/connect";
import { CrashRecovery } from "../../generated/proto/cacti/satp/v02/crash_recovery_connect";
import {
  RecoverMessage,
  RecoverUpdateMessage,
  RecoverSuccessMessage,
  RollbackMessage,
  RollbackAckMessage,
} from "../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { CrashRecoveryService } from "./crash-utils";
import {
  Logger,
  LoggerProvider,
  ILoggerOptions,
} from "@hyperledger/cactus-common";
import { Empty } from "@bufbuild/protobuf";
import { SessionData } from "../../generated/proto/cacti/satp/v02/common/session_pb";
import { SATPSession } from "../satp-session";
import { ILocalLogRepository } from "../../repository/interfaces/repository";

interface HandlerOptions {
  crashService: CrashRecoveryService;
  loggerOptions: ILoggerOptions;
  sessions: Map<string, SessionData>;
  logRepository: ILocalLogRepository;
}

export class CrashRecoveryHandler {
  public static readonly CLASS_NAME = "CrashRecoveryHandler";
  private sessions: Map<string, SessionData>;
  private service: CrashRecoveryService;
  private logger: Logger;
  private logRepository: ILocalLogRepository;

  constructor(ops: HandlerOptions) {
    this.sessions = ops.sessions;
    this.service = ops.crashService;
    this.logger = LoggerProvider.getOrCreate(ops.loggerOptions);
    this.logger.trace(`Initialized ${CrashRecoveryHandler.CLASS_NAME}`);
    this.logRepository = ops.logRepository;
  }

  getHandlerIdentifier(): string {
    return CrashRecoveryHandler.CLASS_NAME;
  }

  public get Log(): Logger {
    return this.logger;
  }

  private generateKey(): string {
    //todo: key generation logic
    return "key";
  }

  async sendRecover(req: SATPSession): Promise<RecoverUpdateMessage> {
    const fnTag = `${this.getHandlerIdentifier()}#sendRecover`;
    try {
      this.Log.debug(`${fnTag}, Recover V2 Message...`);

      const sessionId = req.getSessionId();
      const sessionData = this.sessions.get(sessionId);
      if (!sessionData) {
        throw new Error(`${fnTag}, Session not found`);
      }

      const recoverMessage = new RecoverMessage({
        sessionId: sessionId,
        messageType: "Recover",
        satpPhase: "phase",
        sequenceNumber: Number(sessionData.lastSequenceNumber),
        isBackup: false,
        newIdentityPublicKey: "",
        lastEntryTimestamp: sessionData.lastSequenceNumber,
        senderSignature: "",
      });

      const updateMessage =
        this.service.createRecoverUpdateMessage(recoverMessage);

      const logEntry = {
        sessionID: sessionId,
        type: "RECOVER",
        key: "key", // generateKey(),
        operation: "RECOVER_MESSAGE_SENT",
        timestamp: new Date().toISOString(),
        data: "",
      };

      await this.logRepository.create(logEntry);
      return updateMessage;
    } catch (error) {
      throw new Error(`${fnTag}, Failed to process RecoverV2Message ${error}`);
    }
  }

  async sendRecoverUpdate(
    req: RecoverUpdateMessage,
  ): Promise<RecoverSuccessMessage> {
    const fnTag = `${this.getHandlerIdentifier()}#handleRecoverUpdateMessage()`;
    try {
      this.Log.debug(`${fnTag}, Handling Recover Update Message...`);

      const sessionData = this.sessions.get(req.sessionId);
      if (!sessionData) {
        throw new Error(
          `${fnTag}, session data not found for ID: ${req.sessionId}`,
        );
      }

      const successMessage = this.service.createRecoverSuccessMessage(req);

      this.Log.debug(`${fnTag}, Recover Success Message created`);
      const logEntry = {
        sessionID: req.sessionId,
        type: "RECOVER_UPDATE",
        key: "key", // generateKey(),
        operation: "RECOVER_UPDATE_MESSAGE_SENT",
        timestamp: new Date().toISOString(),
        data: "",
      };

      await this.logRepository.create(logEntry);

      return successMessage;
    } catch (error) {
      throw new Error(
        `${fnTag}, Error handling Recover Update Message: ${error}`,
      );
    }
  }

  async sendRecoverSuccess(req: RecoverSuccessMessage): Promise<Empty> {
    const fnTag = `${this.getHandlerIdentifier()}#handleRecoverSuccessMessage()`;
    try {
      this.Log.debug(`${fnTag}, Handling Recover Success Message...`);

      const session = this.sessions.get(req.sessionId);
      if (!session) {
        throw new Error(`${fnTag}, Session not found`);
      }

      this.Log.debug(`${fnTag}, Session recovery successfully completed`);
      const logEntry = {
        sessionID: req.sessionId,
        type: "RECOVER_SUCCESS",
        key: "key", // generateKey(),
        operation: "RECOVER_SUCCESS_MESSAGE_SENT",
        timestamp: new Date().toISOString(),
        data: "",
      };

      await this.logRepository.create(logEntry);

      return new Empty();
    } catch (error) {
      throw new Error(
        `${fnTag}, Error handling Recover Success Message: ${error}`,
      );
    }
  }

  async sendRollback(req: RollbackMessage): Promise<RollbackAckMessage> {
    const fnTag = `${this.getHandlerIdentifier()}#handleRollbackMessage()`;
    try {
      this.Log.debug(`${fnTag}, Handling Rollback Message...`);

      const session = this.sessions.get(req.sessionId);
      if (!session) {
        throw new Error(`${fnTag}, Session not found`);
      }

      const ackMessage = this.service.createRollbackAckMessage(req);

      this.Log.debug(`${fnTag}, Rollback Ack Message created`);
      const logEntry = {
        sessionID: req.sessionId,
        type: "ROLLBACK",
        key: "key", //generateKey(),
        operation: "ROLLBACK_MESSAGE_SENT",
        timestamp: new Date().toISOString(),
        data: "",
      };

      await this.logRepository.create(logEntry);

      return ackMessage;
    } catch (error) {
      throw new Error(`${fnTag}, Error handling Rollback Message: ${error}`);
    }
  }

  async sendRollbackAck(req: RollbackAckMessage): Promise<Empty> {
    const fnTag = `${this.getHandlerIdentifier()}#handleRollbackAckMessage()`;
    try {
      this.Log.debug(`${fnTag}, Handling Rollback Ack Message...`);

      const session = this.sessions.get(req.sessionId);
      if (!session) {
        throw new Error(`${fnTag}, Session not found`);
      }

      this.Log.debug(`${fnTag}, Rollback successfully acknowledged`);
      const logEntry = {
        sessionID: req.sessionId,
        type: "ROLLBACK_",
        key: "key", //generateKey(),
        operation: "ROLLBACK_",
        timestamp: new Date().toISOString(),
        data: "",
      };

      await this.logRepository.create(logEntry);

      return new Empty();
    } catch (error) {
      throw new Error(
        `${fnTag}, Error handling Rollback Ack Message: ${error}`,
      );
    }
  }

  setupRouter(router: ConnectRouter): void {
    router.service(CrashRecovery, {
      recoverV2Message: this.sendRecover,
      recoverV2UpdateMessage: this.sendRecoverUpdate,
      recoverV2SuccessMessage: this.sendRecoverSuccess,
      rollbackV2Message: this.sendRollback,
      rollbackV2AckMessage: this.sendRollbackAck,
    });
  }
}
