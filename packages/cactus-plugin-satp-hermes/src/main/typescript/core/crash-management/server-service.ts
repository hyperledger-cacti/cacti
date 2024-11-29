import {
  RecoverMessage,
  RecoverUpdateMessage,
  RecoverSuccessMessage,
  RollbackMessage,
  RollbackAckMessage,
} from "../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { SATPSession } from "../satp-session";
import { ILocalLogRepository } from "../../repository/interfaces/repository";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { RollbackStrategyFactory } from "./rollback/rollback-strategy-factory";
import { SATPBridgesManager } from "../../gol/satp-bridges-manager";

export class CrashRecoveryServerService {
  private readonly log: Logger;

  constructor(
    private readonly bridgesManager: SATPBridgesManager,
    private readonly logRepository: ILocalLogRepository,
    private readonly sessions: Map<string, SATPSession>,
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
      if (!session) {
        this.log.error(`${fnTag} - Session not found: ${req.sessionId}`);
        throw new Error(`Session not found: ${req.sessionId}`);
      }

      const recoveredLogs = await this.logRepository.fetchLogsFromSequence(
        req.sessionId,
        Number(session.getClientSessionData().lastSequenceNumber),
      );

      const recoverUpdateMessage = new RecoverUpdateMessage({
        sessionId: req.sessionId,
        messageType: "urn:ietf:SATP-2pc:msgtype:recover-update-msg",
        hashRecoverMessage: "",
        recoveredLogs: recoveredLogs,
        senderSignature: "",
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

  public async handleRecoverSuccess(req: RecoverSuccessMessage): Promise<void> {
    const fnTag = `${CrashRecoveryServerService.name}#handleRecoverSuccess`;

    try {
      this.log.debug(`${fnTag} - Handling RecoverSuccessMessage:`, req);

      const session = this.sessions.get(req.sessionId);
      if (!session) {
        this.log.error(`${fnTag} - Session not found: ${req.sessionId}`);
        throw new Error(`Session not found: ${req.sessionId}`);
      }

      this.log.info(`${fnTag} - Session marked as recovered: ${req.sessionId}`);
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
      );

      const strategy = factory.createStrategy(session);

      const rollbackState = await strategy.execute(session);

      const rollbackAckMessage = new RollbackAckMessage({
        sessionId: req.sessionId,
        messageType: "urn:ietf:SATP-2pc:msgtype:rollback-ack-msg",
        success: rollbackState.status === "COMPLETED",
        actionsPerformed: rollbackState.rollbackLogEntries.map(
          (entry) => entry.action,
        ),
        proofs: [],
        senderSignature: "",
      });

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
