/**
 * @fileoverview
 * Core SATP error classes and exception hierarchy for Secure Asset Transfer Protocol.
 *
 * @description
 * This module provides the foundational error handling infrastructure for SATP Hermes,
 * implementing a comprehensive error classification system that aligns with the IETF SATP
 * Core v2 specification. All SATP-related errors extend from the base SATPInternalError
 * class, providing consistent error reporting, tracing, and debugging capabilities across
 * the entire cross-chain transfer protocol implementation.
 *
 * **Error Classification System:**
 * - **SATPInternalError**: Base class for all internal SATP protocol errors
 * - **Bootstrap Errors**: Gateway initialization and configuration errors
 * - **Identity Errors**: Gateway identity management and resolution errors
 * - **Network Errors**: Cross-chain network and connectivity errors
 * - **Transaction Errors**: Asset transfer and smart contract operation errors
 * - **Message Errors**: SATP protocol message handling and validation errors
 * - **Recovery Errors**: Error recovery and rollback operation failures
 *
 * **Error Reporting Features:**
 * - IETF SATP error type classification with protocol-compliant error codes
 * - Distributed tracing support with trace ID and stack trace preservation
 * - HTTP-compatible status codes for API integration
 * - Cause chain preservation for comprehensive error analysis
 * - Structured error metadata for automated error handling
 *
 * **Usage Context:**
 * These error classes are used throughout the SATP implementation to provide
 * standardized error handling for gateway operations, cross-chain transfers,
 * smart contract interactions, and protocol message processing. They integrate
 * with OpenTelemetry tracing for comprehensive observability.
 *
 * @example
 * Basic error handling with tracing:
 * ```typescript
 * try {
 *   await gatewayManager.performTransfer(transferRequest);
 * } catch (error) {
 *   if (error instanceof SATPInternalError) {
 *     console.error(`SATP Error [${error.getSATPErrorType()}]: ${error.message}`);
 *     console.error(`Trace ID: ${error.traceID}`);
 *     console.error(`HTTP Code: ${error.code}`);
 *   }
 *   throw error;
 * }
 * ```
 *
 * @example
 * Creating custom SATP errors:
 * ```typescript
 * throw new NonExistantGatewayIdentity(
 *   'gateway-xyz-123',
 *   new Error('Database connection failed'),
 *   'trace-abc-456',
 *   'Stack trace details...'
 * );
 * ```
 *
 * @since 2.0.0
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Specification
 * @see {@link SATPInternalError} for base error class
 * @see {@link RuntimeError} for underlying error infrastructure
 *
 * @author SATP Hermes Development Team
 * @copyright 2024 Hyperledger Foundation
 * @license Apache-2.0
 */

import { asError } from "@hyperledger/cactus-common";
import { RuntimeError } from "run-time-error-cjs";
import { Error as SATPErrorType } from "../../generated/proto/cacti/satp/v02/common/message_pb";

