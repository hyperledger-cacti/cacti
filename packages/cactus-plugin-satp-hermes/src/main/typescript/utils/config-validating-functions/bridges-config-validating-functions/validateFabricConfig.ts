import {
  type FabricSigningCredential,
  FabricSigningCredentialType,
  type VaultTransitKey,
  type WebSocketKey,
} from "@hyperledger/cactus-plugin-ledger-connector-fabric";

import type { FabricAsset } from "../../../cross-chain-mechanisms/satp-bridge/types/fabric-asset";
import { isAsset } from "./validateAsset";
import type { NetworkConfigJSON } from "../validateSatpBridgesConfig";
import {
  type FabricOptionsJSON,
  isFabricOptionsJSON,
} from "./validateFabricOptions";
import {
  type BungeeOptionsJSON,
  isBungeeOptionsJSON,
  isClaimFormat,
} from "./validateBungeeOptions";
import type { ClaimFormat } from "../../../generated/proto/cacti/satp/v02/common/message_pb";

export interface FabricConfigJSON extends NetworkConfigJSON {
  signingCredential: FabricSigningCredential;
  channelName: string;
  contractName: string;
  options: FabricOptionsJSON;
  bungeeOptions: BungeeOptionsJSON;
  fabricAssets?: FabricAsset[];
  claimFormat: ClaimFormat;
}

// Type guard for FabricAsset
function isFabricAsset(obj: unknown): obj is FabricAsset {
  const objRecord = obj as Record<string, unknown>;
  return (
    isAsset(obj) &&
    "mspId" in obj &&
    typeof objRecord.mspId === "string" &&
    "channelName" in obj &&
    typeof objRecord.channelName === "string"
  );
}

// Type guard for an array of FabricAsset
function isFabricAssetArray(input: unknown): input is Array<FabricAsset> {
  return Array.isArray(input) && input.every(isFabricAsset);
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

// Type guard for FabricConfigJSON
export function isFabricConfigJSON(obj: unknown): obj is FabricConfigJSON {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return (
    "channelName" in obj &&
    typeof objRecord.channelName === "string" &&
    "contractName" in obj &&
    typeof objRecord.contractName === "string" &&
    "signingCredential" in obj &&
    isFabricSigningCredential(objRecord.signingCredential) &&
    (!("fabricAssets" in obj) || isFabricAssetArray(objRecord.fabricAssets)) &&
    "bungeeOptions" in obj &&
    isBungeeOptionsJSON(objRecord.bungeeOptions) &&
    "options" in obj &&
    isFabricOptionsJSON(objRecord.options) &&
    "claimFormat" in obj &&
    isClaimFormat(objRecord.claimFormat)
  );
}
