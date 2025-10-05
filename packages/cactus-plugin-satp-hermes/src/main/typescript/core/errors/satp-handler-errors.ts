/**
 * @fileoverview
 * SATP protocol handler-specific error classes for request/response processing.
 *
 * @description
 * This module provides specialized error classes for SATP protocol message handlers,
 * focusing on errors that occur during the processing of incoming protocol messages,
 * session management, and request/response handling workflows. These errors are
 * specifically designed for the handler layer of the SATP implementation.
 *
 * **Handler Error Categories:**
 * - **Session Management Errors**: Session lookup, creation, and lifecycle issues
 * - **Message Processing Errors**: Request/response creation and processing failures
 * - **Gateway Network Errors**: Gateway identification and routing issues
 * - **Authentication Errors**: Public key and credential validation failures
 *
 * **SATP Protocol Integration:**
 * All handler errors map to specific SATP error types defined in the IETF SATP
 * Core v2 specification, ensuring protocol compliance and standardized error
 * communication between gateways.
 *
 * **Usage Context:**
 * These errors are primarily used within SATP message handlers, service layers,
 * and protocol processing components to indicate specific failure conditions
 * during cross-chain transfer protocol execution.
 *
 * @example
 * Handler error usage:
 * ```typescript
 * async function handleTransferInitRequest(request: TransferInitRequest) {
 *   const sessionId = request.sessionId;
 *   const session = await sessionManager.findById(sessionId);
 *
 *   if (!session) {
 *     throw new SessionNotFoundError(
 *       'TransferInitHandler#handleRequest',
 *       new Error('Database query returned null')
 *     );
 *   }
 *
 *   // Process request...
 * }
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Specification
 * @see {@link SATPInternalError} for base error functionality
 * @see {@link SATPErrorType} for protocol error type enumeration
 *
 * @author SATP Hermes Development Team
 * @copyright 2024 Hyperledger Foundation
 * @license Apache-2.0
 */

import { SATPInternalError } from "./satp-errors";
import { Error as SATPErrorType } from "../../generated/proto/cacti/satp/v02/common/message_pb";

/**
 * Error thrown when a SATP transfer session cannot be found during handler processing.
 *
 * @description
 * Indicates that a requested SATP transfer session does not exist in the session
 * registry or has been removed due to cleanup, expiration, or system errors.
 * This error is specific to handler-level session lookup operations.
 *
 * **Common Scenarios:**
 * - Session expired and was cleaned up by background processes
 * - Invalid session ID provided in protocol messages
 * - Database connectivity issues preventing session lookup
 * - Session corruption or data inconsistency
 * - Race conditions during concurrent session operations
 *
 * **SATP Error Type:** SESSION_NOT_FOUND - Protocol-compliant error classification
 * **HTTP Status:** 500 Internal Server Error - Handler processing failure
 *
 * @class SessionNotFoundError
 * @extends SATPInternalError
 *
 * @example
 * Session lookup in message handler:
 * ```typescript
 * async function processTransferRequest(message: TransferMessage) {
 *   const session = await sessionRegistry.get(message.sessionId);
 *   if (!session) {
 *     throw new SessionNotFoundError(
 *       'TransferHandler#processRequest',
 *       new Error(`Session ${message.sessionId} not in registry`)
 *     );
 *   }
 *   return session;
 * }
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link SATPInternalError} for base error functionality
 * @see {@link SATPErrorType.SESSION_NOT_FOUND} for protocol error type
 */
export class SessionNotFoundError extends SATPInternalError {
  /**
   * Creates a new session not found error for handler operations.
   *
   * @constructor
   * @param {string} tag - Context tag identifying the handler operation that failed
   * @param {string | Error | null | undefined} [cause] - Optional underlying cause or error
   */
  constructor(tag: string, cause?: string | Error | null | undefined) {
    super(`${tag}, session not found`, cause ?? null, 500);
    this.errorType = SATPErrorType.SESSION_NOT_FOUND;
  }
}

/**
 * Error thrown when a session ID is missing or invalid during handler processing.
 *
 * @description
 * Indicates that a SATP protocol message lacks a required session ID or contains
 * an invalid session identifier format, preventing proper message routing and
 * session association during handler processing.
 *
 * **Common Scenarios:**
 * - Missing session ID field in protocol messages
 * - Malformed or corrupted session ID values
 * - Session ID format validation failures
 * - Protocol message deserialization errors
 * - Client-side session management issues
 *
 * **SATP Error Type:** SESSION_ID_NOT_FOUND - Protocol-compliant error classification
 * **HTTP Status:** 500 Internal Server Error - Handler processing failure
 *
 * @class SessionIdNotFoundError
 * @extends SATPInternalError
 *
 * @example
 * Session ID validation in handler:
 * ```typescript
 * function validateSessionId(message: ProtocolMessage): string {
 *   if (!message.sessionId || message.sessionId.trim() === '') {
 *     throw new SessionIdNotFoundError(
 *       'MessageValidator#validateSessionId',
 *       new Error('Session ID field is empty or missing')
 *     );
 *   }
 *   return message.sessionId;
 * }
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link SATPInternalError} for base error functionality
 * @see {@link SATPErrorType.SESSION_ID_NOT_FOUND} for protocol error type
 */
