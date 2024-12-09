import {
  RecoverMessage,
  RecoverUpdateMessage,
  RecoverSuccessMessage,
  RollbackMessage,
  RollbackAckMessage,
  RecoverUpdateMessageSchema,
  RollbackAckMessageSchema,
  RecoverSuccessMessageResponse,
  RecoverSuccessMessageResponseSchema,
} from "../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { SATPSession } from "../satp-session";
import { ILocalLogRepository } from "../../repository/interfaces/repository";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { RollbackStrategyFactory } from "./rollback/rollback-strategy-factory";
import { SATPBridgesManager } from "../../gol/satp-bridges-manager";
import { create } from "@bufbuild/protobuf";
import { SATPLogger } from "../../logging";
import { stringify as safeStableStringify } from "safe-stable-stringify";

export class CrashRecoveryServerService {
  private readonly log: Logger;

  constructor(
    private readonly bridgesManager: SATPBridgesManager,
    private readonly logRepository: ILocalLogRepository,
    private readonly sessions: Map<string, SATPSession>,
    private readonly dbLogger: SATPLogger,
    loggerLabel: string = "CrashRecoveryServerService",
  ) {
    this.log = LoggerProvider.getOrCreate({ label: loggerLabel });
    this.log.trace(`Initialized ${CrashRecoveryServerService.name}`);
  }

  public async handleRecover(
    req: RecoverMessage,
  ): Promise<RecoverUpdateMessage> {
    const fnTag = `${CrashRecoveryServerService.name}#handleRecover`;

    try {
      this.log.debug(`${fnTag} - Handling RecoverMessage:`, req);

      const session = this.sessions.get(req.sessionId);
      const sessionData = session?.getServerSessionData();
      if (!session) {
        this.log.error(`${fnTag} - Session not found: ${req.sessionId}`);
        throw new Error(`Session not found: ${req.sessionId}`);
      }

      if (!sessionData) {
        this.log.error(`${fnTag} - SessionData not found: ${req.sessionId}`);
        throw new Error(`Error: ${req.sessionId}`);
      }

      const recoveredLogs = await this.logRepository.fetchLogsFromSequence(
        req.sessionId,
        Number(session.getServerSessionData().lastSequenceNumber),
      );

      const recoverUpdateMessage = create(RecoverUpdateMessageSchema, {
        sessionId: req.sessionId,
        messageType: "urn:ietf:SATP-2pc:msgtype:recover-update-msg",
        hashRecoverMessage: "",
        recoveredLogs: recoveredLogs,
        senderSignature: "",
      });

      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: "urn:ietf:SATP-2pc:msgtype:recover-update-msg",
        operation: "done",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      this.log.debug(
        `${fnTag} - RecoverUpdateMessage created:`,
        recoverUpdateMessage,
      );

      return recoverUpdateMessage;
    } catch (error) {
      this.log.error(`${fnTag} - Error handling RecoverMessage: ${error}`);
      throw error;
    }
  }

  public async handleRecoverSuccess(
    req: RecoverSuccessMessage,
  ): Promise<RecoverSuccessMessageResponse> {
    const fnTag = `${CrashRecoveryServerService.name}#handleRecoverSuccess`;

    try {
      this.log.debug(`${fnTag} - Handling RecoverSuccessMessage:`, req);

      const session = this.sessions.get(req.sessionId);
      if (!session) {
        this.log.error(`${fnTag} - Session not found: ${req.sessionId}`);
        throw new Error(`Session not found: ${req.sessionId}`);
      }

      const recoverSuccessMessageResponse = create(
        RecoverSuccessMessageResponseSchema,
        {
          sessionId: req.sessionId,
          received: true,
          senderSignature: "",
        },
      );
      //await this.dbLogger.persistLogEntry({});
      this.log.info(`${fnTag} - Session marked as recovered: ${req.sessionId}`);
      return recoverSuccessMessageResponse;
    } catch (error) {
      this.log.error(
        `${fnTag} - Error handling RecoverSuccessMessage: ${error}`,
      );
      throw error;
    }
  }

  public async handleRollback(
    req: RollbackMessage,
  ): Promise<RollbackAckMessage> {
    const fnTag = `${CrashRecoveryServerService.name}#handleRollback`;

    try {
      this.log.debug(`${fnTag} - Handling RollbackMessage:`, req);

      const session = this.sessions.get(req.sessionId);
      if (!session) {
        this.log.error(`${fnTag} - Session not found: ${req.sessionId}`);
        throw new Error(`Session not found: ${req.sessionId}`);
      }

      const factory = new RollbackStrategyFactory(
        this.bridgesManager,
        this.logRepository,
        //this.dbLogger,
      );

      const strategy = factory.createStrategy(session);

      const rollbackState = await strategy.execute(session);

      const rollbackAckMessage = create(RollbackAckMessageSchema, {
        sessionId: req.sessionId,
        messageType: "urn:ietf:SATP-2pc:msgtype:rollback-ack-msg",
        success: rollbackState.status === "COMPLETED",
        actionsPerformed: rollbackState.rollbackLogEntries.map(
          (entry) => entry.action,
        ),
        proofs: [],
        senderSignature: "",
      });
      //await this.dbLogger.persistLogEntry({});
      this.log.info(
        `${fnTag} - Rollback performed for session: ${req.sessionId}`,
      );

      return rollbackAckMessage;
    } catch (error) {
      this.log.error(`${fnTag} - Error handling RollbackMessage: ${error}`);
      throw error;
    }
  }
}
