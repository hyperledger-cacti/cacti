/**
 * @fileoverview SATP Oracle Type Definitions
 *
 * This module provides core type definitions and interfaces for SATP oracle
 * operations. Defines data structures for oracle entries, event listeners,
 * and cross-chain computation task parameters used across oracle implementations.
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @author Hyperledger Cacti Contributors
 * @since 0.0.3-beta
 */

/**
 * Base interface for oracle ledger update operations.
 *
 * Defines the structure for oracle operations that update ledger state
 * with computed results, including contract interaction parameters and
 * method invocation details for cross-chain operations.
 *
 * @since 0.0.3-beta
 * @example
 * ```typescript
 * const oracleEntry: IOracleEntryBase = {
 *   contractName: 'SATWrapper',
 *   methodName: 'updateAssetState',
 *   params: ['asset-id-123', 'new-state-value', timestamp]
 * };
 * ```
 */
export interface IOracleEntryBase {
  /** Name of the target contract for the operation */
  contractName: string;
  /** Method name to invoke on the contract */
  methodName: string;
  /** Parameters to pass to the contract method */
  params: any[];
}

/**
 * Base interface for oracle event listener configuration.
 *
 * Defines the structure for setting up event listeners on blockchain
 * networks to trigger oracle computations based on on-chain events
 * as part of cross-chain coordination workflows.
 *
 * @since 0.0.3-beta
 * @example
 * ```typescript
 * const oracleListener: IOracleListenerBase = {
 *   contractName: 'AssetContract',
 *   contractAddress: '0x1234567890abcdef...',
 *   contractAbi: [{ type: 'event', name: 'AssetLocked', ... }],
 *   eventSignature: 'AssetLocked(address,uint256)'
 * };
 * ```
 */
export interface IOracleListenerBase {
  /** Name of the contract to listen to */
  contractName: string;
  /** Deployed contract address */
  contractAddress: string;
  /** Contract ABI for event parsing */
  contractAbi: object[];
  /** Event signature to listen for */
  eventSignature: string;
}

// export type IOracleRepeatableTask = OracleTask & {
//   mode: OracleRegisterRequestTaskModeEnum;
//   pollingInterval?: number;
//   srcEventSignature?: string;
//   // trigger: () => void;
// };
