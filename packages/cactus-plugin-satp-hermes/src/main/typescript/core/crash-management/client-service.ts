import {
  RecoverMessage,
  RecoverSuccessMessage,
  RollbackMessage,
  RollbackState,
} from "../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import { Logger, LoggerProvider } from "@hyperledger/cactus-common";
import { SATPSession } from "../satp-session";

export class CrashRecoveryClientService {
  private readonly log: Logger;

  constructor(loggerLabel: string = "CrashRecoveryClientService") {
    this.log = LoggerProvider.getOrCreate({ label: loggerLabel });
    this.log.trace(`Initialized ${CrashRecoveryClientService.name}`);
  }

  public createRecoverMessage(session: SATPSession): RecoverMessage {
    const fnTag = `${CrashRecoveryClientService.name}#createRecoverMessage`;
    this.log.debug(
      `${fnTag} - Creating RecoverMessage for sessionId: ${session.getSessionId()}`,
    );

    const sessionData = session.getClientSessionData();

    const recoverMessage = new RecoverMessage({
      sessionId: session.getSessionId(),
      messageType: "urn:ietf:SATP-2pc:msgtype:recover-msg",
      satpPhase: "phase0",
      sequenceNumber: Number(sessionData.lastSequenceNumber),
      isBackup: false,
      newIdentityPublicKey: "",
      lastEntryTimestamp: BigInt(0),
      senderSignature: "",
    });

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

    const recoverSuccessMessage = new RecoverSuccessMessage({
      sessionId: session.getSessionId(),
      messageType: "urn:ietf:SATP-2pc:msgtype:recover-success-msg",
      hashRecoverUpdateMessage: "",
      success: true,
      entriesChanged: [],
      senderSignature: "",
    });

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

    const rollbackMessage = new RollbackMessage({
      sessionId: session.getSessionId(),
      messageType: "urn:ietf:SATP-2pc:msgtype:rollback-msg",
      success: rollbackState.status === "completed",
      actionsPerformed: [],
      proofs: [],
      senderSignature: "",
    });

    this.log.debug(`${fnTag} - RollbackMessage created:`, rollbackMessage);

    return rollbackMessage;
  }
}