/**
 * Base error class for all SATP protocol internal errors and exceptions.
 *
 * @description
 * Serves as the foundational error class for the entire SATP Hermes error hierarchy,
 * providing standardized error reporting, tracing, and debugging capabilities aligned
 * with the IETF SATP Core v2 specification. This class extends RuntimeError to provide
 * enhanced error handling with protocol-specific metadata, distributed tracing support,
 * and HTTP-compatible status codes.
 *
 * **Core Features:**
 * - **Protocol Compliance**: Integrates SATP error type classification system
 * - **Distributed Tracing**: Built-in support for trace ID and stack trace preservation
 * - **HTTP Integration**: Compatible status codes for REST API error responses
 * - **Cause Chain**: Preserves underlying error causes for comprehensive debugging
 * - **Structured Metadata**: Consistent error information across all SATP operations
 *
 * **Error Type System:**
 * Each error instance is associated with a specific SATPErrorType from the protocol
 * specification, enabling standardized error classification and automated error
 * handling across different SATP implementations.
 *
 * **Tracing Integration:**
 * Supports OpenTelemetry distributed tracing with trace ID preservation and
 * structured stack trace information for comprehensive error analysis in
 * distributed cross-chain environments.
 *
 * @class SATPInternalError
 * @extends RuntimeError
 *
 * @example
 * Basic error creation and handling:
 * ```typescript
 * const error = new SATPInternalError(
 *   'Asset transfer validation failed',
 *   new Error('Invalid asset metadata'),
 *   400,
 *   'trace-123-abc',
 *   'Detailed stack trace...'
 * );
 *
 * console.log(error.message);        // 'Asset transfer validation failed'
 * console.log(error.code);           // 400
 * console.log(error.traceID);        // 'trace-123-abc'
 * console.log(error.getSATPErrorType()); // SATPErrorType.UNSPECIFIED
 * ```
 *
 * @example
 * Error handling with type checking:
 * ```typescript
 * try {
 *   await performSATPOperation();
 * } catch (error) {
 *   if (error instanceof SATPInternalError) {
 *     logger.error({
 *       message: error.message,
 *       errorType: error.getSATPErrorType(),
 *       traceId: error.traceID,
 *       httpCode: error.code
 *     });
 *   }
 * }
 * ```
 *
 * @since 2.0.0
 * @see {@link SATPErrorType} for protocol error type enumeration
 * @see {@link RuntimeError} for base error functionality
 */
export class SATPInternalError extends RuntimeError {
  /**
   * SATP protocol error type classification for standardized error categorization.
   *
   * @description
   * Maps this error instance to a specific error type defined in the SATP protocol
   * specification. Used for protocol-compliant error reporting and automated error
   * handling across different SATP implementations.
   *
   * @protected
   * @type {SATPErrorType}
   * @default SATPErrorType.UNSPECIFIED
   */
  protected errorType = SATPErrorType.UNSPECIFIED;

  /**
   * Creates a new SATP internal error with comprehensive error metadata.
   *
   * @description
   * Initializes a new SATP error instance with detailed error information,
   * tracing support, and protocol-compliant error classification. Ensures
   * proper prototype chain setup for instanceof checks and error handling.
   *
   * **Parameter Details:**
   * - **message**: Human-readable error description for logging and debugging
   * - **cause**: Underlying error or cause chain for root cause analysis
   * - **code**: HTTP-compatible status code for API error responses
   * - **traceID**: Distributed tracing identifier for cross-service error tracking
   * - **trace**: Detailed stack trace information for debugging
   *
   * @constructor
   * @param {string} message - Primary error message describing the failure
   * @param {string | Error | null} cause - Underlying cause or parent error
   * @param {number} [code=500] - HTTP status code (default: 500 Internal Server Error)
   * @param {string} [traceID] - Optional distributed tracing identifier
   * @param {string} [trace] - Optional detailed trace information
   *
   * @example
   * Create error with full metadata:
   * ```typescript
   * const error = new SATPInternalError(
   *   'Gateway authentication failed',
   *   new Error('Invalid certificate'),
   *   401,
   *   'trace-auth-001',
   *   'Detailed authentication failure trace'
   * );
   * ```
   *
   * @example
   * Create simple error:
   * ```typescript
   * const error = new SATPInternalError(
   *   'Operation timeout',
   *   null,
   *   408
   * );
   * ```
   */
  constructor(
    public message: string,
    public cause: string | Error | null,
    // TODO internal error codes
    public code: number = 500,
    public traceID?: string,
    public trace?: string,
  ) {
    super(message, asError(cause));
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype); // make sure prototype chain is set to error
  }

  /**
   * Retrieves the SATP protocol error type for this error instance.
   *
   * @description
   * Returns the protocol-specific error type classification as defined in the
   * IETF SATP Core v2 specification. This enables standardized error handling,
   * automated error classification, and protocol-compliant error reporting
   * across different SATP implementations.
   *
   * **Usage Context:**
   * - Error type-based routing and handling logic
   * - Protocol-compliant error response generation
   * - Error analytics and monitoring classification
   * - Cross-gateway error communication
   *
   * @public
   * @method getSATPErrorType
   * @returns {SATPErrorType} The SATP protocol error type for this error
   *
   * @example
   * Error type-based handling:
   * ```typescript
   * try {
   *   await gatewayOperation();
   * } catch (error) {
   *   if (error instanceof SATPInternalError) {
   *     const errorType = error.getSATPErrorType();
   *     switch (errorType) {
   *       case SATPErrorType.SESSION_NOT_FOUND:
   *         handleSessionError(error);
   *         break;
   *       case SATPErrorType.SIGNATURE_VERIFICATION_FAILED:
   *         handleAuthError(error);
   *         break;
   *       default:
   *         handleGenericError(error);
   *     }
   *   }
   * }
   * ```
   *
   * @since 2.0.0
   */
  public getSATPErrorType(): SATPErrorType {
    return this.errorType;
  }
}

