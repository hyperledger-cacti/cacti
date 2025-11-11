import {
  type Web3SigningCredential,
  type Web3SigningCredentialCactiKeychainRef,
  type Web3SigningCredentialGethKeychainPassword,
  type Web3SigningCredentialNone,
  type Web3SigningCredentialPrivateKeyHex,
  Web3SigningCredentialType,
} from "@hyperledger/cactus-plugin-ledger-connector-ethereum";
import { isEthereumOptionsJSON } from "./validate-ethereum-options";
import { isClaimFormat } from "./validate-bungee-options";
import { isGasConfig } from "../validate-cc-config";
import { isNetworkId } from "../validate-satp-gateway-identity";
import { Logger } from "@hyperledger/cactus-common";
import {
  chainConfigElement,
  identifyAndCheckConfigFormat,
} from "../../../utils";
import { LedgerType } from "@hyperledger/cactus-core-api";
import { IEthereumNetworkConfig } from "../../../../cross-chain-mechanisms/bridge/bridge-types";
import { NetworkId } from "../../../../public-api";

// Type guard for Web3SigningCredentialType
export function isWeb3SigningCredentialType(
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
    "transactionSignerEthAccount" in obj &&
    typeof objRecord.transactionSignerEthAccount === "string" &&
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
    "transactionSignerEthAccount" in obj &&
    typeof objRecord.transactionSignerEthAccount === "string" &&
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
    "transactionSignerEthAccount" in obj &&
    typeof objRecord.transactionSignerEthAccount === "string" &&
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
  return (
    isWeb3SigningCredentialCactiKeychainRef(obj) ||
    isWeb3SigningCredentialGethKeychainPassword(obj) ||
    isWeb3SigningCredentialPrivateKeyHex(obj) ||
    isWeb3SigningCredentialNone(obj)
  );
}

export function isEthereumNetworkId(obj: NetworkId) {
  return (obj.ledgerType as LedgerType) === LedgerType.Ethereum;
}

// Type guard for EthereumConfigJSON
export function isEthereumConfigJSON(
  obj: unknown,
  log: Logger,
): obj is IEthereumNetworkConfig {
  if (typeof obj !== "object" || obj === null) {
    log.error("isEthereumConfigJSON: obj is not an object or is null");
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
      configElementTypeguard: isEthereumOptionsJSON,
    },
  ];

  const configOptionalFields: chainConfigElement<unknown>[] = [
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
  ];

  const objRecord = obj as Record<string, unknown>;

  return identifyAndCheckConfigFormat(
    configDefaultFields,
    objRecord,
    log,
    "isEthereumConfigJSON",
    configOptionalFields,
  );
}
