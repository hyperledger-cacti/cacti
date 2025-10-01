/**
 * @fileoverview
 * SATP service layer error classes for protocol validation and business logic failures.
 *
 * @description
 * This module provides comprehensive error classes for SATP service layer operations,
 * focusing on protocol message validation, session management, parameter validation,
 * and business logic execution failures. These errors are specifically designed for
 * the service layer components that implement SATP protocol business logic.
 *
 * **Service Error Categories:**
 * - **Message Validation Errors**: Protocol message format and content validation
 * - **Session Management Errors**: Session lifecycle, state, and data management
 * - **Parameter Validation Errors**: Required field and parameter validation
 * - **Protocol Compliance Errors**: SATP specification adherence and version compatibility
 * - **Business Logic Errors**: Asset transfer and workflow execution failures
 * - **Security Validation Errors**: Cryptographic and authentication failures
 *
 * **SATP Protocol Integration:**
 * All service errors are mapped to specific SATP error types defined in the IETF SATP
 * Core v2 specification, ensuring protocol compliance and standardized error reporting
 * across different SATP implementations and gateway integrations.
 *
 * **Error Handling Strategy:**
 * Service errors include detailed context information, parameter validation details,
 * and protocol-specific error classifications to support comprehensive debugging,
 * automated error recovery, and client-side error handling.
 *
 * @example
 * Service layer error handling:
 * ```typescript
 * async function validateTransferRequest(request: TransferRequest) {
 *   if (!request.commonBody) {
 *     throw new SatpCommonBodyError(
 *       'TransferService#validateRequest',
 *       JSON.stringify(request),
 *       new Error('Missing common body structure')
 *     );
 *   }
 *
 *   if (!request.sessionId) {
 *     throw new SessionIdError(
 *       'TransferService#validateRequest',
 *       new Error('Session ID validation failed')
 *     );
 *   }
 * }
 * ```
 *
 * @since 2.0.0
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
 * Error thrown when SATP message common body is missing or malformed.
 *
 * @description
 * Indicates that a SATP protocol message lacks the required common body structure
 * or contains malformed common body data that fails validation against the SATP
 * specification. The common body contains essential protocol metadata required
 * for proper message processing and routing.
 *
 * **Common Body Requirements:**
 * - Session identification information
 * - Message sequence numbers
 * - Protocol version information
 * - Gateway identification data
 * - Timestamp and expiration information
 *
 * **Validation Failures:**
 * - Missing common body structure entirely
 * - Required fields missing within common body
 * - Invalid data types or formats in common body fields
 * - Protocol version mismatch or incompatibility
 * - Malformed JSON or serialization errors
 *
 * **SATP Error Type:** COMMON_BODY_BADLY_FORMATED - Protocol-compliant error classification
 * **HTTP Status:** 400 Bad Request - Client-side message format error
 *
 * @class SatpCommonBodyError
 * @extends SATPInternalError
 *
 * @example
 * Common body validation:
 * ```typescript
 * function validateCommonBody(message: ProtocolMessage) {
 *   if (!message.commonBody) {
 *     throw new SatpCommonBodyError(
 *       'MessageValidator#validateCommonBody',
 *       JSON.stringify(message),
 *       new Error('Common body structure missing')
 *     );
 *   }
 *
 *   const required = ['sessionId', 'sequenceNumber', 'protocolVersion'];
 *   for (const field of required) {
 *     if (!message.commonBody[field]) {
 *       throw new SatpCommonBodyError(
 *         'MessageValidator#validateCommonBody',
 *         JSON.stringify(message.commonBody),
 *         new Error(`Required field missing: ${field}`)
 *       );
 *     }
 *   }
 * }
 * ```
 *
 * @since 2.0.0
 * @see {@link SATPInternalError} for base error functionality
 * @see {@link SATPErrorType.COMMON_BODY_BADLY_FORMATED} for protocol error type
 */
export class SatpCommonBodyError extends SATPInternalError {
  /**
   * Creates a new common body validation error.
   *
   * @constructor
   * @param {string} tag - Context tag identifying the service operation that failed
   * @param {string} data - Serialized message data that failed validation
   * @param {string | Error | null} [cause] - Optional underlying cause or error
   */
  constructor(tag: string, data: string, cause?: string | Error | null) {
    super(
      `${tag}, message satp common body is missing or is missing required fields \n ${data}`,
      cause ?? null,
      400,
    );
    this.errorType = SATPErrorType.COMMON_BODY_BADLY_FORMATED;
  }
}