/**
 * Error thrown when attempting to bootstrap a gateway manager that has already been initialized.
 *
 * @description
 * Indicates that the gateway manager bootstrap process has been called multiple times,
 * which is not allowed as it could lead to inconsistent state and resource conflicts.
 * This error helps prevent double initialization issues and ensures proper gateway
 * lifecycle management in SATP protocol implementations.
 *
 * **Error Context:**
 * - Gateway manager initialization conflicts
 * - Duplicate bootstrap attempts
 * - State management violations
 * - Resource initialization conflicts
 *
 * **HTTP Status:** 409 Conflict - The request conflicts with the current state
 *
 * @class BootstrapError
 * @extends SATPInternalError
 *
 * @example
 * Gateway bootstrap protection:
 * ```typescript
 * class GatewayManager {
 *   private isBootstrapped = false;
 *
 *   async bootstrap() {
 *     if (this.isBootstrapped) {
 *       throw new BootstrapError(
 *         new Error('Double bootstrap attempt'),
 *         'trace-bootstrap-001'
 *       );
 *     }
 *     // Perform bootstrap logic
 *     this.isBootstrapped = true;
 *   }
 * }
 * ```
 *
 * @since 2.0.0
 * @see {@link SATPInternalError} for base error functionality
 */
export class BootstrapError extends SATPInternalError {
  /**
   * Creates a new bootstrap error indicating duplicate initialization attempt.
   *
   * @constructor
   * @param {string | Error | null} [cause] - Optional underlying cause or error
   * @param {string} [traceID] - Optional distributed tracing identifier
   * @param {string} [trace] - Optional detailed trace information
   */
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super(
      "Bootstrap already called in this Gateway Manager",
      cause ?? null,
      409,
      traceID,
      trace,
    );
  }
}

/**
 * Error thrown when attempting to access or reference a gateway that does not exist.
 *
 * @description
 * Indicates that a requested gateway identity could not be found in the gateway registry
 * or management system. This error occurs during gateway discovery, routing, or when
 * establishing cross-chain communication channels with non-existent gateway endpoints.
 *
 * **Common Scenarios:**
 * - Gateway ID lookup failures in registry
 * - Cross-chain routing to invalid gateway endpoints
 * - Gateway decommissioning and cleanup operations
 * - Network partition or gateway unavailability
 * - Configuration errors with incorrect gateway identifiers
 *
 * **HTTP Status:** 404 Not Found - The requested gateway resource does not exist
 *
 * @class NonExistantGatewayIdentity
 * @extends SATPInternalError
 *
 * @example
 * Gateway lookup with error handling:
 * ```typescript
 * async function getGateway(gatewayId: string) {
 *   const gateway = await gatewayRegistry.findById(gatewayId);
 *   if (!gateway) {
 *     throw new NonExistantGatewayIdentity(
 *       gatewayId,
 *       new Error('Database lookup returned null'),
 *       'trace-lookup-001'
 *     );
 *   }
 *   return gateway;
 * }
 * ```
 *
 * @example
 * Cross-chain routing error:
 * ```typescript
 * try {
 *   await routeToGateway('unknown-gateway-123');
 * } catch (error) {
 *   if (error instanceof NonExistantGatewayIdentity) {
 *     logger.warn(`Gateway not found: ${error.message}`);
 *     // Attempt alternative routing or fail gracefully
 *   }
 * }
 * ```
 *
 * @since 2.0.0
 * @see {@link SATPInternalError} for base error functionality
 */
