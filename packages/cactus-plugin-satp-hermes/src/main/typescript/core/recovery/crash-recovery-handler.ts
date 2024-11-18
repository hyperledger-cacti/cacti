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
//import { SessionData } from "../../generated/proto/cacti/satp/v02/common/session_pb";
import { ILocalLogRepository } from "../../repository/interfaces/repository";
import { getSatpLogKey } from "../../gateway-utils";
import { SATPSession } from "../satp-session";

interface HandlerOptions {
  crashService: CrashRecoveryService;
  loggerOptions: ILoggerOptions;
  sessions: Map<string, SATPSession>;
  logRepository: ILocalLogRepository;
}

export class CrashRecoveryHandler {
  public static readonly CLASS_NAME = "CrashRecoveryHandler";
  public sessions: Map<string, SATPSession>;
  private service: CrashRecoveryService;
  private log: Logger;
  private logRepository: ILocalLogRepository;

  constructor(ops: HandlerOptions) {
    this.sessions = ops.sessions;
    this.service = ops.crashService;
    this.log = LoggerProvider.getOrCreate(ops.loggerOptions);
    this.log.trace(`Initialized ${CrashRecoveryHandler.CLASS_NAME}`);
    this.logRepository = ops.logRepository;
  }

  getHandlerIdentifier(): string {
    return CrashRecoveryHandler.CLASS_NAME;
  }

  async handleRecover(req: RecoverMessage): Promise<RecoverUpdateMessage> {
    const fnTag = `${this.getHandlerIdentifier()}#handleRecover`;
    this.log.debug(`${fnTag}, handling RecoverMessage: ${JSON.stringify(req)}`);

    try {
      const sessionData = this.sessions.get(req.sessionId);
      if (!sessionData) {
        throw new Error(`${fnTag}, Session not found`);
      }
      const logData = sessionData.hasClientSessionData()
        ? sessionData.getClientSessionData()
        : sessionData.getServerSessionData();

      const updateMessage = await this.service.createRecoverUpdateMessage(req);
      this.log.debug(`${fnTag}, Created RecoverUpdateMessage`);

      const logEntry = {
        sessionID: req.sessionId,
        type: "RECOVER",
        key: getSatpLogKey(req.sessionId, "RECOVER", "init"),
        operation: "init",
        timestamp: new Date().toISOString(),
        data: JSON.stringify(logData),
      };

      await this.logRepository.create(logEntry);
      return updateMessage;
    } catch (error) {
      this.log.error(`${fnTag}, Failed to handle RecoverMessage: ${error}`);
      throw error;
    }
  }

  async handleRecoverSuccess(req: RecoverSuccessMessage): Promise<Empty> {
    const fnTag = `${this.getHandlerIdentifier()}#handleRecoverSuccess`;
    this.log.debug(`${fnTag}, Handling RecoverSuccessMessage`);

    try {
      const sessionData = this.sessions.get(req.sessionId);
      if (!sessionData) {
        throw new Error(`${fnTag}, Session not found`);
      }
      const logData = sessionData.hasClientSessionData()
        ? sessionData.getClientSessionData()
        : sessionData.getServerSessionData();

      const logEntry = {
        sessionID: req.sessionId,
        type: "RECOVER_SUCCESS",
        key: getSatpLogKey(req.sessionId, "RECOVER_SUCCESS", "init"),
        operation: "RECOVER_SUCCESS_MESSAGE_SENT",
        timestamp: new Date().toISOString(),
        data: JSON.stringify(logData),
      };

      await this.logRepository.create(logEntry);
      return new Empty();
    } catch (error) {
      this.log.error(
        `${fnTag}, Error handling RecoverSuccessMessage: ${error}`,
      );
      throw error;
    }
  }

  async handleRollback(req: RollbackMessage): Promise<RollbackAckMessage> {
    const fnTag = `${this.getHandlerIdentifier()}#handleRollback`;
    this.log.debug(`${fnTag}, Handling RollbackMessage`);

    try {
      const sessionData = this.sessions.get(req.sessionId);
      if (!sessionData) {
        throw new Error(`${fnTag}, Session not found`);
      }
      const logData = sessionData.hasClientSessionData()
        ? sessionData.getClientSessionData()
        : sessionData.getServerSessionData();

      const ackMessage = this.service.createRollbackAckMessage(req);

      const logEntry = {
        sessionID: req.sessionId,
        type: "ROLLBACK",
        key: getSatpLogKey(req.sessionId, "ROLLBACK", "init"),
        operation: "ROLLBACK_MESSAGE_SENT",
        timestamp: new Date().toISOString(),
        data: JSON.stringify(logData),
      };

      await this.logRepository.create(logEntry);
      return ackMessage;
    } catch (error) {
      this.log.error(`${fnTag}, Error handling RollbackMessage: ${error}`);
      throw error;
    }
  }

  async handleRollbackAck(req: RollbackAckMessage): Promise<Empty> {
    const fnTag = `${this.getHandlerIdentifier()}#handleRollbackAck`;
    this.log.debug(`${fnTag}, Handling RollbackAckMessage`);

    try {
      const sessionData = this.sessions.get(req.sessionId);
      if (!sessionData) {
        throw new Error(`${fnTag}, Session not found`);
      }
      const logData = sessionData.hasClientSessionData()
        ? sessionData.getClientSessionData()
        : sessionData.getServerSessionData();

      const logEntry = {
        sessionID: req.sessionId,
        type: "ROLLBACK_ACK",
        key: getSatpLogKey(req.sessionId, "ROLLBACK_ACK", "init"),
        operation: "ROLLBACK_ACK",
        timestamp: new Date().toISOString(),
        data: JSON.stringify(logData),
      };

      await this.logRepository.create(logEntry);
      return new Empty();
    } catch (error) {
      this.log.error(`${fnTag}, Error handling RollbackAckMessage: ${error}`);
      throw error;
    }
  }

  setupRouter(router: ConnectRouter): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this;
    router.service(CrashRecovery, {
      async recoverV2Message(req) {
        return await that.handleRecover(req);
      },
      async recoverV2SuccessMessage(req) {
        return await that.handleRecoverSuccess(req);
      },
      async rollbackV2Message(req) {
        return await that.handleRollback(req);
      },
      async rollbackV2AckMessage(req) {
        return await that.handleRollbackAck(req);
      },
    });
  }
}