/**
 * Error thrown when a SATP transfer session is undefined or null in service operations.
 *
 * @description
 * Indicates that a service layer operation attempted to access a SATP transfer session
 * that is undefined, null, or otherwise unavailable. This error occurs when session
 * references become invalid during service processing workflows.
 *
 * **Common Scenarios:**
 * - Session initialization failures leaving null references
 * - Memory management issues causing session garbage collection
 * - Race conditions in concurrent session access
 * - Service layer state inconsistencies
 * - Session cleanup operations affecting active references
 *
 * **SATP Error Type:** SESSION_NOT_FOUND - Protocol-compliant error classification
 * **HTTP Status:** 500 Internal Server Error - Service layer processing failure
 *
 * @class SessionError
 * @extends SATPInternalError
 *
 * @since 2.0.0
 * @see {@link SATPInternalError} for base error functionality
 * @see {@link SATPErrorType.SESSION_NOT_FOUND} for protocol error type
 */
export class SessionError extends SATPInternalError {
  /**
   * Creates a new session undefined error for service operations.
   *
   * @constructor
   * @param {string} tag - Context tag identifying the service operation that failed
   * @param {string | Error | null} [cause] - Optional underlying cause or error
   */
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, session undefined`, cause ?? null, 500);
    this.errorType = SATPErrorType.SESSION_NOT_FOUND;
  }
}

/**
 * Error thrown when a session ID is undefined or invalid in service operations.
 *
 * @description
 * Indicates that a service layer operation encountered an undefined, null, or
 * invalid session identifier, preventing proper session resolution and processing.
 * This error is specific to service-level session ID validation and handling.
 *
 * **Common Scenarios:**
 * - Service method calls with undefined session ID parameters
 * - Session ID extraction failures from protocol messages
 * - Invalid session ID formats or structures
 * - Service configuration errors with session management
 * - Database query failures returning null session IDs
 *
 * **SATP Error Type:** SESSION_ID_NOT_FOUND - Protocol-compliant error classification
 * **HTTP Status:** 500 Internal Server Error - Service layer validation failure
 *
 * @class SessionIdError
 * @extends SATPInternalError
 *
 * @since 2.0.0
 * @see {@link SATPInternalError} for base error functionality
 * @see {@link SATPErrorType.SESSION_ID_NOT_FOUND} for protocol error type
 */
export class SessionIdError extends SATPInternalError {
  /**
   * Creates a new session ID undefined error for service operations.
   *
   * @constructor
   * @param {string} tag - Context tag identifying the service operation that failed
   * @param {string | Error | null} [cause] - Optional underlying cause or error
   */
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, session id undefined`, cause ?? null, 500);
    this.errorType = SATPErrorType.SESSION_ID_NOT_FOUND;
  }
}

/**
 * Error thrown when session information does not match expected values.
 *
 * @description
 * Indicates that a service operation detected a mismatch between expected and
 * actual session information, such as session IDs, gateway identifiers, or
 * session state values. This error helps maintain session consistency and
 * prevents cross-session data corruption.
 *
 * **Common Mismatch Scenarios:**
 * - Session ID mismatch between request and stored session
 * - Gateway identifier inconsistencies in session data
 * - Session state conflicts during concurrent operations
 * - Protocol message routing to incorrect sessions
 * - Session ownership validation failures
 *
 * **Impact on Service Operations:**
 * - Prevents incorrect session data modifications
 * - Maintains cross-chain transfer integrity
 * - Protects against session hijacking or confusion
 * - Ensures proper protocol message routing
 *
 * **SATP Error Type:** SESSION_MISS_MATCH - Protocol-compliant error classification
 * **HTTP Status:** 500 Internal Server Error - Service layer consistency failure
 *
 * @class SessionMissMatchError
 * @extends SATPInternalError
 *
 * @example
 * Session validation in service:
 * ```typescript
 * function validateSessionConsistency(requestSessionId: string, storedSession: Session) {
 *   if (requestSessionId !== storedSession.sessionId) {
 *     throw new SessionMissMatchError(
 *       'TransferService#validateSession',
 *       new Error(`Expected: ${storedSession.sessionId}, Got: ${requestSessionId}`)
 *     );
 *   }
 * }
 * ```
 *
 * @since 2.0.0
 * @see {@link SATPInternalError} for base error functionality
 * @see {@link SATPErrorType.SESSION_MISS_MATCH} for protocol error type
 */
