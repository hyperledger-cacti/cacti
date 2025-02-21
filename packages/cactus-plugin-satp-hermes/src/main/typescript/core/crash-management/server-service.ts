import {
  type RecoverMessage,
  type RecoverUpdateMessage,
  type RecoverSuccessMessage,
  type RollbackMessage,
  type RollbackAckMessage,
  RecoverUpdateMessageSchema,
  RollbackAckMessageSchema,
  type RecoverSuccessMessageResponse,
  RecoverSuccessMessageResponseSchema,
} from "../../generated/proto/cacti/satp/v02/crash_recovery_pb";
import type { SATPSession } from "../satp-session";
import type { ILocalLogRepository } from "../../repository/interfaces/repository";
import type { JsObjectSigner, Logger } from "@hyperledger/cactus-common";
import { RollbackStrategyFactory } from "./rollback/rollback-strategy-factory";
import type { SATPCrossChainManager } from "../../cross-chain-mechanisms/satp-cc-manager";
import { create } from "@bufbuild/protobuf";
import { stringify as safeStableStringify } from "safe-stable-stringify";
import { bufArray2HexStr, sign, verifySignature } from "../../gateway-utils";
import { SignatureVerificationError } from "../errors/satp-service-errors";
import { Type } from "../../generated/proto/cacti/satp/v02/common/session_pb";

export class CrashRecoveryServerService {
  constructor(
    private readonly bridgesManager: SATPCrossChainManager,
    private readonly defaultRepository: boolean,
    private readonly logRepository: ILocalLogRepository,
    private readonly sessions: Map<string, SATPSession>,
    private readonly signer: JsObjectSigner,
    private readonly log: Logger,
  ) {
    this.log = log;
    this.log.trace(`Initialized ${CrashRecoveryServerService.name}`);
  }

  public async handleRecover(
    req: RecoverMessage,
  ): Promise<RecoverUpdateMessage> {
    const fnTag = `${CrashRecoveryServerService.name}#handleRecover`;

    try {
      this.log.debug(`${fnTag} - Handling RecoverMessage:`, req.sessionId);

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

      if (!verifySignature(this.signer, req, sessionData.serverGatewayPubkey)) {
        throw new SignatureVerificationError(fnTag);
      }

      if (this.defaultRepository && !this.logRepository.getCreated()) {
        this.logRepository.createKnex();
      }

      const recoveredLogs = await this.logRepository.fetchLogsFromSequence(
        req.sessionId,
        req.sequenceNumber,
      );

      if (recoveredLogs.length === 0) {
        throw new Error(
          `No logs Found: ${req.sessionId}, Sequence Number received: ${req.sequenceNumber}`,
        );
      }

      const recoverUpdateMessage = create(RecoverUpdateMessageSchema, {
        sessionId: req.sessionId,
        messageType: "urn:ietf:SATP-2pc:msgtype:recover-update-msg",
        hashRecoverMessage: "",
        recoveredLogs: recoveredLogs,
        serverSignature: "",
      });

      const signature = bufArray2HexStr(
        sign(this.signer, safeStableStringify(recoverUpdateMessage)),
      );

      recoverUpdateMessage.serverSignature = signature;

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
      this.log.debug(
        `${fnTag} - Handling RecoverSuccessMessage:`,
        req.sessionId,
      );

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

      if (!verifySignature(this.signer, req, sessionData.serverGatewayPubkey)) {
        throw new SignatureVerificationError(fnTag);
      }

      const recoverSuccessMessageResponse = create(
        RecoverSuccessMessageResponseSchema,
        {
          sessionId: req.sessionId,
          received: true,
          serverSignature: "",
        },
      );

      const signature = bufArray2HexStr(
        sign(this.signer, safeStableStringify(recoverSuccessMessageResponse)),
      );

      recoverSuccessMessageResponse.serverSignature = signature;

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
      this.log.debug(`${fnTag} - Handling RollbackMessage:`, req.sessionId);

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

      if (!verifySignature(this.signer, req, sessionData.serverGatewayPubkey)) {
        throw new SignatureVerificationError(fnTag);
      }

      const factory = new RollbackStrategyFactory(
        this.bridgesManager,
        this.log,
      );

      const strategy = factory.createStrategy(sessionData);

      const rollbackState = await strategy.execute(session, Type.SERVER);

      const rollbackAckMessage = create(RollbackAckMessageSchema, {
        sessionId: req.sessionId,
        messageType: "urn:ietf:SATP-2pc:msgtype:rollback-ack-msg",
        success: rollbackState.status === "COMPLETED",
        actionsPerformed: rollbackState.rollbackLogEntries.map(
          (entry) => entry.action,
        ),
        proofs: [],
        serverSignature: "",
      });

      const signature = bufArray2HexStr(
        sign(this.signer, safeStableStringify(rollbackAckMessage)),
      );

      rollbackAckMessage.serverSignature = signature;

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
