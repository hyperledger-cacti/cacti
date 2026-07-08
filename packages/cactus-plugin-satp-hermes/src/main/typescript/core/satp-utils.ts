import { Asset } from "../cross-chain-mechanisms/bridge/ontology/assets/asset";
/**
 * @fileoverview
 * SATP Protocol Utilities - Helper Functions for SATP Operations
 *
 * @description
 * This module provides essential utility functions for SATP (Secure Asset Transfer Protocol)
 * operations within the Hyperledger Cacti ecosystem. These utilities support protocol
 * message handling, type conversions, and common operations used throughout the SATP
 * implementation.
 *
 * **Core Functionality:**
 * - **Message Type Utilities**: Helper functions for protocol message type handling
 * - **Type Conversions**: Conversion utilities for protocol enums and types
 * - **Protocol Helpers**: Common operations for SATP protocol compliance
 * - **Validation Support**: Utilities for protocol validation and verification
 *
 * **Integration Context:**
 * These utilities are used across all SATP components including services, handlers,
 * sessions, and stage implementations to provide consistent protocol operations
 * and message handling capabilities.
 *
 * @author SATP Development Team
 * @since 0.0.3-beta
 * @version 0.0.3-beta
 * @see {@link MessageType} for message type enumeration
 * @see {@link getEnumKeyByValue} for enum utility functions
 */

import {
  ERCTokenStandard,
  MessageType,
} from "../generated/proto/cacti/satp/v02/common/message_pb";
import { getEnumKeyByValue } from "../services/utils";
import {
  TokenIdMissingError,
  LedgerAssetError,
  AmountMissingError,
  UniqueTokenDescriptorMissingError,
} from "./errors/satp-service-errors";
import { SATPLogger } from "./satp-logger";
import { protoToAsset } from "./stage-services/service-utils";
import { LedgerType } from "@hyperledger-cacti/cactus-core-api";
import { NetworkId } from "../public-api";
import { TokenType } from "../generated/proto/cacti/satp/v02/common/message_pb";
import { SessionData } from "../generated/proto/cacti/satp/v02/session/session_pb";

/**
 * Aggregated asset and network information built from session data.
 *
 * @description
 * Represents the token and its associated network identification derived
 * from a SATP session, ready to be consumed by bridge execution layers.
 */
export interface SessionAssetBuildData {
  /** Asset instance (fungible or non-fungible) reconstructed from session data */
  token: Asset;
  /** Target network identifier containing ledger type and network id */
  networkId: NetworkId;
}

/**
 * Identifies which side of a SATP session is being processed.
 */
export enum SessionSide {
  /** Operations executed by the client gateway */
  CLIENT,
  /** Operations executed by the server gateway */
  SERVER,
}

/**
 * Retrieves the human-readable name for a SATP message type.
 *
 * @description
 * Converts MessageType enum values to their corresponding string names for
 * logging, debugging, and human-readable output. Provides fallback handling
 * for undefined or unspecified message types.
 *
 * @public
 * @function getMessageTypeName
 * @param {MessageType | undefined} messageType - Message type enum value
 * @returns {string} Human-readable message type name
 * @since 0.0.3-beta
 */
export function getMessageTypeName(
  messageType: MessageType | undefined,
): string {
  return (
    (messageType
      ? getEnumKeyByValue(MessageType, messageType)
      : getEnumKeyByValue(MessageType, MessageType.UNSPECIFIED)) ||
    "UNSPECIFIED"
  );
}

/**
 * Converts a camelCase string to SCREAMING_SNAKE_CASE.
 *
 * @description
 * Inserts an underscore between every lowercase–uppercase boundary and
 * uppercases the result (e.g. "contractName" → "CONTRACT_NAME").
 * Used to map camelCase variable identifiers from ontology JSON to their
 * corresponding enum keys.
 *
 * @public
 * @function toScreamingSnakeCase
 * @param {string} value - camelCase input string
 * @returns {string} SCREAMING_SNAKE_CASE output string
 * @since 0.1.0-alpha
 */
export function toScreamingSnakeCase(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase();
}

