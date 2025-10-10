import {
  type FabricSigningCredential,
  FabricSigningCredentialType,
  type VaultTransitKey,
  type WebSocketKey,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";

import {
  type FabricOptionsJSON,
  isFabricOptionsJSON,
} from "./validate-fabric-options";
import { isClaimFormat } from "./validate-bungee-options";
import type { ClaimFormat } from "../../../../generated/proto/cacti/satp/v02/common/message_pb";
import { NetworkOptionsJSON } from "../validate-cc-config";
import { isNetworkId } from "../validate-satp-gateway-identity";
import { isKeyPairJSON, KeyPairJSON } from "../validate-key-pair-json";
import { X509Identity } from "fabric-network";
import { Logger } from "@hyperledger/cactus-common";
import {
  chainConfigElement,
  identifyAndCheckConfigFormat,
} from "../../../utils";

export interface FabricConfigJSON extends NetworkOptionsJSON {
  userIdentity?: X509Identity;
  channelName: string;
  connectorOptions: Partial<FabricOptionsJSON>;
  targetOrganizations?: Array<TargetOrganization>;
  caFilePath?: string;
  coreYamlFilePath?: string;
  orderer?: string;
  ordererTLSHostnameOverride?: string;
  connTimeout?: number;
  signaturePolicy?: string;
  mspId?: string;
  wrapperContractName?: string;
  leafId?: string;
  keyPair?: KeyPairJSON;
  claimFormats?: ClaimFormat[];
}

export interface TargetOrganization {
  CORE_PEER_LOCALMSPID: string;
  CORE_PEER_ADDRESS: string;
  CORE_PEER_MSPCONFIG_PATH: string;
  CORE_PEER_TLS_ROOTCERT_PATH: string;
  ORDERER_TLS_ROOTCERT_PATH: string;
}

// Type guard for FabricSigningCredentialType
export function isFabricSigningCredentialType(
  value: unknown,
  log: Logger,
): value is FabricSigningCredentialType {
  if (typeof value !== "string") {
    log.error("isFabricSigningCredentialType: value is not a string");
    return false;
  }
  if (
    value !== FabricSigningCredentialType.X509 &&
    value !== FabricSigningCredentialType.VaultX509 &&
    value !== FabricSigningCredentialType.WsX509
  ) {
    log.error(
      `isFabricSigningCredentialType: value '${value}' is not a valid FabricSigningCredentialType`,
    );
    return false;
  }
  return true;
}

// Type guard for VaultTransitKey
function isVaultTransitKey(obj: unknown, log: Logger): obj is VaultTransitKey {
  const objRecord = obj as Record<string, unknown>;
  if (typeof obj !== "object" || obj === null) {
    log.error("isVaultTransitKey: obj is not an object or is null");
    return false;
  }
  if (!("keyName" in obj) || typeof objRecord.keyName !== "string") {
    log.error("isVaultTransitKey: keyName missing or not a string");
    return false;
  }
  if (!("token" in obj) || typeof objRecord.token !== "string") {
    log.error("isVaultTransitKey: token missing or not a string");
    return false;
  }
  return true;
}

// Type guard for WebSocketKey
function isWebSocketKey(obj: unknown, log: Logger): obj is WebSocketKey {
  const objRecord = obj as Record<string, unknown>;
  if (typeof obj !== "object" || obj === null) {
    log.error("isWebSocketKey: obj is not an object or is null");
    return false;
  }
  if (!("sessionId" in obj) || typeof objRecord.sessionId !== "string") {
    log.error("isWebSocketKey: sessionId missing or not a string");
    return false;
  }
  if (!("signature" in obj) || typeof objRecord.signature !== "string") {
    log.error("isWebSocketKey: signature missing or not a string");
    return false;
  }
  return true;
}

// Type guard for FabricSigningCredential
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isFabricSigningCredential(
  obj: unknown,
  log: Logger,
): obj is FabricSigningCredential {
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof obj === "object" &&
    obj !== null &&
    "keychainId" in obj &&
    typeof objRecord.keychainId === "string" &&
    "keychainRef" in obj &&
    typeof objRecord.keychainRef === "string" &&
    (!("type" in obj) || isFabricSigningCredentialType(objRecord.type, log)) &&
    (!("vaultTransitKey" in obj) ||
      isVaultTransitKey(objRecord.vaultTransitKey, log)) &&
    (!("webSocketKey" in obj) || isWebSocketKey(objRecord.webSocketKey, log))
  );
}

