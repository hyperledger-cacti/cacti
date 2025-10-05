import { Asset, UniqueTokenID } from "./ontology/assets/asset";
import { TransactionResponse } from "./bridge-types";

/**
 * @fileoverview
 * Bridge leaf interface for non-fungible asset cross-chain operations in SATP Hermes.
 *
 * @description
 * This module defines the abstract interface for non-fungible (NFT) asset operations
 * within the SATP bridge architecture. Non-fungible bridge leaves provide specialized
 * functionality for unique asset transfers, maintaining NFT uniqueness and metadata
 * integrity across blockchain networks while ensuring SATP protocol compliance.
 *
 * **Non-Fungible Asset Management:**
 * - NFT wrapper contract deployment and initialization
 * - Unique asset wrapping with metadata preservation
 * - Cross-chain NFT locking and unlocking operations
 * - NFT minting and burning for bridge representations
 * - Metadata and provenance tracking across chains
 * - Ownership verification and transfer authorization
 *
 * **SATP Protocol Integration:**
 * Bridge leaves implement IETF SATP Core v2 specification requirements for
 * non-fungible asset transfers, including cryptographic proof generation,
 * atomic transaction execution, and cross-chain state verification.
 *
 * @example
 * Implementing NFT bridge leaf for Ethereum:
 * ```typescript
 * class EthereumNFTLeaf extends BridgeLeafNonFungible {
 *   async deployNonFungibleWrapperContract(): Promise<void> {
 *     const contract = await deployContract('BridgeNFTWrapper', {
 *       name: 'Bridged NFTs',
 *       symbol: 'BNFT',
 *       baseURI: 'https://bridge.example.com/nft/'
 *     });
 *     this.wrapperAddress = contract.address;
 *   }
 *
 *   getDeployNonFungibleWrapperContractReceipt() {
 *     return this.deploymentReceipt;
 *   }
 * }
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Specification
 * @see {@link BridgeLeafFungible} for fungible asset operations
 * @see {@link BridgeManagerClientInterface} for bridge endpoint management
 * @see {@link SATPBridgeExecutionLayer} for transaction execution
 *
 * @author SATP Hermes Development Team
 * @copyright 2024 Hyperledger Foundation
 * @license Apache-2.0
 */

/**
 * Abstract base class for non-fungible asset bridge leaf implementations.
 *
 * @description
 * Defines the core interface for non-fungible token (NFT) operations within
 * the SATP bridge architecture. This class provides the foundation for
 * blockchain-specific implementations that handle unique asset transfers,
 * maintaining NFT properties, metadata, and ownership across chains.
 *
 * **Non-Fungible Bridge Capabilities:**
 * - Deploys and manages NFT wrapper contracts
 * - Handles unique asset identification and verification
 * - Maintains metadata integrity during cross-chain operations
 * - Provides cryptographic proofs for NFT ownership
 * - Supports batch operations for multiple NFTs
 * - Enables customizable metadata and royalty preservation
 *
 * **Implementation Requirements:**
 * Bridge leaf implementations must provide blockchain-specific logic for
 * NFT contract deployment, asset wrapping, cross-chain proofs, and
 * transaction execution while maintaining SATP protocol compliance.
 *
 * @example
 * Basic non-fungible bridge leaf structure:
 * ```typescript
 * class PolygonNFTLeaf extends BridgeLeafNonFungible {
 *   private wrapperContract: Contract;
 *   private deploymentReceipt: TransactionReceipt;
 *
 *   async deployNonFungibleWrapperContract(): Promise<void> {
 *     // Deploy ERC721 wrapper contract on Polygon
 *     this.wrapperContract = await this.deployERC721Wrapper();
 *     this.deploymentReceipt = await this.wrapperContract.deployTransaction.wait();
 *   }
 *
 *   getDeployNonFungibleWrapperContractReceipt() {
 *     return this.deploymentReceipt;
 *   }
 * }
 * ```
 *
 * @abstract
 * @since 0.0.3-beta
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.1
 * @see {@link https://eips.ethereum.org/EIPS/eip-721} ERC-721 NFT Standard
 * @see {@link BridgeLeafFungible} for fungible asset operations
 */
