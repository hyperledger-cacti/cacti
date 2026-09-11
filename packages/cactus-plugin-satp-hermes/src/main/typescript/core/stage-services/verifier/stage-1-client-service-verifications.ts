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
import { MessageType } from "../../../generated/proto/cacti/satp/v13/common/message_pb";
import type { TransferProposalResponse } from "../../../generated/proto/cacti/satp/v13/service/stage_1_pb";
import type { PreSATPTransferResponse } from "../../../generated/proto/cacti/satp/v13/service/stage_0_pb";
import { type SessionData } from "../../../generated/proto/cacti/satp/v13/session/session_pb";
import type { SATPSession } from "../../satp-session";
import type { SATPLogger as Logger } from "../../satp-logger";
import type { NetworkId } from "../../../public-api";
import { SessionType } from "../../session-utils";
import {
  MessageTypeError,
  SessionError,
  TokenIdMissingError,
  TransferContextIdError,
  WrapAssertionClaimError,
} from "../../errors/satp-service-errors";
import {
  hashPrevMessageVerifier,
  claimSignatureVerifier,
  signatureVerifier,
  verifyMessage,
} from "./data-verifier";

export function verifyTransferProposalRequest(
  tag: string,
  sessionData: SessionData,
  connectedDLTs: NetworkId[],
): void {
  if (sessionData.senderAsset == undefined) {
    throw new Error(`${tag}, receiverAsset is missing`);
  }

  if (sessionData.senderAsset.networkId == undefined) {
    throw new Error(`${tag}, senderAsset.networkId is missing`);
  }

  if (
    !connectedDLTs.some(
      (connectedDLT) =>
        connectedDLT.id === sessionData.senderAsset!.networkId!.id,
    )
  ) {
    throw new Error(
      `${tag}, sender gateway dlt system: ${sessionData.senderAsset.networkId.id} is not supported by this gateway`,
    );
  }
}

export function verifyTransferCommenceRequest(
  tag: string,
  session: SATPSession | undefined,
): void {
  if (session == undefined) {
    throw new SessionError(tag);
  }

  session.verify(tag, SessionType.CLIENT);
}

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
  verifyMessage(
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

  if (response.common!.messageType == MessageType.INIT_REJECT) {
    logger.info(
      `${tag}, TransferProposalReceipt proposedTransferClaims were rejected`,
    );
    return false;
  }

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
): void {
  if (session == undefined) {
    throw new SessionError(tag);
  }

  if (response.recipientGatewayNetworkId == "") {
    throw new Error(`${tag}, recipientGatewayNetworkId is missing`);
  }

  const sessionData = session.getClientSessionData();

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

  // The wrap assertion claim rides a Stage 0 message, so it has no JWS
  // envelope fallback, because Stage 0 is still not wired
  // Its own signature over the receipt is the only
  // proof of the server gateway's wrap assertion. Issued by the server.
  claimSignatureVerifier(
    tag,
    signer,
    response.wrapAssertionClaim,
    sessionData.serverGatewayPubkey,
  );

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
}
