import { Amount, Asset } from "./ontology/assets/asset";
/**
 * @fileoverview
 * SATP Bridge Leaf Fungible Asset Interface for cross-chain fungible token operations.
 *
 * Defines the abstract interface for bridge leaf components that handle fungible digital
 * assets (tokens with divisible amounts) in SATP cross-chain transfer operations. This
 * interface establishes the contract for asset wrapping, locking, minting, burning, and
 * assignment operations required for secure atomic cross-chain transfers.
 *
 * **SATP Protocol Context:**
 * - Asset Wrapping: Encapsulation of native assets for cross-chain representation
 * - Asset Locking: Phase 2 lock operations for atomic transfers
 * - Asset Minting: Phase 3 asset creation on destination networks
 * - Asset Burning: Phase 3 asset destruction on source networks
 * - Asset Assignment: Ownership transfer within cross-chain operations
 *
 * **Fungible Asset Operations:**
 * - Wrapper contract deployment and management
 * - Asset amount-based operations (lock, mint, burn with quantities)
 * - Transaction receipt retrieval and validation
 * - Cross-chain proof generation and verification
 *
 * @module BridgeLeafFungible
 *
 * @example
 * Implementing fungible bridge leaf:
 * ```typescript
 * class EthereumFungibleLeaf extends BridgeLeafFungible {
 *   async wrapAsset(asset: Asset): Promise<TransactionResponse> {
 *     const wrapperContract = await this.getWrapperContract();
 *     return await wrapperContract.wrap(
 *       asset.contractAddress,
 *       asset.id,
 *       asset.amount
 *     );
 *   }
 *
 *   async lockAsset(assetId: string, amount: number): Promise<TransactionResponse> {
 *     return await this.wrapperContract.lock(assetId, amount);
 *   }
 * }
 * ```
 *
 * @example
 * Cross-chain fungible transfer coordination:
 * ```typescript
 * const sourceLeaf = new EthereumFungibleLeaf(sourceConfig);
 * const targetLeaf = new FabricFungibleLeaf(targetConfig);
 *
 * // Phase 2: Lock asset on source network
 * const lockResult = await sourceLeaf.lockAsset(asset.id, transferAmount);
 *
 * // Phase 3: Mint on target, burn on source
 * await targetLeaf.mintAsset(targetAsset.id, transferAmount);
 * await sourceLeaf.burnAsset(asset.id, transferAmount);
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @see {@link BridgeLeaf} for base bridge leaf interface
 * @see {@link BridgeLeafNonFungible} for non-fungible asset operations
 * @see {@link SATPBridgeExecutionLayer} for higher-level execution coordination
 */

import { TransactionResponse } from "./bridge-types";

/**
 * Abstract interface for SATP bridge leaf operations on fungible digital assets.
 *
 * @description
 * Defines the contract for bridge leaf components that handle fungible assets (tokens
 * with divisible amounts) in cross-chain transfer operations. This interface provides
 * the essential methods required for asset wrapping, locking, minting, burning, and
 * assignment operations within the SATP protocol framework.
 *
 * **Fungible Asset Characteristics:**
 * - Divisible token amounts supporting fractional transfers
 * - Amount-based locking and unlocking operations
 * - Quantity-specific minting and burning operations
 * - Batch processing capabilities for multiple asset operations
 * - Decimal precision handling for accurate amount transfers
 *
 * **SATP Protocol Integration:**
 * - Phase 1: Asset definition and wrapper contract deployment
 * - Phase 2: Asset locking with amount specification
 * - Phase 3: Coordinated minting and burning with precise amounts
 * - Recovery: Amount-specific rollback and unlock operations
 *
 * @abstract
 * @class BridgeLeafFungible
 *
 * @example
 * Implementing ERC20 fungible bridge leaf:
 * ```typescript
 * class ERC20BridgeLeaf extends BridgeLeafFungible {
 *   async deployFungibleWrapperContract(): Promise<void> {
 *     const contract = await this.deployContract(ERC20WrapperABI);
 *     this.wrapperAddress = contract.address;
 *   }
 *
 *   async lockAsset(assetId: string, amount: number): Promise<TransactionResponse> {
 *     const tx = await this.wrapperContract.lock(assetId, amount);
 *     return { transactionId: tx.hash, transactionReceipt: tx.receipt };
 *   }
 * }
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.2
 * @see {@link Asset} for asset data structure definition
 * @see {@link TransactionResponse} for transaction result interface
 * @see {@link BridgeLeaf} for base bridge leaf functionality
 */
