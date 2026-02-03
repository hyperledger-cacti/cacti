/**
 * @fileoverview Network Identification - Blockchain network identification interface
 *
 * This module defines the NetworkId interface for identifying blockchain networks
 * in SATP cross-chain asset transfers. Provides a consistent structure for
 * representing different distributed ledger technologies (DLTs) across the
 * SATP protocol implementation.
 *
 * @module NetworkIdentification
 * @since 0.0.3-beta
 */

import { LedgerType } from "@hyperledger-cacti/cactus-core-api";

/**
 * Network identification structure for blockchain networks in SATP operations.
 *
 * @description
 * Defines the structure for uniquely identifying blockchain networks participating
 * in SATP cross-chain asset transfers. Combines a string identifier with ledger
 * type classification to enable proper routing, validation, and protocol handling
 * for different blockchain platforms.
 *
 * **Usage Context:**
 * Used throughout SATP gateway operations to:
 * - Identify source and destination networks in asset transfers
 * - Route transactions to appropriate blockchain connectors
 * - Validate network compatibility for cross-chain operations
 * - Configure bridge mechanisms for specific DLT types
 *
 * @interface NetworkId
 *
 * @property {string} id - Unique network identifier (e.g., "ethereum-mainnet", "fabric-channel1")
 * @property {LedgerType} ledgerType - Classification of the blockchain platform type
 *
 * @example
 * ```typescript
 * const ethereumNetwork: NetworkId = {
 *   id: "ethereum-mainnet",
 *   ledgerType: LedgerType.Ethereum
 * };
 *
 * const fabricNetwork: NetworkId = {
 *   id: "fabric-channel1",
 *   ledgerType: LedgerType.Fabric2
 * };
 * ```
 *
 * @see {@link LedgerType} for supported blockchain platform types
 * @see {@link GatewayIdentity} for gateway network configuration
 * @see {@link INetworkOptions} for network connection options
 *
 * @todo Implement full network identification draft specification
 * @since 0.0.3-beta
 */
export interface NetworkId {
  /** Unique identifier for the blockchain network */
  id: string;
  /** Type of distributed ledger technology (DLT) */
  ledgerType: LedgerType;
}
