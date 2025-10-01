/**
 * @fileoverview SATP Cross-Chain Mechanism Utilities
 *
 * This module provides common utility functions for SATP cross-chain
 * operations including credential validation, type guards, and helper
 * functions used across bridge and oracle implementations.
 *
 * The utilities include:
 * - Credential type validation functions
 * - Network configuration helpers
 * - Cross-chain operation type guards
 * - Common transformation utilities
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @author Hyperledger Cacti Contributors
 * @since 0.0.2-beta
 */

import {
  Web3SigningCredentialType,
  Web3SigningCredentialNone,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";

/**
 * Type guard function to check if a credential is of type None.
 *
 * Validates whether a Web3 signing credential object represents
 * a "None" credential type, which indicates no signing credentials
 * are provided for the operation.
 *
 * @param x - Credential object to validate
 * @returns True if the credential type is None, false otherwise
 * @since 0.0.2-beta
 * @example
 * ```typescript
 * const credential = { type: Web3SigningCredentialType.None };
 * if (isWeb3SigningCredentialNone(credential)) {
 *   console.log('No signing credentials provided');
 * }
 * ```
 */
export function isWeb3SigningCredentialNone(x?: {
  type?: Web3SigningCredentialType;
}): x is Web3SigningCredentialNone {
  return x?.type === Web3SigningCredentialType.None;
}
