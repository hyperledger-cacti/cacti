import {
  DeploymentTargetOrganization,
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
import { iskeyPairJSON, KeyPairJSON } from "../validate-key-pair-json";
import { X509Identity } from "fabric-network";

export interface FabricConfigJSON extends NetworkOptionsJSON {
  userIdentity?: X509Identity;
  channelName: string;
  connectorOptions: FabricOptionsJSON;
  targetOrganizations?: Array<DeploymentTargetOrganization>;
  caFile?: string;
  ccSequence?: number;
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

// Type guard for FabricSigningCredentialType
export function isFabricSigningCredentialType(
  value: unknown,
): value is FabricSigningCredentialType {
  return (
    typeof value === "string" &&
    value !== null &&
    (value === FabricSigningCredentialType.X509 ||
      value === FabricSigningCredentialType.VaultX509 ||
      value === FabricSigningCredentialType.WsX509)
  );
}

// Type guard for VaultTransitKey
function isVaultTransitKey(obj: unknown): obj is VaultTransitKey {
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof obj === "object" &&
    obj !== null &&
    "keyName" in obj &&
    typeof objRecord.keyName === "string" &&
    "token" in obj &&
    typeof objRecord.token === "string"
  );
}

// Type guard for WebSocketKey
function isWebSocketKey(obj: unknown): obj is WebSocketKey {
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof obj === "object" &&
    obj !== null &&
    "sessionId" in obj &&
    typeof objRecord.sessionId === "string" &&
    "signature" in obj &&
    typeof objRecord.signature === "string"
  );
}

// Type guard for FabricSigningCredential
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isFabricSigningCredential(
  obj: unknown,
): obj is FabricSigningCredential {
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof obj === "object" &&
    obj !== null &&
    "keychainId" in obj &&
    typeof objRecord.keychainId === "string" &&
    "keychainRef" in obj &&
    typeof objRecord.keychainRef === "string" &&
    (!("type" in obj) || isFabricSigningCredentialType(objRecord.type)) &&
    (!("vaultTransitKey" in obj) ||
      isVaultTransitKey(objRecord.vaultTransitKey)) &&
    (!("webSocketKey" in obj) || isWebSocketKey(objRecord.webSocketKey))
  );
}

function isUserIdentity(obj: unknown): obj is X509Identity {
  const objRecord = obj as Record<string, unknown>;
  return (
    typeof obj === "object" &&
    obj !== null &&
    "type" in obj &&
    typeof objRecord.type === "string" &&
    "credentials" in obj &&
    typeof objRecord.credentials === "object" &&
    objRecord.credentials !== null &&
    "certificate" in objRecord.credentials &&
    typeof objRecord.credentials.certificate === "string" &&
    "privateKey" in objRecord.credentials &&
    typeof objRecord.credentials.privateKey === "string"
  );
}

// Type guard for FabricConfigJSON
export function isFabricConfigJSON(obj: unknown): obj is FabricConfigJSON {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return (
    "channelName" in obj &&
    typeof objRecord.channelName === "string" &&
    "userIdentity" in obj &&
    isUserIdentity(objRecord.userIdentity) &&
    "connectorOptions" in obj &&
    isFabricOptionsJSON(objRecord.connectorOptions) &&
    "networkIdentification" in obj &&
    isNetworkId(objRecord.networkIdentification) &&
    (!("targetOrganizations" in obj) ||
      (Array.isArray(objRecord.targetOrganizations) &&
        objRecord.targetOrganizations.every(
          (org) => typeof org === "object" && org !== null,
        ))) &&
    (!("caFile" in obj) || typeof objRecord.caFile === "string") &&
    (!("ccSequence" in obj) || typeof objRecord.ccSequence === "number") &&
    (!("orderer" in obj) || typeof objRecord.orderer === "string") &&
    (!("ordererTLSHostnameOverride" in obj) ||
      typeof objRecord.ordererTLSHostnameOverride === "string") &&
    (!("connTimeout" in obj) || typeof objRecord.connTimeout === "number") &&
    (!("signaturePolicy" in obj) ||
      typeof objRecord.signaturePolicy === "string") &&
    (!("mspId" in obj) || typeof objRecord.mspId === "string") &&
    (!("wrapperContractName" in obj) ||
      typeof objRecord.wrapperContractName === "string") &&
    (!("leafId" in obj) || typeof objRecord.leafId === "string") &&
    (!("keyPair" in obj) || iskeyPairJSON(obj.keyPair)) &&
    (!("claimFormats" in obj) ||
      (Array.isArray(objRecord.claimFormats) &&
        objRecord.claimFormats.every((format) => isClaimFormat(format))))
  );
}
