/**
 * @fileoverview
 * SATP Service Utilities - Asset Conversion and Protocol Buffer Integration
 *
 * @description
 * This module provides essential utility functions for converting between internal
 * asset representations and Protocol Buffer formats within the SATP (Secure Asset
 * Transfer Protocol) ecosystem. These utilities enable seamless integration between
 * the internal asset ontology and the standardized Protocol Buffer message formats
 * used for cross-network communication.
 *
 * **Core Functionality:**
 * - **Asset Serialization**: Converts internal asset objects to Protocol Buffer format
 * - **Asset Deserialization**: Converts Protocol Buffer assets back to internal format
 * - **Asset Comparison**: Provides deep equality checking for Protocol Buffer assets
 * - **Multi-Ledger Support**: Handles asset conversion across different blockchain types
 * - **Type Safety**: Ensures proper type handling during conversion processes
 *
 * **Supported Ledger Types:**
 * - **Ethereum Variants**: Besu 1.x, Besu 2.x, and native Ethereum networks
 * - **Hyperledger Fabric**: Fabric 2.x networks with MSP and channel support
 * - **EVM Compatibility**: Support for EVM-based networks with contract addresses
 * - **Asset Type Flexibility**: Handles various fungible asset types and properties
 *
 * **Conversion Features:**
 * - **Bi-directional Conversion**: Internal ↔ Protocol Buffer asset formats
 * - **Network Context**: Preserves network-specific properties during conversion
 * - **Asset Properties**: Maintains all asset metadata including ownership and amounts
 * - **Ledger-Specific Fields**: Handles contract addresses, MSP IDs, and channel names
 * - **Type Preservation**: Ensures asset types and references are maintained
 *
 * **Usage Patterns:**
 * These utilities are primarily used by SATP stage services when preparing
 * messages for transmission or processing received messages. They ensure
 * consistent asset representation across different network types while
 * maintaining all necessary metadata for proper asset handling.
 *
 * @author SATP Development Team
 * @since 0.0.3-beta
 * @version 0.0.3-beta
 * @see {@link https://datatracker.ietf.org/doc/draft-ietf-satp-core/} IETF SATP Core Specification
 * @see {@link FungibleAsset} Internal asset representation
 * @see {@link ProtoAsset} Protocol Buffer asset schema
 * @see {@link NetworkId} Network identification structure
 */

import { create } from "@bufbuild/protobuf";
import {
  AssetSchema as ProtoAssetSchema,
  type Asset as ProtoAsset,
  TokenType,
} from "../../generated/proto/cacti/satp/v02/common/message_pb";
import { LedgerType } from "@hyperledger/cactus-core-api";
import {
  EvmFungibleAsset,
  EvmNonFungibleAsset,
} from "../../cross-chain-mechanisms/bridge/ontology/assets/evm-asset";
import { FabricFungibleAsset } from "../../cross-chain-mechanisms/bridge/ontology/assets/fabric-asset";
import {
  Asset,
  FungibleAsset,
  NonFungibleAsset,
  Amount,
  UniqueTokenID,
} from "../../cross-chain-mechanisms/bridge/ontology/assets/asset";
import { NetworkId } from "../../public-api";