export class SessionMissMatchError extends SATPInternalError {
  /**
   * Creates a new session mismatch error for service operations.
   *
   * @constructor
   * @param {string} tag - Context tag identifying the service operation that failed
   * @param {string | Error | null} [cause] - Optional underlying cause or error
   */
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, session missmatch`, cause ?? null, 500);
    this.errorType = SATPErrorType.SESSION_MISS_MATCH;
  }
}

/**
 * Error thrown when session data fails to load correctly from storage.
 *
 * @description
 * Indicates that session data retrieval from persistent storage resulted in
 * corrupted, incomplete, or invalid data that cannot be properly deserialized
 * or used for SATP operations. This error affects session recovery and
 * continuation of cross-chain transfers.
 *
 * **Common Data Loading Issues:**
 * - Database corruption or partial read failures
 * - Serialization/deserialization format mismatches
 * - Schema migration issues affecting stored data
 * - Storage system failures or inconsistencies
 * - Memory allocation failures during data loading
 *
 * **SATP Error Type:** SESSION_DATA_LOADED_INCORRECTLY - Protocol error classification
 * **HTTP Status:** 500 Internal Server Error - Data integrity failure
 *
 * @class SessionDataNotLoadedCorrectlyError
 * @extends SATPInternalError
 *
 * @since 2.0.0
 * @see {@link SATPInternalError} for base error functionality
 */
export class SessionDataNotLoadedCorrectlyError extends SATPInternalError {
  /**
   * Creates a new session data loading error.
   *
   * @constructor
   * @param {string} tag - Context tag identifying the operation that failed
   * @param {string} data - Session data that failed to load correctly
   * @param {string | Error | null} [cause] - Optional underlying cause or error
   */
  constructor(tag: string, data: string, cause?: string | Error | null) {
    super(
      `${tag}, session data was not loaded correctly \n ${data} \n stack: ${cause} `,
      cause ?? null,
      500,
    );
    this.errorType = SATPErrorType.SESSION_DATA_LOADED_INCORRECTLY;
  }
}

/**
 * Error thrown when required session data is not available.
 *
 * @description
 * Indicates that specific session data required for a service operation
 * is missing, unavailable, or has not been properly initialized. This
 * error prevents service operations that depend on complete session state.
 *
 * **Common Availability Issues:**
 * - Required session fields not yet populated
 * - Data cleanup or archival removing active session data
 * - Partial session initialization leaving gaps
 * - Storage system failures preventing data access
 * - Access control restrictions blocking data retrieval
 *
 * **SATP Error Type:** SESSION_DATA_NOT_FOUND - Protocol error classification
 * **HTTP Status:** 500 Internal Server Error - Data availability failure
 *
 * @class SessionDataNotAvailableError
 * @extends SATPInternalError
 *
 * @since 2.0.0
 * @see {@link SATPInternalError} for base error functionality
 */
export class SessionDataNotAvailableError extends SATPInternalError {
  /**
   * Creates a new session data availability error.
   *
   * @constructor
   * @param {string} tag - Context tag identifying the operation that failed
   * @param {string} type - Type of session data that is not available
   * @param {string | Error | null} [cause] - Optional underlying cause or error
   */
  constructor(tag: string, type: string, cause?: string | Error | null) {
    super(`${tag}, ${type} session data not available`, cause ?? null, 500);
    this.errorType = SATPErrorType.SESSION_DATA_NOT_FOUND;
  }
}

/**
 * Error thrown when attempting to modify a completed session.
 *
 * @description
 * Indicates that a service operation attempted to modify or process a SATP
 * transfer session that has already completed successfully. This error
 * prevents invalid state transitions and maintains session lifecycle integrity.
 *
 * **Common Completion Conflicts:**
 * - Duplicate message processing after session completion
 * - Race conditions with session finalization
 * - Client retry operations on completed transfers
 * - Service restart attempting to reprocess completed sessions
 * - Protocol violations attempting post-completion modifications
 *
 * **SATP Error Type:** SESSION_COMPLETED - Protocol error classification
 * **HTTP Status:** 500 Internal Server Error - Session lifecycle violation
 *
 * @class SessionCompletedError
 * @extends SATPInternalError
 *
 * @since 2.0.0
 * @see {@link SATPInternalError} for base error functionality
 */
export class SessionCompletedError extends SATPInternalError {
  /**
   * Creates a new session completed error.
   *
   * @constructor
   * @param {string} tag - Context tag identifying the operation that failed
   * @param {string | Error | null} [cause] - Optional underlying cause or error
   */
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, session data already completed`, cause ?? null, 500);
    this.errorType = SATPErrorType.SESSION_COMPLETED;
  }
}

