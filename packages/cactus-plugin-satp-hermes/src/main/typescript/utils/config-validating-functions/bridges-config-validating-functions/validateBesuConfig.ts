import type { EvmAsset } from "../../../cross-chain-mechanisms/satp-bridge/types/evm-asset";
import {
  type Web3SigningCredential,
  type Web3SigningCredentialCactusKeychainRef,
  type Web3SigningCredentialNone,
  type Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import type { NetworkConfigJSON } from "../validateSatpBridgesConfig";
import { type BesuOptionsJSON, isBesuOptionsJSON } from "./validateBesuOptions";
import {
  type BungeeOptionsJSON,
  isBungeeOptionsJSON,
  isClaimFormat,
} from "./validateBungeeOptions";
import type { ClaimFormat } from "../../../generated/proto/cacti/satp/v02/common/message_pb";
import { isEvmAssetArray } from "./validateEthereumConfig";

export interface BesuConfigJSON extends NetworkConfigJSON {
  keychainId: string;
  signingCredential: Web3SigningCredential;
  contractName: string;
  contractAddress: string;
  gas: number;
  options: BesuOptionsJSON;
  bungeeOptions: BungeeOptionsJSON;
  besuAssets?: EvmAsset[];
  claimFormat: ClaimFormat;
}

// Type guard for Web3SigningCredentialType
function isWeb3SigningCredentialType(
  value: unknown,
): value is Web3SigningCredentialType {
  return (
    typeof value === "string" &&
    value !== null &&
    (value === Web3SigningCredentialType.CactusKeychainRef ||
      value === Web3SigningCredentialType.PrivateKeyHex ||
      value === Web3SigningCredentialType.None)
  );
}

// Type guard for Web3SigningCredentialCactusKeychainRef
function isWeb3SigningCredentialCactusKeychainRef(
  obj: unknown,
): obj is Web3SigningCredentialCactusKeychainRef {
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof obj === "object" &&
    obj !== null &&
    "ethAccount" in obj &&
    typeof objRecord.ethAccount === "string" &&
    "keychainEntryKey" in obj &&
    typeof objRecord.keychainEntryKey === "string" &&
    "keychainId" in obj &&
    typeof objRecord.keychainId === "string" &&
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
    isWeb3SigningCredentialCactusKeychainRef(obj) ||
    isWeb3SigningCredentialPrivateKeyHex(obj) ||
    isWeb3SigningCredentialNone(obj)
  );
}

// Type guard for BesuConfigJSON
export function isBesuConfigJSON(obj: unknown): obj is BesuConfigJSON {
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
    (!("besuAssets" in obj) || isEvmAssetArray(objRecord.besuAssets)) &&
    "bungeeOptions" in obj &&
    isBungeeOptionsJSON(objRecord.bungeeOptions) &&
    "options" in obj &&
    isBesuOptionsJSON(objRecord.options) &&
    "claimFormat" in obj &&
    isClaimFormat(objRecord.claimFormat)
  );
}