export abstract class BridgeLeafFungible {
  /**
   * Deploys the fungible asset wrapper contract to the blockchain network.
   *
   * @description
   * Deploys the smart contract that manages fungible asset wrapping, locking, and
   * cross-chain operations. The wrapper contract serves as the bridge between native
   * blockchain assets and the SATP protocol representation, enabling secure asset
   * custody and atomic cross-chain transfers.
   *
   * **Wrapper Contract Capabilities:**
   * - Asset wrapping and unwrapping operations
   * - Amount-based asset locking and unlocking
   * - Controlled asset minting and burning
   * - Asset ownership assignment and transfers
   * - Cross-chain proof generation and validation
   *
   * @returns Promise resolving when wrapper contract deployment completes
   *
   * @throws {ContractDeploymentError} When contract deployment fails
   * @throws {InsufficientGasError} When transaction gas is insufficient
   * @throws {NetworkConnectivityError} When blockchain network is unreachable
   *
   * @example
   * Deploying Ethereum ERC20 wrapper:
   * ```typescript
   * await ethereumLeaf.deployFungibleWrapperContract();
   * const wrapperAddress = ethereumLeaf.getWrapperContract('FUNGIBLE');
   * console.log(`Wrapper deployed at: ${wrapperAddress}`);
   * ```
   *
   * @since 0.0.3-beta
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.1
   * @see {@link getDeployFungibleWrapperContractReceipt} for deployment receipt retrieval
   * @see {@link wrapAsset} for asset wrapping operations
   */
  public abstract deployWrapperContract(): Promise<void>;

  /**
   * Retrieves the deployment receipt for the fungible wrapper contract.
   *
   * @description
   * Returns the blockchain transaction receipt containing deployment details for
   * the fungible asset wrapper contract. The receipt provides essential information
   * including contract address, deployment transaction hash, gas usage, and
   * deployment status verification.
   *
   * **Receipt Information:**
   * - Contract deployment address
   * - Transaction hash and block confirmation
   * - Gas usage and transaction fees
   * - Deployment status and error details
   * - Contract creation event logs
   *
   * @returns Deployment receipt containing contract address and transaction details
   *
   * @throws {ReceiptNotFoundError} When deployment receipt is not available
   * @throws {ContractNotDeployedError} When wrapper contract has not been deployed
   *
   * @example
   * Retrieving deployment receipt:
   * ```typescript
   * const receipt = ethereumLeaf.getDeployFungibleWrapperContractReceipt();
   * console.log(`Contract deployed at: ${receipt.contractAddress}`);
   * console.log(`Gas used: ${receipt.gasUsed}`);
   * ```
   *
   * @since 0.0.3-beta
   * @see {@link deployFungibleWrapperContract} for wrapper contract deployment
   * @see {@link TransactionResponse} for transaction response structure
   */
  public abstract getDeployWrapperContractReceipt(): unknown;

