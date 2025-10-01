/**
 * @fileoverview
 * Abstract SATP Bridge Execution Layer interface for cross-chain asset operations.
 *
 * @description
 * This module defines the abstract interface for the SATP Bridge Execution Layer,
 * which serves as the core abstraction for executing cross-chain asset operations
 * within the SATP Hermes framework. The execution layer provides a standardized
 * interface for asset management operations while allowing blockchain-specific
 * implementations to handle network-specific details.
 *
 * **Core Execution Layer Responsibilities:**
 * - Define standardized asset operation interfaces
 * - Provide transaction receipt and proof generation contracts
 * - Enable gateway session data integration
 * - Support smart contract output processing
 * - Ensure SATP protocol compliance across implementations
 * - Facilitate atomic cross-chain transaction execution
 *
 * **SATP Protocol Integration:**
 * The execution layer interface follows IETF SATP Core v2 specification requirements
 * for cross-chain asset operations, including standardized transaction receipts,
 * cryptographic proof generation, and asset lifecycle management.
 *
 * **Implementation Pattern:**
 * Concrete implementations inject gateway session data containing transaction
 * parameters and chain configurations, then process smart contract outputs
 * to generate standardized transaction receipts with proofs.
 *
 * @example
 * Implementing the execution layer interface:
 * ```typescript
 * class CustomExecutionLayer extends SATPBridgeExecutionLayer {
 *   async wrapAsset(asset: Asset): Promise<TransactionReceipt> {
 *     // Blockchain-specific asset wrapping logic
 *     const txResult = await this.blockchain.wrapAsset(asset);
 *
 *     return {
 *       receipt: JSON.stringify(txResult.receipt),
 *       proof: await this.generateProof(txResult)
 *     };
 *   }
 *
 *   // Implement other required methods...
 * }
 * ```
 *
 * @since 2.0.0
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Specification
 * @see {@link SATPBridgeExecutionLayerImpl} for concrete implementation
 * @see {@link Asset} for asset data structures
 * @see {@link TransactionReceipt} for receipt format
 *
 * @author SATP Hermes Development Team
 * @copyright 2024 Hyperledger Foundation
 * @license Apache-2.0
 */

import { Asset } from "./ontology/assets/asset";

/**
 * Transaction receipt interface for SATP bridge operations.
 *
 * @description
 * Standardized transaction receipt format used across all SATP bridge operations
 * to provide consistent transaction information and cryptographic proofs for
 * cross-chain verification. The receipt contains both the raw blockchain
 * transaction receipt and the generated proof for cross-chain validation.
 *
 * **Receipt Components:**
 * - Raw transaction receipt from blockchain network
 * - Cryptographic proof for cross-chain verification
 * - Standardized format across all blockchain implementations
 *
 * @example
 * Transaction receipt structure:
 * ```typescript
 * const receipt: TransactionReceipt = {
 *   receipt: JSON.stringify({
 *     transactionHash: '0x123...',
 *     blockNumber: 12345,
 *     gasUsed: 21000,
 *     status: 1
 *   }),
 *   proof: 'eyJ0eXAiOiJKV1QiLCJhbGc...' // Base64 encoded proof
 * };
 * ```
 *
 * @since 2.0.0
 * @see {@link SATPBridgeExecutionLayer} for usage context
 */
export interface TransactionReceipt {
  /** String-encoded transaction receipt from blockchain network */
  receipt: string;
  /** Cryptographic proof for cross-chain verification */
  proof: string;
}

/**
 * Abstract base class defining the SATP Bridge Execution Layer interface.
 *
 * @description
 * Provides the standardized interface for cross-chain asset operations within
 * the SATP bridge architecture. This abstract class defines the contract that
 * all execution layer implementations must fulfill, ensuring consistent behavior
 * across different blockchain networks while maintaining SATP protocol compliance.
 *
 * **Core Asset Operations:**
 * - Asset wrapping and unwrapping for cross-chain representation
 * - Asset locking and unlocking for atomic transfers
 * - Asset minting and burning for bridge token management
 * - Asset assignment for ownership transfers
 * - Asset existence and lock verification
 *
 * **Implementation Requirements:**
 * Concrete implementations must provide blockchain-specific logic for each
 * operation while maintaining the standardized TransactionReceipt format
 * and ensuring atomic transaction semantics.
 *
 * @example
 * Extending the execution layer:
 * ```typescript
 * class MyExecutionLayer extends SATPBridgeExecutionLayer {
 *   async wrapAsset(asset: Asset): Promise<TransactionReceipt> {
 *     // Implementation specific to your blockchain
 *     const result = await this.deployWrapperAndWrap(asset);
 *     return {
 *       receipt: JSON.stringify(result.receipt),
 *       proof: await this.generateSATPProof(result)
 *     };
 *   }
 * }
 * ```
 *
 * @abstract
 * @since 2.0.0
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4
 * @see {@link TransactionReceipt} for receipt format
 * @see {@link Asset} for asset data structures
 */
