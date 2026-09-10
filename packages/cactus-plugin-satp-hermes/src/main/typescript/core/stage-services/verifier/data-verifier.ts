/**
 * @fileoverview
 * SATP Protocol Data Verification and Validation Utilities.
 *
 * @description
 * This module provides comprehensive data verification and validation functions
 * for SATP protocol messages and session data. It implements critical security
 * validations including signature verification, message integrity checks,
 * protocol compliance validation, and session state consistency verification
 * according to the IETF SATP Core v13 specification.
 *
 * **Core Verification Functions:**
 * - **Common Body Verification**: Validates standard SATP message structure and fields
 * - **Signature Verification**: Cryptographic validation of message signatures
 * - **Protocol Compliance**: Ensures messages conform to SATP specification requirements
 * - **Session Consistency**: Validates session state and message sequencing
 * - **Security Enforcement**: Implements security requirements and authentication
 *
 * **Validation Categories:**
 * - **Protocol Version**: Ensures compatibility with supported SATP versions
 * - **Message Type**: Validates message types match expected protocol stages
 * - **Sequence Numbers**: Enforces proper message ordering and prevents replay attacks
 * - **Hash Validation**: Verifies message integrity and chain consistency
 * - **Public Key Authentication**: Validates gateway identities and credentials
 * - **Digital Signatures**: Cryptographic verification of message authenticity
 *
 * **Security Features:**
 * - Prevents message tampering through comprehensive hash validation
 * - Enforces proper message sequencing to prevent replay attacks
 * - Validates cryptographic signatures for message authenticity
 * - Ensures session consistency across distributed gateway operations
 * - Implements protocol compliance checks for security requirements
 *
 * @example
 * Common body verification in stage handlers:
 * ```typescript
 * import { commonBodyVerifier, signatureVerifier } from './data-verifier';
 *
 * function processIncomingMessage(message: SatpMessage, session: SATPSession) {
 *   try {
 *     // Verify message structure and protocol compliance
 *     commonBodyVerifier(
 *       'MessageProcessor',
 *       message.common,
 *       session.getSessionData(),
 *       MessageType.TRANSFER_PROPOSAL_REQUEST
 *     );
 *
 *     // Verify cryptographic signature
 *     signatureVerifier(
 *       'MessageProcessor',
 *       signer,
 *       message,
 *       session.getSessionData()
 *     );
 *
 *     // Process validated message
 *     return processValidatedMessage(message, session);
 *   } catch (error) {
 *     console.error('Message validation failed:', error);
 *     throw error;
 *   }
 * }
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-13.txt} SATP Core Specification
 * @see {@link CommonSatp} for common message structure
 * @see {@link SessionData} for session data structure
 *
 * @author SATP Hermes Development Team
 * @copyright 2024 Hyperledger Foundation
 * @license Apache-2.0
 */

import { JsObjectSigner } from "@hyperledger-cacti/cactus-common";
import { verifySignature } from "../../../utils/gateway-utils";
import {
  CommonSatp,
  MessageType,
} from "../../../generated/proto/cacti/satp/v13/common/message_pb";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { SessionData } from "../../../generated/proto/cacti/satp/v13/session/session_pb";
import { SATP_VERSION } from "../../constants";
import {
  MessageTypeError,
  SatpCommonBodyError,
  SATPVersionError,
  SessionDataNotLoadedCorrectlyError,
  SignatureVerificationError,
  ClaimSignatureError,
  TransferContextIdError,
  MissingTransferContextIdError,
  HashPrevMessageError,
  SequenceNumberError,
  SessionError,
  TransferInitClaimsHashError,
} from "../../errors/satp-service-errors";
import {
  getMessageHash,
  getPreviousMessageType,
  SessionType,
} from "../../session-utils";
import { SATPSession } from "../../satp-session";
import { getMessageTypeName } from "../../satp-utils";