export class NonExistantGatewayIdentity extends SATPInternalError {
  /**
   * Creates a new gateway identity error for a non-existent gateway.
   *
   * @constructor
   * @param {string} id - The gateway identifier that could not be found
   * @param {string | Error | null} [cause] - Optional underlying cause or error
   * @param {string} [traceID] - Optional distributed tracing identifier
   * @param {string} [trace] - Optional detailed trace information
   */
  constructor(
    id: string,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(
      `Gateway with id ${id} does not exist`,
      cause ?? null,
      404,
      traceID,
      trace,
    );
  }
}

/**
 * Error thrown when unable to retrieve the approve address for asset operations.
 *
 * @description
 * Indicates a failure to obtain the appropriate approval address required for
 * asset transfer operations on a specific blockchain network. This error occurs
 * during the asset approval phase of cross-chain transfers, where smart contracts
 * need to grant permission for asset movement or wrapper contract interactions.
 *
 * **Common Scenarios:**
 * - Unsupported network and asset type combinations
 * - Missing or incorrectly configured wrapper contracts
 * - Network connectivity issues preventing address resolution
 * - Smart contract deployment failures
 * - Asset type configuration errors
 *
 * **Impact on SATP Operations:**
 * - Blocks asset transfer initialization
 * - Prevents smart contract approval operations
 * - Causes cross-chain transfer failures
 * - Requires manual intervention or configuration fixes
 *
 * **HTTP Status:** 400 Bad Request - Invalid configuration or unsupported combination
 *
 * @class GetApproveAddressError
 * @extends SATPInternalError
 *
 * @example
 * Asset approval address resolution:
 * ```typescript
 * async function getApprovalAddress(networkId: string, assetType: string) {
 *   try {
 *     const networkType = await getNetworkType(networkId);
 *     const address = await resolveApproveAddress(networkId, networkType, assetType);
 *     return address;
 *   } catch (error) {
 *     throw new GetApproveAddressError(
 *       networkId,
 *       networkType,
 *       assetType,
 *       error,
 *       'trace-approve-001'
 *     );
 *   }
 * }
 * ```
 *
 * @example
 * Error handling in asset transfer:
 * ```typescript
 * try {
 *   const approveAddr = leaf.getApproveAddress(TokenType.ERC20);
 *   await approveAssetTransfer(approveAddr, amount);
 * } catch (error) {
 *   if (error instanceof GetApproveAddressError) {
 *     logger.error(`Approval address resolution failed: ${error.message}`);
 *     // Handle configuration error or fallback
 *   }
 * }
 * ```
 *
 * @since 2.0.0
 * @see {@link SATPInternalError} for base error functionality
 */
export class GetApproveAddressError extends SATPInternalError {
  /**
   * Creates a new approve address error for failed address resolution.
   *
   * @constructor
   * @param {string} networkID - The blockchain network identifier
   * @param {string} networkType - The type of blockchain network (e.g., 'Ethereum', 'Fabric')
   * @param {string} assetType - The type of asset requiring approval (e.g., 'ERC20', 'ERC721')
   * @param {string | Error | null} [cause] - Optional underlying cause or error
   * @param {string} [traceID] - Optional distributed tracing identifier
   * @param {string} [trace] - Optional detailed trace information
   */
  constructor(
    networkID: string,
    networkType: string,
    assetType: string,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(
      `Could not get approve address for network ${networkID}, ${networkType} and asset type ${assetType}`,
      cause ?? null,
      400,
      traceID,
      trace,
    );
  }
}