  /**
   * Wraps a native blockchain asset into the SATP bridge wrapper contract.
   *
   * @description
   * Encapsulates a native fungible asset (such as ERC20 tokens or native coins) into
   * the bridge wrapper contract, enabling it to participate in cross-chain transfer
   * operations. This process creates a bridge-managed representation of the asset
   * while maintaining custody of the original asset.
   *
   * **Wrapping Process:**
   * - Validates asset ownership and transfer approval
   * - Transfers asset custody to wrapper contract
   * - Creates bridge-managed asset representation
   * - Generates wrapping transaction receipt and proof
   * - Records asset metadata for cross-chain operations
   *
   * @param asset - Fungible asset to be wrapped with amount and ownership details
   * @returns Promise resolving to transaction response with receipt and ID
   *
   * @throws {AssetValidationError} When asset validation fails
   * @throws {InsufficientBalanceError} When asset balance is insufficient
   * @throws {ApprovalRequiredError} When asset approval is required but missing
   * @throws {WrapperContractError} When wrapper contract interaction fails
   *
   * @example
   * Wrapping ERC20 tokens:
   * ```typescript
   * const erc20Asset: Asset = {
   *   id: 'token-123',
   *   contractAddress: '0x742d35Cc...',
   *   amount: '1000.5',
   *   owner: '0x123abc...'
   * };
   *
   * const wrapResult = await ethereumLeaf.wrapAsset(erc20Asset);
   * console.log(`Wrapped in tx: ${wrapResult.transactionId}`);
   * ```
   *
   * @since 0.0.3-beta
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.1
   * @see {@link unwrapAsset} for asset unwrapping operations
   * @see {@link Asset} for asset data structure
   * @see {@link TransactionResponse} for response format
   */
  public abstract wrapAsset(asset: Asset): Promise<TransactionResponse>;

  /**
   * Unwraps a bridge-managed asset back to its native blockchain representation.
   *
   * @description
   * Releases a previously wrapped fungible asset from the bridge wrapper contract,
   * returning custody of the original native asset to the specified owner. This
   * operation reverses the wrapping process and concludes the asset's participation
   * in cross-chain operations on the current network.
   *
   * **Unwrapping Process:**
   * - Validates asset ownership and unwrapping permissions
   * - Burns or destroys the bridge-managed asset representation
   * - Releases native asset custody from wrapper contract
   * - Transfers native asset back to owner
   * - Generates unwrapping transaction receipt and proof
   *
   * @param assetId - Unique identifier of the wrapped asset to be unwrapped
   * @returns Promise resolving to transaction response with receipt and ID
   *
   * @throws {AssetNotFoundError} When specified asset ID does not exist
   * @throws {UnauthorizedUnwrapError} When caller lacks unwrapping permissions
   * @throws {InsufficientWrappedBalanceError} When wrapped balance is insufficient
   * @throws {WrapperContractError} When wrapper contract interaction fails
   *
   * @example
   * Unwrapping asset to native form:
   * ```typescript
   * const unwrapResult = await ethereumLeaf.unwrapAsset('wrapped-token-123');
   * console.log(`Unwrapped in tx: ${unwrapResult.transactionId}`);
   *
   * // Asset is now back in native ERC20 form
   * const nativeBalance = await erc20Contract.balanceOf(ownerAddress);
   * ```
   *
   * @since 0.0.3-beta
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.1
   * @see {@link wrapAsset} for asset wrapping operations
   * @see {@link TransactionResponse} for response format
   */
  public abstract unwrapAsset(assetId: string): Promise<TransactionResponse>;

  /**
   * Locks a specified amount of a fungible asset in the bridge wrapper contract.
   *
   * @description
   * Securely locks a specified amount of a fungible asset within the bridge wrapper
   * contract, preventing local access while enabling cross-chain transfer operations.
   * The asset remains under bridge control until the cross-chain operation completes
   * or fails, ensuring atomic cross-chain transfer semantics.
   *
   * **Asset Locking Process:**
   * - Validates asset existence and ownership permissions
   * - Creates time-bounded asset lock with specified amount
   * - Generates cryptographic proof of asset custody
   * - Records lock metadata for cross-chain verification
   * - Emits lock event for cross-chain monitoring
   *
   * @param assetId - Unique identifier of the asset to be locked
   * @param amount - Amount of the asset to be locked (in asset's base units)
   * @returns Promise resolving to transaction response with lock receipt and proof
   *
   * @throws {AssetNotFoundError} When specified asset ID does not exist
   * @throws {InsufficientBalanceError} When asset balance is insufficient for locking
   * @throws {AssetAlreadyLockedError} When specified asset amount is already locked
   * @throws {WrapperContractError} When wrapper contract interaction fails
   *
   * @example
   * Locking specific amount for cross-chain transfer:
   * ```typescript
   * const lockResult = await ethereumLeaf.lockAsset('usdc-token-456', 500.0);
   * console.log(`Locked 500 USDC in tx: ${lockResult.transactionId}`);
   *
   * // Asset amount is now locked and ready for cross-chain transfer
   * ```
   *
   * @since 0.0.3-beta
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.2
   * @see {@link unlockAsset} for asset unlocking operations
   * @see {@link TransactionResponse} for response format
   */
  public abstract lockAsset(
    assetId: string,
    amount: Amount,
  ): Promise<TransactionResponse>;

