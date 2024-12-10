import {
  RecoverMessage,
  RecoverMessageSchema,
  RecoverSuccessMessage,
  RecoverSuccessMessageSchema,
  RollbackMessage,
  RollbackMessageSchema,
  RollbackState,
} from "../../../typescript/generated/proto/cacti/satp/v02/crash_recovery_pb";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { SATPSession } from "../satp-session";
import { ILocalLogRepository } from "../../repository/interfaces/repository";
import { create } from "@bufbuild/protobuf";
import { SATPLogger } from "../../logging";

export class CrashRecoveryClientService {
  private readonly log: Logger;

  constructor(
    private readonly logRepository: ILocalLogRepository,
    private readonly sessions: Map<string, SATPSession>,
    private readonly dbLogger: SATPLogger,
    loggerLabel: string = "CrashRecoveryClientService",
  ) {
    this.log = LoggerProvider.getOrCreate({ label: loggerLabel });
    this.log.trace(`Initialized ${CrashRecoveryClientService.name}`);
  }

  public createRecoverMessage(session: SATPSession): RecoverMessage {
    const fnTag = `${CrashRecoveryClientService.name}#createRecoverMessage`;
    this.log.debug(
      `${fnTag} - Creating RecoverMessage for sessionId: ${session.getSessionId()}`,
    );

    const sessionData = session.getClientSessionData();

    const recoverMessage = create(RecoverMessageSchema, {
      sessionId: session.getSessionId(),
      messageType: "urn:ietf:SATP-2pc:msgtype:recover-msg",
      satpPhase: "phase0",
      sequenceNumber: Number(sessionData.lastSequenceNumber),
      isBackup: false,
      newIdentityPublicKey: "",
      lastEntryTimestamp: BigInt(0),
      senderSignature: "",
    });
    //await this.dbLogger.persistLogEntry({});
    this.log.debug(`${fnTag} - RecoverMessage created:`, recoverMessage);

    return recoverMessage;
  }

  public async createRecoverSuccessMessage(
    session: SATPSession,
  ): Promise<RecoverSuccessMessage> {
    const fnTag = `${CrashRecoveryClientService.name}#createRecoverSuccessMessage`;
    this.log.debug(
      `${fnTag} - Creating RecoverSuccessMessage for sessionId: ${session.getSessionId()}`,
    );

    const recoverSuccessMessage = create(RecoverSuccessMessageSchema, {
      sessionId: session.getSessionId(),
      messageType: "urn:ietf:SATP-2pc:msgtype:recover-success-msg",
      hashRecoverUpdateMessage: "",
      success: true,
      entriesChanged: [],
      senderSignature: "",
    });
    //await this.dbLogger.persistLogEntry({});
    this.log.debug(
      `${fnTag} - RecoverSuccessMessage created:`,
      recoverSuccessMessage,
    );

    return recoverSuccessMessage;
  }

  public async createRollbackMessage(
    session: SATPSession,
    rollbackState: RollbackState,
  ): Promise<RollbackMessage> {
    const fnTag = `${CrashRecoveryClientService.name}#createRollbackMessage`;
    this.log.debug(
      `${fnTag} - Creating RollbackMessage for sessionId: ${session.getSessionId()}`,
    );

    const rollbackMessage = create(RollbackMessageSchema, {
      sessionId: session.getSessionId(),
      messageType: "urn:ietf:SATP-2pc:msgtype:rollback-msg",
      success: rollbackState.status === "completed",
      actionsPerformed: [],
      proofs: [],
      senderSignature: "",
    });
    //await this.dbLogger.persistLogEntry({});
    this.log.debug(`${fnTag} - RollbackMessage created:`, rollbackMessage);

    return rollbackMessage;
  }
}