export abstract class BridgeLeafNonFungible {
  /**
   * Deploys the non-fungible asset wrapper contract to the blockchain network.
   *
   * @description
   * Deploys a specialized smart contract for managing non-fungible token (NFT)
   * operations within the SATP bridge architecture. The wrapper contract handles
   * unique asset identification, metadata preservation, ownership verification,
   * and cross-chain transfer coordination for NFTs.
   *
   * **NFT Wrapper Contract Features:**
   * - ERC-721 or equivalent NFT standard compliance
   * - Metadata URI management and preservation
   * - Ownership verification and transfer authorization
   * - Cross-chain proof generation for unique assets
   * - Batch operations for multiple NFT transfers
   * - Royalty and creator attribution tracking
   * - Asset locking and unlocking mechanisms
   *
   * **Deployment Process:**
   * - Validates network compatibility and gas requirements
   * - Deploys NFT wrapper contract with bridge configuration
   * - Initializes contract with network-specific parameters
   * - Sets up cross-chain communication endpoints
   * - Configures access controls and permissions
   *
   * @returns Promise resolving when wrapper contract deployment completes
   *
   * @throws {ContractDeploymentError} When NFT wrapper deployment fails
   * @throws {InsufficientGasError} When transaction gas is insufficient
   * @throws {NetworkConnectivityError} When blockchain network is unreachable
   * @throws {InvalidConfigurationError} When contract configuration is invalid
   *
   * @example
   * Deploying Ethereum ERC-721 wrapper:
   * ```typescript
   * await ethereumNFTLeaf.deployNonFungibleWrapperContract();
   * const wrapperAddress = ethereumNFTLeaf.getWrapperContract('NON_FUNGIBLE');
   * console.log(`NFT wrapper deployed at: ${wrapperAddress}`);
   *
   * // Contract is now ready for NFT operations
   * const receipt = ethereumNFTLeaf.getDeployNonFungibleWrapperContractReceipt();
   * console.log(`Deployment gas used: ${receipt.gasUsed}`);
   * ```
   *
   * @since 0.0.3-beta
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.1
   * @see {@link https://eips.ethereum.org/EIPS/eip-721} ERC-721 NFT Standard
   * @see {@link getDeployNonFungibleWrapperContractReceipt} for deployment receipt
   */
  public abstract deployWrapperContract(): Promise<void>;

  /**
   * Retrieves the deployment receipt for the non-fungible wrapper contract.
   *
   * @description
   * Returns the comprehensive blockchain transaction receipt containing detailed
   * information about the NFT wrapper contract deployment. The receipt provides
   * essential deployment verification data including contract address, transaction
   * confirmation, gas usage, and contract initialization events.
   *
   * **Receipt Information:**
   * - NFT wrapper contract deployment address
   * - Transaction hash and block confirmation details
   * - Gas usage and transaction fee information
   * - Contract creation event logs and emitted data
   * - Deployment status and error details (if any)
   * - Contract initialization parameters and configuration
   *
   * **Deployment Verification:**
   * The receipt enables verification of successful contract deployment,
   * contract address validation, and deployment cost analysis for
   * cross-chain bridge operations.
   *
   * @returns Deployment receipt containing contract address and transaction details
   *
   * @throws {ReceiptNotFoundError} When deployment receipt is not available
   * @throws {ContractNotDeployedError} When NFT wrapper has not been deployed
   * @throws {InvalidReceiptError} When receipt data is corrupted or invalid
   *
   * @example
   * Retrieving and validating deployment receipt:
   * ```typescript
   * const receipt = ethereumNFTLeaf.getDeployNonFungibleWrapperContractReceipt();
   *
   * if (receipt.status === 1) {
   *   console.log(`NFT wrapper deployed successfully at: ${receipt.contractAddress}`);
   *   console.log(`Transaction hash: ${receipt.transactionHash}`);
   *   console.log(`Gas used: ${receipt.gasUsed}`);
   *
   *   // Verify contract supports ERC-721 interface
   *   const contract = new Contract(receipt.contractAddress, ERC721_ABI);
   *   const supportsERC721 = await contract.supportsInterface('0x80ac58cd');
   *   console.log(`ERC-721 support: ${supportsERC721}`);
   * } else {
   *   console.error('NFT wrapper deployment failed');
   * }
   * ```
   *
   * @since 0.0.3-beta
   * @see {@link deployNonFungibleWrapperContract} for wrapper deployment
   * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Section 4.1
   */
  public abstract getDeployWrapperContractReceipt(): unknown;