  /**
   * Unlocks a specified amount of a previously locked fungible asset.
   *
   * @description
   * Releases a specified amount of a fungible asset from its locked state within
   * the bridge wrapper contract, typically following a failed cross-chain transfer
   * or timeout. This operation restores local access to the specified asset amount
   * and cancels pending cross-chain operations for that amount.
   *
   * **Asset Unlocking Process:**
   * - Validates unlock conditions and permissions
   * - Verifies lock timeout or failure conditions
   * - Removes asset lock for specified amount
   * - Restores asset access to original owner
   * - Generates unlock transaction receipt and proof
   *
   * @param assetId - Unique identifier of the locked asset to be unlocked
   * @param amount - Amount of the asset to be unlocked (in asset's base units)
   * @returns Promise resolving to transaction response with unlock receipt
   *
   * @throws {AssetNotFoundError} When specified asset ID does not exist
   * @throws {AssetNotLockedError} When asset or amount is not currently locked
   * @throws {UnauthorizedUnlockError} When caller lacks unlock permissions
   * @throws {LockTimeoutNotReachedError} When lock timeout has not been reached
   * @throws {WrapperContractError} When wrapper contract interaction fails
   *
   * @example
   * Unlocking specific amount after transfer failure:
   * ```typescript
   * try {
   *   const unlockResult = await ethereumLeaf.unlockAsset('usdc-token-456', 500.0);
   *   console.log(`Unlocked 500 USDC in tx: ${unlockResult.transactionId}`);
   * } catch (error) {
   *   if (error instanceof LockTimeoutNotReachedError) {
   *     console.log('Lock timeout not reached, asset still in transfer');
   *   }
   * }
   * ```
   *
   * @since 0.0.3-beta
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.2
   * @see {@link lockAsset} for asset locking operations
   * @see {@link TransactionResponse} for response format
   */
  public abstract unlockAsset(
    assetId: string,
    amount: Amount,
  ): Promise<TransactionResponse>;

  /**
   * Mints a specified amount of a fungible asset in the bridge wrapper contract.
   *
   * @description
   * Creates a specified amount of a fungible asset representation within the bridge
   * wrapper contract, typically as the destination side of a cross-chain transfer
   * operation. This process generates bridge-controlled assets that correspond to
   * assets locked on the source blockchain, maintaining cross-chain asset balance invariants.
   *
   * **Asset Minting Process:**
   * - Validates cross-chain proof and authorization
   * - Verifies asset minting permissions and limits
   * - Creates new asset representation with specified amount
   * - Assigns asset ownership to designated recipient
   * - Records minting metadata for cross-chain tracking
   *
   * @param assetId - Unique identifier of the asset to be minted
   * @param amount - Amount of the asset to be minted (in asset's base units)
   * @returns Promise resolving to transaction response with minting receipt
   *
   * @throws {UnauthorizedMintingError} When caller lacks minting permissions
   * @throws {AssetNotFoundError} When specified asset ID does not exist
   * @throws {ExceedsSupplyLimitError} When minting would exceed asset supply limits
   * @throws {WrapperContractError} When wrapper contract interaction fails
   *
   * @example
   * Minting specific amount on destination chain:
   * ```typescript
   * const mintResult = await polygonLeaf.mintAsset('bridged-eth-789', 2.5);
   * console.log(`Minted 2.5 ETH in tx: ${mintResult.transactionId}`);
   *
   * // New bridged asset amount is now available on destination chain
   * ```
   *
   * @since 0.0.3-beta
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.3
   * @see {@link burnAsset} for asset burning operations
   * @see {@link TransactionResponse} for response format
   */
  public abstract mintAsset(
    assetId: string,
    amount: Amount,
  ): Promise<TransactionResponse>;

