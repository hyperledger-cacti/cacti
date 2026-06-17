/**
 * @fileoverview SATP Gateway Error Classes
 *
 * This module defines custom error classes for SATP gateway operations,
 * providing structured error handling with proper error typing, messaging,
 * and tracing capabilities. Extends the runtime error system to include
 * SATP-specific error contexts and gateway-specific error scenarios.
 *
 * Error classes support:
 * - SATP protocol error type classification
 * - Error chaining and cause tracking
 * - HTTP status code mapping
 * - Distributed tracing integration
 * - Gateway lifecycle error handling
 *
 * @example
 * ```typescript
 * import { GatewayError, GatewayShuttingDownError } from './gateway-errors';
 *
 * // Standard gateway error
 * throw new GatewayError(
 *   'Transaction validation failed',
 *   originalError,
 *   400,
 *   'trace-123',
 *   stackTrace
 * );
 *
 * // Shutdown-specific error
 * throw new GatewayShuttingDownError('TransactionHandler');
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Error Handling
 * @author Hyperledger Cacti Contributors
 * @since 0.0.3-beta
 */

import { asError } from "@hyperledger-cacti/cactus-common";
import { RuntimeError } from "run-time-error-cjs";
import { Error as GatewayErrorType } from "../generated/proto/cacti/satp/v02/common/message_pb";

/**
 * Base error class for SATP gateway operations.
 *
 * Provides structured error handling for SATP protocol operations with
 * support for error chaining, HTTP status codes, distributed tracing,
 * and SATP-specific error type classification. All gateway-specific
 * errors should extend this base class.
 *
 * Features:
 * - SATP protocol error type mapping
 * - Error cause chain preservation
 * - HTTP status code integration
 * - Distributed tracing support
 * - Structured error messaging
 *
 * @class GatewayError
 * @extends RuntimeError
 * @since 0.0.3-beta
 * @example
 * ```typescript
 * // Create a gateway error with full context
 * const error = new GatewayError(
 *   'Asset lock verification failed',
 *   originalError,
 *   400,
 *   'trace-abc123',
 *   'detailed-stack-trace'
 * );
 *
 * // Check error type
 * console.log('Error type:', error.getGatewayErrorType());
 * console.log('HTTP status:', error.code);
 * ```
 */
export class GatewayError extends RuntimeError {
  /** SATP protocol error type classification */
  protected errorType = GatewayErrorType.UNSPECIFIED;

  /**
   * Create a new gateway error with comprehensive error context.
   *
   * @param message - Human-readable error description
   * @param cause - Underlying error cause (string, Error, or null)
   * @param code - HTTP status code for API responses (defaults to 500)
   * @param traceID - Optional distributed tracing identifier
   * @param trace - Optional detailed stack trace information
   * @since 0.0.3-beta
   */
  constructor(
    public message: string,
    public cause: string | Error | null,
    public code: number = 500,
    public traceID?: string,
    public trace?: string,
  ) {
    super(message, asError(cause));
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype); // make sure prototype chain is set to error
  }

  /**
   * Get the SATP protocol error type classification.
   *
   * Returns the protocol-specific error type as defined in the SATP
   * specification, enabling proper error handling and reporting in
   * cross-gateway communications.
   *
   * @returns SATP protocol error type enumeration
   * @since 0.0.3-beta
   */
  public getGatewayErrorType(): GatewayErrorType {
    return this.errorType;
  }
}

/**
 * Error thrown when gateway operations are attempted during shutdown.
 *
 * Specialized error class for handling requests that arrive during gateway
 * shutdown process. Provides clear messaging about the shutdown state and
 * prevents new operations from being initiated when the gateway is in the
 * process of graceful termination.
 *
 * This error is typically thrown by:
 * - Request dispatchers during shutdown
 * - Service handlers when shutdown flag is set
 * - Resource managers during cleanup phase
 *
 * @class GatewayShuttingDownError
 * @extends GatewayError
 * @since 0.0.3-beta
 * @example
 * ```typescript
 * // Check shutdown state before processing
 * if (this.isShuttingDown) {
 *   throw new GatewayShuttingDownError('TransactionHandler');
 * }
 *
 * // Handle shutdown error in request handler
 * try {
 *   await dispatcher.Transact(request);
 * } catch (error) {
 *   if (error instanceof GatewayShuttingDownError) {
 *     return { status: 503, message: 'Gateway shutting down' };
 *   }
 *   throw error;
 * }
 * ```
 */
export class GatewayShuttingDownError extends GatewayError {
  /**
   * Create a shutdown error for the specified component.
   *
   * @param tag - Component or method tag where shutdown was detected
   * @param cause - Optional underlying cause of the shutdown
   * @since 0.0.3-beta
   */
  constructor(tag: string, cause?: string | Error | null) {
    super(
      `${tag}, shutdown initiated not receiving new requests`,
      cause ?? null,
      503, // Service Unavailable
    );
  }
}
