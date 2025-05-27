import {
  BurnAssertionClaimFormatSchema,
  BurnAssertionClaimSchema,
  ClaimFormat,
  CommonSatpSchema,
  MessageType,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { SATP_VERSION } from "../../constants";
import {
  CommitFinalAssertionResponse,
  CommitFinalAssertionRequest,
  CommitFinalAssertionRequestSchema,
  CommitPreparationRequest,
  CommitPreparationRequestSchema,
  CommitPreparationResponse,
  TransferCompleteRequest,
  TransferCompleteRequestSchema,
  TransferCompleteResponse,
} from "../../../generated/proto/cacti/satp/v02/service/stage_3_pb";
import { bufArray2HexStr, getHash, sign } from "../../../gateway-utils";
import {
  getMessageHash,
  saveHash,
  saveSignature,
  saveTimestamp,
  SessionType,
  TimestampType,
} from "../../session-utils";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import {
  SATPService,
  ISATPClientServiceOptions,
  ISATPServiceOptions,
  SATPServiceType,
} from "../satp-service";
import { SATPSession } from "../../satp-session";
import { LockAssertionResponse } from "../../../generated/proto/cacti/satp/v02/service/stage_2_pb";
import { commonBodyVerifier, signatureVerifier } from "../data-verifier";
import {
  AmountMissingError,
  AssignmentAssertionClaimError,
  BurnAssertionClaimError,
  LedgerAssetError,
  MintAssertionClaimError,
  MissingBridgeManagerError,
  SessionError,
  TokenIdMissingError,
} from "../../errors/satp-service-errors";
import { FailedToProcessError } from "../../errors/satp-handler-errors";
import { State } from "../../../generated/proto/cacti/satp/v02/session/session_pb";
import { create } from "@bufbuild/protobuf";
import { BridgeManagerClientInterface } from "../../../cross-chain-mechanisms/bridge/interfaces/bridge-manager-client-interface";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { FungibleAsset } from "../../../cross-chain-mechanisms/bridge/ontology/assets/asset";
import { protoToAsset } from "../service-utils";
import { NetworkId } from "../../../public-api";

export class Stage3ClientService extends SATPService {
  public static readonly SATP_STAGE = "3";
  public static readonly SERVICE_TYPE = SATPServiceType.Client;
  public static readonly SATP_SERVICE_INTERNAL_NAME = `stage-${this.SATP_STAGE}-${SATPServiceType[this.SERVICE_TYPE].toLowerCase()}`;

  private bridgeManager: BridgeManagerClientInterface;

  private claimFormat: ClaimFormat;

  constructor(ops: ISATPClientServiceOptions) {
    const commonOptions: ISATPServiceOptions = {
      stage: Stage3ClientService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage3ClientService.SERVICE_TYPE,
      bridgeManager: ops.bridgeManager,
      dbLogger: ops.dbLogger,
    };
    super(commonOptions);

    if (ops.bridgeManager == undefined) {
      throw new MissingBridgeManagerError(
        `${this.getServiceIdentifier()}#constructor`,
      );
    }

    this.claimFormat = ops.claimFormat || ClaimFormat.DEFAULT;
    this.bridgeManager = ops.bridgeManager;
  }

  async commitPreparation(
    response: LockAssertionResponse,
    session: SATPSession,
  ): Promise<void | CommitPreparationRequest> {
    const stepTag = `commitPreparation()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const messageType = MessageType[MessageType.COMMIT_PREPARE];
    this.Log.debug(`${fnTag}, CommitPreparation...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();
    this.Log.info(`init-${messageType}`);
    await this.dbLogger.persistLogEntry({
      sessionID: sessionData.id,
      type: messageType,
      operation: "init",
      data: safeStableStringify(sessionData),
      sequenceNumber: Number(sessionData.lastSequenceNumber),
    });
    try {
      this.Log.info(`exec-${messageType}`);
      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "exec",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });

      const commonBody = create(CommonSatpSchema, {
        version: SATP_VERSION,
        messageType: MessageType.COMMIT_PREPARE,
        sequenceNumber: response.common!.sequenceNumber + BigInt(1),
        hashPreviousMessage: getMessageHash(
          sessionData,
          MessageType.ASSERTION_RECEIPT,
        ),
        sessionId: response.common!.sessionId,
        clientGatewayPubkey: sessionData.clientGatewayPubkey,
        serverGatewayPubkey: sessionData.serverGatewayPubkey,
        resourceUrl: sessionData.resourceUrl,
      });

      sessionData.lastSequenceNumber = commonBody.sequenceNumber =
        response.common!.sequenceNumber + BigInt(1);

      const commitPreparationRequestMessage = create(
        CommitPreparationRequestSchema,
        {
          common: commonBody,
        },
      );

      if (sessionData.transferContextId != undefined) {
        commitPreparationRequestMessage.common!.transferContextId =
          sessionData.transferContextId;
      }

      if (sessionData.clientTransferNumber != undefined) {
        commitPreparationRequestMessage.clientTransferNumber =
          sessionData.clientTransferNumber;
      }

      const messageSignature = bufArray2HexStr(
        sign(this.Signer, safeStableStringify(commitPreparationRequestMessage)),
      );

      commitPreparationRequestMessage.clientSignature = messageSignature;

      saveSignature(sessionData, MessageType.COMMIT_PREPARE, messageSignature);

      saveHash(
        sessionData,
        MessageType.COMMIT_PREPARE,
        getHash(commitPreparationRequestMessage),
      );

      saveTimestamp(
        sessionData,
        MessageType.COMMIT_PREPARE,
        TimestampType.PROCESSED,
      );

      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "done",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });

      this.Log.info(`${fnTag}, sending CommitPreparationMessage...`);

      return commitPreparationRequestMessage;
    } catch (error) {
      this.Log.error(`fail-${messageType}`, error);
      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "fail",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      throw error;
    }
  }

  async commitFinalAssertion(
    response: CommitPreparationResponse,
    session: SATPSession,
  ): Promise<void | CommitFinalAssertionRequest> {
    const stepTag = `commitFinalAssertion()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const messageType = MessageType[MessageType.COMMIT_FINAL];
    this.Log.debug(`${fnTag}, CommitFinalAssertion...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();
    this.Log.info(`init-${messageType}`);
    await this.dbLogger.persistLogEntry({
      sessionID: sessionData.id,
      type: messageType,
      operation: "init",
      data: safeStableStringify(sessionData),
      sequenceNumber: Number(sessionData.lastSequenceNumber),
    });
    try {
      this.Log.info(`exec-${messageType}`);
      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "exec",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });

      const commonBody = create(CommonSatpSchema, {
        version: SATP_VERSION,
        messageType: MessageType.COMMIT_FINAL,
        sequenceNumber: response.common!.sequenceNumber + BigInt(1),
        hashPreviousMessage: getMessageHash(
          sessionData,
          MessageType.COMMIT_READY,
        ),
        sessionId: response.common!.sessionId,
        clientGatewayPubkey: sessionData.clientGatewayPubkey,
        serverGatewayPubkey: sessionData.serverGatewayPubkey,
        resourceUrl: sessionData.resourceUrl,
      });
      sessionData.lastSequenceNumber = commonBody.sequenceNumber =
        response.common!.sequenceNumber + BigInt(1);

      commonBody.sessionId = response.common!.sessionId;
      commonBody.clientGatewayPubkey = sessionData.clientGatewayPubkey;
      commonBody.serverGatewayPubkey = sessionData.serverGatewayPubkey;
      commonBody.resourceUrl = sessionData.resourceUrl;

      const commitFinalAssertionRequestMessage = create(
        CommitFinalAssertionRequestSchema,
        {
          common: commonBody,
        },
      );

      if (sessionData.burnAssertionClaim == undefined) {
        throw new BurnAssertionClaimError(fnTag);
      }

      commitFinalAssertionRequestMessage.burnAssertionClaim =
        sessionData.burnAssertionClaim;

      if (sessionData.burnAssertionClaimFormat != undefined) {
        commitFinalAssertionRequestMessage.burnAssertionClaimFormat =
          sessionData.burnAssertionClaimFormat;
      }

      if (sessionData.transferContextId != undefined) {
        commitFinalAssertionRequestMessage.common!.transferContextId =
          sessionData.transferContextId;
      }

      if (sessionData.clientTransferNumber != undefined) {
        commitFinalAssertionRequestMessage.clientTransferNumber =
          sessionData.clientTransferNumber;
      }

      const messageSignature = bufArray2HexStr(
        sign(
          this.Signer,
          safeStableStringify(commitFinalAssertionRequestMessage),
        ),
      );

      commitFinalAssertionRequestMessage.clientSignature = messageSignature;

      saveSignature(sessionData, MessageType.COMMIT_FINAL, messageSignature);

      saveHash(
        sessionData,
        MessageType.COMMIT_FINAL,
        getHash(commitFinalAssertionRequestMessage),
      );

      saveTimestamp(
        sessionData,
        MessageType.COMMIT_FINAL,
        TimestampType.PROCESSED,
      );

      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "done",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });

      this.Log.info(`${fnTag}, sending CommitFinalAssertionMessage...`);

      return commitFinalAssertionRequestMessage;
    } catch (error) {
      this.Log.error(`fail-${messageType}`, error);
      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "fail",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      throw error;
    }
  }

  async transferComplete(
    response: CommitFinalAssertionResponse,
    session: SATPSession,
  ): Promise<void | TransferCompleteRequest> {
    const stepTag = `transferComplete()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const messageType = MessageType[MessageType.COMMIT_TRANSFER_COMPLETE];
    this.Log.debug(`${fnTag}, TransferComplete...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();
    this.Log.info(`init-${messageType}`);
    await this.dbLogger.persistLogEntry({
      sessionID: sessionData.id,
      type: messageType,
      operation: "init",
      data: safeStableStringify(sessionData),
      sequenceNumber: Number(sessionData.lastSequenceNumber),
    });
    try {
      this.Log.info(`exec-${messageType}`);
      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "exec",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      const commonBody = create(CommonSatpSchema, {
        version: SATP_VERSION,
        messageType: MessageType.COMMIT_TRANSFER_COMPLETE,
        sequenceNumber: response.common!.sequenceNumber + BigInt(1),
        hashPreviousMessage: getMessageHash(
          sessionData,
          MessageType.ACK_COMMIT_FINAL,
        ),
        sessionId: response.common!.sessionId,
        clientGatewayPubkey: sessionData.clientGatewayPubkey,
        serverGatewayPubkey: sessionData.serverGatewayPubkey,
        resourceUrl: sessionData.resourceUrl,
      });

      sessionData.lastSequenceNumber = commonBody.sequenceNumber =
        response.common!.sequenceNumber + BigInt(1);

      const transferCompleteRequestMessage = create(
        TransferCompleteRequestSchema,
        {
          common: commonBody,
        },
      );

      if (sessionData.transferContextId != undefined) {
        transferCompleteRequestMessage.common!.transferContextId =
          sessionData.transferContextId;
      }

      if (sessionData.clientTransferNumber != undefined) {
        transferCompleteRequestMessage.clientTransferNumber =
          sessionData.clientTransferNumber;
      }

      transferCompleteRequestMessage.hashTransferCommence = getMessageHash(
        sessionData,
        MessageType.TRANSFER_COMMENCE_REQUEST,
      );

      const messageSignature = bufArray2HexStr(
        sign(this.Signer, safeStableStringify(transferCompleteRequestMessage)),
      );

      transferCompleteRequestMessage.clientSignature = messageSignature;
      saveSignature(
        sessionData,
        MessageType.COMMIT_TRANSFER_COMPLETE,
        messageSignature,
      );

      saveHash(
        sessionData,
        MessageType.COMMIT_TRANSFER_COMPLETE,
        getHash(transferCompleteRequestMessage),
      );

      saveTimestamp(
        sessionData,
        MessageType.COMMIT_TRANSFER_COMPLETE,
        TimestampType.PROCESSED,
      );

      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "done",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });

      this.Log.info(`${fnTag}, sending TransferCompleteMessage...`);

      return transferCompleteRequestMessage;
    } catch (error) {
      this.Log.error(`fail-${messageType}`, error);
      await this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: messageType,
        operation: "fail",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      throw error;
    }
  }

  async checkLockAssertionResponse(
    response: LockAssertionResponse,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkLockAssertionResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, CheckLockAssertionResponse...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();

    commonBodyVerifier(
      fnTag,
      response.common,
      sessionData,
      MessageType.ASSERTION_RECEIPT,
    );

    signatureVerifier(fnTag, this.Signer, response, sessionData);

    if (
      sessionData.serverTransferNumber != undefined &&
      response.serverTransferNumber != sessionData.serverTransferNumber
    ) {
      // This does not throw an error because the serverTransferNumber is only meaningful to the server.
      this.Log.info(
        `${fnTag}, serverTransferNumber does not match the one that was sent`,
      );
    }

    saveHash(sessionData, MessageType.ASSERTION_RECEIPT, getHash(response));

    saveTimestamp(
      sessionData,
      MessageType.ASSERTION_RECEIPT,
      TimestampType.RECEIVED,
    );

    this.Log.info(`${fnTag}, LockAssertionResponse passed all checks.`);
  }

  async checkCommitPreparationResponse(
    response: CommitPreparationResponse,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkCommitPreparationResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, CommitPreparationResponse...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();

    commonBodyVerifier(
      fnTag,
      response.common,
      sessionData,
      MessageType.COMMIT_READY,
    );

    signatureVerifier(fnTag, this.Signer, response, sessionData);

    if (response.mintAssertionClaimFormat != undefined) {
      //todo
      this.Log.info(
        `${fnTag},  Optional variable loaded: mintAssertionClaimsFormat `,
      );
      sessionData.mintAssertionClaimFormat = response.mintAssertionClaimFormat;
    }

    if (response.mintAssertionClaim == undefined) {
      //todo
      throw new MintAssertionClaimError(fnTag);
    }

    sessionData.mintAssertionClaim = response.mintAssertionClaim;

    if (
      sessionData.serverTransferNumber != undefined &&
      response.serverTransferNumber != sessionData.serverTransferNumber
    ) {
      // This does not throw an error because the serverTransferNumber is only meaningful to the server.
      this.Log.info(
        `${fnTag}, serverTransferNumber does not match the one that was sent`,
      );
    }

    saveHash(sessionData, MessageType.COMMIT_READY, getHash(response));

    saveTimestamp(
      sessionData,
      MessageType.COMMIT_READY,
      TimestampType.RECEIVED,
    );

    this.Log.info(`${fnTag}, CommitPreparationResponse passed all checks.`);
  }

  async checkCommitFinalAssertionResponse(
    response: CommitFinalAssertionResponse,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkCommitFinalAssertionResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, CommitFinalAcknowledgementReceipt...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();

    commonBodyVerifier(
      fnTag,
      response.common,
      sessionData,
      MessageType.ACK_COMMIT_FINAL,
    );

    signatureVerifier(fnTag, this.Signer, response, sessionData);

    if (response.assignmentAssertionClaim == undefined) {
      throw new AssignmentAssertionClaimError(fnTag);
    }

    sessionData.assignmentAssertionClaim = response.assignmentAssertionClaim;

    if (response.assignmentAssertionClaimFormat != undefined) {
      this.Log.info(
        `${fnTag},  Optional variable loaded: assignmentAssertionClaimFormat `,
      );
      sessionData.assignmentAssertionClaimFormat =
        response.assignmentAssertionClaimFormat;
    }

    if (
      sessionData.serverTransferNumber != "" &&
      response.serverTransferNumber != sessionData.serverTransferNumber
    ) {
      // This does not throw an error because the serverTransferNumber is only meaningful to the server.
      this.Log.info(
        `${fnTag}, serverTransferNumber does not match the one that was sent`,
      );
    }

    saveHash(sessionData, MessageType.ACK_COMMIT_FINAL, getHash(response));

    saveTimestamp(
      sessionData,
      MessageType.ACK_COMMIT_FINAL,
      TimestampType.RECEIVED,
    );

    this.Log.info(`${fnTag}, CommitFinalAssertionResponse passed all checks.`);
  }

  async checkTransferCompleteResponse(
    response: TransferCompleteResponse,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkTransferCompleteResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    this.Log.debug(`${fnTag}, TransferComplete...`);

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();

    commonBodyVerifier(
      fnTag,
      response.common,
      sessionData,
      MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
    );

    signatureVerifier(fnTag, this.Signer, response, sessionData);

    if (
      sessionData.serverTransferNumber != "" &&
      response.serverTransferNumber != sessionData.serverTransferNumber
    ) {
      // This does not throw an error because the serverTransferNumber is only meaningful to the server.
      this.Log.info(
        `${fnTag}, serverTransferNumber does not match the one that was sent`,
      );
    }

    sessionData.state = State.COMPLETED;

    saveHash(
      sessionData,
      MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
      getHash(response),
    );

    saveTimestamp(
      sessionData,
      MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
      TimestampType.RECEIVED,
    );

    this.Log.info(`${fnTag}, TransferCompleteRequest passed all checks.`);
  }

  async burnAsset(session: SATPSession): Promise<void> {
    const stepTag = `burnAsset()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;

    if (session == undefined) {
      throw new SessionError(fnTag);
    }

    session.verify(fnTag, SessionType.CLIENT);

    const sessionData = session.getClientSessionData();
    this.Log.info(`init-${stepTag}`);
    this.dbLogger.persistLogEntry({
      sessionID: sessionData.id,
      type: "burn-asset",
      operation: "init",
      data: safeStableStringify(sessionData),
      sequenceNumber: Number(sessionData.lastSequenceNumber),
    });
    this.Log.debug(`${fnTag}, Burning Asset...`);
    try {
      this.Log.info(`exec-${stepTag}`);
      this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: "burn-asset",
        operation: "exec",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });

      if (sessionData.senderAsset == undefined) {
        throw new LedgerAssetError(fnTag);
      }

      const networkId = {
        id: sessionData.senderAsset.networkId?.id,
        ledgerType: sessionData.senderAsset.networkId?.type as LedgerType,
      } as NetworkId;

      const token: FungibleAsset = protoToAsset(
        sessionData.senderAsset,
        networkId,
      ) as FungibleAsset;

      if (token.id == undefined) {
        throw new TokenIdMissingError(fnTag);
      }

      if (token.amount == undefined) {
        throw new AmountMissingError(fnTag);
      }

      this.Log.debug(
        `${fnTag}, Burn Asset ID: ${token.id} amount: ${token.amount}`,
      );

      const bridge = this.bridgeManager.getSATPExecutionLayer(
        networkId,
        this.claimFormat,
      );

      sessionData.burnAssertionClaim = create(BurnAssertionClaimSchema, {});

      const res = await bridge.burnAsset(token);

      sessionData.burnAssertionClaim.receipt = res.receipt;

      this.Log.debug(
        `${fnTag}, Burn Operation Receipt: ${sessionData.burnAssertionClaim.receipt}`,
      );

      sessionData.burnAssertionClaim.proof = res.proof;

      sessionData.burnAssertionClaimFormat = create(
        BurnAssertionClaimFormatSchema,
        {
          format: this.claimFormat,
        },
      );

      sessionData.burnAssertionClaim.signature = bufArray2HexStr(
        sign(this.Signer, sessionData.burnAssertionClaim.receipt),
      );
      this.dbLogger.storeProof({
        sessionID: sessionData.id,
        type: "burn-asset",
        operation: "done",
        data: safeStableStringify(sessionData.burnAssertionClaim.proof),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      this.Log.info(`${fnTag}, done-${fnTag}`);
    } catch (error) {
      this.dbLogger.persistLogEntry({
        sessionID: sessionData.id,
        type: "burn-asset",
        operation: "fail",
        data: safeStableStringify(sessionData),
        sequenceNumber: Number(sessionData.lastSequenceNumber),
      });
      throw new FailedToProcessError(fnTag, "BurnAsset", error);
    }
  }
}
