import {
  GasTransactionConfig,
  type Web3SigningCredential,
  type Web3SigningCredentialCactiKeychainRef,
  type Web3SigningCredentialGethKeychainPassword,
  type Web3SigningCredentialNone,
  type Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import {
  type EthereumOptionsJSON,
  isEthereumOptionsJSON,
} from "./validate-ethereum-options";
import { isClaimFormat } from "./validate-bungee-options";
import type { ClaimFormat } from "../../../../generated/proto/cacti/satp/v02/common/message_pb";
import { NetworkOptionsJSON } from "../validate-cc-config";
import { KeyPairJSON } from "../validate-key-pair-json";
import { isNetworkId } from "../validate-satp-gateway-identity";

export interface EthereumConfigJSON extends NetworkOptionsJSON {
  signingCredential: Web3SigningCredential;
  connectorOptions: EthereumOptionsJSON;
  wrapperContractName?: string;
  wrapperContractAddress?: string;
  gasConfig?: GasTransactionConfig;
  leafId?: string;
  keyPair?: KeyPairJSON;
  claimFormats?: ClaimFormat[];
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

function isGasConfig(obj: unknown): obj is GasTransactionConfig {
  if (!obj || typeof obj !== "object") {
    throw new TypeError(
      "isGasConfig: obj null or not obj" + JSON.stringify(obj),
    );
  }

  const objRecord = obj as Record<string, unknown>;

  return (
    ("gas" in obj &&
      typeof objRecord.gas === "string" &&
      "gasPrice" in obj &&
      typeof objRecord.gasPrice === "string") ||
    ("gasLimit" in obj &&
      typeof objRecord.gasLimit === "string" &&
      "maxFeePerGas" in obj &&
      typeof objRecord.maxFeePerGas === "string" &&
      "maxPriorityFeePerGas" in obj &&
      typeof objRecord.maxPriorityFeePerGas === "string")
  );
}

// Type guard for EthereumConfigJSON
export function isEthereumConfigJSON(obj: unknown): obj is EthereumConfigJSON {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return (
    "networkIdentification" in obj &&
    isNetworkId(objRecord.networkIdentification) &&
    "signingCredential" in obj &&
    isWeb3SigningCredential(objRecord.signingCredential) &&
    "connectorOptions" in obj &&
    isEthereumOptionsJSON(objRecord.connectorOptions) &&
    (!("wrapperContractName" in obj) ||
      typeof objRecord.wrapperContractName === "string") &&
    (!("wrapperContractAddress" in obj) ||
      typeof objRecord.wrapperContractAddress === "string") &&
    (!("gasConfig" in obj) || isGasConfig(objRecord.gasConfig)) &&
    (!("leafId" in obj) || typeof objRecord.leafId === "string") &&
    (!("keyPair" in obj) || typeof objRecord.keyPair === "object") &&
    (!("claimFormats" in obj) ||
      (Array.isArray(objRecord.claimFormats) &&
        objRecord.claimFormats.every((format) => isClaimFormat(format))))
  );
}