  /**
   * Burns a specified amount of a fungible asset from the bridge wrapper contract.
   *
   * @description
   * Destroys a specified amount of a fungible asset representation within the bridge
   * wrapper contract, typically as the source side of a cross-chain transfer operation.
   * This process removes the specified amount from circulation while enabling the
   * unlocking of corresponding assets on the destination blockchain.
   *
   * **Asset Burning Process:**
   * - Validates asset ownership and burning permissions
   * - Verifies asset existence and sufficient balance for burning
   * - Destroys specified asset amount from circulation
   * - Generates cryptographic proof of asset destruction
   * - Records burning metadata for cross-chain verification
   *
   * @param assetId - Unique identifier of the asset to be burned
   * @param amount - Amount of the asset to be burned (in asset's base units)
   * @returns Promise resolving to transaction response with burning receipt and proof
   *
   * @throws {AssetNotFoundError} When specified asset ID does not exist
   * @throws {UnauthorizedBurningError} When caller lacks burning permissions
   * @throws {InsufficientBalanceError} When asset balance is insufficient for burning
   * @throws {WrapperContractError} When wrapper contract interaction fails
   *
   * @example
   * Burning specific amount for cross-chain transfer:
   * ```typescript
   * const burnResult = await polygonLeaf.burnAsset('bridged-eth-789', 2.5);
   * console.log(`Burned 2.5 ETH in tx: ${burnResult.transactionId}`);
   *
   * // Burning proof can now be used to unlock original asset
   * const proof = burnResult.receipt.proof;
   * await ethereumLeaf.unlockAssetWithProof('eth-original-123', 2.5, proof);
   * ```
   *
   * @since 0.0.3-beta
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.3
   * @see {@link mintAsset} for asset minting operations
   * @see {@link TransactionResponse} for response format
   */
  public abstract burnAsset(
    assetId: string,
    amount: Amount,
  ): Promise<TransactionResponse>;

  /**
   * Assigns a specified amount of a fungible asset to a recipient address.
   *
   * @description
   * Transfers ownership of a specified amount of a fungible asset within the bridge
   * wrapper contract to a designated recipient. This operation is typically used
   * during cross-chain transfers to assign newly minted assets to their intended
   * recipients or redistribute locked assets based on transfer conditions.
   *
   * **Asset Assignment Process:**
   * - Validates current asset ownership and transfer permissions
   * - Verifies recipient address validity and compliance
   * - Transfers specified amount to recipient account
   * - Updates asset ownership records and balances
   * - Generates assignment transaction receipt and proof
   *
   * @param assetId - Unique identifier of the asset to be assigned
   * @param to - Recipient address for the asset assignment
   * @param amount - Amount of the asset to be assigned (in asset's base units)
   * @returns Promise resolving to transaction response with assignment receipt
   *
   * @throws {AssetNotFoundError} When specified asset ID does not exist
   * @throws {UnauthorizedAssignmentError} When caller lacks assignment permissions
   * @throws {InsufficientBalanceError} When asset balance is insufficient for assignment
   * @throws {InvalidRecipientError} When recipient address is invalid or in a denylist
   * @throws {WrapperContractError} When wrapper contract interaction fails
   *
   * @example
   * Assigning asset to cross-chain recipient:
   * ```typescript
   * const assignResult = await polygonLeaf.assignAsset(
   *   'bridged-usdc-456',
   *   '0x789recipient...',
   *   1000.0
   * );
   * console.log(`Assigned 1000 USDC in tx: ${assignResult.transactionId}`);
   *
   * // Asset ownership is now transferred to recipient
   * ```
   *
   * @since 0.0.3-beta
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.4
   * @see {@link mintAsset} for asset minting operations
   * @see {@link TransactionResponse} for response format
   */
  public abstract assignAsset(
    assetId: string,
    to: string,
    amount: Amount,
  ): Promise<TransactionResponse>;

