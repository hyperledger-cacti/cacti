import {
  Logger,
  ILoggerOptions,
  LoggerProvider,
} from "@hyperledger/cactus-common";
import {
  RecoverMessage,
  RecoverUpdateMessage,
  RecoverSuccessMessage,
  RollbackMessage,
  RollbackAckMessage,
} from "../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { ILocalLogRepository } from "../../repository/interfaces/repository";

interface ICrashRecoveryServiceOptions {
  loggerOptions: ILoggerOptions;
  logRepository: ILocalLogRepository;
}

export class CrashRecoveryService {
  private readonly logger: Logger;
  private readonly logRepository: ILocalLogRepository;

  constructor(options: ICrashRecoveryServiceOptions) {
    this.logger = LoggerProvider.getOrCreate(options.loggerOptions);
    this.logRepository = options.logRepository;
  }

  async createRecoverUpdateMessage(
    request: RecoverMessage,
  ): Promise<RecoverUpdateMessage> {
    this.logger.debug("Creating RecoverUpdateMessage...");
    const recoveredLogs =
      await this.logRepository.readLogsMoreRecentThanTimestamp(
        request.lastEntryTimestamp.toString(),
      );

    return new RecoverUpdateMessage({
      sessionId: request.sessionId,
      messageType: "urn:ietf:SATP-2pc:msgtype:recover-msg",
      hashRecoverMessage: "",
      recoveredLogs: recoveredLogs,
      senderSignature: "",
    });
  }

  createRecoverSuccessMessage(
    request: RecoverUpdateMessage,
  ): RecoverSuccessMessage {
    this.logger.debug("Creating RecoverSuccessMessage...");
    return new RecoverSuccessMessage({
      sessionId: request.sessionId,
      messageType: "urn:ietf:SATP-2pc:msgtype:recover-update-msg",
      hashRecoverUpdateMessage: "",
      success: true,
      entriesChanged: [],
      senderSignature: "",
    });
  }

  createRollbackAckMessage(request: RollbackMessage): RollbackAckMessage {
    this.logger.debug("Creating RollbackAckMessage...");
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
    this.logger.debug("Sending RecoverMessage...");
    const updateMessage = await this.createRecoverUpdateMessage(message);
    return updateMessage;
  }

  async sendRecoverUpdateMessage(
    message: RecoverUpdateMessage,
  ): Promise<RecoverSuccessMessage> {
    this.logger.debug("Sending RecoverUpdateMessage...");
    const successMessage = this.createRecoverSuccessMessage(message);
    return successMessage;
  }

  async sendRollbackMessage(
    message: RollbackMessage,
  ): Promise<RollbackAckMessage> {
    this.logger.debug("Sending RollbackMessage...");
    const ackMessage = this.createRollbackAckMessage(message);
    return ackMessage;
  }
}
