/**
 * @fileoverview
 * Ontology management error classes for SATP Hermes cross-chain operations.
 *
 * @description
 * This module defines specialized error classes for ontology management operations
 * within the SATP bridge architecture. These errors provide structured error
 * handling for asset ontology loading, validation, retrieval, and ledger
 * compatibility verification operations.
 *
 * **Ontology Error Categories:**
 * - General ontology management internal errors
 * - Asset ontology not found errors
 * - Unsupported ledger type errors
 * - Ontology validation and compatibility errors
 *
 * **Error Context Information:**
 * All error classes include comprehensive context information including error
 * codes, trace IDs for distributed tracing, stack traces, and detailed cause
 * information to facilitate debugging and monitoring.
 *
 * @example
 * Handling ontology errors:
 * ```typescript
 * try {
 *   const ontology = ontologyManager.getOntology(LedgerType.Ethereum, 'unknown-asset');
 * } catch (error) {
 *   if (error instanceof OntologyNotFoundError) {
 *     console.log('Asset ontology not found:', error.message);
 *     console.log('Trace ID:', error.traceID);
 *   } else if (error instanceof LedgerNotSupported) {
 *     console.log('Ledger not supported:', error.cause);
 *   }
 * }
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Specification
 * @see {@link OntologyManager} for ontology management operations
 * @see {@link RuntimeError} for base error functionality
 *
 * @author SATP Hermes Development Team
 * @copyright 2024 Hyperledger Foundation
 * @license Apache-2.0
 */

import { asError } from "@hyperledger-cacti/cactus-common";
import { RuntimeError } from "run-time-error-cjs";

/**
 * Base error class for all ontology management related errors in SATP Hermes.
 *
 * @description
 * Serves as the foundation for all ontology-specific error types, providing
 * structured error information including error codes, trace IDs for distributed
 * tracing, and comprehensive cause information. This base class ensures
 * consistent error handling across all ontology management operations.
 *
 * **Error Context Features:**
 * - Structured error messaging with detailed context
 * - HTTP-style error codes for categorization
 * - Distributed tracing support with trace IDs
 * - Stack trace preservation for debugging
 * - Cause chain tracking for error propagation
 *
 * @example
 * Creating custom ontology error:
 * ```typescript
 * class CustomOntologyError extends OntologyInternalError {
 *   constructor(message: string, cause?: Error) {
 *     super(message, cause, 400, 'trace-123');
 *   }
 * }
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link RuntimeError} for base error functionality
 * @see {@link OntologyManager} for context where errors are thrown
 */
export class OntologyInternalError extends RuntimeError {
  /**
   * Creates an instance of OntologyInternalError.
   *
   * @param message - Human-readable error description
   * @param cause - Underlying cause of the error (string, Error, or null)
   * @param code - HTTP-style error code for categorization (default: 500)
   * @param traceID - Distributed tracing identifier for request correlation
   * @param trace - Stack trace information for debugging
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
    //this.stack = trace || new Error().stack;
  }
}

/**
 * Error thrown when a requested asset ontology cannot be found.
 *
 * @description
 * Indicates that an asset ontology lookup operation failed because the
 * specified ontology does not exist in the ontology manager's registry.
 * This typically occurs when requesting ontologies for unregistered assets
 * or when ontology files are missing or corrupted.
 *
 * **Common Scenarios:**
 * - Asset ID not found in ontology registry
 * - Ontology file missing from filesystem
 * - Ontology failed to load during initialization
 * - Invalid asset reference in cross-chain operations
 *
 * @example
 * Handling ontology not found:
 * ```typescript
 * try {
 *   const ontology = manager.getOntology(LedgerType.Ethereum, 'missing-asset');
 * } catch (error) {
 *   if (error instanceof OntologyNotFoundError) {
 *     console.log('Asset ontology not available:', error.message);
 *     // Handle missing ontology gracefully
 *   }
 * }
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link OntologyManager.getOntology} for ontology retrieval
 */
export class OntologyNotFoundError extends OntologyInternalError {
  /**
   * Creates an instance of OntologyNotFoundError.
   *
   * @param cause - Underlying cause of the ontology lookup failure
   * @param traceID - Distributed tracing identifier for request correlation
   * @param trace - Stack trace information for debugging
   */
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Ontology not found", cause ?? null, 500, traceID, trace);
  }
}

/**
 * Error thrown when operations are attempted on unsupported ledger types.
 *
 * @description
 * Indicates that a ledger type is not supported by the current ontology
 * management implementation. This occurs when attempting to perform
 * ontology operations on blockchain networks that lack proper integration
 * or when using experimental ledger types not yet fully implemented.
 *
 * **Unsupported Scenarios:**
 * - Ledger type not implemented in ontology manager
 * - Missing interaction signature definitions for ledger
 * - Ontology format incompatible with ledger type
 * - Experimental or deprecated ledger types
 *
 * @example
 * Handling unsupported ledger:
 * ```typescript
 * try {
 *   const interactions = manager.getOntologyInteractions(LedgerType.Unknown, 'asset-id');
 * } catch (error) {
 *   if (error instanceof LedgerNotSupported) {
 *     console.log('Ledger not supported:', error.cause);
 *     // Fallback to default behavior or show error message
 *   }
 * }
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link OntologyManager.getOntologyInteractions} for interaction retrieval
 * @see {@link LedgerType} for supported ledger types
 */
export class LedgerNotSupported extends OntologyInternalError {
  /**
   * Creates an instance of LedgerNotSupported.
   *
   * @param cause - Details about the unsupported ledger type
   * @param traceID - Distributed tracing identifier for request correlation
   * @param trace - Stack trace information for debugging
   */
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Ledger not supported", cause ?? null, 500, traceID, trace);
  }
}

export class InvalidOntologyHash extends OntologyInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Invalid ontology hash", cause ?? null, 500, traceID, trace);
  }
}

export class InvalidOntologySignature extends OntologyInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super("Invalid ontology signature", cause ?? null, 500, traceID, trace);
  }
}

export class OntologyFunctionNotAvailable extends OntologyInternalError {
  constructor(
    nonAvailableFunction: string,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(
      `Ontology function ${nonAvailableFunction} stated as not available`,
      cause ?? null,
      500,
      traceID,
      trace,
    );
  }
}

export class OntologyFunctionVariableNotSupported extends OntologyInternalError {
  constructor(
    variable: string,
    ledgerType: string,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(
      `Ontology function variable ${variable} not supported by ledger ${ledgerType}`,
      cause ?? null,
      500,
      traceID,
      trace,
    );
  }
}

export class UnknownInteractionError extends OntologyInternalError {
  constructor(
    interaction: string,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(
      `Unknown interaction type: ${interaction}`,
      cause ?? null,
      500,
      traceID,
      trace,
    );
  }
}

export class InteractionWithoutFunctionError extends OntologyInternalError {
  constructor(
    interaction: string,
    cause?: string | Error | null,
    traceID?: string,
    trace?: string,
  ) {
    super(
      `Interaction ${interaction} does not have any function defined`,
      cause ?? null,
      500,
      traceID,
      trace,
    );
  }
}

export class InvalidBytecodeError extends OntologyInternalError {
  constructor(cause?: string | Error | null, traceID?: string, trace?: string) {
    super(
      "Ontology contains invalid bytecode",
      cause ?? null,
      500,
      traceID,
      trace,
    );
  }
}
