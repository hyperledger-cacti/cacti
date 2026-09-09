/**
 * @fileoverview
 * Stage 1 client-side verification helpers for the SATP protocol.
 *
 * @description
 * These functions layer the Stage 1 client-specific validation on top of the
 * stage-agnostic {@link verifyMessage} entry point. Keeping the bespoke checks
 * here (proposal-response accept/reject handling and the pre-transfer response
 * validation) keeps the Stage 1 client service step implementations thin.
 *
 * @since 3.1.0
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-13.txt} SATP Core Specification
 */

import type { JsObjectSigner } from "@hyperledger-cacti/cactus-common";
import { getHash } from "../../../utils/gateway-utils";
import { MessageType } from "../../../generated/proto/cacti/satp/v13/common/message_pb";
import type { TransferProposalResponse } from "../../../generated/proto/cacti/satp/v13/service/stage_1_pb";
import type { PreSATPTransferResponse } from "../../../generated/proto/cacti/satp/v13/service/stage_0_pb";
import {
  State,
  type SessionData,
} from "../../../generated/proto/cacti/satp/v13/session/session_pb";
import type { SATPSession } from "../../satp-session";
import type { SATPLogger as Logger } from "../../satp-logger";
import {
  SessionType,
  TimestampType,
  saveHash,
  saveTimestamp,
} from "../../session-utils";
import {
  MessageTypeError,
  SessionError,
  TokenIdMissingError,
  TransferContextIdError,
  WrapAssertionClaimError,
} from "../../errors/satp-service-errors";
import {
  hashPrevMessageVerifier,
  signatureVerifier,
  verifyMessage,
} from "./data-verifier";

/**
 * Full Stage 1 client verification of an incoming `TransferProposalResponse`.
 *
 * Delegates the common checks (session state, common body accepting either
 * `INIT_RECEIPT` or `INIT_REJECT`, signature) to {@link verifyMessage}, then
 * handles the accept/reject branch and advances the session accordingly.
 *
 * @returns `true` when the proposal was accepted, `false` when it was rejected.
 * @throws {SessionError} When the session is undefined
 */
export function verifyTransferProposalResponse(
  tag: string,
  signer: JsObjectSigner,
  response: TransferProposalResponse,
  session: SATPSession | undefined,
  logger: Logger,
): boolean {
  // INIT_RECEIPT has no hash-chain predecessor to validate here.
  const sessionData = verifyMessage(
    tag,
    signer,
    response,
    session,
    SessionType.CLIENT,
    MessageType.INIT_RECEIPT,
    {
      secondaryMessageType: MessageType.INIT_REJECT,
      checkHashPrevMessage: false,
    },
  );

  // Assume INIT_REJECT; overridden with INIT_RECEIPT below when accepted.
  saveTimestamp(sessionData, MessageType.INIT_REJECT, TimestampType.RECEIVED);

  if (response.common!.messageType == MessageType.INIT_REJECT) {
    logger.info(
      `${tag}, TransferProposalReceipt proposedTransferClaims were rejected`,
    );
    sessionData.state = State.REJECTED;
    saveHash(sessionData, MessageType.INIT_REJECT, getHash(response));
    return false;
  }

  saveHash(sessionData, MessageType.INIT_RECEIPT, getHash(response));
  saveTimestamp(sessionData, MessageType.INIT_RECEIPT, TimestampType.RECEIVED);

  return true;
}

/**
 * Full Stage 1 client verification of an incoming `PreSATPTransferResponse`.
 *
 * This message predates the common-body envelope, so the field and signature
 * checks are performed explicitly here rather than through
 * {@link verifyMessage}, while the hash-chain check reuses
 * {@link hashPrevMessageVerifier}.
 *
 * @returns The resolved client session data.
 * @throws {SessionError} When the session is undefined
 * @throws {TransferContextIdError} When the transfer context id is missing or mismatched
 * @throws {WrapAssertionClaimError} When the wrap assertion claim is missing
 * @throws {TokenIdMissingError} When the recipient token id is missing
 * @throws {MessageTypeError} When the message type is not `PRE_SATP_TRANSFER_RESPONSE`
 * @throws {HashPrevMessageError} When the previous-message hash does not match
 */
export function verifyPreSATPTransferResponse(
  tag: string,
  signer: JsObjectSigner,
  response: PreSATPTransferResponse,
  session: SATPSession | undefined,
): SessionData {
  if (session == undefined) {
    throw new SessionError(tag);
  }

  if (response.recipientGatewayNetworkId == "") {
    throw new Error(`${tag}, recipientGatewayNetworkId is missing`);
  }

  const sessionData = session.getClientSessionData();

  sessionData.recipientGatewayNetworkId = response.recipientGatewayNetworkId;

  session.verify(tag, SessionType.CLIENT);

  if (
    response.contextId == "" ||
    response.contextId != sessionData.transferContextId
  ) {
    throw new TransferContextIdError(
      tag,
      response.contextId,
      sessionData.transferContextId,
    );
  }

  if (response.wrapAssertionClaim == undefined) {
    throw new WrapAssertionClaimError(tag);
  }

  if (response.recipientTokenId == "") {
    throw new TokenIdMissingError(tag);
  }

  if (response.messageType != MessageType.PRE_SATP_TRANSFER_RESPONSE) {
    throw new MessageTypeError(
      tag,
      response.messageType.toString(),
      MessageType.PRE_SATP_TRANSFER_RESPONSE.toString(),
    );
  }

  hashPrevMessageVerifier(
    tag,
    response.hashPreviousMessage,
    sessionData,
    MessageType.PRE_SATP_TRANSFER_REQUEST,
  );

  signatureVerifier(tag, signer, response, sessionData);

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

  return sessionData;
}