/**
 * Error thrown when unable to retrieve the status of a SATP transfer session.
 *
 * @description
 * Indicates a failure to obtain status information for an active or completed
 * SATP transfer session. This error occurs during session monitoring, progress
 * tracking, or when clients request updates on cross-chain transfer operations.
 *
 * **Common Scenarios:**
 * - Session ID not found in session registry
 * - Database connectivity issues during status lookup
 * - Session data corruption or inconsistent state
 * - Access control violations for session information
 * - Network timeouts during distributed status queries
 *
 * **Impact on SATP Operations:**
 * - Prevents transfer progress monitoring
 * - Blocks client status update requests
 * - Hampers debugging and troubleshooting efforts
 * - May indicate broader session management issues
 *
 * **HTTP Status:** 400 Bad Request - Invalid session ID or status query
 *
 * @class GetStatusError
 * @extends SATPInternalError
 *
 * @example
 * Session status retrieval:
 * ```typescript
 * async function getTransferStatus(sessionId: string) {
 *   try {
 *     const session = await sessionManager.findById(sessionId);
 *     return session.getStatus();
 *   } catch (error) {
 *     throw new GetStatusError(
 *       sessionId,
 *       'Session lookup failed',
 *       error,
 *       'trace-status-001'
 *     );
 *   }
 * }
 * ```
 *
 * @since 2.0.0
 * @see {@link SATPInternalError} for base error functionality
 */
export class GetStatusError extends SATPInternalError {
  /**
   * Creates a new status retrieval error for a SATP session.
   *
   * @constructor
   * @param {string} sessionID - The SATP session identifier
   * @param {string} message - Specific reason for the status retrieval failure
   * @param {string | Error | null} [cause] - Optional underlying cause or error
   * @param {string} [traceID] - Optional distributed tracing identifier
   * @param {string} [trace] - Optional detailed trace information
   */
  constructor(
    sessionID: string,
    message: string,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(
      `Could not GetStatus at Session: with id ${sessionID}. Reason: ${message}`,
      cause ?? null,
      400,
      traceID,
      trace,
    );
  }
}

/**
 * Error thrown when a blockchain transaction operation fails during SATP execution.
 *
 * @description
 * Indicates a failure in executing blockchain transactions required for cross-chain
 * asset transfers, including smart contract interactions, asset movements, and
 * state updates. This error captures transaction-level failures that prevent
 * successful completion of SATP protocol operations.
 *
 * **Common Transaction Failures:**
 * - Smart contract execution reverts
 * - Insufficient gas or transaction fees
 * - Network congestion and timeout issues
 * - Invalid transaction parameters or signatures
 * - Smart contract security restrictions
 *
 * **Impact on SATP Operations:**
 * - Blocks asset transfer completion
 * - May require transaction retry or rollback
 * - Affects cross-chain operation atomicity
 * - Triggers error recovery procedures
 *
 * **HTTP Status:** 500 Internal Server Error - Transaction execution failure
 *
 * @class TransactError
 * @extends SATPInternalError
 *
 * @example
 * Transaction execution with error handling:
 * ```typescript
 * async function executeAssetTransfer(transferParams: TransferParams) {
 *   try {
 *     await blockchainConnector.sendTransaction(transferParams);
 *   } catch (error) {
 *     throw new TransactError(
 *       'AssetTransfer#executeTransfer',
 *       error
 *     );
 *   }
 * }
 * ```
 *
 * @since 2.0.0
 * @see {@link SATPInternalError} for base error functionality
 */
export class TransactError extends SATPInternalError {
  /**
   * Creates a new transaction error for failed blockchain operations.
   *
   * @constructor
   * @param {string} tag - Context tag identifying the operation that failed
   * @param {string | Error | null} [cause] - Optional underlying cause or error
   */
  constructor(tag: string, cause?: string | Error | null) {
    super(`${tag}, failed to transact`, cause ?? null, 500);
  }
}

