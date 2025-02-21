import type { EvmAsset } from "../../../cross-chain-mechanisms/satp-bridge/types/evm-asset";
import {
  type Web3SigningCredential,
  type Web3SigningCredentialCactiKeychainRef,
  type Web3SigningCredentialGethKeychainPassword,
  type Web3SigningCredentialNone,
  type Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { isAsset } from "./validateAsset";
import type { NetworkConfigJSON } from "../validateSatpBridgesConfig";
import {
  type EthereumOptionsJSON,
  isEthereumOptionsJSON,
} from "./validateEthereumOptions";
import {
  type BungeeOptionsJSON,
  isBungeeOptionsJSON,
  isClaimFormat,
} from "./validateBungeeOptions";
import type { ClaimFormat } from "../../../generated/proto/cacti/satp/v02/common/message_pb";

export interface EthereumConfigJSON extends NetworkConfigJSON {
  keychainId: string;
  signingCredential: Web3SigningCredential;
  contractName: string;
  contractAddress: string;
  gas: number;
  options: EthereumOptionsJSON;
  bungeeOptions: BungeeOptionsJSON;
  ethereumAssets?: EvmAsset[];
  claimFormat: ClaimFormat;
}

// Type guard for EvmAsset
function isEvmAsset(obj: unknown): obj is EvmAsset {
  const objRecord = obj as Record<string, unknown>;
  return (
    isAsset(obj) &&
    "contractAddress" in obj &&
    typeof objRecord.contractAddress === "string"
  );
}

// Type guard for an array of EvmAsset
export function isEvmAssetArray(input: unknown): input is Array<EvmAsset> {
  return Array.isArray(input) && input.every(isEvmAsset);
}

// Type guard for Web3SigningCredentialType
function isWeb3SigningCredentialType(
  value: unknown,
): value is Web3SigningCredentialType {
  return (
    typeof value === "string" &&
    value !== null &&
    (value === Web3SigningCredentialType.CactiKeychainRef ||
      value === Web3SigningCredentialType.GethKeychainPassword ||
      value === Web3SigningCredentialType.PrivateKeyHex ||
      value === Web3SigningCredentialType.None)
  );
}

// Type guard for Web3SigningCredentialCactiKeychainRef
function isWeb3SigningCredentialCactiKeychainRef(
  obj: unknown,
): obj is Web3SigningCredentialCactiKeychainRef {
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof obj === "object" &&
    obj !== null &&
    "ethAccount" in obj &&
    typeof objRecord.ethAccount === "string" &&
    "keychainEntryKey" in obj &&
    typeof objRecord.keychainEntryKey === "string" &&
    (!("keychainId" in obj) || typeof objRecord.keychainId === "string") &&
    "type" in obj &&
    isWeb3SigningCredentialType(objRecord.type)
  );
}

// Type guard for Web3SigningCredentialGethKeychainPassword
function isWeb3SigningCredentialGethKeychainPassword(
  obj: unknown,
): obj is Web3SigningCredentialGethKeychainPassword {
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof obj === "object" &&
    obj !== null &&
    "ethAccount" in obj &&
    typeof objRecord.ethAccount === "string" &&
    "secret" in obj &&
    typeof objRecord.secret === "string" &&
    "type" in obj &&
    isWeb3SigningCredentialType(objRecord.type)
  );
}

// Type guard for Web3SigningCredentialPrivateKeyHex
function isWeb3SigningCredentialPrivateKeyHex(
  obj: unknown,
): obj is Web3SigningCredentialPrivateKeyHex {
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof obj === "object" &&
    obj !== null &&
    "ethAccount" in obj &&
    typeof objRecord.ethAccount === "string" &&
    "secret" in obj &&
    typeof objRecord.secret === "string" &&
    "type" in obj &&
    isWeb3SigningCredentialType(objRecord.type)
  );
}

// Type guard for Web3SigningCredentialNone
function isWeb3SigningCredentialNone(
  obj: unknown,
): obj is Web3SigningCredentialNone {
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof obj === "object" &&
    obj !== null &&
    "type" in obj &&
    isWeb3SigningCredentialType(objRecord.type)
  );
}

// Type guard for Web3SigningCredential
function isWeb3SigningCredential(obj: unknown): obj is Web3SigningCredential {
  if (!obj || typeof obj !== "object") {
    return false;
  }
  return (
    isWeb3SigningCredentialCactiKeychainRef(obj) ||
    isWeb3SigningCredentialGethKeychainPassword(obj) ||
    isWeb3SigningCredentialPrivateKeyHex(obj) ||
    isWeb3SigningCredentialNone(obj)
  );
}

// Type guard for EthereumConfigJSON
export function isEthereumConfigJSON(obj: unknown): obj is EthereumConfigJSON {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return (
    "keychainId" in obj &&
    typeof objRecord.keychainId === "string" &&
    "contractName" in obj &&
    typeof objRecord.contractName === "string" &&
    "contractAddress" in obj &&
    typeof objRecord.contractAddress === "string" &&
    "gas" in obj &&
    typeof objRecord.gas === "number" &&
    "signingCredential" in obj &&
    isWeb3SigningCredential(objRecord.signingCredential) &&
    (!("ethereumAssets" in obj) || isEvmAssetArray(objRecord.ethereumAssets)) &&
    "bungeeOptions" in obj &&
    isBungeeOptionsJSON(objRecord.bungeeOptions) &&
    "options" in obj &&
    isEthereumOptionsJSON(objRecord.options) &&
    "claimFormat" in obj &&
    isClaimFormat(objRecord.claimFormat)
  );
}