function isUserIdentity(obj: unknown, log: Logger): obj is X509Identity {
  const objRecord = obj as Record<string, unknown>;
  if (typeof obj !== "object" || obj === null) {
    log.error("isUserIdentity: obj is not an object or is null");
    return false;
  }
  if (!("type" in obj)) {
    log.error("isUserIdentity: 'type' property missing");
    return false;
  }
  if (typeof objRecord.type !== "string") {
    log.error("isUserIdentity: 'type' property is not a string");
    return false;
  }
  if (!("credentials" in obj)) {
    log.error("isUserIdentity: 'credentials' property missing");
    return false;
  }
  if (
    typeof objRecord.credentials !== "object" ||
    objRecord.credentials === null
  ) {
    log.error("isUserIdentity: 'credentials' is not an object or is null");
    return false;
  }
  const credentials = objRecord.credentials as Record<string, unknown>;
  if (!("certificate" in credentials)) {
    log.error("isUserIdentity: 'certificate' property missing in credentials");
    return false;
  }
  if (typeof credentials.certificate !== "string") {
    log.error("isUserIdentity: 'certificate' property is not a string");
    return false;
  }
  if (!("privateKey" in credentials)) {
    log.error("isUserIdentity: 'privateKey' property missing in credentials");
    return false;
  }
  if (typeof credentials.privateKey !== "string") {
    log.error("isUserIdentity: 'privateKey' property is not a string");
    return false;
  }
  return true;
}

// Type guard for FabricConfigJSON
export function isFabricConfigJSON(
  obj: unknown,
  log: Logger,
): obj is FabricConfigJSON {
  if (typeof obj !== "object" || obj === null) {
    log.error("isFabricConfigJSON: obj is not an object or is null");
    return false;
  }

  const configDefaultFields: chainConfigElement<unknown>[] = [
    {
      configElement: "channelName",
      configElementType: String,
    },
    {
      configElement: "userIdentity",
      configElementTypeguard: isUserIdentity,
    },
    {
      configElement: "connectorOptions",
      configElementTypeguard: isFabricOptionsJSON,
    },
    {
      configElement: "networkIdentification",
      configElementTypeguard: isNetworkId,
    },
    {
      configElement: "caFilePath",
      configElementType: String,
    },
    {
      configElement: "coreYamlFilePath",
      configElementType: String,
    },
  ];

  const configOptionalFields: chainConfigElement<unknown>[] = [
    {
      configElement: "targetOrganizations",
      configElementType: Array,
      configSubElementType: Object,
    },
    {
      configElement: "ccSequence",
      configElementType: Number,
    },
    {
      configElement: "orderer",
      configElementType: String,
    },
    {
      configElement: "ordererTLSHostnameOverride",
      configElementType: String,
    },
    {
      configElement: "connTimeout",
      configElementType: Number,
    },
    {
      configElement: "signaturePolicy",
      configElementType: String,
    },
    {
      configElement: "mspId",
      configElementType: String,
    },
    {
      configElement: "wrapperContractName",
      configElementType: String,
    },
    {
      configElement: "leafId",
      configElementType: String,
    },
    {
      configElement: "keyPair",
      configElementTypeguard: isKeyPairJSON,
    },
    {
      configElement: "claimFormats",
      configElementType: Array,
      configSubElementFunctionTypeguard: isClaimFormat,
    },
  ];

  const objRecord = obj as Record<string, unknown>;

  return identifyAndCheckConfigFormat(
    configDefaultFields,
    objRecord,
    log,
    "isFabricConfigJSON",
    configOptionalFields,
  );
}