/**
 * Converts a string ERC token standard identifier to its corresponding enum value.
 *
 * @description
 * Performs a case-insensitive mapping from a string representation (e.g. "ERC20",
 * "erc721") to the protobuf {@link ERCTokenStandard} enum. Returns
 * {@link ERCTokenStandard.ERC_TOKEN_STANDARD_UNSPECIFIED} for unknown or absent values.
 *
 * @public
 * @function ercStandardToEnum
 * @param {string | undefined} standard - String representation of the ERC standard
 * @returns {ERCTokenStandard} Corresponding enum value
 * @since 0.1.0-alpha
 */
export function ercStandardToEnum(
  standard: string | undefined,
): ERCTokenStandard {
  switch (standard?.toUpperCase()) {
    case "ERC20":
      return ERCTokenStandard.ERC_TOKEN_STANDARD_ERC20;
    case "ERC721":
      return ERCTokenStandard.ERC_TOKEN_STANDARD_ERC721;
    case "ERC1155":
      return ERCTokenStandard.ERC_TOKEN_STANDARD_ERC1155;
    case "ERC6909":
      return ERCTokenStandard.ERC_TOKEN_STANDARD_ERC6909;
    default:
      return ERCTokenStandard.ERC_TOKEN_STANDARD_UNSPECIFIED;
  }
}

/**
 * Builds and validates an Asset from session data for a given session side.
 *
 * @description
 * Extracts the sender or receiver asset (based on session side), validates
 * required properties according to the token type, and returns the built
 * asset along with its network identification. Throws service errors on
 * missing or invalid parameters.
 *
 * @param fnTag - Context tag for logging and error reporting
 * @param protocolStep - Human-readable protocol step for logs
 * @param logger - Logger instance for debug output
 * @param sessionData - Session data containing sender/receiver assets
 * @param sessionSide - Indicates if CLIENT or SERVER side should be used
 * @returns Asset and NetworkId ready for bridge execution
 * @throws {LedgerAssetError} If the chosen side asset is missing
 * @throws {TokenIdMissingError} If token id is missing
 * @throws {AmountMissingError} If fungible amount is missing
 * @throws {UniqueTokenDescriptorMissingError} If NFT descriptor is missing
 */
export function buildAndCheckAsset(
  fnTag: string,
  protocolStep: string,
  logger: SATPLogger,
  sessionData: SessionData,
  sessionSide: SessionSide,
): SessionAssetBuildData {
  let sessionAsset: any;
  if (sessionSide == SessionSide.CLIENT) {
    if (sessionData.senderAsset == undefined) {
      throw new LedgerAssetError(fnTag);
    }
    sessionAsset = sessionData.senderAsset;
  } else {
    if (sessionData.receiverAsset == undefined) {
      throw new LedgerAssetError(fnTag);
    }
    sessionAsset = sessionData.receiverAsset;
  }
  const networkId = {
    id: sessionAsset.networkId?.id,
    ledgerType: sessionAsset.networkId?.type as LedgerType,
  } as NetworkId;
  let token: Asset;

  switch (sessionAsset.tokenType) {
    case TokenType.NONSTANDARD_FUNGIBLE:
      token = protoToAsset(sessionAsset, networkId) as Asset;
      if (token.id == undefined) {
        throw new TokenIdMissingError(fnTag);
      }
      if (
        !("amount" in token) ||
        ("amount" in token && token.amount == undefined)
      ) {
        throw new AmountMissingError(fnTag);
      }
      logger.debug(
        `${fnTag}, ${protocolStep} Asset ID: ${token.id} amount: ${token.amount}`,
      );
      return { token: token, networkId: networkId } as SessionAssetBuildData;
    case TokenType.NONSTANDARD_NONFUNGIBLE:
      token = protoToAsset(sessionAsset, networkId) as Asset;
      if (token.id == undefined) {
        throw new TokenIdMissingError(fnTag);
      }
      if (
        !("uniqueDescriptor" in token) ||
        ("uniqueDescriptor" in token && token.uniqueDescriptor == undefined)
      ) {
        throw new UniqueTokenDescriptorMissingError(fnTag);
      }
      logger.debug(
        `${fnTag}, ${protocolStep} Asset ID: ${token.id} uniqueDescriptor: ${token.uniqueDescriptor}`,
      );
      return { token: token, networkId: networkId } as SessionAssetBuildData;
    default:
      throw new Error(`Unsupported asset type ${sessionAsset.tokenType}`);
  }
}