export class SessionIdNotFoundError extends SATPInternalError {
  /**
   * Creates a new session ID not found error for handler operations.
   *
   * @constructor
   * @param {string} tag - Context tag identifying the handler operation that failed
   * @param {string | Error | null | undefined} [cause] - Optional underlying cause or error
   */
  constructor(tag: string, cause?: string | Error | null | undefined) {
    super(`${tag}, session id not found`, cause ?? null, 500);
    this.errorType = SATPErrorType.SESSION_ID_NOT_FOUND;
  }
}

/**
 * Error thrown when message creation fails during SATP handler processing.
 *
 * @description
 * Indicates a failure in creating SATP protocol messages within handler components,
 * including response message generation, protocol message formatting, and message
 * serialization operations. This error is specific to the message creation phase
 * of handler processing workflows.
 *
 * **Common Creation Failures:**
 * - Protocol message serialization errors
 * - Required field validation failures
 * - Message signing or cryptographic operations failures
 * - Memory allocation issues during message construction
 * - Template or schema validation errors
 *
 * **Impact on Handler Operations:**
 * - Prevents proper response message generation
 * - Blocks protocol message flow continuation
 * - May cause request timeouts or protocol violations
 * - Affects cross-gateway communication reliability
 *
 * **HTTP Status:** 500 Internal Server Error - Handler message creation failure
 *
 * @class FailedToCreateMessageError
 * @extends SATPInternalError
 *
 * @example
 * Message creation error handling:
 * ```typescript
 * async function createTransferResponse(request: TransferRequest) {
 *   try {
 *     const response = await messageBuilder.createResponse(request);
 *     return response;
 *   } catch (error) {
 *     throw new FailedToCreateMessageError(
 *       'TransferHandler#createResponse',
 *       'Response message serialization failed',
 *       error
 *     );
 *   }
 * }
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link SATPInternalError} for base error functionality
 */
export class FailedToCreateMessageError extends SATPInternalError {
  /**
   * Creates a new message creation error for handler operations.
   *
   * @constructor
   * @param {string} tag - Context tag identifying the handler operation that failed
   * @param {string} message - Specific details about the message creation failure
   * @param {string | Error | null | undefined} [cause] - Optional underlying cause or error
   */
  constructor(
    tag: string,
    message: string,
    cause?: string | Error | null | undefined,
  ) {
    super(
      `${tag}, failed to create message: ${message} \n stack: ${cause}`,
      cause ?? null,
      500,
    );
  }
}

/**
 * Error thrown when message processing fails during SATP handler execution.
 *
 * @description
 * Indicates a failure in processing incoming SATP protocol messages within handler
 * components, including message validation, business logic execution, and state
 * updates. This error encompasses general processing failures that occur during
 * the main handler execution workflow.
 *
 * **Common Processing Failures:**
 * - Message validation or schema compliance errors
 * - Business logic execution exceptions
 * - Database transaction failures during processing
 * - External service integration failures
 * - State machine transition errors
 *
 * **Impact on Handler Operations:**
 * - Prevents successful message processing completion
 * - May trigger error recovery or rollback procedures
 * - Affects protocol state consistency
 * - Can cause transfer session failures
 *
 * **HTTP Status:** 500 Internal Server Error - Handler processing failure
 *
 * @class FailedToProcessError
 * @extends SATPInternalError
 *
 * @example
 * Message processing error handling:
 * ```typescript
 * async function processIncomingMessage(message: ProtocolMessage) {
 *   try {
 *     await validateMessage(message);
 *     await executeBusinessLogic(message);
 *     await updateSessionState(message);
 *   } catch (error) {
 *     throw new FailedToProcessError(
 *       'MessageHandler#processMessage',
 *       'Business logic execution failed',
 *       error
 *     );
 *   }
 * }
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link SATPInternalError} for base error functionality
 */
