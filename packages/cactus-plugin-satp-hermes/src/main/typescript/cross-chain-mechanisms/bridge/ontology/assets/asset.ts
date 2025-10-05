/**
 * @fileoverview
 * Core asset interfaces and utilities for SATP Hermes cross-chain operations.
 *
 * @description
 * This module defines the fundamental asset data structures and utility functions
 * used throughout the SATP bridge architecture. It provides the foundation for
 * asset representation, type classification, and identification across different
 * blockchain networks while maintaining SATP protocol compliance.
 *
 * **Asset Management Features:**
 * - Unified asset interface for cross-chain compatibility
 * - Fungible and non-fungible asset type differentiation
 * - Asset identification and reference tracking
 * - Network-agnostic asset representation
 * - Type-safe asset creation and validation utilities
 *
 * **SATP Protocol Integration:**
 * Asset structures follow IETF SATP Core v2 specification requirements for
 * cross-chain asset identification, ownership tracking, and network association.
 *
 * @example
 * Basic asset creation:
 * ```typescript
 * import { Asset, FungibleAsset, createAssetId, TokenType } from './asset';
 *
 * const assetId = createAssetId('context-123', TokenType.ERC20, 'ethereum-mainnet');
 *
 * const fungibleAsset: FungibleAsset = {
 *   id: assetId,
 *   referenceId: 'original-token-456',
 *   type: TokenType.ERC20,
 *   owner: '0x123...',
 *   contractName: 'MyToken',
 *   network: { id: 'ethereum-mainnet', ledgerType: LedgerType.Ethereum },
 *   amount: '1000.50'
 * };
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link https://www.ietf.org/archive/id/draft-ietf-satp-core-02.txt} SATP Core Specification
 * @see {@link TokenType} for supported asset types
 * @see {@link NetworkId} for network identification
 * @see {@link EvmAsset} for EVM-specific asset extensions
 * @see {@link FabricAsset} for Fabric-specific asset extensions
 *
 * @author SATP Hermes Development Team
 * @copyright 2024 Hyperledger Foundation
 * @license Apache-2.0
 */

import { v4 as uuidv4 } from "uuid";
import {
  ERCTokenStandard,
  TokenType,
} from "../../../../generated/proto/cacti/satp/v02/common/message_pb";
import { NetworkId } from "../../../../public-api";

/**
 * Base interface for all assets in the SATP bridge architecture.
 *
 * @description
 * Defines the fundamental properties required for any asset to participate in
 * cross-chain transfer operations. This interface provides the minimum set
 * of information needed for asset identification, ownership tracking, and
 * network association across different blockchain implementations.
 *
 * **Core Asset Properties:**
 * - Unique asset identification within bridge context
 * - Reference to original asset on source blockchain
 * - Asset type classification (fungible/non-fungible)
 * - Owner address and ownership verification
 * - Contract name for asset representation
 * - Network association for routing and validation
 *
 * **Cross-Chain Compatibility:**
 * The asset interface is designed to be blockchain-agnostic while maintaining
 * sufficient information for proper asset handling across different networks
 * and protocols supported by the SATP bridge.
 *
 * @example
 * Implementing basic asset:
 * ```typescript
 * const basicAsset: Asset = {
 *   id: 'bridge-asset-123',
 *   referenceId: 'original-nft-456',
 *   type: TokenType.ERC721,
 *   owner: '0x789abc...',
 *   contractName: 'MyNFTCollection',
 *   network: { id: 'polygon-mainnet', ledgerType: LedgerType.Ethereum }
 * };
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link FungibleAsset} for fungible token extensions
 * @see {@link TokenType} for asset type enumeration
 * @see {@link NetworkId} for network identification structure
 */
export interface Asset {
  /** Unique identifier for the asset within the bridge context */
  id: string;
  /** Reference identifier linking to the original asset on source blockchain */
  referenceId: string;
  /** Asset type classification (ERC20, ERC721, etc.) */
  type: TokenType;
  /** Address of the current asset owner */
  owner: string;
  /** Name of the contract representing this asset */
  contractName: string;
  /** Network identification where the asset is located */
  network: NetworkId;
  ercTokenStandard: ERCTokenStandard;
}

export type Brand<K, T> = K & { __brand: T };
export type Amount = Brand<number, "Amount">;
export type UniqueTokenID = Brand<null, "UniqueTokenID">;

export interface FungibleAsset extends Asset {
  amount: Amount;
}

