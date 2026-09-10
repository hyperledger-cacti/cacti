import {
  TransferCommenceRequest,
  TransferProposalRequest,
  TransferProposalResponse,
  TransferProposalRequestSchema,
  TransferCommenceRequestSchema,
} from "../../../generated/proto/cacti/satp/v13/service/stage_1_pb";
import {
  MessageType,
  CommonSatpSchema,
  TransferClaimsSchema,
  NetworkCapabilitiesSchema,
} from "../../../generated/proto/cacti/satp/v13/common/message_pb";
import { bufArray2HexStr, getHash, sign } from "../../../utils/gateway-utils";
import {
  getMessageHash,
  saveHash,
  saveSignature,
  saveTimestamp,
  SessionType,
  TimestampType,
} from "../../session-utils";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { SATPSession } from "../../../core/satp-session";
import {
  SATPService,
  SATPServiceType,
  ISATPClientServiceOptions,
  ISATPServiceOptions,
} from "../satp-service";
import {
  verifyPreSATPTransferResponse,
  verifyTransferCommenceRequest,
  verifyTransferProposalRequest,
  verifyTransferProposalResponse,
} from "../verifier/stage-1-client-service-verifications";
import { SessionError } from "../../errors/satp-service-errors";
import { PreSATPTransferResponse } from "../../../generated/proto/cacti/satp/v13/service/stage_0_pb";
import { create } from "@bufbuild/protobuf";
import { NetworkId } from "../../../public-api";
import { context, SpanStatusCode } from "@opentelemetry/api";
import { DEFAULT_TLS13_CIPHER_SUITE } from "../../constants";
import { State } from "../../../generated/proto/cacti/satp/v13/session/session_pb";

export class Stage1ClientService extends SATPService {
  public static readonly SATP_STAGE = "1";
  public static readonly SERVICE_TYPE = SATPServiceType.Client;
  public static readonly SATP_SERVICE_INTERNAL_NAME = `stage-${this.SATP_STAGE}-${SATPServiceType[this.SERVICE_TYPE].toLowerCase()}`;

  constructor(ops: ISATPClientServiceOptions) {
    const commonOptions: ISATPServiceOptions = {
      stage: Stage1ClientService.SATP_STAGE,
      loggerOptions: ops.loggerOptions,
      serviceName: ops.serviceName,
      signer: ops.signer,
      serviceType: Stage1ClientService.SERVICE_TYPE,
      dbLogger: ops.dbLogger,
      monitorService: ops.monitorService,
    };
    super(commonOptions);
  }

