import {
  type Web3SigningCredential,
  type Web3SigningCredentialCactusKeychainRef,
  type Web3SigningCredentialNone,
  type Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import {
  type BesuOptionsJSON,
  isBesuOptionsJSON,
} from "./validate-besu-options";
import { isClaimFormat } from "./validate-bungee-options";
import type { ClaimFormat } from "../../../../generated/proto/cacti/satp/v02/common/message_pb";
import { KeyPairJSON } from "../validate-key-pair-json";
import { NetworkOptionsJSON } from "../validate-cc-config";
import { isNetworkId } from "../validate-satp-gateway-identity";

export interface BesuConfigJSON extends NetworkOptionsJSON {
  signingCredential: Web3SigningCredential;
  connectorOptions: BesuOptionsJSON;
  leafId?: string;
  keyPair?: KeyPairJSON;
  claimFormats?: ClaimFormat[];
  wrapperContractName?: string;
  wrapperContractAddress?: string;
  gas?: number;
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
    "networkIdentification" in obj &&
    isNetworkId(objRecord.networkIdentification) &&
    "signingCredential" in obj &&
    isWeb3SigningCredential(objRecord.signingCredential) &&
    "connectorOptions" in obj &&
    isBesuOptionsJSON(objRecord.connectorOptions) &&
    (!("leafId" in obj) || typeof objRecord.leafId === "string") &&
    (!("keyPair" in obj) || typeof objRecord.keyPair === "object") &&
    ("claimFormats" in objRecord
      ? Array.isArray(objRecord.claimFormats) &&
        objRecord.claimFormats.every(isClaimFormat)
      : true) &&
    ("wrapperContractName" in objRecord
      ? typeof objRecord.wrapperContractName === "string"
      : true) &&
    ("wrapperContractAddress" in objRecord
      ? typeof objRecord.wrapperContractAddress === "string"
      : true) &&
    ("gas" in objRecord ? typeof objRecord.gas === "number" : true)
  );
}
