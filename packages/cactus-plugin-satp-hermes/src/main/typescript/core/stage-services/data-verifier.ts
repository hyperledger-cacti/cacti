/**
 * @fileoverview
 * SATP Protocol Data Verification and Validation Utilities.
 *
 * @description
 * This module provides comprehensive data verification and validation functions
 * for SATP protocol messages and session data. It implements critical security
 * validations including signature verification, message integrity checks,
 * protocol compliance validation, and session state consistency verification
 * according to the IETF SATP Core v2 specification.
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
 * @since 2.0.0
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Specification
 * @see {@link CommonSatp} for common message structure
 * @see {@link SessionData} for session data structure
 *
 * @author SATP Hermes Development Team
 * @copyright 2024 Hyperledger Foundation
 * @license Apache-2.0
 */

import { JsObjectSigner } from "@hyperledger/cactus-common";
import { verifySignature } from "../../utils/gateway-utils";
import {
  CommonSatp,
  MessageType,
} from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { stringify as safeStableStringify } from "safe-stable-stringify";

import { SessionData } from "../../generated/proto/cacti/satp/v02/session/session_pb";
import { SATP_VERSION } from "../constants";
import {
  ClientGatewayPubkeyError,
  HashError,
  MessageTypeError,
  ResourceUrlError,
  SatpCommonBodyError,
  SATPVersionError,
  SequenceNumberError,
  ServerGatewayPubkeyError,
  SessionDataNotLoadedCorrectlyError,
  SignatureMissingError,
  SignatureVerificationError,
  TransferContextIdError,
} from "../errors/satp-service-errors";
import { getMessageHash, getPreviousMessageType } from "../session-utils";
import { getMessageTypeName } from "../satp-utils";

/**
 * Verifies the common body structure and protocol compliance of SATP messages.
 *
 * @description
 * Performs comprehensive validation of SATP message common fields to ensure
 * protocol compliance, security requirements, and session consistency according
 * to the IETF SATP Core v2 specification. This function is the cornerstone of
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
 * @since 2.0.0
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
    common.sessionId == "" ||
    common.sequenceNumber == undefined ||
    common.resourceUrl == "" ||
    common.clientGatewayPubkey == "" ||
    common.serverGatewayPubkey == "" ||
    (common.hashPreviousMessage == "" &&
      messageStage != MessageType.INIT_PROPOSAL)
  ) {
    console.error("errorcommon", safeStableStringify(common));
    throw new SatpCommonBodyError(tag, safeStableStringify(common));
  }

  if (common.version != SATP_VERSION) {
    throw new SATPVersionError(tag, common.version, SATP_VERSION);
  }

  if (common.serverGatewayPubkey != sessionData.serverGatewayPubkey) {
    throw new ServerGatewayPubkeyError(tag);
  }

  if (common.clientGatewayPubkey != sessionData.clientGatewayPubkey) {
    throw new ClientGatewayPubkeyError(tag);
  }

  if (common.sequenceNumber != sessionData.lastSequenceNumber + BigInt(1)) {
    throw new SequenceNumberError(
      tag,
      common.sequenceNumber,
      sessionData.lastSequenceNumber,
    );
  }

  if (common.transferContextId != sessionData.transferContextId) {
    throw new TransferContextIdError(
      tag,
      common.transferContextId,
      sessionData.transferContextId,
    );
  }

  if (common.resourceUrl != sessionData.resourceUrl) {
    throw new ResourceUrlError(tag);
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

  if (
    common.hashPreviousMessage !=
    getMessageHash(
      sessionData,
      getPreviousMessageType(sessionData, messageStage),
    )
  ) {
    throw new HashError(
      tag,
      common.hashPreviousMessage,
      getMessageHash(
        sessionData,
        getPreviousMessageType(sessionData, messageStage),
      ),
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
 * @since 2.0.0
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
  } else {
    throw new SignatureMissingError(tag);
  }
}