  async transferProposalRequest(
    session: SATPSession,
    connectedDLTs: NetworkId[],
  ): Promise<void | TransferProposalRequest> {
    const stepTag = `transferProposalRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        this.Log.debug(`${fnTag}, transferProposalRequest...`);
        const messageType = MessageType[MessageType.INIT_PROPOSAL];
        verifyTransferCommenceRequest(fnTag, session);
        const sessionData = session.getClientSessionData();
        sessionData.lastSequenceNumber += BigInt(1);

        await this.dbLogger.persistLogEntry({
          sessionId: sessionData.id,
          type: messageType,
          operation: "init",
          data: safeStableStringify(sessionData),
          sequenceNumber: Number(sessionData.lastSequenceNumber),
        });

        try {
          this.Log.info(`exec-${messageType}`);
          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: messageType,
            operation: "exec",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });

          verifyTransferProposalRequest(fnTag, sessionData, connectedDLTs);
          sessionData.lastSequenceNumber += BigInt(1);

          const commonBody = create(CommonSatpSchema, {
            version: sessionData.version,
            messageType: MessageType.INIT_PROPOSAL,
            sessionId: sessionData.id,
            transferContextId: sessionData.transferContextId,
          });

          const transferInitClaims = create(TransferClaimsSchema, {
            digitalAssetId: sessionData.digitalAssetId,
            assetProfileId: sessionData.assetProfileId,
            verifiedOriginatorEntityId: sessionData.verifiedOriginatorEntityId,
            verifiedBeneficiaryEntityId:
              sessionData.verifiedBeneficiaryEntityId,
            senderGatewayNetworkId: sessionData.senderGatewayNetworkId,
            recipientGatewayNetworkId: sessionData.recipientGatewayNetworkId,
            senderGatewaySignaturePublicKey: sessionData.clientGatewayPubkey,
            receiverGatewaySignaturePublicKey: sessionData.serverGatewayPubkey,
            senderGatewayOwnerId: sessionData.senderGatewayOwnerId,
            receiverGatewayOwnerId: sessionData.receiverGatewayOwnerId,
          });

          sessionData.hashTransferInitClaims = getHash(transferInitClaims);

          const networkCapabilities = create(NetworkCapabilitiesSchema, {
            gatewayDefaultSignatureAlgorithm: sessionData.signatureAlgorithm,
            networkLockType: sessionData.lockType,
            networkLockExpirationTime: sessionData.lockExpirationTime,
            gatewayTlsScheme:
              sessionData.gatewayTlsScheme ?? DEFAULT_TLS13_CIPHER_SUITE,
          });

          const transferProposalRequestMessage = create(
            TransferProposalRequestSchema,
            {
              common: commonBody,
              transferInitClaims: transferInitClaims,
              networkCapabilities: networkCapabilities,
            },
          );

          if (sessionData.transferClaimsFormat != undefined) {
            this.Log.info(
              `${fnTag}, Optional variable loaded: transferInitClaimsFormat...`,
            );
            transferProposalRequestMessage.transferInitClaimsFormat =
              sessionData.transferClaimsFormat;
          }

          const messageSignature = bufArray2HexStr(
            sign(
              this.Signer,
              safeStableStringify(transferProposalRequestMessage),
            ),
          );

          saveSignature(
            sessionData,
            MessageType.INIT_PROPOSAL,
            messageSignature,
          );

          saveHash(
            sessionData,
            MessageType.INIT_PROPOSAL,
            getHash(transferProposalRequestMessage),
          );

          saveTimestamp(
            sessionData,
            MessageType.INIT_PROPOSAL,
            TimestampType.PROCESSED,
          );

          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: messageType,
            operation: "done",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });
          this.Log.info(`${fnTag}, sending TransferProposalRequest...`);

          return transferProposalRequestMessage;
        } catch (error) {
          this.Log.error(`fail-${messageType}`, error);
          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: messageType,
            operation: "fail",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });
          throw error;
        }
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  async transferCommenceRequest(
    response: TransferProposalResponse,
    session: SATPSession,
  ): Promise<void | TransferCommenceRequest> {
    const stepTag = `transferCommenceRequest()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, async () => {
      try {
        const messageType = MessageType[MessageType.TRANSFER_COMMENCE_REQUEST];
        this.Log.debug(`${fnTag}, transferCommenceRequest...`);

        if (session == undefined) {
          throw new SessionError(fnTag);
        }

        session.verify(fnTag, SessionType.CLIENT);
        const sessionData = session.getClientSessionData();

        // persist the signature-verified wrap-assertion claim so it stays
        // provable for dispute resolution and audit after transport ends
        // TODO consider persisting in separate DB more suitable for audits/long term storage
        await this.dbLogger.persistLogEntry({
          sessionId: sessionData.id,
          type: MessageType[MessageType.TRANSFER_COMMENCE_REQUEST],
          operation: "claim-verified",
          data: safeStableStringify(response.hashTransferInitClaims) ?? "",
          sequenceNumber: Number(sessionData.lastSequenceNumber),
        });

        await this.dbLogger.persistLogEntry({
          sessionId: sessionData.id,
          type: messageType,
          operation: "init",
          data: safeStableStringify(sessionData),
          sequenceNumber: Number(sessionData.lastSequenceNumber),
        });

        try {
          this.Log.info(`exec-${messageType}`);
          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: messageType,
            operation: "exec",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });

          const commonBody = create(CommonSatpSchema, {
            version: sessionData.version,
            messageType: MessageType.TRANSFER_COMMENCE_REQUEST,
            sessionId: sessionData.id,
            transferContextId: sessionData.transferContextId,
          });

          const transferCommenceRequestMessage = create(
            TransferCommenceRequestSchema,
            {
              common: commonBody,
              hashTransferInitClaims: sessionData.hashTransferInitClaims,
              hashPrevMessage: getMessageHash(
                sessionData,
                MessageType.INIT_RECEIPT,
              ),
            },
          );

          const messageSignature = bufArray2HexStr(
            sign(
              this.Signer,
              safeStableStringify(transferCommenceRequestMessage),
            ),
          );

          saveSignature(
            sessionData,
            MessageType.TRANSFER_COMMENCE_REQUEST,
            messageSignature,
          );

          saveHash(
            sessionData,
            MessageType.TRANSFER_COMMENCE_REQUEST,
            getHash(transferCommenceRequestMessage),
          );

          saveTimestamp(
            sessionData,
            MessageType.TRANSFER_COMMENCE_REQUEST,
            TimestampType.PROCESSED,
          );

          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: messageType,
            operation: "done",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });

