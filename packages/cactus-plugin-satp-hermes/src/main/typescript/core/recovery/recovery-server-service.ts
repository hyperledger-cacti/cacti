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

export class CrashRecoveryServerService {
  private readonly log: Logger;

  constructor(
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
    this.log.debug(`${fnTag} - Handling RecoverMessage:`, req);

    const session = this.sessions.get(req.sessionId);
    if (!session) {
      this.log.error(`${fnTag} - Session not found: ${req.sessionId}`);
      throw new Error(`Session not found: ${req.sessionId}`);
    }

    // todo : create a method to get logs with sequence number
    const recoveredLogs = await this.logRepository.fetchLogsFromSequence(
      req.sessionId,
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
  }

  public async handleRecoverSuccess(req: RecoverSuccessMessage): Promise<void> {
    const fnTag = `${CrashRecoveryServerService.name}#handleRecoverSuccess`;
    this.log.debug(`${fnTag} - Handling RecoverSuccessMessage:`, req);

    try {
      const session = this.sessions.get(req.sessionId);
      if (!session) {
        this.log.error(`${fnTag} - Session not found: ${req.sessionId}`);
        throw new Error(`Session not found: ${req.sessionId}`);
      }

      this.log.info(`${fnTag} - Session marked as recovered: ${req.sessionId}`);
    } catch (error) {
      this.log.error(
        `${fnTag}, Error handling RecoverSuccessMessage: ${error}`,
      );
      throw error;
    }
  }

  public async handleRollback(
    req: RollbackMessage,
  ): Promise<RollbackAckMessage> {
    const fnTag = `${CrashRecoveryServerService.name}#handleRollback`;
    this.log.debug(`${fnTag} - Handling RollbackMessage:`, req);

    const session = this.sessions.get(req.sessionId);
    if (!session) {
      this.log.error(`${fnTag} - Session not found: ${req.sessionId}`);
      throw new Error(`Session not found: ${req.sessionId}`);
    }

    const rollbackAckMessage = new RollbackAckMessage({
      sessionId: req.sessionId,
      messageType: "urn:ietf:SATP-2pc:msgtype:rollback-ack-msg",
      success: true,
      actionsPerformed: [],
      proofs: [],
      senderSignature: "",
    });

    return rollbackAckMessage;
  }

  public async handleRollbackAck(req: RollbackAckMessage): Promise<void> {
    const fnTag = `${CrashRecoveryServerService.name}#handleRollbackAck`;
    this.log.debug(`${fnTag} - Handling RollbackAckMessage:`, req);

    const session = this.sessions.get(req.sessionId);
    if (!session) {
      this.log.error(`${fnTag} - Session not found: ${req.sessionId}`);
      throw new Error(`Session not found: ${req.sessionId}`);
    }

    this.log.info(`${fnTag} - Session marked as rolled back: ${req.sessionId}`);
  }
}
