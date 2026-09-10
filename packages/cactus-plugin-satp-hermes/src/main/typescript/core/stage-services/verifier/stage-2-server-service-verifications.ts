/**
 * @fileoverview
 * Stage 2 server-side verification helpers for the SATP protocol.
 *
 * @description
 * These functions layer the Stage 2 server-specific validation on top of the
 * stage-agnostic {@link verifyMessage} entry point. Keeping the bespoke checks
 * here (lock-assertion claim, claim format, and expiration bounds) keeps the
 * Stage 2 server service step implementations thin.
 *
 * @since 3.1.0
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-13.txt} SATP Core Specification
 */

import type { JsObjectSigner } from "@hyperledger-cacti/cactus-common";
import { MessageType } from "../../../generated/proto/cacti/satp/v13/common/message_pb";
import type { LockAssertionRequest } from "../../../generated/proto/cacti/satp/v13/service/stage_2_pb";
import type { SATPSession } from "../../satp-session";
import { SessionType } from "../../session-utils";
import {
  LockAssertionClaimError,
  LockAssertionClaimFormatError,
  LockAssertionExpirationError,
} from "../../errors/satp-service-errors";
import { claimSignatureVerifier, verifyMessage } from "./data-verifier";

/**
 * Full Stage 2 server verification of an incoming `LockAssertionRequest`.
 *
 * Delegates the common checks (session state, common body, signature) to
 * {@link verifyMessage}, then validates the lock-assertion claim, its format,
 * and the expiration bounds.
 *
 * @throws {SessionError} When the session is undefined
 * @throws {LockAssertionClaimError} When the lock-assertion claim is missing
 * @throws {LockAssertionClaimFormatError} When the claim format is missing
 * @throws {LockAssertionExpirationError} When the expiration is expired or too far out
 */
export function verifyLockAssertionRequestMessage(
  tag: string,
  signer: JsObjectSigner,
  request: LockAssertionRequest,
  session: SATPSession | undefined,
): void {
  const sessionData = verifyMessage(
    tag,
    signer,
    request,
    session,
    SessionType.SERVER,
    MessageType.LOCK_ASSERT,
    { checkHashPrevMessage: false },
  );

  if (request.lockAssertionClaim == undefined) {
    throw new LockAssertionClaimError(tag);
  }

  if (request.lockAssertionClaimFormat == undefined) {
    throw new LockAssertionClaimFormatError(tag);
  }

  // Durable proof of the client gateway's lock assertion over the receipt,
  // independent of the message envelope's JWS. Issued by the client.
  claimSignatureVerifier(
    tag,
    signer,
    request.lockAssertionClaim,
    sessionData.clientGatewayPubkey,
  );

  const currentTime = BigInt(Date.now());
  const maximumExpiration = currentTime + sessionData.lockExpirationTime;

  if (request.lockAssertionExpiration <= currentTime) {
    throw new LockAssertionExpirationError(
      tag,
      "lock assertion already expired",
    );
  }

  if (request.lockAssertionExpiration > maximumExpiration) {
    throw new LockAssertionExpirationError(
      tag,
      "lock assertion exceeds the negotiated expiration time",
    );
  }
}