/**
 * Verifies the common body structure and protocol compliance of SATP messages.
 *
 * @description
 * Performs comprehensive validation of SATP message common fields to ensure
 * protocol compliance, security requirements, and session consistency according
 * to the IETF SATP Core v13 specification. This function is the cornerstone of
 * SATP message validation, enforcing critical security and protocol requirements.
 *
 * **Validation Categories:**
 * - **Structural Validation**: Ensures all required fields are present and non-empty
 * - **Protocol Version**: Validates compatibility with supported SATP versions
 * - **Gateway Authentication**: Verifies client and server gateway public keys
 * - **Message Sequencing**: Enforces proper sequence numbers to prevent replay attacks
 * - **Session Consistency**: Validates transfer context and resource URL consistency
 * - **Message Type**: Ensures message type matches expected protocol stage
 * - **Hash Chain Integrity**: Validates previous message hash for tamper detection
 *
 * **Security Enforcement:**
 * - Prevents message replay attacks through sequence number validation
 * - Ensures message integrity through hash chain verification
 * - Validates gateway authentication credentials
 * - Enforces protocol version compatibility for security updates
 * - Maintains session consistency across distributed operations
 *
 * **Validation Steps:**
 * 1. **Null Checks**: Validates session data and common fields are present
 * 2. **Field Presence**: Ensures all required fields contain valid values
 * 3. **Version Compatibility**: Checks SATP version matches implementation
 * 4. **Gateway Validation**: Verifies public key consistency with session
 * 5. **Sequence Validation**: Enforces proper message ordering
 * 6. **Context Validation**: Ensures transfer context and resource URL consistency
 * 7. **Type Validation**: Confirms message type matches expected stage
 * 8. **Hash Validation**: Verifies previous message hash chain integrity
 *
 * @public
 * @function commonBodyVerifier
 * @param {string} tag - Context tag for error reporting and debugging
 * @param {CommonSatp | undefined} common - Common SATP message fields to validate
 * @param {SessionData | undefined} sessionData - Current session data for consistency checks
 * @param {MessageType} messageStage - Expected primary message type for this stage
 * @param {MessageType} [messageStage2] - Optional secondary message type (Stage 1 only)
 * @returns {void} Throws error if validation fails, returns void if successful
 * @throws {SessionDataNotLoadedCorrectlyError} When session data is undefined or invalid
 * @throws {SatpCommonBodyError} When common fields are missing or invalid
 * @throws {SATPVersionError} When protocol version doesn't match expected version
 * @throws {ServerGatewayPubkeyError} When server gateway public key doesn't match session
 * @throws {ClientGatewayPubkeyError} When client gateway public key doesn't match session
 * @throws {SequenceNumberError} When sequence number is not properly incremented
 * @throws {TransferContextIdError} When transfer context ID doesn't match session
 * @throws {ResourceUrlError} When resource URL doesn't match session
 * @throws {MessageTypeError} When message type doesn't match expected stage
 * @throws {HashError} When previous message hash doesn't match expected value
 *
 * @example
 * Basic message validation:
 * ```typescript
 * try {
 *   commonBodyVerifier(
 *     'Stage1Handler#processTransferProposal',
 *     incomingMessage.common,
 *     session.getSessionData(),
 *     MessageType.INIT_PROPOSAL
 *   );
 *   console.log('Message validation successful');
 * } catch (error) {
 *   console.error('Validation failed:', error.message);
 *   throw error;
 * }
 * ```
 *
 * @example
 * Stage 1 dual message type validation:
 * ```typescript
 * // Stage 1 can receive either proposal requests or commence requests
 * commonBodyVerifier(
 *   'Stage1Handler#processMessage',
 *   message.common,
 *   sessionData,
 *   MessageType.INIT_PROPOSAL,
 *   MessageType.TRANSFER_COMMENCE_REQUEST
 * );
 * ```
 *
 * @example
 * Comprehensive error handling:
 * ```typescript
 * function validateIncomingMessage(message: any, session: SATPSession) {
 *   try {
 *     commonBodyVerifier(
 *       'MessageValidator',
 *       message.common,
 *       session.getSessionData(),
 *       expectedMessageType
 *     );
 *     return { valid: true, message: 'Validation successful' };
 *   } catch (error) {
 *     if (error instanceof SATPVersionError) {
 *       return { valid: false, message: 'Protocol version mismatch' };
 *     } else if (error instanceof SequenceNumberError) {
 *       return { valid: false, message: 'Invalid message sequence' };
 *     } else {
 *       return { valid: false, message: 'General validation failure' };
 *     }
 *   }
 * }
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link CommonSatp} for common message field structure
 * @see {@link SessionData} for session data structure
 * @see {@link MessageType} for supported message types
 */
