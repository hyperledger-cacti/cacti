/**
 * @fileoverview
 * Stage 3 server-side verification helpers for the SATP protocol.
 *
 * @description
 * These functions layer the Stage 3 server-specific validation on top of the
 * stage-agnostic {@link verifyMessage} entry point. Keeping the bespoke checks
 * here (burn-assertion claim and transfer completion) keeps the Stage 3 server
 * service step implementations thin.
 *
 * @since 3.1.0
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-13.txt} SATP Core Specification
 */

import type { JsObjectSigner } from "@hyperledger-cacti/cactus-common";
import { MessageType } from "../../../generated/proto/cacti/satp/v13/common/message_pb";
import type {
  CommitFinalAssertionRequest,
  CommitPreparationRequest,
  TransferCompleteRequest,
} from "../../../generated/proto/cacti/satp/v13/service/stage_3_pb";
import type { SATPSession } from "../../satp-session";
import type { SATPLogger as Logger } from "../../satp-logger";
import { SessionType } from "../../session-utils";
import { BurnAssertionClaimError } from "../../errors/satp-service-errors";
import { verifyMessage } from "./data-verifier";

/**
 * Full Stage 3 server verification of an incoming `CommitPreparationRequest`.
 *
 * Delegates the common checks (session state, common body, signature) to
 * {@link verifyMessage}.
 *
 * @throws {SessionError} When the session is undefined
 */
export function verifyCommitPreparationRequestMessage(
  tag: string,
  signer: JsObjectSigner,
  request: CommitPreparationRequest,
  session: SATPSession | undefined,
): void {
  verifyMessage(
    tag,
    signer,
    request,
    session,
    SessionType.SERVER,
    MessageType.COMMIT_PREPARE,
    { checkHashPrevMessage: false },
  );
}

/**
 * Full Stage 3 server verification of an incoming `CommitFinalAssertionRequest`.
 *
 * Delegates the common checks to {@link verifyMessage}, then validates the
 * required burn-assertion claim.
 *
 * @throws {SessionError} When the session is undefined
 * @throws {BurnAssertionClaimError} When the burn-assertion claim is missing
 */
export function verifyCommitFinalAssertionRequestMessage(
  tag: string,
  signer: JsObjectSigner,
  request: CommitFinalAssertionRequest,
  session: SATPSession | undefined,
  logger: Logger,
): void {
  verifyMessage(
    tag,
    signer,
    request,
    session,
    SessionType.SERVER,
    MessageType.COMMIT_FINAL,
    { checkHashPrevMessage: false },
  );

  if (request.burnAssertionClaim == undefined) {
    throw new BurnAssertionClaimError(tag);
  }

  if (request.burnAssertionClaimFormat != undefined) {
    logger.info(`${tag}, optional variable loaded: burnAssertionClaimFormat`);
  }
}

/**
 * Full Stage 3 server verification of an incoming `TransferCompleteRequest`.
 *
 * Delegates the common checks to {@link verifyMessage}.
 *
 * @throws {SessionError} When the session is undefined
 */
export function verifyTransferCompleteRequestMessage(
  tag: string,
  signer: JsObjectSigner,
  request: TransferCompleteRequest,
  session: SATPSession | undefined,
): void {
  verifyMessage(
    tag,
    signer,
    request,
    session,
    SessionType.SERVER,
    MessageType.COMMIT_TRANSFER_COMPLETE,
    { checkHashPrevMessage: false },
  );
}