/**
 * Error thrown when unable to create a valid SATP protocol request message.
 *
 * @description
 * Indicates a failure in constructing or serializing SATP protocol request messages
 * according to the IETF SATP Core v2 specification. This error occurs during
 * message preparation, validation, or encoding phases of cross-chain operations.
 *
 * **Common Creation Failures:**
 * - Invalid message parameters or missing required fields
 * - Protocol serialization or encoding errors
 * - Signature generation failures
 * - Message format validation errors
 * - Cryptographic operation failures
 *
 * **HTTP Status:** 500 Internal Server Error - Message creation failure
 *
 * @class CreateSATPRequestError
 * @extends SATPInternalError
 *
 * @since 2.0.0
 * @see {@link SATPInternalError} for base error functionality
 */
export class CreateSATPRequestError extends SATPInternalError {
  /**
   * Creates a new SATP request creation error.
   *
   * @constructor
   * @param {string} tag - Context tag identifying the operation that failed
   * @param {string} message - Specific details about the creation failure
   * @param {string | Error | null} [cause] - Optional underlying cause or error
   */
  constructor(tag: string, message: string, cause?: string | Error | null) {
    super(
      `${tag}, failed to create SATP request: ${message}`,
      cause ?? null,
      500,
    );
  }
}

/**
 * Error thrown when unable to retrieve or deserialize a SATP protocol message.
 *
 * @description
 * Indicates a failure in retrieving, deserializing, or processing SATP protocol
 * messages from network communications, message queues, or storage systems.
 * This error affects the ability to process incoming cross-chain protocol messages.
 *
 * **Common Retrieval Failures:**
 * - Network communication timeouts or failures
 * - Message deserialization or decoding errors
 * - Invalid message format or corrupted data
 * - Message queue or storage system errors
 * - Protocol version incompatibility issues
 *
 * **HTTP Status:** 500 Internal Server Error - Message retrieval failure
 *
 * @class RetrieveSATPMessageError
 * @extends SATPInternalError
 *
 * @since 2.0.0
 * @see {@link SATPInternalError} for base error functionality
 */
export class RetrieveSATPMessageError extends SATPInternalError {
  /**
   * Creates a new SATP message retrieval error.
   *
   * @constructor
   * @param {string} tag - Context tag identifying the operation that failed
   * @param {string} message - Specific details about the retrieval failure
   * @param {string | Error | null} [cause] - Optional underlying cause or error
   */
  constructor(tag: string, message: string, cause?: string | Error | null) {
    super(
      `${tag}, failed to retrieve SATP message: ${message}`,
      cause ?? null,
      500,
    );
  }
}

/**
 * Error thrown when unable to recover a SATP protocol message during error recovery operations.
 *
 * @description
 * Indicates a failure in message recovery procedures used to restore SATP protocol
 * state after communication failures, network partitions, or system crashes.
 * This error occurs during disaster recovery, message replay, or state synchronization
 * operations in distributed cross-chain environments.
 *
 * **Common Recovery Failures:**
 * - Message backup or checkpoint corruption
 * - Incomplete transaction logs or audit trails
 * - State inconsistency preventing message reconstruction
 * - Cryptographic key unavailability for message decryption
 * - Network partition preventing distributed recovery coordination
 *
 * **Impact on SATP Operations:**
 * - Prevents automatic error recovery
 * - May require manual intervention or rollback
 * - Affects system resilience and fault tolerance
 * - Can lead to incomplete cross-chain transfers
 *
 * **HTTP Status:** 500 Internal Server Error - Recovery operation failure
 *
 * @class RecoverMessageError
 * @extends SATPInternalError
 *
 * @example
 * Message recovery operation:
 * ```typescript
 * async function recoverFailedTransfer(sessionId: string) {
 *   try {
 *     const checkpointData = await getCheckpoint(sessionId);
 *     return await reconstructMessage(checkpointData);
 *   } catch (error) {
 *     throw new RecoverMessageError(
 *       'TransferRecovery#reconstructMessage',
 *       'Checkpoint data corrupted',
 *       error
 *     );
 *   }
 * }
 * ```
 *
 * @since 2.0.0
 * @see {@link SATPInternalError} for base error functionality
 */