export abstract class SATPBridgeExecutionLayer {
  /**
   * Wraps an asset into the bridge wrapper contract for cross-chain operations.
   *
   * @description
   * Encapsulates a native blockchain asset within the bridge wrapper contract,
   * enabling it to participate in cross-chain transfer operations. This operation
   * transfers custody of the original asset to the bridge while creating a
   * bridge-managed representation that can be transferred across networks.
   *
   * **Wrapping Process:**
   * - Validates asset ownership and transfer permissions
   * - Transfers asset custody to bridge wrapper contract
   * - Creates bridge-managed asset representation
   * - Generates transaction receipt with cross-chain proof
   * - Records asset metadata for tracking and verification
   *
   * @param asset - Asset to be wrapped with ownership and metadata details
   * @returns Promise resolving to transaction receipt with wrapping proof
   *
   * @throws {AssetValidationError} When asset validation fails
   * @throws {InsufficientBalanceError} When asset balance is insufficient
   * @throws {WrapperContractError} When wrapper contract interaction fails
   *
   * @since 2.0.0
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.1
   */
  public abstract wrapAsset(asset: Asset): Promise<TransactionReceipt>;
  /**
   * Unwraps a bridge-managed asset back to its native blockchain representation.
   *
   * @description
   * Releases a previously wrapped asset from the bridge wrapper contract,
   * returning custody of the original native asset to the specified owner.
   * This operation reverses the wrapping process and concludes the asset's
   * participation in cross-chain operations on the current network.
   *
   * **Unwrapping Process:**
   * - Validates asset ownership and unwrapping permissions
   * - Burns or destroys bridge-managed asset representation
   * - Releases native asset custody from wrapper contract
   * - Transfers native asset back to owner
   * - Generates unwrapping transaction receipt and proof
   *
   * @param asset - Bridge-managed asset to be unwrapped
   * @returns Promise resolving to transaction receipt with unwrapping proof
   *
   * @throws {AssetNotFoundError} When asset does not exist
   * @throws {UnauthorizedUnwrapError} When caller lacks unwrapping permissions
   * @throws {WrapperContractError} When wrapper contract interaction fails
   *
   * @since 2.0.0
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.1
   */
  public abstract unwrapAsset(asset: Asset): Promise<TransactionReceipt>;
  /**
   * Locks an asset in the bridge wrapper contract for cross-chain transfer.
   *
   * @description
   * Securely locks an asset within the bridge wrapper contract, preventing
   * local access while enabling cross-chain transfer operations. The asset
   * remains under bridge control until the cross-chain operation completes
   * or fails, ensuring atomic cross-chain transfer semantics.
   *
   * **Asset Locking Process:**
   * - Validates asset ownership and lock permissions
   * - Creates time-bounded asset lock with escrow conditions
   * - Generates cryptographic proof of asset custody
   * - Records lock metadata for cross-chain verification
   * - Emits lock event for cross-chain monitoring
   *
   * @param asset - Asset to be locked with amount and ownership details
   * @returns Promise resolving to transaction receipt with lock proof
   *
   * @throws {AssetValidationError} When asset validation fails
   * @throws {InsufficientBalanceError} When asset balance is insufficient
   * @throws {AssetAlreadyLockedError} When asset is already locked
   * @throws {WrapperContractError} When wrapper contract interaction fails
   *
   * @since 2.0.0
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.2
   */
  public abstract lockAsset(asset: Asset): Promise<TransactionReceipt>;
  /**
   * Unlocks a previously locked asset from the bridge wrapper contract.
   *
   * @description
   * Releases an asset from its locked state within the bridge wrapper contract,
   * typically following a failed cross-chain transfer or timeout. This operation
   * restores local access to the asset and cancels any pending cross-chain
   * operations, ensuring asset availability to the original owner.
   *
   * **Asset Unlocking Process:**
   * - Validates unlock conditions and permissions
   * - Verifies lock timeout or failure conditions
   * - Removes asset lock and escrow constraints
   * - Restores asset access to original owner
   * - Generates unlock transaction receipt and proof
   *
   * @param asset - Locked asset to be unlocked
   * @returns Promise resolving to transaction receipt with unlock proof
   *
   * @throws {AssetNotFoundError} When asset does not exist
   * @throws {AssetNotLockedError} When asset is not currently locked
   * @throws {UnauthorizedUnlockError} When caller lacks unlock permissions
   * @throws {LockTimeoutNotReachedError} When lock timeout has not been reached
   * @throws {WrapperContractError} When wrapper contract interaction fails
   *
   * @since 2.0.0
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.2
   */
  public abstract unlockAsset(asset: Asset): Promise<TransactionReceipt>;
  /**
   * Mints a new asset representation in the bridge wrapper contract.
   *
   * @description
   * Creates a new asset representation within the bridge wrapper contract,
   * typically as the destination side of a cross-chain transfer operation.
   * This process generates bridge-controlled assets that correspond to assets
   * locked on the source blockchain, maintaining cross-chain balance invariants.
   *
   * **Asset Minting Process:**
   * - Validates cross-chain proof and authorization
   * - Verifies asset minting permissions and limits
   * - Creates new asset representation with specified properties
   * - Assigns asset ownership to designated recipient
   * - Records minting metadata for cross-chain tracking
   *
   * @param asset - Asset specification for minting with recipient details
   * @returns Promise resolving to transaction receipt with minting proof
   *
   * @throws {UnauthorizedMintingError} When caller lacks minting permissions
   * @throws {AssetValidationError} When asset specification is invalid
   * @throws {ExceedsSupplyLimitError} When minting would exceed supply limits
   * @throws {WrapperContractError} When wrapper contract interaction fails
   *
   * @since 2.0.0
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.3
   */
  public abstract mintAsset(asset: Asset): Promise<TransactionReceipt>;
  /**
   * Burns an asset representation from the bridge wrapper contract.
   *
   * @description
   * Destroys an asset representation within the bridge wrapper contract,
   * typically as the source side of a cross-chain transfer operation.
   * This process removes bridge-controlled assets while enabling the
   * unlocking of corresponding assets on the destination blockchain.
   *
   * **Asset Burning Process:**
   * - Validates asset ownership and burning permissions
   * - Verifies asset existence and availability for burning
   * - Destroys specified asset from circulation
   * - Generates cryptographic proof of asset destruction
   * - Records burning metadata for cross-chain verification
   *
   * @param asset - Asset to be burned from bridge wrapper contract
   * @returns Promise resolving to transaction receipt with burning proof
   *
   * @throws {AssetNotFoundError} When asset does not exist
   * @throws {UnauthorizedBurningError} When caller lacks burning permissions
   * @throws {InsufficientBalanceError} When asset balance is insufficient
   * @throws {WrapperContractError} When wrapper contract interaction fails
   *
   * @since 2.0.0
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.3
   */
  public abstract burnAsset(asset: Asset): Promise<TransactionReceipt>;
  /**
   * Assigns an asset to a recipient address within the bridge wrapper contract.
   *
   * @description
   * Transfers ownership of an asset within the bridge wrapper contract to a
   * designated recipient. This operation is typically used during cross-chain
   * transfers to assign newly minted assets to their intended recipients or
   * redistribute assets based on transfer conditions.
   *
   * **Asset Assignment Process:**
   * - Validates current asset ownership and transfer permissions
   * - Verifies recipient address validity and compliance
   * - Transfers asset ownership to recipient account
   * - Updates asset ownership records and metadata
   * - Generates assignment transaction receipt and proof
   *
   * @param asset - Asset to be assigned with recipient information
   * @returns Promise resolving to transaction receipt with assignment proof
   *
   * @throws {AssetNotFoundError} When asset does not exist
   * @throws {UnauthorizedAssignmentError} When caller lacks assignment permissions
   * @throws {InvalidRecipientError} When recipient address is invalid
   * @throws {WrapperContractError} When wrapper contract interaction fails
   *
   * @since 2.0.0
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.4
   */
  public abstract assignAsset(asset: Asset): Promise<TransactionReceipt>;
  /**
   * Verifies the existence of an asset on the blockchain network.
   *
   * @description
   * Queries the blockchain to confirm whether a specific asset exists within
   * the bridge wrapper contract or native blockchain state. This verification
   * is essential for cross-chain operations to ensure asset availability
   * before attempting transfer operations.
   *
   * **Verification Process:**
   * - Queries blockchain state for asset existence
   * - Validates asset metadata and ownership information
   * - Checks asset availability for operations
   * - Returns verification status with confidence level
   *
   * @param assetId - Unique identifier of the asset to verify
   * @param invocationType - Blockchain-specific invocation method (call/send)
   * @returns Promise resolving to verification result or undefined if inconclusive
   *
   * @throws {InvalidAssetIdError} When asset ID format is invalid
   * @throws {NetworkConnectivityError} When blockchain network is unreachable
   * @throws {ContractQueryError} When contract query fails
   *
   * @since 2.0.0
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.5
   */
  public abstract verifyAssetExistence(
    assetId: string,
    invocationType: unknown,
  ): Promise<boolean | undefined>;
  /**
   * Verifies if an asset is currently locked within the bridge wrapper contract.
   *
   * @description
   * Queries the blockchain to determine the lock status of a specific asset
   * within the bridge wrapper contract. This verification is crucial for
   * cross-chain transfer operations to ensure assets are properly secured
   * before initiating cross-chain operations.
   *
   * **Lock Verification Process:**
   * - Queries bridge wrapper contract for asset lock status
   * - Validates lock conditions and timeout parameters
   * - Checks lock ownership and authorization details
   * - Returns lock status with expiration information
   *
   * @param assetId - Unique identifier of the asset to check for lock status
   * @param invocationType - Blockchain-specific invocation method (call/send)
   * @returns Promise resolving to lock verification result or undefined if inconclusive
   *
   * @throws {InvalidAssetIdError} When asset ID format is invalid
   * @throws {NetworkConnectivityError} When blockchain network is unreachable
   * @throws {ContractQueryError} When wrapper contract query fails
   *
   * @since 2.0.0
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.5
   */
  public abstract verifyLockAsset(
    assetId: string,
    invocationType: unknown,
  ): Promise<boolean | undefined>;
}
