import {
  RecoverMessage,
  RecoverMessageSchema,
  RecoverSuccessMessage,
  RecoverSuccessMessageSchema,
  RollbackMessage,
  RollbackMessageSchema,
  RollbackState,
} from "../../../typescript/generated/proto/cacti/satp/v02/crash_recovery_pb";
import { JsObjectSigner, Logger } from "@hyperledger/cactus-common";
import { SATPSession } from "../satp-session";
import { create } from "@bufbuild/protobuf";
import { SATPLogger } from "../../logging";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import { bufArray2HexStr, sign } from "../../gateway-utils";

export class CrashRecoveryClientService {
  constructor(
    private readonly dbLogger: SATPLogger,
    private readonly log: Logger,
    private readonly signer: JsObjectSigner,
  ) {
    this.log = log;
    this.log.trace(`Initialized ${CrashRecoveryClientService.name}`);
  }

  public async createRecoverMessage(
    session: SATPSession,
  ): Promise<RecoverMessage> {
    const fnTag = `${CrashRecoveryClientService.name}#createRecoverMessage`;
    this.log.debug(
      `${fnTag} - Creating RecoverMessage for sessionId: ${session.getSessionId()}`,
    );

    const sessionData = session.getClientSessionData();

    const recoverMessage = create(RecoverMessageSchema, {
      sessionId: session.getSessionId(),
      messageType: "urn:ietf:SATP-2pc:msgtype:recover-msg",
      satpPhase: "",
      sequenceNumber: Number(sessionData.lastSequenceNumber),
      isBackup: false,
      newIdentityPublicKey: "",
      lastEntryTimestamp: BigInt(sessionData.lastMessageReceivedTimestamp),
      senderSignature: "",
    });

    const signature = bufArray2HexStr(
      sign(this.signer, safeStableStringify(recoverMessage)),
    );

    recoverMessage.senderSignature = signature;

    await this.dbLogger.persistLogEntry({
      sessionID: recoverMessage.sessionId,
      type: "urn:ietf:SATP-2pc:msgtype:recover-msg",
      operation: "done",
      data: safeStableStringify(sessionData),
      sequenceNumber: Number(sessionData.lastSequenceNumber),
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
    const sessionData = session.getClientSessionData();
    const recoverSuccessMessage = create(RecoverSuccessMessageSchema, {
      sessionId: session.getSessionId(),
      messageType: "urn:ietf:SATP-2pc:msgtype:recover-success-msg",
      hashRecoverUpdateMessage: "",
      success: true,
      entriesChanged: [],
      senderSignature: "",
    });

    const signature = bufArray2HexStr(
      sign(this.signer, safeStableStringify(recoverSuccessMessage)),
    );

    recoverSuccessMessage.senderSignature = signature;

    await this.dbLogger.persistLogEntry({
      sessionID: recoverSuccessMessage.sessionId,
      type: "urn:ietf:SATP-2pc:msgtype:recover-success-msg",
      operation: "done",
      data: safeStableStringify(sessionData),
      sequenceNumber: Number(sessionData.lastSequenceNumber),
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
    const sessionData = session.getClientSessionData();
    const rollbackMessage = create(RollbackMessageSchema, {
      sessionId: session.getSessionId(),
      messageType: "urn:ietf:SATP-2pc:msgtype:rollback-msg",
      success: rollbackState.status === "COMPLETED",
      actionsPerformed: rollbackState.rollbackLogEntries.map(
        (entry) => entry.action,
      ),
      proofs: [],
      senderSignature: "",
    });

    const signature = bufArray2HexStr(
      sign(this.signer, safeStableStringify(rollbackMessage)),
    );

    rollbackMessage.senderSignature = signature;

    await this.dbLogger.persistLogEntry({
      sessionID: rollbackMessage.sessionId,
      type: "urn:ietf:SATP-2pc:msgtype:rollback-msg",
      operation: "done",
      data: safeStableStringify(sessionData),
      sequenceNumber: Number(sessionData.lastSequenceNumber),
    });
    this.log.debug(`${fnTag} - RollbackMessage created:`, rollbackMessage);

    return rollbackMessage;
  }
}
