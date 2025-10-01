/**
 * @fileoverview
 * SATP Bridge Manager Client Interface for cross-chain asset transfer operations.
 *
 * Provides client-facing capabilities for SATP gateway interactions including bridge
 * endpoint discovery, execution layer access, and asset transfer coordination. This
 * interface defines the client contract for consuming bridge services and executing
 * cross-chain asset transfers through the SATP protocol.
 *
 * **SATP Protocol Context:**
 * - Gateway Discovery: Automated discovery of available bridge endpoints
 * - Execution Layer Access: Retrieval of network-specific execution capabilities
 * - Asset Transfer Coordination: Client-side asset transfer orchestration
 * - Cross-Chain Communication: Gateway-to-gateway interaction management
 *
 * **Client Operations:**
 * - Bridge endpoint discovery and selection
 * - Network-specific execution layer retrieval
 * - Asset approval address resolution
 * - Cross-chain transfer capability assessment
 *
 * @module BridgeManagerClientInterface
 *
 * @example
 * Client-side cross-chain transfer:
 * ```typescript
 * class SatpClientManager extends BridgeManagerClientInterface {
 *   async executeTransfer(asset: Asset, targetNetwork: NetworkId): Promise<TransferResult> {
 *     // Discover available bridge endpoints
 *     const sourceBridge = this.getBridgeEndPoint(asset.network.id, ClaimFormat.DEFAULT);
 *     const targetExecution = this.getSATPExecutionLayer(targetNetwork, ClaimFormat.DEFAULT);
 *
 *     // Execute cross-chain transfer
 *     return await this.coordinateTransfer(sourceBridge, targetExecution, asset);
 *   }
 * }
 * ```
 *
 * @example
 * Multi-network asset discovery:
 * ```typescript
 * const clientManager = new SatpClientManager();
 *
 * // Discover all available networks
 * const availableNetworks = clientManager.getAvailableEndPoints();
 *
 * // Get execution layers for each network
 * const executionLayers = availableNetworks.map(networkId =>
 *   clientManager.getSATPExecutionLayer(networkId, ClaimFormat.BUNGEE)
 * );
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} IETF SATP Core v2 Specification
 * @see {@link BridgeLeaf} for bridge endpoint implementation details
 * @see {@link SATPBridgeExecutionLayer} for execution layer capabilities
 * @see {@link BridgeManagerAdminInterface} for administrative bridge operations
 */

import {
  ClaimFormat,
  TokenType,
} from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { NetworkId } from "../../../public-api";
import { BridgeLeaf } from "../bridge-leaf";
import { SATPBridgeExecutionLayer } from "../satp-bridge-execution-layer";

/**
 * Client interface for SATP bridge manager operations and cross-chain asset transfers.
 *
 * @description
 * Defines the client-facing contract for interacting with SATP bridge infrastructure
 * including bridge endpoint discovery, execution layer access, and cross-chain asset
 * transfer coordination. This interface provides the essential methods required for
 * client applications to consume bridge services and execute secure asset transfers.
 *
 * **Client Capabilities:**
 * - Automated discovery of available bridge endpoints across networks
 * - Network-specific execution layer retrieval for asset operations
 * - Asset approval address resolution for transaction preparation
 * - Cross-chain transfer capability assessment and routing
 * - Gateway communication and coordination services
 *
 * @abstract
 * @class BridgeManagerClientInterface
 *
 * @example
 * Implementing client bridge management:
 * ```typescript
 * class SatpBridgeClient extends BridgeManagerClientInterface {
 *   getBridgeEndPoint(id: NetworkId, claimFormat: ClaimFormat): BridgeLeaf {
 *     const bridgeLeaf = this.bridgeRegistry.get(id);
 *     if (!bridgeLeaf) {
 *       throw new BridgeNotFoundError(`No bridge found for network ${id}`);
 *     }
 *     return bridgeLeaf.configureClaimFormat(claimFormat);
 *   }
 *
 *   getSATPExecutionLayer(id: NetworkId, claimFormat?: ClaimFormat): SATPBridgeExecutionLayer {
 *     const bridgeLeaf = this.getBridgeEndPoint(id, claimFormat || ClaimFormat.DEFAULT);
 *     return new SATPBridgeExecutionLayerImpl({ leafBridge: bridgeLeaf });
 *   }
 * }
 * ```
 *
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 3.2
 * @see {@link BridgeLeaf} for bridge endpoint implementation
 * @see {@link SATPBridgeExecutionLayer} for execution layer interface
 * @see {@link NetworkId} for network identification structure
 * @see {@link ClaimFormat} for supported claim formats
 */