export function assetToProto(asset: Asset, networkId: NetworkId): ProtoAsset {
/**
 * Converts internal fungible asset representation to Protocol Buffer format.
 *
 * @description
 * Transforms internal asset objects into standardized Protocol Buffer format
 * suitable for cross-network SATP communication. This function handles
 * ledger-specific asset properties and ensures all necessary metadata is
 * preserved during the conversion process.
 *
 * **Conversion Process:**
 * 1. **Basic Properties**: Maps core asset fields (ID, type, reference, owner, amount)
 * 2. **Ledger Detection**: Identifies the target network's ledger type
 * 3. **Specific Properties**: Adds ledger-specific fields based on network type
 * 4. **Validation**: Ensures all required fields are properly set
 *
 * **Supported Ledger Types:**
 * - **Ethereum Networks**: Includes contract address for EVM-based assets
 * - **Besu Networks**: Supports both 1.x and 2.x versions with contract addresses
 * - **Hyperledger Fabric**: Includes MSP ID and channel name for Fabric assets
 *
 * **Asset Properties Handled:**
 * - **Token ID**: Unique asset identifier within the network
 * - **Token Type**: Asset type classification for proper handling
 * - **Reference ID**: Cross-reference identifier for asset tracking
 * - **Owner**: Current asset owner address or identifier
 * - **Amount**: Asset quantity with proper BigInt conversion
 * - **Contract Address**: Smart contract address (EVM networks)
 * - **MSP ID**: Membership Service Provider identifier (Fabric)
 * - **Channel Name**: Fabric channel name for asset location
 *
 * @public
 * @function assetToProto
 * @param {FungibleAsset} asset - Internal fungible asset to convert
 * @param {NetworkId} networkId - Target network identifier with ledger type
 * @returns {ProtoAsset} Protocol Buffer asset representation
 * @throws {Error} When networkId.ledgerType is not supported
 *
 * @example
 * Convert Ethereum asset to Protocol Buffer:
 * ```typescript
 * const evmAsset: EvmFungibleAsset = {
 *   id: 'token-123',
 *   type: 'ERC20',
 *   referenceId: 'ref-456',
 *   owner: '0x1234...abcd',
 *   amount: '1000000000000000000', // 1 ETH in wei
 *   contractAddress: '0xA0b86a33E6441Ef...',
 *   network: ethereumNetworkId
 * };
 *
 * const protoAsset = assetToProto(evmAsset, ethereumNetworkId);
 * console.log(protoAsset.contractAddress); // '0xA0b86a33E6441Ef...'
 * ```
 *
 * @example
 * Convert Fabric asset to Protocol Buffer:
 * ```typescript
 * const fabricAsset: FabricFungibleAsset = {
 *   id: 'asset-789',
 *   type: 'FabricToken',
 *   referenceId: 'ref-101',
 *   owner: 'user1',
 *   amount: '500',
 *   mspId: 'Org1MSP',
 *   channelName: 'mychannel',
 *   network: fabricNetworkId
 * };
 *
 * const protoAsset = assetToProto(fabricAsset, fabricNetworkId);
 * console.log(protoAsset.mspId); // 'Org1MSP'
 * console.log(protoAsset.channelName); // 'mychannel'
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link FungibleAsset} for internal asset structure
 * @see {@link ProtoAsset} for Protocol Buffer asset schema
 * @see {@link NetworkId} for network identification
 */
export function assetToProto(
  asset: FungibleAsset,
  networkId: NetworkId,
): ProtoAsset {
  const protoAsset = create(ProtoAssetSchema, {
    tokenId: asset.id,
    tokenType: asset.type,
    referenceId: asset.referenceId,
    owner: asset.owner,
    ercTokenStandard: asset.ercTokenStandard,
  });

  /*  
      Assets interpret the concept of amount in different ways. On Fungible tokens
      the amount is the quantity of one asset that is held or exchanged at a certain
      point in time. On Non Fungible tokens, since each token is unique, what is relevant
      is the unique descriptor of each token, and not a direct token amount, like in
      fungible tokens. This is the reason for the amount parameter definition, while turning
      an asset to a proto and a proto to an asset, differs.
  */
  switch (networkId.ledgerType) {
    case LedgerType.Besu1X:
    case LedgerType.Besu2X:
    case LedgerType.Ethereum:
      switch (asset.type) {
        case TokenType.NONSTANDARD_FUNGIBLE:
          protoAsset.amount = BigInt((asset as EvmFungibleAsset).amount);
          protoAsset.contractAddress = (
            asset as EvmFungibleAsset
          ).contractAddress;
          break;
        case TokenType.NONSTANDARD_NONFUNGIBLE:
          protoAsset.amount = BigInt(
            (asset as EvmNonFungibleAsset).uniqueDescriptor,
          );
          protoAsset.contractAddress = (
            asset as EvmNonFungibleAsset
          ).contractAddress;
          break;
        default:
          throw new Error(`Unsupported asset type ${asset.type}`);
      }
      break;
    case LedgerType.Fabric2:
      protoAsset.mspId = (asset as FabricFungibleAsset).mspId;
      protoAsset.channelName = (asset as FabricFungibleAsset).channelName;
      break;
    default:
      throw new Error(`Unsupported networkId: ${networkId.ledgerType}`);
  }
  return protoAsset;
}

/**
 * Converts Protocol Buffer asset representation to internal asset format.
 *
 * @description
 * Transforms Protocol Buffer asset messages back into internal asset objects
 * suitable for use within the SATP service ecosystem. This function reverses
 * the assetToProto conversion, ensuring all asset metadata is properly
 * reconstructed and ledger-specific properties are correctly assigned.
 *
 * **Conversion Process:**
 * 1. **Base Object Creation**: Creates internal asset object with core properties
 * 2. **Property Mapping**: Maps Protocol Buffer fields to internal structure
 * 3. **Type Conversion**: Handles BigInt to string conversion for amounts
 * 4. **Ledger-Specific Assignment**: Adds MSP/channel or contract address as needed
 * 5. **Validation**: Ensures proper asset type and network assignment
 *
 * **Property Handling:**
 * - **Token ID**: Maps to internal asset ID field
 * - **Token Type**: Converts from Protocol Buffer enum to internal type
 * - **Reference ID**: Preserves cross-reference identifier
 * - **Owner**: Maps owner address or identifier
 * - **Amount**: Converts BigInt amount to string representation
 * - **Contract Name**: Preserves contract name if present
 * - **Network Context**: Associates asset with provided network ID
 *
 * **Ledger-Specific Properties:**
 * - **Fabric Assets**: Assigns MSP ID and channel name when present
 * - **EVM Assets**: Assigns contract address for Ethereum-based networks
 *
 * @public
 * @function protoToAsset
 * @param {ProtoAsset} asset - Protocol Buffer asset to convert
 * @param {NetworkId} networkId - Source network identifier
 * @returns {Asset} Internal asset representation
 *
 * @example
 * Convert Protocol Buffer asset to internal format:
 * ```typescript
 * const protoAsset: ProtoAsset = {
 *   tokenId: 'token-123',
 *   tokenType: 1, // ERC20 enum value
 *   referenceId: 'ref-456',
 *   owner: '0x1234...abcd',
 *   amount: BigInt('1000000000000000000'),
 *   contractAddress: '0xA0b86a33E6441Ef...',
 *   contractName: 'MyToken'
 * };
 *
 * const internalAsset = protoToAsset(protoAsset, ethereumNetworkId);
 * console.log(internalAsset.amount); // '1000000000000000000'
 * console.log((internalAsset as EvmFungibleAsset).contractAddress);
 * ```
 *
 * @example
 * Handle Fabric asset conversion:
 * ```typescript
 * const fabricProtoAsset: ProtoAsset = {
 *   tokenId: 'asset-789',
 *   tokenType: 2, // Fabric token type
 *   owner: 'user1',
 *   amount: BigInt('500'),
 *   mspId: 'Org1MSP',
 *   channelName: 'mychannel'
 * };
 *
 * const fabricAsset = protoToAsset(fabricProtoAsset, fabricNetworkId);
 * console.log((fabricAsset as FabricFungibleAsset).mspId); // 'Org1MSP'
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link ProtoAsset} for Protocol Buffer asset schema
 * @see {@link Asset} for internal asset interface
 * @see {@link FungibleAsset} for fungible asset structure
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function protoToAsset(asset: ProtoAsset, networkId: NetworkId): Asset {
  const assetObj: Asset = {
    id: asset.tokenId,
    referenceId: asset.referenceId,
    type: asset.tokenType.valueOf(),
    owner: asset.owner,
    contractName: asset.contractName,
    network: networkId,
    ercTokenStandard: asset.ercTokenStandard,
  };
  if (asset.tokenType == TokenType.NONSTANDARD_FUNGIBLE) {
    (assetObj as FungibleAsset).amount = Number(asset.amount) as Amount;
  } else if (asset.tokenType == TokenType.NONSTANDARD_NONFUNGIBLE) {
    (assetObj as NonFungibleAsset).uniqueDescriptor = Number(
      asset.amount,
    ) as UniqueTokenID;
  }
  if (asset.mspId) {
    (assetObj as FabricFungibleAsset).mspId = asset.mspId;
    (assetObj as FabricFungibleAsset).channelName = asset.channelName;
  }
  if (asset.contractAddress) {
    (assetObj as EvmFungibleAsset).contractAddress = asset.contractAddress;
  }

  return assetObj;
}

/**
 * Performs deep equality comparison between two Protocol Buffer assets.
 *
 * @description
 * Compares all fields of two Protocol Buffer asset objects to determine
 * if they represent the same asset with identical properties. This function
 * is essential for asset verification, validation, and consistency checking
 * throughout the SATP protocol flow.
 *
 * **Comparison Fields:**
 * - **Token ID**: Asset unique identifier
 * - **Token Type**: Asset type classification
 * - **Owner**: Current asset owner address
 * - **Amount**: Asset quantity (BigInt comparison)
 * - **Contract Name**: Smart contract or chaincode name
 * - **MSP ID**: Membership Service Provider identifier (Fabric)
 * - **Channel Name**: Fabric channel name
 * - **Contract Address**: Smart contract address (EVM networks)
 *
 * **Use Cases:**
 * - **Asset Verification**: Confirming asset consistency across protocol stages
 * - **Validation Checks**: Ensuring received assets match expected values
 * - **Audit Trail**: Verifying asset properties haven't been tampered with
 * - **Error Detection**: Identifying discrepancies in asset representation
 * - **Protocol Compliance**: Ensuring assets meet SATP specification requirements
 *
 * **Comparison Logic:**
 * All fields must match exactly for the comparison to return true. This includes
 * optional fields like MSP ID and contract addresses - if present in one asset,
 * they must be present and identical in the other asset.
 *
 * @public
 * @function compareProtoAsset
 * @param {ProtoAsset} asset1 - First Protocol Buffer asset to compare
 * @param {ProtoAsset} asset2 - Second Protocol Buffer asset to compare
 * @returns {boolean} True if all asset properties match exactly, false otherwise
 *
 * @example
 * Basic asset comparison:
 * ```typescript
 * const asset1: ProtoAsset = {
 *   tokenId: 'token-123',
 *   tokenType: 1,
 *   owner: '0x1234...abcd',
 *   amount: BigInt('1000000000000000000'),
 *   contractAddress: '0xA0b86a33E6441Ef...'
 * };
 *
 * const asset2: ProtoAsset = {
 *   tokenId: 'token-123',
 *   tokenType: 1,
 *   owner: '0x1234...abcd',
 *   amount: BigInt('1000000000000000000'),
 *   contractAddress: '0xA0b86a33E6441Ef...'
 * };
 *
 * const isEqual = compareProtoAsset(asset1, asset2);
 * console.log(isEqual); // true
 * ```
 *
 * @example
 * Detect asset differences:
 * ```typescript
 * const originalAsset: ProtoAsset = { ...otherProps, amount: BigInt('1000') };
 * const receivedAsset: ProtoAsset = { ...otherProps, amount: BigInt('999') };
 *
 * if (!compareProtoAsset(originalAsset, receivedAsset)) {
 *   console.error('Asset mismatch detected - possible tampering');
 *   throw new Error('Asset validation failed');
 * }
 * ```
 *
 * @example
 * Validation in SATP protocol flow:
 * ```typescript
 * function validateAssetConsistency(
 *   proposedAsset: ProtoAsset,
 *   confirmedAsset: ProtoAsset
 * ): void {
 *   if (!compareProtoAsset(proposedAsset, confirmedAsset)) {
 *     throw new Error('Asset consistency check failed between proposal and confirmation');
 *   }
 * }
 * ```
 *
 * @since 0.0.3-beta
 * @see {@link ProtoAsset} for Protocol Buffer asset schema
 * @see {@link assetToProto} for asset conversion to Protocol Buffer
 * @see {@link protoToAsset} for Protocol Buffer to internal conversion
 */
export function compareProtoAsset(
  asset1: ProtoAsset,
  asset2: ProtoAsset,
): boolean {
  return (
    asset1.tokenId === asset2.tokenId &&
    asset1.tokenType === asset2.tokenType &&
    asset1.owner === asset2.owner &&
    asset1.amount === asset2.amount &&
    asset1.contractName === asset2.contractName &&
    asset1.mspId === asset2.mspId &&
    asset1.channelName === asset2.channelName &&
    asset1.contractAddress === asset2.contractAddress &&
    asset1.ercTokenStandard === asset2.ercTokenStandard
  );
}
