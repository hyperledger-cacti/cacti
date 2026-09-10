/**
 * @fileoverview
 * Stage 3 client-side verification helpers for the SATP protocol.
 *
 * @description
 * These functions layer the Stage 3 client-specific validation on top of the
 * stage-agnostic {@link verifyMessage} entry point. Keeping the bespoke checks
 * here (mint- and assignment-assertion claims and transfer completion) keeps
 * the Stage 3 client service step implementations thin.
 *
 * @since 3.1.0
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-13.txt} SATP Core Specification
 */

import type { JsObjectSigner } from "@hyperledger-cacti/cactus-common";
import { MessageType } from "../../../generated/proto/cacti/satp/v13/common/message_pb";
import type { LockAssertionResponse } from "../../../generated/proto/cacti/satp/v13/service/stage_2_pb";
import type {
  CommitFinalAssertionResponse,
  CommitPreparationResponse,
  TransferCompleteResponse,
} from "../../../generated/proto/cacti/satp/v13/service/stage_3_pb";
import type { SATPSession } from "../../satp-session";
import type { SATPLogger as Logger } from "../../satp-logger";
import { SessionType } from "../../session-utils";
import {
  AssignmentAssertionClaimError,
  MintAssertionClaimError,
} from "../../errors/satp-service-errors";
import { claimSignatureVerifier, verifyMessage } from "./data-verifier";

/**
 * Full Stage 3 client verification of an incoming `LockAssertionResponse`.
 *
 * Delegates the common checks (session state, common body, signature) to
 * {@link verifyMessage}.
 *
 * @throws {SessionError} When the session is undefined
 */
export function verifyLockAssertionResponseMessage(
  tag: string,
  signer: JsObjectSigner,
  response: LockAssertionResponse,
  session: SATPSession | undefined,
): void {
  verifyMessage(
    tag,
    signer,
    response,
    session,
    SessionType.CLIENT,
    MessageType.ASSERTION_RECEIPT,
    { checkHashPrevMessage: false },
  );
}

/**
 * Full Stage 3 client verification of an incoming `CommitPreparationResponse`.
 *
 * Delegates the common checks to {@link verifyMessage}, then validates the
 * required mint-assertion claim.
 *
 * @throws {SessionError} When the session is undefined
 * @throws {MintAssertionClaimError} When the mint-assertion claim is missing
 */
export function verifyCommitPreparationResponseMessage(
  tag: string,
  signer: JsObjectSigner,
  response: CommitPreparationResponse,
  session: SATPSession | undefined,
  logger: Logger,
): void {
  verifyMessage(
    tag,
    signer,
    response,
    session,
    SessionType.CLIENT,
    MessageType.COMMIT_READY,
    { checkHashPrevMessage: false },
  );

  if (response.mintAssertionClaimFormat != undefined) {
    logger.info(`${tag}, optional variable loaded: mintAssertionClaimFormat`);
  }

  if (response.mintAssertionClaim == undefined) {
    throw new MintAssertionClaimError(tag);
  }

  // Durable proof of the server gateway's mint assertion over the receipt,
  // independent of the message envelope's JWS. Issued by the server.
  claimSignatureVerifier(
    tag,
    signer,
    response.mintAssertionClaim,
    session!.getClientSessionData().serverGatewayPubkey,
  );
}

/**
 * Full Stage 3 client verification of an incoming `CommitFinalAssertionResponse`.
 *
 * Delegates the common checks to {@link verifyMessage}, then validates the
 * required assignment-assertion claim.
 *
 * @throws {SessionError} When the session is undefined
 * @throws {AssignmentAssertionClaimError} When the assignment-assertion claim is missing
 */
export function verifyCommitFinalAssertionResponseMessage(
  tag: string,
  signer: JsObjectSigner,
  response: CommitFinalAssertionResponse,
  session: SATPSession | undefined,
  logger: Logger,
): void {
  verifyMessage(
    tag,
    signer,
    response,
    session,
    SessionType.CLIENT,
    MessageType.ACK_COMMIT_FINAL,
    { checkHashPrevMessage: false },
  );

  if (response.assignmentAssertionClaim == undefined) {
    throw new AssignmentAssertionClaimError(tag);
  }

  // Durable proof of the server gateway's assignment assertion over the
  // receipt, independent of the message envelope's JWS. Issued by the server.
  claimSignatureVerifier(
    tag,
    signer,
    response.assignmentAssertionClaim,
    session!.getClientSessionData().serverGatewayPubkey,
  );

  if (response.assignmentAssertionClaimFormat != undefined) {
    logger.info(
      `${tag}, optional variable loaded: assignmentAssertionClaimFormat`,
    );
  }
}

/**
 * Full Stage 3 client verification of an incoming `TransferCompleteResponse`.
 *
 * Delegates the common checks to {@link verifyMessage}.
 *
 * @throws {SessionError} When the session is undefined
 */
export function verifyTransferCompleteResponseMessage(
  tag: string,
  signer: JsObjectSigner,
  response: TransferCompleteResponse,
  session: SATPSession | undefined,
): void {
  verifyMessage(
    tag,
    signer,
    response,
    session,
    SessionType.CLIENT,
    MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
    { checkHashPrevMessage: false },
  );
}