export abstract class BridgeManagerClientInterface {
  /**
   * Retrieves the bridge endpoint for cross-chain asset transfers on the specified network.
   *
   * @description
   * Discovers and returns the bridge leaf component for the specified blockchain network
   * configured with the requested claim format. The bridge endpoint provides the core
   * functionality for asset wrapping, locking, and cross-chain communication operations
   * required for SATP protocol compliance.
   *
   * **Bridge Endpoint Capabilities:**
   * - Asset wrapping and unwrapping operations
   * - Asset locking and unlocking for cross-chain transfers
   * - Cryptographic proof generation for claim verification
   * - Gateway-to-gateway communication coordination
   * - Network-specific transaction execution
   *
   * @param id - Network identifier for the target blockchain network
   * @param claimFormat - Claim format for cryptographic proof generation
   * @returns Bridge leaf instance configured for the specified network and claim format
   *
   * @throws {BridgeNotFoundError} When no bridge endpoint exists for the network
   * @throws {UnsupportedClaimFormatError} When the claim format is not supported
   * @throws {NetworkConnectivityError} When the network is unreachable
   *
   * @example
   * Retrieving Ethereum bridge endpoint:
   * ```typescript
   * const ethereumBridge = clientManager.getBridgeEndPoint(
   *   { id: 'ethereum-mainnet', ledgerType: LedgerType.Ethereum },
   *   ClaimFormat.BUNGEE
   * );
   *
   * // Use bridge for asset operations
   * const wrappedAsset = await ethereumBridge.wrapAsset(erc20Asset);
   * ```
   *
   * @example
   * Fabric network bridge access:
   * ```typescript
   * const fabricBridge = clientManager.getBridgeEndPoint(
   *   { id: 'fabric-channel-1', ledgerType: LedgerType.Fabric2 },
   *   ClaimFormat.DEFAULT
   * );
   *
   * const lockedAsset = await fabricBridge.lockAsset('asset-123', 100);
   * ```
   *
   * @since 2.0.0
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.2
   * @see {@link BridgeLeaf} for bridge endpoint implementation details
   * @see {@link ClaimFormat} for supported proof formats
   * @see {@link NetworkId} for network identification structure
   */
  public abstract getBridgeEndPoint(
    id: NetworkId,
    claimFormat: ClaimFormat,
  ): BridgeLeaf;

  /**
   * Retrieves the list of blockchain networks with available bridge endpoints.
   *
   * @description
   * Discovers and returns all blockchain networks that have active bridge endpoints
   * available for cross-chain asset transfer operations. This method provides network
   * discovery capabilities essential for multi-chain asset transfer routing and
   * gateway selection in SATP protocol implementations.
   *
   * **Network Discovery Features:**
   * - Active bridge endpoint enumeration
   * - Network connectivity status validation
   * - Bridge capability assessment
   * - Multi-chain routing support
   * - Dynamic network availability monitoring
   *
   * @returns Array of network identifiers with available bridge endpoints
   *
   * @example
   * Discovering available networks:
   * ```typescript
   * const availableNetworks = clientManager.getAvailableEndPoints();
   *
   * console.log('Available networks:');
   * availableNetworks.forEach(network => {
   *   console.log(`- ${network.id} (${network.ledgerType})`);
   * });
   *
   * // Select networks for cross-chain transfer
   * const sourceNetwork = availableNetworks.find(n => n.id === 'ethereum-mainnet');
   * const targetNetwork = availableNetworks.find(n => n.id === 'fabric-channel-1');
   * ```
   *
   * @example
   * Multi-network transfer routing:
   * ```typescript
   * const networks = clientManager.getAvailableEndPoints();
   *
   * // Find optimal transfer path
   * const transferRoute = this.findOptimalRoute(
   *   sourceAsset.network,
   *   targetNetwork,
   *   networks
   * );
   * ```
   *
   * @since 2.0.0
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 3.3
   * @see {@link NetworkId} for network identification details
   * @see {@link getBridgeEndPoint} for accessing specific network bridges
   * @see {@link SATPGatewayRegistry} for gateway registration and discovery
   */
  public abstract getAvailableEndPoints(): NetworkId[];