export class FailedToProcessError extends SATPInternalError {
  /**
   * Creates a new message processing error for handler operations.
   *
   * @constructor
   * @param {string} tag - Context tag identifying the handler operation that failed
   * @param {string} message - Specific details about the processing failure
   * @param {string | Error | null | undefined} [cause] - Optional underlying cause or error
   */
  constructor(
    tag: string,
    message: string,
    cause?: string | Error | null | undefined,
  ) {
    super(
      `${tag}, failed to process: ${message} \n stack: ${cause}`,
      cause ?? null,
      500,
    );
  }
}

/**
 * Error thrown when the sender gateway network ID is missing or invalid.
 *
 * @description
 * Indicates that a SATP protocol message lacks a required sender gateway network
 * identifier or contains an empty/invalid value, preventing proper message routing
 * and gateway identification during handler processing.
 *
 * **Common Scenarios:**
 * - Missing senderGatewayNetworkId field in protocol messages
 * - Empty or whitespace-only gateway network ID values
 * - Invalid gateway network ID format or structure
 * - Message corruption during network transmission
 * - Client configuration errors with incorrect gateway IDs
 *
 * **SATP Error Type:** SENDER_GATEWAY_NETWORK_ID_NOT_FOUND - Protocol-compliant error
 * **HTTP Status:** 500 Internal Server Error - Handler validation failure
 *
 * @class SenderGatewayNetworkIdError
 * @extends SATPInternalError
 *
 * @example
 * Gateway network ID validation:
 * ```typescript
 * function validateSenderGateway(message: ProtocolMessage) {
 *   if (!message.senderGatewayNetworkId ||
 *       message.senderGatewayNetworkId.trim() === '') {
 *     throw new SenderGatewayNetworkIdError(
 *       'MessageValidator#validateSenderGateway',
 *       new Error('Empty sender gateway network ID')
 *     );
 *   }
 *   return message.senderGatewayNetworkId;
 * }
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link SATPInternalError} for base error functionality
 * @see {@link SATPErrorType.SENDER_GATEWAY_NETWORK_ID_NOT_FOUND} for protocol error type
 */
export class SenderGatewayNetworkIdError extends SATPInternalError {
  /**
   * Creates a new sender gateway network ID error for handler operations.
   *
   * @constructor
   * @param {string} tag - Context tag identifying the handler operation that failed
   * @param {string | Error | null | undefined} [cause] - Optional underlying cause or error
   */
  constructor(tag: string, cause?: string | Error | null | undefined) {
    super(`${tag}, senderGatewayNetworkId is empty`, cause ?? null, 500);
    this.errorType = SATPErrorType.SENDER_GATEWAY_NETWORK_ID_NOT_FOUND;
  }
}

/**
 * Error thrown when a required public key is missing or invalid during handler processing.
 *
 * @description
 * Indicates that a SATP protocol message lacks a required public key for
 * cryptographic operations, signature verification, or identity validation
 * during handler processing workflows.
 *
 * **Common Scenarios:**
 * - Missing public key fields in authentication messages
 * - Corrupted or invalid public key formats
 * - Public key retrieval failures from key management systems
 * - Certificate or key store access issues
 * - Key rotation or expiration problems
 *
 * **Impact on Handler Operations:**
 * - Prevents message signature verification
 * - Blocks cryptographic authentication operations
 * - Causes security validation failures
 * - May trigger protocol security violations
 *
 * **SATP Error Type:** PUBLIC_KEY_NOT_FOUND - Protocol-compliant error classification
 * **HTTP Status:** 500 Internal Server Error - Handler security validation failure
 *
 * @class PubKeyError
 * @extends SATPInternalError
 *
 * @example
 * Public key validation in authentication:
 * ```typescript
 * async function validateMessageSignature(message: SignedMessage) {
 *   const publicKey = await keyManager.getPublicKey(message.senderId);
 *   if (!publicKey) {
 *     throw new PubKeyError(
 *       'AuthHandler#validateSignature',
 *       new Error(`Public key not found for sender: ${message.senderId}`)
 *     );
 *   }
 *   return verifySignature(message, publicKey);
 * }
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link SATPInternalError} for base error functionality
 * @see {@link SATPErrorType.PUBLIC_KEY_NOT_FOUND} for protocol error type
 */
export class PubKeyError extends SATPInternalError {
  /**
   * Creates a new public key error for handler operations.
   *
   * @constructor
   * @param {string} tag - Context tag identifying the handler operation that failed
   * @param {string | Error | null | undefined} [cause] - Optional underlying cause or error
   */
  constructor(tag: string, cause?: string | Error | null | undefined) {
    super(`${tag}, pubKey not found`, cause ?? null, 500);
    this.errorType = SATPErrorType.PUBLIC_KEY_NOT_FOUND;
  }
}