/**
 * Error thrown when SATP protocol version is missing or unsupported.
 *
 * @description
 * Indicates that a SATP protocol message contains an unsupported protocol version
 * or is missing version information entirely. This error ensures protocol
 * compatibility and prevents processing of incompatible message formats.
 *
 * **Version Validation Scenarios:**
 * - Missing protocol version field in messages
 * - Unsupported version numbers or formats
 * - Version downgrade attacks or compatibility issues
 * - Protocol evolution and backward compatibility failures
 * - Client-server version mismatch in distributed environments
 *
 * **Error Classification:**
 * - **Missing Version**: MISSING_PARAMETER error type
 * - **Unsupported Version**: SATP_VERSION_NOT_SUPPORTED error type
 *
 * **HTTP Status:** 400 Bad Request - Client protocol version error
 *
 * @class SATPVersionError
 * @extends SATPInternalError
 *
 * @example
 * Protocol version validation:
 * ```typescript
 * function validateProtocolVersion(message: ProtocolMessage) {
 *   const SUPPORTED_VERSIONS = ['2.0', '2.1'];
 *
 *   if (!message.protocolVersion) {
 *     throw new SATPVersionError(
 *       'MessageValidator#validateVersion',
 *       new Error('Protocol version field missing')
 *     );
 *   }
 *
 *   if (!SUPPORTED_VERSIONS.includes(message.protocolVersion)) {
 *     throw new SATPVersionError(
 *       'MessageValidator#validateVersion',
 *       new Error('Version compatibility check failed'),
 *       message.protocolVersion,
 *       SUPPORTED_VERSIONS.join(', ')
 *     );
 *   }
 * }
 * ```
 *
 * @since 2.0.0
 * @see {@link SATPInternalError} for base error functionality
 * @see {@link SATPErrorType.MISSING_PARAMETER} for missing version error type
 * @see {@link SATPErrorType.SATP_VERSION_NOT_SUPPORTED} for unsupported version error type
 */
export class SATPVersionError extends SATPInternalError {
  /**
   * Creates a new SATP version error.
   *
   * @constructor
   * @param {string} tag - Context tag identifying the operation that failed
   * @param {string | Error | null} [cause] - Optional underlying cause or error
   * @param {string} [unsupported] - The unsupported version that was received
   * @param {string} [supported] - The supported version(s) description
   */
  constructor(
    tag: string,
    cause?: string | Error | null,
    unsupported?: string,
    supported?: string,
  ) {
    if (!supported) {
      super(`${tag}, SATP version is missing`, cause ?? null, 400);
      this.errorType = SATPErrorType.MISSING_PARAMETER;
    } else {
      super(
        `${tag}, unsupported SATP version \n received: ${unsupported}, supported: ${supported}`,
        cause ?? null,
        400,
      );
      this.errorType = SATPErrorType.SATP_VERSION_NOT_SUPPORTED;
    }
  }
}