  /**
   * Retrieves the SATP execution layer for asset transfer operations on the specified network.
   *
   * @description
   * Provides access to the SATP bridge execution layer that orchestrates cross-chain
   * asset transfer operations including wrapping, locking, minting, burning, and assignment
   * of digital assets. The execution layer implements the core SATP protocol logic for
   * secure, atomic cross-chain transactions with crash fault tolerance.
   *
   * **Execution Layer Capabilities:**
   * - Atomic asset transfer operations (wrap, lock, mint, burn, assign)
   * - Cryptographic proof generation and verification
   * - Transaction receipt management and validation
   * - Crash recovery and rollback mechanisms
   * - ACID property enforcement for cross-chain transactions
   *
   * @param id - Network identifier for the target blockchain network
   * @param claimFormat - Optional claim format for proof generation (defaults to DEFAULT)
   * @returns SATP bridge execution layer configured for the specified network
   *
   * @throws {ExecutionLayerNotFoundError} When execution layer cannot be created for the network
   * @throws {UnsupportedNetworkError} When the network type is not supported
   * @throws {ClaimFormatError} When the claim format is incompatible with the network
   *
   * @example
   * Ethereum execution layer access:
   * ```typescript
   * const ethereumExecution = clientManager.getSATPExecutionLayer(
   *   { id: 'ethereum-mainnet', ledgerType: LedgerType.Ethereum },
   *   ClaimFormat.BUNGEE
   * );
   *
   * // Execute asset transfer operations
   * const lockResult = await ethereumExecution.lockAsset(erc20Asset);
   * const mintResult = await ethereumExecution.mintAsset(targetAsset);
   * ```
   *
   * @example
   * Cross-chain transfer coordination:
   * ```typescript
   * const sourceExecution = clientManager.getSATPExecutionLayer(sourceNetwork);
   * const targetExecution = clientManager.getSATPExecutionLayer(targetNetwork);
   *
   * // Execute 3-phase SATP transfer
   * await sourceExecution.lockAsset(asset);          // Phase 2: Lock
   * await targetExecution.mintAsset(targetAsset);    // Phase 3: Mint
   * await sourceExecution.burnAsset(asset);          // Phase 3: Burn
   * ```
   *
   * @since 2.0.0
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.3
   * @see {@link SATPBridgeExecutionLayer} for execution layer interface details
   * @see {@link getBridgeEndPoint} for underlying bridge endpoint access
   * @see {@link ClaimFormat} for supported proof generation formats
   */
  public abstract getSATPExecutionLayer(
    id: NetworkId,
    claimFormat?: ClaimFormat,
  ): SATPBridgeExecutionLayer;

  /**
   * Retrieves the approval address for asset operations on the specified network.
   *
   * @description
   * Returns the blockchain address that must be approved for asset transfer operations
   * on the specified network. This address is typically the wrapper contract or bridge
   * contract that requires approval to manage assets on behalf of users during cross-chain
   * transfer operations in the SATP protocol.
   *
   * **Approval Address Usage:**
   * - ERC20 token approval for wrapper contract interactions
   * - Bridge contract authorization for asset locking operations
   * - Gateway permission management for cross-chain transfers
   * - Asset custody delegation for SATP protocol execution
   * - Multi-signature wallet approvals for institutional transfers
   *
   * @param networkIdentification - Network identifier and ledger type information
   * @param assetType - Type of asset requiring approval (ERC20, ERC721, etc.)
   * @returns Blockchain address requiring approval for asset operations
   *
   * @throws {ApproveAddressError} When approval address cannot be determined
   * @throws {UnsupportedAssetTypeError} When asset type is not supported on the network
   * @throws {NetworkNotConfiguredError} When network is not properly configured
   *
   * @example
   * ERC20 token approval:
   * ```typescript
   * const approvalAddress = clientManager.getApproveAddress(
   *   { id: 'ethereum-mainnet', ledgerType: LedgerType.Ethereum },
   *   TokenType.ERC20
   * );
   *
   * // Approve wrapper contract to spend tokens
   * await erc20Contract.approve(approvalAddress, transferAmount);
   * ```
   *
   * @example
   * Multi-asset approval setup:
   * ```typescript
   * const networks = clientManager.getAvailableEndPoints();
   *
   * for (const network of networks) {
   *   const fungibleApproval = clientManager.getApproveAddress(network, TokenType.ERC20);
   *   const nftApproval = clientManager.getApproveAddress(network, TokenType.ERC721);
   *
   *   await this.setupApprovals(network, fungibleApproval, nftApproval);
   * }
   * ```
   *
   * @since 2.0.0
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.1
   * @see {@link TokenType} for supported asset type enumeration
   * @see {@link NetworkId} for network identification structure
   * @see {@link BridgeLeaf.getApproveAddress} for implementation details
   */
  public abstract getApproveAddress(
    networkIdentification: NetworkId,
    assetType: TokenType,
  ): string;
}
