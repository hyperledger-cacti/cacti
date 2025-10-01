/**
 * @fileoverview
 * SATP Protocol Utilities - Helper Functions for SATP Operations
 *
 * @description
 * This module provides essential utility functions for SATP (Secure Asset Transfer Protocol)
 * operations within the Hyperledger Cacti ecosystem. These utilities support protocol
 * message handling, type conversions, and common operations used throughout the SATP
 * implementation.
 *
 * **Core Functionality:**
 * - **Message Type Utilities**: Helper functions for protocol message type handling
 * - **Type Conversions**: Conversion utilities for protocol enums and types
 * - **Protocol Helpers**: Common operations for SATP protocol compliance
 * - **Validation Support**: Utilities for protocol validation and verification
 *
 * **Integration Context:**
 * These utilities are used across all SATP components including services, handlers,
 * sessions, and stage implementations to provide consistent protocol operations
 * and message handling capabilities.
 *
 * @author SATP Development Team
 * @since 2.0.0
 * @version 2.0.0
 * @see {@link MessageType} for message type enumeration
 * @see {@link getEnumKeyByValue} for enum utility functions
 */

import { MessageType } from "../generated/proto/cacti/satp/v02/common/message_pb";
import { getEnumKeyByValue } from "../services/utils";

/**
 * Retrieves the human-readable name for a SATP message type.
 *
 * @description
 * Converts MessageType enum values to their corresponding string names for
 * logging, debugging, and human-readable output. Provides fallback handling
 * for undefined or unspecified message types.
 *
 * @public
 * @function getMessageTypeName
 * @param {MessageType | undefined} messageType - Message type enum value
 * @returns {string} Human-readable message type name
 * @since 2.0.0
 */
export function getMessageTypeName(
  messageType: MessageType | undefined,
): string {
  return (
    (messageType
      ? getEnumKeyByValue(MessageType, messageType)
      : getEnumKeyByValue(MessageType, MessageType.UNSPECIFIED)) ||
    "UNSPECIFIED"
  );
}
