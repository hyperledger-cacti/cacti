/**
 * @fileoverview
 * Utility functions for SATP protocol stage handlers and message processing.
 *
 * @description
 * This module provides common utility functions used across all SATP protocol stage handlers
 * for consistent message processing, session management, and protocol compliance validation.
 * These utilities ensure standardized handling of SATP message structures and session data
 * according to the IETF SATP Core v2 specification.
 *
 * **Core Utilities:**
 * - **Session ID Extraction**: Safe extraction of session identifiers from SATP messages
 * - **Message Validation**: Common validation logic for protocol message structures
 * - **Error Handling**: Standardized error reporting for handler operations
 *
 * **Usage Context:**
 * These utilities are used by all SATP stage handlers (Stage 0-3) to ensure consistent
 * message processing and session management across the entire cross-chain transfer workflow.
 * They provide a unified interface for common operations while maintaining protocol compliance.
 *
 * @example
 * Session ID extraction in stage handlers:
 * ```typescript
 * import { getSessionId } from './handler-utils';
 *
 * async function processMessage(request: SatpMessage) {
 *   try {
 *     const sessionId = getSessionId(request);
 *     const session = this.sessions.get(sessionId);
 *     // Process message with valid session
 *   } catch (error) {
 *     // Handle session ID extraction errors
 *   }
 * }
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Specification
 * @see {@link SessionIdNotFoundError} for session validation error handling
 *
 * @author SATP Hermes Development Team
 * @copyright 2024 Hyperledger Foundation
 * @license Apache-2.0
 */

import { SessionIdNotFoundError } from "../errors/satp-handler-errors";

/**
 * Safely extracts the session ID from a SATP protocol message.
 *
 * @description
 * Retrieves the session identifier from the common fields of SATP protocol messages,
 * ensuring proper validation and error handling for missing or invalid session IDs.
 * This function is used across all stage handlers to maintain consistent session
 * identification and tracking throughout the cross-chain transfer workflow.
 *
 * **Session ID Requirements:**
 * - Must be present in the message's common field structure
 * - Must be a valid non-empty string identifier
 * - Used for session lookup and message routing
 * - Critical for maintaining transfer state consistency
 *
 * **Protocol Compliance:**
 * According to the IETF SATP Core v2 specification, all protocol messages must
 * include a session identifier in their common message fields to enable proper
 * session management and message correlation across the transfer workflow.
 *
 * **Error Handling:**
 * Throws SessionIdNotFoundError if the session ID is missing, undefined, or empty,
 * providing clear error context for debugging and protocol compliance validation.
 *
 * @function getSessionId
 * @param {any} obj - SATP protocol message object containing common fields
 * @returns {string} The extracted session identifier
 * @throws {SessionIdNotFoundError} When session ID is missing or invalid
 *
 * @example
 * Basic session ID extraction:
 * ```typescript
 * const transferRequest = {
 *   common: {
 *     sessionId: 'satp-session-123-abc',
 *     messageType: MessageType.TRANSFER_COMMENCE_REQUEST,
 *     // ... other common fields
 *   },
 *   // ... message-specific fields
 * };
 *
 * try {
 *   const sessionId = getSessionId(transferRequest);
 *   console.log(`Processing session: ${sessionId}`);
 * } catch (error) {
 *   if (error instanceof SessionIdNotFoundError) {
 *     console.error('Invalid message: missing session ID');
 *   }
 * }
 * ```
 *
 * @example
 * Stage handler usage pattern:
 * ```typescript
 * class Stage1SATPHandler {
 *   async processTransferProposal(request: TransferProposalRequest) {
 *     const sessionId = getSessionId(request);
 *     const session = this.sessions.get(sessionId);
 *
 *     if (!session) {
 *       throw new SessionNotFoundError(`Session ${sessionId} not found`);
 *     }
 *
 *     // Continue with message processing
 *   }
 * }
 * ```
 *
 * @example
 * Error handling with logging:
 * ```typescript
 * function processIncomingMessage(message: any) {
 *   try {
 *     const sessionId = getSessionId(message);
 *     return processWithSession(sessionId, message);
 *   } catch (error) {
 *     if (error instanceof SessionIdNotFoundError) {
 *       logger.error('Message validation failed', {
 *         error: error.message,
 *         messageType: message.type,
 *         timestamp: Date.now()
 *       });
 *     }
 *     throw error;
 *   }
 * }
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link SessionIdNotFoundError} for specific error type
 * @see {@link SATPHandler} for stage handler interface
 */
export function getSessionId(obj: any): string {
  if (!obj.common.sessionId) {
    throw new SessionIdNotFoundError("getSessionId");
  }
  return obj.common.sessionId;
}