  public abstract wrapAsset(asset: Asset): Promise<TransactionResponse>;

  public abstract unwrapAsset(assetId: string): Promise<TransactionResponse>;

  public abstract lockAsset(
    assetId: string,
    nftID: UniqueTokenID,
  ): Promise<TransactionResponse>;

  public abstract unlockAsset(
    assetId: string,
    nftID: UniqueTokenID,
  ): Promise<TransactionResponse>;

  public abstract mintAsset(
    assetId: string,
    nftID: UniqueTokenID,
  ): Promise<TransactionResponse>;

  public abstract burnAsset(
    assetId: string,
    nftID: UniqueTokenID,
  ): Promise<TransactionResponse>;

  public abstract assignAsset(
    assetId: string,
    to: string,
    nftID: UniqueTokenID,
  ): Promise<TransactionResponse>;

  public abstract runTransaction(
    methodName: string,
    params: string[],
    invocationType: unknown,
  ): Promise<TransactionResponse>;

  public abstract getReceipt(transactionId: string): Promise<string>;
  // TODO: Implement comprehensive non-fungible bridge operations
  //
  // The following methods should be implemented for complete NFT bridge functionality:
  //
  // 1. Asset Management Operations:
  //    - wrapNFT(tokenId: string, tokenURI: string, metadata: NFTMetadata): Promise<TransactionResponse>
  //    - unwrapNFT(bridgedTokenId: string): Promise<TransactionResponse>
  //    - lockNFT(tokenId: string, recipient: string): Promise<TransactionResponse>
  //    - unlockNFT(tokenId: string): Promise<TransactionResponse>
  //
  // 2. Cross-Chain Transfer Operations:
  //    - mintBridgedNFT(originalTokenId: string, recipient: string, metadata: NFTMetadata): Promise<TransactionResponse>
  //    - burnBridgedNFT(bridgedTokenId: string): Promise<TransactionResponse>
  //    - transferNFTOwnership(tokenId: string, newOwner: string): Promise<TransactionResponse>
  //
  // 3. Metadata and Verification:
  //    - getNFTMetadata(tokenId: string): Promise<NFTMetadata>
  //    - verifyNFTOwnership(tokenId: string, owner: string): Promise<boolean>
  //    - generateNFTProof(tokenId: string): Promise<NFTProof>
  //    - validateNFTProof(proof: NFTProof): Promise<boolean>
  //
  // 4. Batch Operations:
  //    - batchWrapNFTs(tokens: NFTBatchRequest[]): Promise<TransactionResponse>
  //    - batchUnwrapNFTs(tokenIds: string[]): Promise<TransactionResponse>
  //    - batchTransferNFTs(transfers: NFTTransferRequest[]): Promise<TransactionResponse>
  //
  // 5. Transaction and Receipt Management:
  //    - runNFTTransaction(methodName: string, params: any[], invocationType: InvocationType): Promise<TransactionResponse>
  //    - getNFTTransactionReceipt(transactionId: string): Promise<string>
  //    - getContractEvents(eventName: string, fromBlock?: number, toBlock?: number): Promise<ContractEvent[]>
  //
  // Implementation should follow SATP protocol requirements for:
  // - Atomic cross-chain transfers with rollback capabilities
  // - Cryptographic proof generation and verification
  // - Metadata preservation and integrity validation
  // - Gas optimization for batch operations
  // - Compliance with ERC-721/ERC-1155 standards where applicable
  //
  // @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Specification
  // @see {@link https://eips.ethereum.org/EIPS/eip-721} ERC-721 NFT Standard
  // @see {@link https://eips.ethereum.org/EIPS/eip-1155} ERC-1155 Multi-Token Standard
}
