/**
 * @fileoverview SATP Bridge Type Definitions
 *
 * This module provides core type definitions and interfaces for SATP bridge
 * operations. Defines common data structures used across bridge implementations
 * for transaction handling, network configuration, and cross-chain coordination.
 *
 * The type definitions include:
 * - Transaction response structures
 * - Network configuration options
 * - Bridge operation parameters
 * - Cross-chain interaction types
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @author Hyperledger Cacti Contributors
 * @since 0.0.3-beta
 */

import { NetworkId } from "../../public-api";

/**
 * Response structure for bridge transaction operations.
 *
 * Provides standardized response format for cross-chain transaction
 * execution including transaction identifiers, receipts, and operation
 * outputs across different blockchain networks.
 *
 * @since 0.0.3-beta
 * @example
 * ```typescript
 * const response: TransactionResponse = {
 *   transactionId: '0x1234...',
 *   transactionReceipt: '{"status": "success"}',
 *   output: { assetId: 'asset-123', amount: '1000' }
 * };
 * ```
 */
export interface TransactionResponse {
  /** Unique identifier for the transaction */
  transactionId?: string;
  /** Transaction receipt from the blockchain */
  transactionReceipt?: string;
  /** Operation-specific output data */
  output?: unknown;
}

/**
 * Network configuration options for bridge operations.
 *
 * Defines the network identification and configuration parameters
 * required for establishing bridge connections to specific blockchain
 * networks within the SATP ecosystem.
 *
 * @since 0.0.3-beta
 * @example
 * ```typescript
 * const networkOptions: INetworkOptions = {
 *   networkIdentification: {
 *     id: 'ethereum-mainnet',
 *     ledgerType: LedgerType.Ethereum
 *   }
 * };
 * ```
 */
export interface INetworkOptions {
  /** Network identification parameters */
  networkIdentification: NetworkId;
}