/**
 * Error thrown when signature algorithm information is missing from protocol messages.
 *
 * @description
 * Indicates that a SATP protocol message lacks required signature algorithm
 * specification, preventing proper cryptographic signature verification.
 * This error ensures that all signed messages include the necessary algorithm
 * metadata for security validation.
 *
 * **SATP Error Type:** MISSING_PARAMETER - Protocol parameter validation failure
 * **HTTP Status:** 400 Bad Request - Missing required security parameter
 *
 * @class SignatureAlgorithmError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class SignatureAlgorithmError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, signature algorithm is missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

/**
 * Error thrown when message signature verification fails.
 *
 * @description
 * Indicates that cryptographic signature verification of a SATP protocol message
 * has failed, suggesting message tampering, invalid signatures, or key mismatches.
 * This error is critical for maintaining the security and integrity of cross-chain
 * communications.
 *
 * **Security Implications:**
 * - Potential message tampering or man-in-the-middle attacks
 * - Invalid or expired cryptographic keys
 * - Signature algorithm mismatches or incompatibilities
 * - Message corruption during network transmission
 *
 * **SATP Error Type:** SIGNATURE_VERIFICATION_FAILED - Security validation failure
 * **HTTP Status:** 400 Bad Request - Security validation error
 *
 * @class SignatureVerificationError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class SignatureVerificationError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, message signature verification failed`, cause ?? null, 400);
    this.errorType = SATPErrorType.SIGNATURE_VERIFICATION_FAILED;
  }
}

/**
 * Error thrown when required message signature is missing.
 *
 * @description
 * Indicates that a SATP protocol message that requires cryptographic signing
 * is missing its signature field, preventing security validation and message
 * authentication. This error enforces security requirements for protocol messages.
 *
 * **SATP Error Type:** MISSING_PARAMETER - Required security parameter missing
 * **HTTP Status:** 400 Bad Request - Missing required security field
 *
 * @class SignatureMissingError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class SignatureMissingError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, message signature missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

/**
 * Error thrown when asset lock type specification is missing.
 *
 * @description
 * Indicates that a SATP transfer request lacks the required lock type specification,
 * which defines how assets should be secured during cross-chain transfer operations.
 *
 * @class LockTypeError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class LockTypeError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, lock type missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

/**
 * Error thrown when lock expiration time is missing from transfer parameters.
 *
 * @description
 * Indicates that a SATP transfer request lacks the required lock expiration time,
 * which is essential for preventing indefinite asset locks and ensuring transfer
 * atomicity with appropriate timeout mechanisms.
 *
 * @class lockExpirationTimeError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class lockExpirationTimeError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, lock expiration time missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

/**
 * Error thrown when credential profile specification is missing.
 *
 * @description
 * Indicates that a SATP protocol message lacks the required credential profile
 * information, which defines the authentication and authorization mechanisms
 * to be used for the cross-chain transfer operation.
 *
 * @class CredentialProfileError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class CredentialProfileError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, credential profile missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

/**
 * Error thrown when logging profile specification is missing.
 *
 * @description
 * Indicates that a SATP protocol configuration lacks the required logging profile
 * specification, which defines audit trail and monitoring requirements for
 * cross-chain transfer operations.
 *
 * @class LoggingProfileError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class LoggingProfileError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, logging profile missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

/**
 * Error thrown when access control profile specification is missing.
 *
 * @description
 * Indicates that a SATP protocol configuration lacks the required access control
 * profile specification, which defines authorization policies and permission
 * models for cross-chain transfer operations.
 *
 * @class AccessControlProfileError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class AccessControlProfileError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, access control profile missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

/**
 * Error thrown when received message type doesn't match expected protocol sequence.
 *
 * @description
 * Indicates that a SATP protocol message has an incorrect message type for the
 * current protocol state or expected message sequence. This error enforces
 * proper protocol state machine transitions and prevents out-of-sequence
 * message processing that could compromise transfer integrity.
 *
 * **Protocol Sequence Validation:**
 * - Ensures messages follow proper SATP protocol flow
 * - Validates state machine transitions during transfers
 * - Prevents protocol violations and security issues
 * - Maintains cross-chain transfer atomicity
 *
 * **Common Sequence Violations:**
 * - Receiving response messages before sending requests
 * - Processing commit messages before lock confirmations
 * - Handling recovery messages during normal operations
 * - Client-server message flow disruptions
 *
 * **SATP Error Type:** MESSAGE_OUT_OF_SEQUENCE - Protocol sequence violation
 * **HTTP Status:** 400 Bad Request - Protocol flow error
 *
 * @class MessageTypeError
 * @extends SATPInternalError
 *
 * @example
 * Message sequence validation:
 * ```typescript
 * function validateMessageSequence(currentState: TransferState, messageType: string) {
 *   const expectedTypes = getExpectedMessageTypes(currentState);
 *
 *   if (!expectedTypes.includes(messageType)) {
 *     if (expectedTypes.length === 1) {
 *       throw new MessageTypeError(
 *         'TransferStateMachine#validateSequence',
 *         messageType,
 *         expectedTypes[0],
 *         undefined,
 *         new Error(`Invalid transition from ${currentState}`)
 *       );
 *     } else {
 *       throw new MessageTypeError(
 *         'TransferStateMachine#validateSequence',
 *         messageType,
 *         expectedTypes[0],
 *         expectedTypes[1],
 *         new Error(`Invalid transition from ${currentState}`)
 *       );
 *     }
 *   }
 * }
 * ```
 *
 * @since 2.0.0
 * @see {@link SATPInternalError} for base error functionality
 * @see {@link SATPErrorType.MESSAGE_OUT_OF_SEQUENCE} for protocol error type
 */
export class MessageTypeError extends SATPInternalError {
  /**
   * Creates a new message type sequence error.
   *
   * @constructor
   * @param {string} tag - Context tag identifying the operation that failed
   * @param {string} received - The message type that was received
   * @param {string} expected1 - The primary expected message type
   * @param {string} [expected2] - Optional secondary expected message type
   * @param {string | Error | null} [cause] - Optional underlying cause or error
   */
  constructor(
    tag: string,
    received: string,
    expected1: string,
    expected2?: string,
    cause?: string | Error | null,
  ) {
    if (expected2) {
      super(
        `${tag}, message type miss match \n received: ${received} \n expected: ${expected1} or ${expected2}`,
        cause ?? null,
        400,
      );
    } else {
      super(
        `${tag}, message type miss match \n received: ${received} \n expected: ${expected1}`,
        cause ?? null,
        400,
      );
    }
    this.errorType = SATPErrorType.MESSAGE_OUT_OF_SEQUENCE;
  }
}