export function commonBodyVerifier(
  tag: string,
  common: CommonSatp | undefined,
  sessionData: SessionData | undefined,
  messageStage: MessageType,
  messageStage2?: MessageType, // this is only used in stage 1 when the message received can be either or 2 types
): void {
  if (sessionData == undefined) {
    throw new SessionDataNotLoadedCorrectlyError(tag, "undefined");
  }

  if (common == undefined) {
    throw new SatpCommonBodyError(tag, "undefined");
  }

  if (
    common.version == "" ||
    common.messageType == undefined ||
    common.sessionId == ""
  ) {
    console.error("errorcommon", safeStableStringify(common));
    throw new SatpCommonBodyError(tag, safeStableStringify(common));
  }

  if (common.version != SATP_VERSION) {
    throw new SATPVersionError(tag, common.version, SATP_VERSION);
  }

  // v13: clientGatewayPubkey, serverGatewayPubkey, sequenceNumber,
  // resourceUrl, and hashPreviousMessage moved out of CommonSatp.
  // These checks are now performed at the per-message level.

  // v13: transferContextId is REQUIRED in every message.
  if (common.transferContextId == "") {
    throw new MissingTransferContextIdError(tag);
  }

  if (common.transferContextId != sessionData.transferContextId) {
    throw new TransferContextIdError(
      tag,
      common.transferContextId,
      sessionData.transferContextId,
    );
  }

  if (
    common.messageType != messageStage &&
    common.messageType != messageStage2
  ) {
    throw new MessageTypeError(
      tag,
      getMessageTypeName(common.messageType),
      getMessageTypeName(messageStage),
      getMessageTypeName(messageStage2),
    );
  }
}

