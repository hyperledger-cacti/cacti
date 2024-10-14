import {
  Logger,
  ILoggerOptions,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  RecoverMessage,
  RecoverUpdateMessage,
  RollbackMessage,
  RollbackAckMessage,
} from "../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { ILocalLogRepository } from "../../repository/interfaces/repository";

interface ICrashRecoveryServiceOptions {
  loggerOptions: ILoggerOptions;
  logRepository: ILocalLogRepository;
}

export class CrashRecoveryService {
  private readonly log: Logger;
  private readonly logRepository: ILocalLogRepository;

  constructor(options: ICrashRecoveryServiceOptions) {
    this.log = LoggerProvider.getOrCreate(options.loggerOptions);
    this.logRepository = options.logRepository;
  }

  async createRecoverUpdateMessage(
    request: RecoverMessage,
  ): Promise<RecoverUpdateMessage> {
    this.log.debug("Creating RecoverUpdateMessage...");
    const recoveredLogs =
      await this.logRepository.readLogsMoreRecentThanTimestamp(
        request.lastEntryTimestamp.toString(),
      );
    return new RecoverUpdateMessage({
      sessionId: request.sessionId,
      messageType: "urn:ietf:SATP-2pc:msgtype:recover-update-msg",
      hashRecoverMessage: "",
      recoveredLogs: recoveredLogs,
      senderSignature: "",
    });
  }

  createRollbackAckMessage(request: RollbackMessage): RollbackAckMessage {
    this.log.debug("Creating RollbackAckMessage...");
    return new RollbackAckMessage({
      sessionId: request.sessionId,
      messageType: "urn:ietf:SATP-2pc:msgtype:rollback-msg",
      success: true,
      actionsPerformed: [],
      proofs: [],
      senderSignature: "",
    });
  }

  async sendRecoverMessage(
    message: RecoverMessage,
  ): Promise<RecoverUpdateMessage> {
    this.log.debug("Sending RecoverMessage...");
    const updateMessage = await this.createRecoverUpdateMessage(message);
    return updateMessage;
  }

  async sendRollbackMessage(
    message: RollbackMessage,
  ): Promise<RollbackAckMessage> {
    this.log.debug("Sending RollbackMessage...");
    const ackMessage = this.createRollbackAckMessage(message);
    return ackMessage;
  }
}
