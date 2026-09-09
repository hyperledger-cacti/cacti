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
import { getHash } from "../../../utils/gateway-utils";
import { MessageType } from "../../../generated/proto/cacti/satp/v13/common/message_pb";
import type { LockAssertionResponse } from "../../../generated/proto/cacti/satp/v13/service/stage_2_pb";
import type {
  CommitFinalAssertionResponse,
  CommitPreparationResponse,
  TransferCompleteResponse,
} from "../../../generated/proto/cacti/satp/v13/service/stage_3_pb";
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
  AssignmentAssertionClaimError,
  MintAssertionClaimError,
} from "../../errors/satp-service-errors";
import { verifyMessage } from "./data-verifier";

/**
 * Full Stage 3 client verification of an incoming `LockAssertionResponse`.
 *
 * Delegates the common checks (session state, common body, signature) to
 * {@link verifyMessage}, then records the message on the session.
 *
 * @returns The resolved client session data.
 * @throws {SessionError} When the session is undefined
 */
export function verifyLockAssertionResponseMessage(
  tag: string,
  signer: JsObjectSigner,
  response: LockAssertionResponse,
  session: SATPSession | undefined,
): SessionData {
  const sessionData = verifyMessage(
    tag,
    signer,
    response,
    session,
    SessionType.CLIENT,
    MessageType.ASSERTION_RECEIPT,
    { checkHashPrevMessage: false },
  );

  saveHash(sessionData, MessageType.ASSERTION_RECEIPT, getHash(response));
  saveTimestamp(
    sessionData,
    MessageType.ASSERTION_RECEIPT,
    TimestampType.RECEIVED,
  );

  return sessionData;
}

/**
 * Full Stage 3 client verification of an incoming `CommitPreparationResponse`.
 *
 * Delegates the common checks to {@link verifyMessage}, then validates the
 * required mint-assertion claim (loading the optional claim format) before
 * recording the message on the session.
 *
 * @returns The resolved client session data.
 * @throws {SessionError} When the session is undefined
 * @throws {MintAssertionClaimError} When the mint-assertion claim is missing
 */
export function verifyCommitPreparationResponseMessage(
  tag: string,
  signer: JsObjectSigner,
  response: CommitPreparationResponse,
  session: SATPSession | undefined,
  logger: Logger,
): SessionData {
  const sessionData = verifyMessage(
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
    sessionData.mintAssertionClaimFormat = response.mintAssertionClaimFormat;
  }

  if (response.mintAssertionClaim == undefined) {
    throw new MintAssertionClaimError(tag);
  }
  sessionData.mintAssertionClaim = response.mintAssertionClaim;

  saveHash(sessionData, MessageType.COMMIT_READY, getHash(response));
  saveTimestamp(sessionData, MessageType.COMMIT_READY, TimestampType.RECEIVED);

  return sessionData;
}

/**
 * Full Stage 3 client verification of an incoming `CommitFinalAssertionResponse`.
 *
 * Delegates the common checks to {@link verifyMessage}, then validates the
 * required assignment-assertion claim (loading the optional claim format)
 * before recording the message on the session.
 *
 * @returns The resolved client session data.
 * @throws {SessionError} When the session is undefined
 * @throws {AssignmentAssertionClaimError} When the assignment-assertion claim is missing
 */
export function verifyCommitFinalAssertionResponseMessage(
  tag: string,
  signer: JsObjectSigner,
  response: CommitFinalAssertionResponse,
  session: SATPSession | undefined,
  logger: Logger,
): SessionData {
  const sessionData = verifyMessage(
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
  sessionData.assignmentAssertionClaim = response.assignmentAssertionClaim;

  if (response.assignmentAssertionClaimFormat != undefined) {
    logger.info(
      `${tag}, optional variable loaded: assignmentAssertionClaimFormat`,
    );
    sessionData.assignmentAssertionClaimFormat =
      response.assignmentAssertionClaimFormat;
  }

  saveHash(sessionData, MessageType.ACK_COMMIT_FINAL, getHash(response));
  saveTimestamp(
    sessionData,
    MessageType.ACK_COMMIT_FINAL,
    TimestampType.RECEIVED,
  );

  return sessionData;
}

/**
 * Full Stage 3 client verification of an incoming `TransferCompleteResponse`.
 *
 * Delegates the common checks to {@link verifyMessage}, marks the session as
 * completed, and records the message on the session.
 *
 * @returns The resolved client session data.
 * @throws {SessionError} When the session is undefined
 */
export function verifyTransferCompleteResponseMessage(
  tag: string,
  signer: JsObjectSigner,
  response: TransferCompleteResponse,
  session: SATPSession | undefined,
): SessionData {
  const sessionData = verifyMessage(
    tag,
    signer,
    response,
    session,
    SessionType.CLIENT,
    MessageType.COMMIT_TRANSFER_COMPLETE_RESPONSE,
    { checkHashPrevMessage: false },
  );

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

  return sessionData;
}