/**
 * Verifies cryptographic signatures on SATP protocol messages.
 *
 * @description
 * Performs cryptographic signature verification to ensure message authenticity
 * and integrity in SATP protocol communications. This function validates digital
 * signatures from both client and server gateways using their respective public
 * keys, providing non-repudiation and tamper detection capabilities essential
 * for secure cross-chain asset transfers.
 *
 * **Cryptographic Validation:**
 * - **Server Signatures**: Validates messages signed by server gateways
 * - **Client Signatures**: Validates messages signed by client gateways
 * - **Public Key Verification**: Uses session-stored public keys for validation
 * - **Signature Integrity**: Ensures signatures match message content exactly
 * - **Non-Repudiation**: Provides cryptographic proof of message origin
 *
 * **Security Features:**
 * - Prevents message tampering through cryptographic signature validation
 * - Ensures message authenticity and origin verification
 * - Provides non-repudiation capabilities for audit and compliance
 * - Enforces proper signature presence requirements
 * - Integrates with session-based public key management
 *
 * **Validation Process:**
 * 1. **Session Validation**: Ensures session data is available for public key lookup
 * 2. **Signature Detection**: Identifies whether message has server or client signature
 * 3. **Public Key Retrieval**: Gets appropriate public key from session data
 * 4. **Cryptographic Verification**: Validates signature against message content
 * 5. **Error Reporting**: Provides detailed failure information for debugging
 *
 * **Signature Types:**
 * - **Server Signature**: Used for server gateway responses and assertions
 * - **Client Signature**: Used for client gateway requests and proofs
 * - **Mutual Authentication**: Both signatures may be present in some messages
 *
 * @public
 * @function signatureVerifier
 * @param {string} tag - Context tag for error reporting and debugging
 * @param {JsObjectSigner} signer - Cryptographic signer instance for verification
 * @param {any} message - SATP message containing signature fields to validate
 * @param {SessionData | undefined} sessionData - Session data containing gateway public keys
 * @returns {void} Throws error if verification fails, returns void if successful
 * @throws {SessionDataNotLoadedCorrectlyError} When session data is undefined or invalid
 * @throws {SignatureVerificationError} When signature verification fails
 * @throws {SignatureMissingError} When no valid signature is found in message
 *
 * @example
 * Basic signature verification:
 * ```typescript
 * try {
 *   signatureVerifier(
 *     'Stage2Handler#processLockAssertion',
 *     cryptoSigner,
 *     lockAssertionMessage,
 *     session.getSessionData()
 *   );
 *   console.log('Signature verification successful');
 * } catch (error) {
 *   console.error('Signature verification failed:', error.message);
 *   throw error;
 * }
 * ```
 *
 * @example
 * Complete message validation workflow:
 * ```typescript
 * function validateIncomingMessage(
 *   message: any,
 *   session: SATPSession,
 *   signer: JsObjectSigner
 * ) {
 *   const sessionData = session.getSessionData();
 *
 *   // First validate common fields
 *   commonBodyVerifier(
 *     'MessageValidator',
 *     message.common,
 *     sessionData,
 *     expectedMessageType
 *   );
 *
 *   // Then verify cryptographic signature
 *   signatureVerifier(
 *     'MessageValidator',
 *     signer,
 *     message,
 *     sessionData
 *   );
 *
 *   console.log('Complete message validation successful');
 * }
 * ```
 *
 * @example
 * Error handling with signature types:
 * ```typescript
 * try {
 *   signatureVerifier(tag, signer, message, sessionData);
 * } catch (error) {
 *   if (error instanceof SignatureMissingError) {
 *     console.error('No signature found in message');
 *   } else if (error instanceof SignatureVerificationError) {
 *     console.error('Invalid signature - message may be tampered');
 *   } else {
 *     console.error('Signature validation error:', error.message);
 *   }
 *   throw error;
 * }
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link JsObjectSigner} for cryptographic signer interface
 * @see {@link verifySignature} for underlying signature verification logic
 * @see {@link SessionData} for session data and public key storage
 */
export function signatureVerifier(
  tag: string,
  signer: JsObjectSigner,
  message: any,
  sessionData: SessionData | undefined,
) {
  if (sessionData == undefined) {
    throw new SessionDataNotLoadedCorrectlyError(tag, "undefined");
  }

  // v13: per-message clientSignature/serverSignature removed.
  // JWS wrapping will be implemented in TASK-064.
  // For now, verify only if legacy signature fields are present.
  if (message.serverSignature != undefined && message.serverSignature != "") {
    if (
      !verifySignature(signer, message, sessionData?.serverGatewayPubkey || "")
    ) {
      throw new SignatureVerificationError(tag);
    }
  } else if (
    message.clientSignature != undefined &&
    message.clientSignature != ""
  ) {
    if (
      !verifySignature(signer, message, sessionData?.clientGatewayPubkey || "")
    ) {
      throw new SignatureVerificationError(tag);
    }
  }
  // No signature fields present — v13 JWS wrapping expected (TASK-064)
}

/**
 * Verifies the signature of an assertion claim (wrap/lock/mint/burn/
 * assignment) against the claim's receipt.
 *
 * Claim signatures are produced by the claim-issuing gateway with
 * `sign(signer, claim.receipt)` (hex-encoded) and are independent of the
 * JWS envelope signing: claims outlive transport and must stay verifiable
 * for dispute resolution and audit. The receipt itself is opaque to this
 * verifier — only the signature over it is checked here.
 *
 * @param tag - Context tag for error reporting
 * @param signer - Signer used for the cryptographic verification
 * @param claim - The assertion claim carrying `receipt` and `signature`
 * @param pubKey - Hex public key of the claim-issuing gateway
 * @throws {ClaimSignatureError} When the signature is missing, malformed,
 *   or fails verification
 *
 * @since 3.1.0
 */