          this.Log.info(`${fnTag}, sending TransferCommenceRequest...`);

          return transferCommenceRequestMessage;
        } catch (error) {
          this.Log.error(`fail-${messageType}`, error);
          await this.dbLogger.persistLogEntry({
            sessionId: sessionData.id,
            type: messageType,
            operation: "fail",
            data: safeStableStringify(sessionData),
            sequenceNumber: Number(sessionData.lastSequenceNumber),
          });
          throw error;
        }
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  async checkPreSATPTransferResponse(
    response: PreSATPTransferResponse,
    session: SATPSession,
  ): Promise<void> {
    const stepTag = `checkPreSATPTransferResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    await context.with(ctx, async () => {
      try {
        this.Log.debug(`${fnTag}, checkPreSATPTransferResponse...`);

        verifyPreSATPTransferResponse(fnTag, this.Signer, response, session);

        // update state
        const sessionData = session.getClientSessionData();

        // first verification after stage 0, prior to transfer commence request
        // persist the signature-verified wrap-assertion claim so it stays
        // provable for dispute resolution and audit after transport ends
        await this.dbLogger.persistLogEntry({
          sessionId: sessionData.id,
          type: MessageType[MessageType.PRE_SATP_TRANSFER_RESPONSE],
          operation: "claim-verified",
          data: safeStableStringify(response.wrapAssertionClaim) ?? "",
          sequenceNumber: Number(sessionData.lastSequenceNumber),
        });

        sessionData.recipientGatewayNetworkId =
          response.recipientGatewayNetworkId;
        sessionData.receiverAsset!.tokenId = response.recipientTokenId;
        saveHash(
          sessionData,
          MessageType.PRE_SATP_TRANSFER_RESPONSE,
          getHash(response),
        );
        saveTimestamp(
          sessionData,
          MessageType.PRE_SATP_TRANSFER_RESPONSE,
          TimestampType.RECEIVED,
        );

        this.Log.info(`${fnTag}, PreSATPTransferResponse passed all checks.`);
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }

  async checkTransferProposalResponse(
    response: TransferProposalResponse,
    session: SATPSession,
  ): Promise<boolean> {
    const stepTag = `checkTransferProposalResponse()`;
    const fnTag = `${this.getServiceIdentifier()}#${stepTag}`;
    const { span, context: ctx } = this.monitorService.startSpan(fnTag);
    return context.with(ctx, () => {
      try {
        this.Log.debug(`${fnTag}, checkTransferProposalResponse...`);

        const accepted = verifyTransferProposalResponse(
          fnTag,
          this.Signer,
          response,
          session,
          this.Log,
        );

        const sessionData = session.getClientSessionData();
        saveTimestamp(
          sessionData,
          MessageType.INIT_REJECT,
          TimestampType.RECEIVED,
        );

        if (accepted) {
          saveHash(sessionData, MessageType.INIT_RECEIPT, getHash(response));
          saveTimestamp(
            sessionData,
            MessageType.INIT_RECEIPT,
            TimestampType.RECEIVED,
          );
          this.Log.info(`${fnTag}, TransferProposalReceipt passed all checks.`);
        } else {
          sessionData.state = State.REJECTED;
          saveHash(sessionData, MessageType.INIT_REJECT, getHash(response));
        }

        return accepted;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: String(err) });
        span.recordException(err);
        throw err;
      } finally {
        span.end();
      }
    });
  }
}
