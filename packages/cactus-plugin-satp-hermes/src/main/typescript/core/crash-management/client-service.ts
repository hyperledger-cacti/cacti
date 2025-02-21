import {
  type RecoverMessage,
  RecoverMessageSchema,
  type RecoverSuccessMessage,
  RecoverSuccessMessageSchema,
  type RollbackMessage,
  RollbackMessageSchema,
  type RollbackState,
} from "../../../typescript/generated/proto/cacti/satp/v02/crash_recovery_pb";
import type { JsObjectSigner, Logger } from "@hyperledger/cactus-common";
import { create } from "@bufbuild/protobuf";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import { bufArray2HexStr, sign } from "../../gateway-utils";
import type { SessionData } from "../../generated/proto/cacti/satp/v02/common/session_pb";
import { getCrashedStage } from "../session-utils";

export class CrashRecoveryClientService {
  constructor(
    private readonly log: Logger,
    private readonly signer: JsObjectSigner,
  ) {
    this.log = log;
    this.log.trace(`Initialized ${CrashRecoveryClientService.name}`);
  }

  public async createRecoverMessage(
    sessionData: SessionData,
  ): Promise<RecoverMessage> {
    const fnTag = `${CrashRecoveryClientService.name}#createRecoverMessage`;

    this.log.debug(
      `${fnTag} - Creating RecoverMessage for sessionId: ${sessionData.id}`,
    );

    const satpPhase = getCrashedStage(sessionData);
    const recoverMessage = create(RecoverMessageSchema, {
      sessionId: sessionData.id,
      messageType: "urn:ietf:SATP-2pc:msgtype:recover-msg",
      satpPhase: String(satpPhase),
      sequenceNumber: Number(sessionData.lastSequenceNumber),
      isBackup: false,
      newIdentityPublicKey: "",
      lastEntryTimestamp: BigInt(sessionData.lastMessageReceivedTimestamp),
      clientSignature: "",
    });

    const signature = bufArray2HexStr(
      sign(this.signer, safeStableStringify(recoverMessage)),
    );

    recoverMessage.clientSignature = signature;

    this.log.debug(`${fnTag} - RecoverMessage created:`, recoverMessage);

    return recoverMessage;
  }

  public async createRecoverSuccessMessage(
    sessionData: SessionData,
  ): Promise<RecoverSuccessMessage> {
    const fnTag = `${CrashRecoveryClientService.name}#createRecoverSuccessMessage`;
    this.log.debug(
      `${fnTag} - Creating RecoverSuccessMessage for sessionId: ${sessionData.id}`,
    );

    const recoverSuccessMessage = create(RecoverSuccessMessageSchema, {
      sessionId: sessionData.id,
      messageType: "urn:ietf:SATP-2pc:msgtype:recover-success-msg",
      // TODO: implement
      hashRecoverUpdateMessage: "",
      success: true,
      entriesChanged: [],
      clientSignature: "",
    });

    const signature = bufArray2HexStr(
      sign(this.signer, safeStableStringify(recoverSuccessMessage)),
    );

    recoverSuccessMessage.clientSignature = signature;

    this.log.debug(
      `${fnTag} - RecoverSuccessMessage created:`,
      recoverSuccessMessage,
    );

    return recoverSuccessMessage;
  }

  public async createRollbackMessage(
    sessionData: SessionData,
    rollbackState: RollbackState,
  ): Promise<RollbackMessage> {
    const fnTag = `${CrashRecoveryClientService.name}#createRollbackMessage`;
    this.log.debug(
      `${fnTag} - Creating RollbackMessage for sessionId: ${sessionData.id}`,
    );

    const rollbackMessage = create(RollbackMessageSchema, {
      sessionId: sessionData.id,
      messageType: "urn:ietf:SATP-2pc:msgtype:rollback-msg",
      success: rollbackState.status === "COMPLETED",
      actionsPerformed: rollbackState.rollbackLogEntries.map(
        (entry) => entry.action,
      ),
      proofs: [],
      clientSignature: "",
    });

    const signature = bufArray2HexStr(
      sign(this.signer, safeStableStringify(rollbackMessage)),
    );

    rollbackMessage.clientSignature = signature;

    this.log.debug(`${fnTag} - RollbackMessage created:`, rollbackMessage);

    return rollbackMessage;
  }
}