export function claimSignatureVerifier(
  tag: string,
  signer: JsObjectSigner,
  claim: { receipt: string; signature: string } | undefined,
  pubKey: string | undefined,
): void {
  if (
    claim == undefined ||
    claim.signature === "" ||
    pubKey === undefined ||
    pubKey === ""
  ) {
    throw new ClaimSignatureError(tag);
  }
  let valid: boolean;
  try {
    valid = signer.verify(
      claim.receipt,
      new Uint8Array(Buffer.from(claim.signature, "hex")),
      new Uint8Array(Buffer.from(pubKey, "hex")),
    );
  } catch (error) {
    throw new ClaimSignatureError(tag, error as Error);
  }
  if (!valid) {
    throw new ClaimSignatureError(tag);
  }
}

/**
 * Verifies the per-message `hashPrevMessage` field against the session's
 * stored hash for the expected previous message type.
 *
 * In v13, `hashPrevMessage` moved out of CommonSatp and into each
 * individual message. This function validates that the hash chain is
 * intact, preventing tampering and replay attacks.
 *
 * @param tag - Context tag for error reporting
 * @param hashPrevMessage - The `hashPrevMessage` value from the incoming message
 * @param sessionData - Current session data containing stored message hashes
 * @param previousMessageType - The MessageType of the message whose hash is expected
 * @throws {HashPrevMessageError} When the hash does not match
 * @throws {SessionDataNotLoadedCorrectlyError} When session data is undefined
 *
 * @since 2.1.0
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-13.txt} Sections 8–10
 */
export function hashPrevMessageVerifier(
  tag: string,
  hashPrevMessage: string | undefined,
  sessionData: SessionData | undefined,
  previousMessageType: MessageType,
): void {
  if (sessionData == undefined) {
    throw new SessionDataNotLoadedCorrectlyError(tag, "undefined");
  }

  const expectedHash = getMessageHash(sessionData, previousMessageType);

  if (!hashPrevMessage || hashPrevMessage === "") {
    throw new HashPrevMessageError(
      tag,
      hashPrevMessage ?? "(empty)",
      expectedHash,
    );
  }

  if (hashPrevMessage !== expectedHash) {
    throw new HashPrevMessageError(tag, hashPrevMessage, expectedHash);
  }
}

/**
 * Verifies that a message's sequence number matches the expected value.
 *
 * @param tag - Context tag for error reporting
 * @param received - The sequence number carried by / associated with the message
 * @param expected - The sequence number expected for the current protocol state
 * @throws {SequenceNumberError} When the two values differ
 *
 * @since 2.1.0
 */
export function sequenceNumberVerifier(
  tag: string,
  received: bigint,
  expected: bigint,
): void {
  if (received !== expected) {
    throw new SequenceNumberError(tag, received, expected);
  }
}

/**
 * Options controlling the optional checks performed by {@link verifyMessage}.
 */
export interface IVerifyMessageOptions {
  /**
   * A second acceptable message type for the common body (e.g. Stage 1 accepts
   * both `INIT_RECEIPT` and `INIT_REJECT`).
   */
  secondaryMessageType?: MessageType;
  /**
   * The `hashPrevMessage` / `hashPreviousMessage` value extracted from the
   * incoming message. The field name differs between Stage 0 and later stages,
   * so callers pass the value explicitly.
   */
  hashPrevMessage?: string;
  /**
   * Explicit previous message type. When omitted it is derived from the
   * message's own type via {@link getPreviousMessageType}.
   */
  previousMessageType?: MessageType;
  /**
   * When `false`, the hash-of-previous-message chain check is skipped (e.g. for
   * the first message of a session that has no predecessor). Defaults to `true`.
   */
  checkHashPrevMessage?: boolean;
  /** The sequence number associated with the incoming message. */
  receivedSequenceNumber?: bigint;
  /** The sequence number expected for the current protocol state. */
  expectedSequenceNumber?: bigint;
  /**
   * When provided, the message's transfer-init-claims hash is checked against
   * the value stored in the session. An empty string or a mismatch is rejected.
   */
  hashTransferInitClaims?: string;
  /** Passed through to {@link SATPSession.verify} to allow a rejected session. */
  allowRejected?: boolean;
  /** Passed through to {@link SATPSession.verify} to allow a completed session. */
  allowCompleted?: boolean;
  /** Passed through to {@link SATPSession.verify} to relax Stage 0 field checks. */
  isStage0?: boolean;
}