export class RecoverMessageError extends SATPInternalError {
  /**
   * Creates a new message recovery error.
   *
   * @constructor
   * @param {string} tag - Context tag identifying the recovery operation that failed
   * @param {string} message - Specific details about the recovery failure
   * @param {string | Error | null} [cause] - Optional underlying cause or error
   */
  constructor(tag: string, message: string, cause?: string | Error | null) {
    super(`${tag}, failed to recover message: ${message}`, cause ?? null, 500);
  }
}

/**
 * Error thrown when the Business Logic Object (BLO) Dispatcher is in an erroneous state.
 *
 * @description
 * Indicates that the BLO Dispatcher component, responsible for orchestrating
 * business logic operations in SATP transfers, has encountered an error condition
 * that prevents normal operation. This error affects the ability to execute
 * custom business logic and asset transfer workflows.
 *
 * **Common BLO Dispatcher Issues:**
 * - Business logic plugin initialization failures
 * - Invalid business logic configuration or parameters
 * - Runtime errors in custom business logic execution
 * - Resource exhaustion or memory issues
 * - Dependency injection or service resolution failures
 *
 * **Impact on SATP Operations:**
 * - Blocks custom business logic execution
 * - Prevents asset transfer workflow customization
 * - May cause transfer operations to fail or hang
 * - Affects system reliability and business rule enforcement
 *
 * **HTTP Status:** 500 Internal Server Error - BLO Dispatcher malfunction
 *
 * @class BLODispatcherErraneousError
 * @extends SATPInternalError
 *
 * @example
 * BLO Dispatcher error handling:
 * ```typescript
 * async function executeBLO(bloRequest: BLORequest) {
 *   try {
 *     await bloDispatcher.execute(bloRequest);
 *   } catch (error) {
 *     if (bloDispatcher.isErroneous()) {
 *       throw new BLODispatcherErraneousError(
 *         'BLOExecution#executeBLO',
 *         error
 *       );
 *     }
 *     throw error;
 *   }
 * }
 * ```
 *
 * @since 2.0.0
 * @see {@link SATPInternalError} for base error functionality
 */
export class BLODispatcherErraneousError extends SATPInternalError {
  /**
   * Creates a new BLO Dispatcher error.
   *
   * @constructor
   * @param {string} tag - Context tag identifying the operation that failed
   * @param {string | Error | null} [cause] - Optional underlying cause or error
   */
  constructor(tag: string, cause?: string | Error | null) {
    super(
      `${tag}, failed because BLODispatcher is erroneous`,
      cause ?? null,
      500,
    );
  }
}

/**
 * Client-facing error class for user-friendly SATP error reporting.
 *
 * @description
 * **⚠️ TODO - Implementation Pending:**
 * This class is intended to provide client-facing error representations that map
 * internal SATP errors to user-friendly messages and error codes. The implementation
 * should include error sanitization, localization support, and API-appropriate
 * error formatting while preserving essential debugging information.
 *
 * **Planned Features:**
 * - User-friendly error message translation
 * - API-appropriate error code mapping
 * - Sensitive information sanitization
 * - Localization and internationalization support
 * - Client SDK integration compatibility
 *
 * **Design Considerations:**
 * - Should map SATPInternalError instances to client-safe representations
 * - Must preserve trace IDs and correlation information for support
 * - Should provide consistent error structure across different client interfaces
 * - Must not expose internal system details or security-sensitive information
 *
 * @class SATPError
 * @extends Error
 *
 * @example
 * Planned usage pattern:
 * ```typescript
 * // TODO: Implement this functionality
 * try {
 *   await performSATPOperation();
 * } catch (internalError) {
 *   if (internalError instanceof SATPInternalError) {
 *     const clientError = SATPError.fromInternalError(internalError);
 *     res.status(clientError.httpCode).json(clientError.toJSON());
 *   }
 * }
 * ```
 *
 * @todo Implement client-facing error logic that maps SATPInternalErrors to user-friendly errors
 * @since 2.0.0
 * @see {@link SATPInternalError} for internal error representation
 */
export class SATPError extends Error {
  // TODO: Implement client-facing error logic, maps SATPInternalErrors to user friendly errors
}
