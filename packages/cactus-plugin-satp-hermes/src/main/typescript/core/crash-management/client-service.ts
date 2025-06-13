import {
  RecoverRequest,
  RecoverRequestSchema,
  RecoverSuccessRequest,
  RecoverSuccessRequestSchema,
  RollbackRequest,
  RollbackRequestSchema,
  RollbackState,
} from "../../../typescript/generated/proto/cacti/satp/v02/service/crash_recovery_pb";
import { JsObjectSigner, Logger } from "@hyperledger/cactus-common";
import { create } from "@bufbuild/protobuf";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import { bufArray2HexStr, sign } from "../../gateway-utils";
import type { SessionData } from "../../generated/proto/cacti/satp/v02/session/session_pb";
import { getCrashedStage } from "../session-utils";

export class CrashRecoveryClientService {
  constructor(
    private readonly log: Logger,
    private readonly signer: JsObjectSigner,
  ) {
    this.log = log;
    this.log.trace(`Initialized ${CrashRecoveryClientService.name}`);
  }

  public async createRecoverRequest(
    sessionData: SessionData,
  ): Promise<RecoverRequest> {
    const fnTag = `${CrashRecoveryClientService.name}#createRecoverRequest`;

    this.log.debug(
      `${fnTag} - Creating RecoverRequest for sessionId: ${sessionData.id}`,
    );

    const satpPhase = getCrashedStage(sessionData);
    const recoverMessage = create(RecoverRequestSchema, {
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

    this.log.debug(`${fnTag} - RecoverRequest created:`, recoverMessage);

    return recoverMessage;
  }

  public async createRecoverSuccessRequest(
    sessionData: SessionData,
  ): Promise<RecoverSuccessRequest> {
    const fnTag = `${CrashRecoveryClientService.name}#createRecoverSuccessRequest`;
    this.log.debug(
      `${fnTag} - Creating RecoverSuccessRequest for sessionId: ${sessionData.id}`,
    );

    const recoverSuccessMessage = create(RecoverSuccessRequestSchema, {
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
      `${fnTag} - RecoverSuccessRequest created:`,
      recoverSuccessMessage,
    );

    return recoverSuccessMessage;
  }

  public async createRollbackRequest(
    sessionData: SessionData,
    rollbackState: RollbackState,
  ): Promise<RollbackRequest> {
    const fnTag = `${CrashRecoveryClientService.name}#createRollbackRequest`;
    this.log.debug(
      `${fnTag} - Creating RollbackRequest for sessionId: ${sessionData.id}`,
    );

    const rollbackMessage = create(RollbackRequestSchema, {
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

    this.log.debug(`${fnTag} - RollbackRequest created:`, rollbackMessage);

    return rollbackMessage;
  }
}