export interface NonFungibleAsset extends Asset {
  uniqueDescriptor: UniqueTokenID;
/**
 * Interface for fungible assets that have measurable amounts.
 *
 * @description
 * Extends the base Asset interface to include amount information for fungible
 * tokens such as ERC-20, where assets can be subdivided and measured in
 * precise quantities. The amount is represented as a string to maintain
 * precision for large numbers and decimal values.
 *
 * **Amount Representation:**
 * - String format to preserve precision for large numbers
 * - Supports decimal values for fractional amounts
 * - Compatible with blockchain native representations
 * - Maintains consistency across different networks
 *
 * @example
 * Creating fungible asset with amount:
 * ```typescript
 * const usdcAsset: FungibleAsset = {
 *   id: 'bridge-usdc-123',
 *   referenceId: 'usdc-ethereum-456',
 *   type: TokenType.ERC20,
 *   owner: '0x123...',
 *   contractName: 'USDC',
 *   network: { id: 'ethereum-mainnet', ledgerType: LedgerType.Ethereum },
 *   amount: '1500.250000' // 1500.25 USDC
 * };
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link Asset} for base asset properties
 * @see {@link instanceOfFungibleAsset} for type checking
 */
export interface FungibleAsset extends Asset {
  /** Amount of the fungible asset (string format for precision) */
  amount: string;
}

/**
 * Converts a string representation to a TokenType enum value.
 *
 * @description
 * Provides a type-safe way to convert string-based token type identifiers
 * to the corresponding TokenType enum values. This is commonly used when
 * parsing asset information from external sources or configuration files.
 *
 * **String Conversion:**
 * - Case-insensitive string matching
 * - Automatic uppercase conversion for enum lookup
 * - Supports all TokenType enum values
 *
 * @param stringType - String representation of the token type (case-insensitive)
 * @returns Corresponding TokenType enum value
 *
 * @throws {TypeError} When the string does not match any TokenType
 *
 * @example
 * Converting string to TokenType:
 * ```typescript
 * const erc20Type = getTokenType('erc20'); // Returns TokenType.ERC20
 * const erc721Type = getTokenType('ERC721'); // Returns TokenType.ERC721
 * const customType = getTokenType('nonstandard_fungible'); // Returns TokenType.NONSTANDARD_FUNGIBLE
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link TokenType} for available token type values
 */
export function getTokenType(stringType: string) {
  return TokenType[stringType.toUpperCase() as keyof typeof TokenType];
}

/**
 * Creates a unique asset identifier for bridge operations.
 *
 * @description
 * Generates a globally unique asset identifier by combining a UUID with
 * contextual information including context ID, token type, and network ID.
 * This ensures asset uniqueness across the entire bridge system while
 * maintaining traceability and context information.
 *
 * **ID Structure:**
 * Format: `{uuid}-{contextId}-{tokenType}-{networkId}`
 * - UUID: Globally unique identifier component
 * - Context ID: Operation or bridge context identifier
 * - Token Type: Asset type classification
 * - Network ID: Source or destination network identifier
 *
 * @param contextId - Context identifier for the bridge operation
 * @param tokenType - Asset type classification
 * @param networkId - Network identifier where asset is located
 * @returns Unique asset identifier string
 *
 * @example
 * Creating asset IDs for different scenarios:
 * ```typescript
 * // Ethereum ERC-20 token
 * const erc20Id = createAssetId(
 *   'transfer-session-123',
 *   TokenType.ERC20,
 *   'ethereum-mainnet'
 * );
 * // Result: '550e8400-e29b-41d4-a716-446655440000-transfer-session-123-1-ethereum-mainnet'
 *
 * // Polygon NFT
 * const nftId = createAssetId(
 *   'mint-operation-456',
 *   TokenType.ERC721,
 *   'polygon-mainnet'
 * );
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link TokenType} for token type values
 * @see {@link uuidv4} for UUID generation
 */
export function createAssetId(
  contextId: string,
  tokenType: TokenType,
  networkId: string,
): string {
  return `${uuidv4()}-${contextId}-${tokenType}-${networkId}`;
}

/**
 * Type guard to check if an asset is a fungible asset.
 *
 * @description
 * Provides runtime type checking to determine if an Asset object is actually
 * a FungibleAsset by checking for the presence of the 'amount' property.
 * This is useful for type-safe asset processing where different handling
 * is required for fungible vs non-fungible assets.
 *
 * **Type Guard Functionality:**
 * - Runtime type checking for TypeScript type narrowing
 * - Safe property access after type verification
 * - Enables conditional logic based on asset fungibility
 *
 * @param asset - Asset object to check for fungibility
 * @returns True if asset has amount property (is fungible), false otherwise
 *
 * @example
 * Using type guard for conditional processing:
 * ```typescript
 * function processAsset(asset: Asset) {
 *   if (instanceOfFungibleAsset(asset)) {
 *     // TypeScript now knows asset is FungibleAsset
 *     console.log(`Processing ${asset.amount} of ${asset.contractName}`);
 *     // Handle fungible token operations
 *   } else {
 *     // Handle non-fungible token operations
 *     console.log(`Processing NFT ${asset.id}`);
 *   }
 * }
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link FungibleAsset} for fungible asset interface
 * @see {@link Asset} for base asset interface
 */
export function instanceOfFungibleAsset(asset: Asset) {
  return "amount" in asset;
}

export function instanceOfNonFungibleAsset(asset: Asset) {
  return "uniqueDescriptor" in asset;
}