/**
 * Error thrown when transfer initialization claims are missing or invalid.
 *
 * @description
 * Indicates that the transfer initialization claims required for starting a
 * SATP cross-chain transfer are missing, malformed, or fail validation.
 * These claims contain essential asset and transfer metadata needed for
 * proper transfer execution.
 *
 * **Transfer Init Claims Content:**
 * - Asset identification and metadata
 * - Transfer parameters and conditions
 * - Source and destination network information
 * - Ownership and authorization proofs
 *
 * @class TransferInitClaimsError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class TransferInitClaimsError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, transferInitClaims missing or faulty`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

/**
 * Error thrown when transfer init claims hash is missing or doesn't match.
 *
 * @description
 * Indicates that the cryptographic hash of transfer initialization claims
 * is missing or doesn't match the expected value, suggesting data integrity
 * issues or potential tampering of transfer parameters.
 *
 * **Hash Validation Purpose:**
 * - Ensures transfer claims integrity
 * - Prevents parameter tampering
 * - Validates message authenticity
 * - Maintains audit trail consistency
 *
 * @class TransferInitClaimsHashError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class TransferInitClaimsHashError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(
      `${tag}, transferInitClaims hash missing or missmatch`,
      cause ?? null,
      400,
    );
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

/**
 * Error thrown when network capabilities information is missing or invalid.
 *
 * @description
 * Indicates that required network capabilities information for cross-chain
 * operations is missing or contains invalid data, preventing proper capability
 * negotiation between gateways.
 *
 * @class NetworkCapabilitiesError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class NetworkCapabilitiesError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(
      `${tag}, NetworkCapabilitiesError missing or faulty`,
      cause ?? null,
      400,
    );
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

/**
 * Error thrown when an unsupported DLT (Distributed Ledger Technology) is specified.
 *
 * @description
 * Indicates that a SATP operation requested interaction with a blockchain
 * or DLT that is not supported by the current gateway implementation.
 * This error helps enforce supported network compatibility.
 *
 * **SATP Error Type:** DLT_NOT_SUPPORTED - Protocol DLT compatibility error
 *
 * @class DLTNotSupportedError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class DLTNotSupportedError extends SATPInternalError {
  constructor(tag: string, dlt: string, cause?: string | Error | null) {
    super(`${tag}, DLT not supported \n received: ${dlt}`, cause ?? null, 400);
    this.errorType = SATPErrorType.DLT_NOT_SUPPORTED;
  }
}

/**
 * Error thrown when server gateway public key is missing or invalid.
 *
 * @description
 * Indicates that the server gateway's public key required for cryptographic
 * operations and secure communication is missing or doesn't match expected values.
 *
 * @class ServerGatewayPubkeyError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class ServerGatewayPubkeyError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(
      `${tag}, serverGatewayPubkey missing or missmatch`,
      cause ?? null,
      400,
    );
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

/**
 * Error thrown when client gateway public key is missing or invalid.
 *
 * @description
 * Indicates that the client gateway's public key required for cryptographic
 * operations and secure communication is missing or doesn't match expected values.
 *
 * @class ClientGatewayPubkeyError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class ClientGatewayPubkeyError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(
      `${tag}, clientGatewayPubkey missing or missmatch`,
      cause ?? null,
      400,
    );
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

/**
 * Error thrown when message sequence numbers don't match expected values.
 *
 * @description
 * Indicates that a protocol message contains a sequence number that doesn't
 * match the expected value for the current protocol state, suggesting
 * message reordering, loss, or duplication issues.
 *
 * **SATP Error Type:** MESSAGE_OUT_OF_SEQUENCE - Protocol sequence violation
 *
 * @class SequenceNumberError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class SequenceNumberError extends SATPInternalError {
  constructor(
    tag: string,
    received: bigint,
    expected: bigint,
    cause?: string | Error | null,
  ) {
    super(
      `${tag}, sequence number missmatch \n received: ${received} \n expected: ${expected}`,
      cause ?? null,
      400,
    );
    this.errorType = SATPErrorType.MESSAGE_OUT_OF_SEQUENCE;
  }
}

/**
 * Error thrown when cryptographic hashes don't match expected values.
 *
 * @description
 * Indicates that a cryptographic hash validation failed, suggesting
 * data tampering, corruption, or integrity issues in protocol messages
 * or transfer data.
 *
 * **SATP Error Type:** HASH_MISS_MATCH - Cryptographic validation failure
 *
 * @class HashError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class HashError extends SATPInternalError {
  constructor(
    tag: string,
    received: string,
    expected: string,
    cause?: string | Error | null,
  ) {
    super(
      `${tag}, hash missmatch \n received: ${received} \n expected: ${expected}`,
      cause ?? null,
      400,
    );
    this.errorType = SATPErrorType.HASH_MISS_MATCH;
  }
}

/**
 * Error thrown when transfer context ID is missing or doesn't match.
 *
 * @description
 * Indicates that the transfer context identifier is missing or doesn't
 * match expected values, preventing proper transfer context resolution
 * and cross-chain operation correlation.
 *
 * **Error Classification:**
 * - **Missing Context ID**: MISSING_PARAMETER error type
 * - **Mismatched Context ID**: CONTEXT_ID_MISS_MATCH error type
 *
 * @class TransferContextIdError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class TransferContextIdError extends SATPInternalError {
  constructor(
    tag: string,
    cause?: string | Error | null,
    received?: string,
    expected?: string,
  ) {
    if (!received || !expected) {
      super(
        `${tag}, transferContextId missing or missmatch`,
        cause ?? null,
        400,
      );
      this.errorType = SATPErrorType.MISSING_PARAMETER;
    } else {
      super(
        `${tag}, transferContextId missing or missmatch \n received: ${received} \n expected: ${expected}`,
        cause ?? null,
        400,
      );
      this.errorType = SATPErrorType.CONTEXT_ID_MISS_MATCH;
    }
  }
}

/**
 * Error thrown when bridge manager component is missing or unavailable.
 *
 * @description
 * Indicates that the bridge manager required for cross-chain operations
 * is not available, not properly initialized, or has encountered an error
 * that prevents bridge functionality.
 *
 * **SATP Error Type:** BRIDGE_PROBLEM - Bridge infrastructure issue
 *
 * @class MissingBridgeManagerError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class MissingBridgeManagerError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, bridge manager missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.BRIDGE_PROBLEM;
  }
}

/**
 * Error thrown when lock assertion claim is missing or malformed.
 *
 * @description
 * Indicates that the cryptographic proof asserting asset lock status
 * is missing or contains invalid data, preventing verification of
 * asset locking for cross-chain transfers.
 *
 * @class LockAssertionClaimError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class LockAssertionClaimError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, lockAssertionClaim missing or faulty`, cause ?? null, 400);
    this.errorType = SATPErrorType.LOCK_ASSERTION_BADLY_FORMATED;
  }
}

/**
 * Error thrown when lock assertion claim format specification is missing.
 *
 * @description
 * Indicates that the format specification for lock assertion claims
 * is missing, preventing proper validation of lock proofs.
 *
 * @class LockAssertionClaimFormatError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class LockAssertionClaimFormatError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, lockAssertionClaimFormat missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.LOCK_ASSERTION_CLAIM_FORMAT_MISSING;
  }
}

/**
 * Error thrown when lock assertion expiration information is missing or invalid.
 *
 * @description
 * Indicates that the expiration time for lock assertions is missing
 * or contains invalid data, affecting timeout handling for locked assets.
 *
 * @class LockAssertionExpirationError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class LockAssertionExpirationError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(
      `${tag}, lockAssertionExpiration missing or faulty`,
      cause ?? null,
      400,
    );
    this.errorType = SATPErrorType.LOCK_ASSERTION_EXPIRATION_ERROR;
  }
}

/**
 * Error thrown when burn assertion claim is missing or malformed.
 *
 * @description
 * Indicates that the cryptographic proof asserting asset burn/destruction
 * is missing or contains invalid data, preventing verification of
 * asset burning operations in cross-chain transfers.
 *
 * @class BurnAssertionClaimError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class BurnAssertionClaimError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, burnAssertionClaim missing or faulty`, cause ?? null, 400);
    this.errorType = SATPErrorType.BURN_ASSERTION_BADLY_FORMATED;
  }
}

/**
 * Error thrown when mint assertion claim is missing or malformed.
 *
 * @description
 * Indicates that the cryptographic proof asserting asset mint/creation
 * is missing or contains invalid data, preventing verification of
 * asset minting operations in cross-chain transfers.
 *
 * @class MintAssertionClaimError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class MintAssertionClaimError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, mintAssertionClaim missing or faulty`, cause ?? null, 400);
    this.errorType = SATPErrorType.MINT_ASSERTION_BADLY_FORMATED;
  }
}

/**
 * Error thrown when assignment assertion claim is missing or malformed.
 *
 * @description
 * Indicates that the cryptographic proof asserting asset assignment/ownership
 * transfer is missing or contains invalid data, preventing verification of
 * asset assignment operations in cross-chain transfers.
 *
 * @class AssignmentAssertionClaimError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class AssignmentAssertionClaimError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(
      `${tag}, assignmentAssertionClaim missing or faulty`,
      cause ?? null,
      400,
    );
    this.errorType = SATPErrorType.ASSIGNMENT_ASSERTION_BADLY_FORMATED;
  }
}

/**
 * Error thrown when resource URL is missing or invalid.
 *
 * @description
 * Indicates that a required resource URL for accessing external services,
 * APIs, or blockchain endpoints is missing or contains invalid data.
 *
 * @class ResourceUrlError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class ResourceUrlError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, resourceUrl missing or missmatch`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

/**
 * Error thrown when gateway network ID is missing or invalid.
 *
 * @description
 * Indicates that the gateway network identifier required for routing
 * and gateway resolution is missing or contains invalid data.
 *
 * @class GatewayNetworkIdError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class GatewayNetworkIdError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, gatewayNetworkId missing or missmatch`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

/**
 * Error thrown when ontology contract is missing or has validation problems.
 *
 * @description
 * Indicates that the asset ontology contract required for asset
 * metadata and type validation is missing or contains malformed data.
 *
 * **SATP Error Type:** ONTOLOGY_BADLY_FORMATED - Ontology validation failure
 *
 * @class OntologyContractError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class OntologyContractError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(
      `${tag}, ontologyContract missing or has problems`,
      cause ?? null,
      400,
    );
    this.errorType = SATPErrorType.ONTOLOGY_BADLY_FORMATED;
  }
}

/**
 * Error thrown when ledger asset ID is missing.
 *
 * @description
 * Indicates that the blockchain-specific asset identifier required
 * for asset operations is missing from the request.
 *
 * @class LedgerAssetIdError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class LedgerAssetIdError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, ledgerAssetId missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

/**
 * Error thrown when ledger asset information is missing.
 *
 * @description
 * Indicates that the blockchain-specific asset information required
 * for cross-chain operations is missing from the request.
 *
 * @class LedgerAssetError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class LedgerAssetError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, ledgerAsset missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

export class BadAssetBuildError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(
      `${tag}, asset build is missing crucial elements`,
      cause ?? null,
      400,
    );
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

/**
 * Error thrown when network ID is missing or invalid.
 *
 * @description
 * Indicates that a blockchain network identifier of a specific type
 * is missing or contains invalid data, preventing network resolution.
 *
 * @class NetworkIdError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class NetworkIdError extends SATPInternalError {
  constructor(tag: string, type: string, cause?: string | Error | null) {
    super(`${tag}, ${type} networkId missing or missmatch`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

/**
 * Error thrown when asset information is missing.
 *
 * @description
 * Indicates that required asset information for cross-chain operations
 * is missing from the request or protocol message.
 *
 * @class AssetMissing
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class AssetMissing extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, asset missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

/**
 * Error thrown when wrap assertion claim is missing or malformed.
 *
 * @description
 * Indicates that the cryptographic proof asserting asset wrapping
 * is missing or contains invalid data, preventing verification of
 * asset wrapping operations in cross-chain transfers.
 *
 * @class WrapAssertionClaimError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class WrapAssertionClaimError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, Wrap Assertion Claim missing or faulty`, cause ?? null, 400);
    this.errorType = SATPErrorType.WRAP_ASSERTION_BADLY_FORMATED;
  }
}

/**
 * Error thrown when token ID is missing.
 *
 * @description
 * Indicates that the token identifier required for asset operations
 * is missing from the request.
 *
 * @class TokenIdMissingError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class TokenIdMissingError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, tokenId missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

/**
 * Error thrown when transfer amount is missing.
 *
 * @description
 * Indicates that the amount value required for asset transfer operations
 * is missing from the request.
 *
 * @class AmountMissingError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class AmountMissingError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, Amount missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}
export class UniqueTokenDescriptorMissingError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, Unique Descriptor missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

/**
 * Error thrown when recipient information is missing.
 *
 * @description
 * Indicates that the recipient address or identifier required for
 * asset transfer operations is missing from the request.
 *
 * @class MissingRecipientError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class MissingRecipientError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, Recipient is missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

/**
 * Error thrown when digital asset ID is missing.
 *
 * @description
 * Indicates that the digital asset identifier required for asset
 * operations is missing from the request.
 *
 * @class DigitalAssetIdError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class DigitalAssetIdError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, DigitalAssetId is missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.MISSING_PARAMETER;
  }
}

/**
 * Error thrown when public key is missing.
 *
 * @description
 * Indicates that a required public key for cryptographic operations
 * is missing from the request or protocol message.
 *
 * **SATP Error Type:** PUBLIC_KEY_NOT_FOUND - Public key validation failure
 *
 * @class PubKeyError
 * @extends SATPInternalError
 * @since 2.0.0
 */
export class PubKeyError extends SATPInternalError {
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, PubKey is missing`, cause ?? null, 400);
    this.errorType = SATPErrorType.PUBLIC_KEY_NOT_FOUND;
  }
}