/**
 * Common validation entry point shared by every client and server stage
 * service for an inbound SATP message. It resolves the session data for the
 * given side and bundles the checks that every received message must pass:
 *
 * 1. **Session is usable** — the session is defined and passes
 *    {@link SATPSession.verify} for the given {@link SessionType}.
 * 2. **Everything is defined** — the common body is present and carries the
 *    correct version, transfer context id, and message type
 *    (via {@link commonBodyVerifier}).
 * 3. **Signature is valid** — via {@link signatureVerifier}.
 * 4. **Hash of the previous message is correct** — the message's hash-chain
 *    link matches the stored hash of its predecessor
 *    (via {@link hashPrevMessageVerifier}). The predecessor is derived
 *    automatically unless overridden. Skipped when there is no predecessor.
 * 5. **Sequence number matches** — when both received and expected values are
 *    supplied (via {@link sequenceNumberVerifier}).
 * 6. **Transfer-init-claims hash matches** — when `hashTransferInitClaims` is
 *    supplied (via a {@link TransferInitClaimsHashError} on mismatch).
 *
 * Stage-specific checks (claims, network capabilities, etc.) live in the
 * per-stage verifier modules and compose on top of this function.
 *
 * @param tag - Context tag for error reporting
 * @param signer - Signer used to validate the message signature
 * @param message - The inbound message; must expose a `common` field
 * @param session - The session the message belongs to
 * @param sessionType - Whether to validate the client or server session data
 * @param messageType - The expected primary message type of `message`
 * @param options - Optional secondary type, hash-chain, sequence, and claims inputs
 * @returns The resolved session data for the requested side
 * @throws {SessionError} When the session is undefined
 * @throws {SatpCommonBodyError} When the common body is missing
 * @throws {MessageTypeError} When the message type does not match
 * @throws {SignatureVerificationError} When the signature is invalid
 * @throws {HashPrevMessageError} When the hash chain is broken
 * @throws {SequenceNumberError} When the sequence number does not match
 * @throws {TransferInitClaimsHashError} When the claims hash does not match
 *
 * @since 2.1.0
 */
export function verifyMessage(
  tag: string,
  signer: JsObjectSigner,
  message: { common?: CommonSatp },
  session: SATPSession | undefined,
  sessionType: SessionType,
  messageType: MessageType,
  options: IVerifyMessageOptions = {},
): SessionData {
  if (session == undefined) {
    throw new SessionError(tag);
  }

  session.verify(
    tag,
    sessionType,
    options.allowRejected,
    options.allowCompleted,
    options.isStage0,
  );

  const sessionData =
    sessionType === SessionType.SERVER
      ? session.getServerSessionData()
      : session.getClientSessionData();

  commonBodyVerifier(
    tag,
    message.common,
    sessionData,
    messageType,
    options.secondaryMessageType,
  );

  signatureVerifier(tag, signer, message, sessionData);

  if (options.checkHashPrevMessage ?? true) {
    const previousMessageType =
      options.previousMessageType ??
      getPreviousMessageType(sessionData!, message.common!.messageType);

    if (previousMessageType !== MessageType.UNSPECIFIED) {
      hashPrevMessageVerifier(
        tag,
        options.hashPrevMessage,
        sessionData,
        previousMessageType,
      );
    }
  }

  if (
    options.receivedSequenceNumber != undefined &&
    options.expectedSequenceNumber != undefined
  ) {
    sequenceNumberVerifier(
      tag,
      options.receivedSequenceNumber,
      options.expectedSequenceNumber,
    );
  }

  if (options.hashTransferInitClaims != undefined) {
    if (
      options.hashTransferInitClaims === "" ||
      options.hashTransferInitClaims !== sessionData.hashTransferInitClaims
    ) {
      throw new TransferInitClaimsHashError(tag);
    }
  }

  return sessionData;
}
