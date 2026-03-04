import {
  type Web3SigningCredential,
  type Web3SigningCredentialCactusKeychainRef,
  type Web3SigningCredentialNone,
  type Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-besu";
import { isBesuOptionsJSON } from "./validate-besu-options";
import { isClaimFormat } from "./validate-bungee-options";
import { isNetworkId } from "../validate-satp-gateway-identity";
import { Logger } from "@hyperledger/cactus-common";
import {
  chainConfigElement,
  identifyAndCheckConfigFormat,
} from "../../../utils";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { IBesuNetworkConfig } from "../../../../cross-chain-mechanisms/bridge/bridge-types";
import { NetworkId } from "../../../../public-api";
import { isGasConfig } from "../validate-cc-config";

export interface BesuGasConfig {
  gasLimit?: string;
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
function isWeb3SigningCredential(
  obj: unknown,
  log: Logger,
): obj is Web3SigningCredential {
  if (!obj || typeof obj !== "object") {
    log.error("isWeb3SigningCredential: obj is not an object or is null");
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  if ("transactionSignerEthAccount" in objRecord) {
    (obj as any).ethAccount = (obj as any).transactionSignerEthAccount;
    delete (obj as any).transactionSignerEthAccount;
  }
  return (
    isWeb3SigningCredentialCactusKeychainRef(obj) ||
    isWeb3SigningCredentialPrivateKeyHex(obj) ||
    isWeb3SigningCredentialNone(obj)
  );
}

export function isBesuNetworkId(obj: NetworkId) {
  return (
    (obj.ledgerType as LedgerType) === LedgerType.Besu1X ||
    (obj.ledgerType as LedgerType) === LedgerType.Besu2X
  );
}

// Type guard for BesuConfigJSON
export function isBesuConfigJSON(
  obj: unknown,
  log: Logger,
): obj is IBesuNetworkConfig {
  if (typeof obj !== "object" || obj === null) {
    log.error("isBesuConfigJSON: obj is not an object or is null");
    return false;
  }

  const configDefaultFields: chainConfigElement<unknown>[] = [
    {
      configElement: "networkIdentification",
      configElementTypeguard: isNetworkId,
    },
    {
      configElement: "signingCredential",
      configElementTypeguard: isWeb3SigningCredential,
    },
    {
      configElement: "connectorOptions",
      configElementTypeguard: isBesuOptionsJSON,
    },
  ];

  const optionalConfigElements: chainConfigElement<unknown>[] = [
    {
      configElement: "leafId",
      configElementType: "string",
    },
    {
      configElement: "keyPair",
      configElementType: "object",
    },
    {
      configElement: "claimFormats",
      configElementTypeguard: Array.isArray,
      configSubElementFunctionTypeguard: isClaimFormat,
    },
    {
      configElement: "wrapperContractName",
      configElementType: "string",
    },
    {
      configElement: "wrapperContractAddress",
      configElementType: "string",
    },
    {
      configElement: "gasConfig",
      configElementTypeguard: isGasConfig,
    },
  ];

  const objRecord = obj as Record<string, unknown>;

  return identifyAndCheckConfigFormat(
    configDefaultFields,
    objRecord,
    log,
    "isBesuConfigJSON",
    optionalConfigElements,
  );
}