  /**
   * Executes a custom transaction method with specified parameters on the bridge leaf.
   *
   * @description
   * Provides a flexible interface for executing arbitrary smart contract methods
   * on the bridge wrapper contract or related blockchain infrastructure. This
   * method enables custom operations beyond the standard asset management functions,
   * supporting extensible bridge functionality and protocol-specific operations.
   *
   * **Transaction Execution Process:**
   * - Validates method name and parameter compatibility
   * - Constructs transaction payload with specified parameters
   * - Executes transaction based on invocation type (call/send)
   * - Monitors transaction confirmation and receipt generation
   * - Returns comprehensive transaction response with results
   *
   * @param methodName - Name of the smart contract method to invoke
   * @param params - Array of string-encoded parameters for method invocation
   * @param invocationType - Type of blockchain invocation (call, send, estimate)
   * @returns Promise resolving to transaction response with execution results
   *
   * @throws {InvalidMethodError} When specified method name is not supported
   * @throws {ParameterValidationError} When method parameters are invalid
   * @throws {TransactionExecutionError} When transaction execution fails
   * @throws {WrapperContractError} When wrapper contract interaction fails
   *
   * @example
   * Executing custom bridge method:
   * ```typescript
   * const customResult = await ethereumLeaf.runTransaction(
   *   'setAssetMetadata',
   *   ['token-123', 'metadata-hash-456'],
   *   'send'
   * );
   * console.log(`Custom method executed in tx: ${customResult.transactionId}`);
   * ```
   *
   * @since 0.0.3-beta
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.5
   * @see {@link getReceipt} for transaction receipt retrieval
   * @see {@link TransactionResponse} for response format
   */
  public abstract runTransaction(
    methodName: string,
    params: string[],
    invocationType: unknown,
  ): Promise<TransactionResponse>;

  /**
   * Retrieves the blockchain transaction receipt for a specified transaction ID.
   *
   * @description
   * Fetches the comprehensive transaction receipt from the blockchain network,
   * providing detailed information about transaction execution, gas usage, event
   * logs, and status confirmation. This method is essential for transaction
   * verification, proof generation, and cross-chain operation validation.
   *
   * **Receipt Information:**
   * - Transaction hash and block confirmation details
   * - Gas usage, transaction fees, and execution status
   * - Contract event logs and emitted data
   * - Transaction execution results and return values
   * - Cryptographic proofs for cross-chain verification
   *
   * @param transactionId - Unique identifier of the transaction to retrieve
   * @returns Promise resolving to string-encoded transaction receipt
   *
   * @throws {TransactionNotFoundError} When specified transaction ID does not exist
   * @throws {ReceiptNotAvailableError} When transaction receipt is not yet available
   * @throws {NetworkConnectivityError} When blockchain network is unreachable
   *
   * @example
   * Retrieving transaction receipt for verification:
   * ```typescript
   * const receipt = await ethereumLeaf.getReceipt('0x123abc...');
   * const parsedReceipt = JSON.parse(receipt);
   *
   * console.log(`Transaction status: ${parsedReceipt.status}`);
   * console.log(`Gas used: ${parsedReceipt.gasUsed}`);
   *
   * // Extract event logs for cross-chain proof
   * const lockEvents = parsedReceipt.logs.filter(log =>
   *   log.topics[0] === ASSET_LOCKED_EVENT_SIGNATURE
   * );
   * ```
   *
   * @since 0.0.3-beta
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.6
   * @see {@link runTransaction} for transaction execution
   */
  public abstract getReceipt(transactionId: string): Promise<string>;
}
