import { LedgerType } from "@hyperledger/cactus-core-api";
import {
  type Address,
  CurrentDrafts,
  type DraftVersions,
  type GatewayIdentity,
} from"../../core/types";
import type { NetworkId } from "../../network-identification/chainid-list";

// Type guard for Address
function isAddress(input: unknown): input is Address {
  if (typeof input !== "string") {
    return false;
  }

  if (input.startsWith("http://") || input.startsWith("https://")) {
    return true;
  }

  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Pattern.test(input)) {
    const octets = input.split(".").map(Number);
    return octets.every((octet) => octet >= 0 && octet <= 255);
  }
  return false;
}

// Type guard for DraftVersions
function isDraftVersions(obj: unknown): obj is DraftVersions {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const objRecord = obj as Record<string, unknown>;
  return Object.values(CurrentDrafts).every(
    (draft) => typeof objRecord[draft] === "string",
  );
}

// Type guard for an array of DraftVersions
function isPrivacyDraftVersionsArray(
  input: unknown,
): input is Array<DraftVersions> {
  return Array.isArray(input) && input.every(isDraftVersions);
}

// Type guard for NetworkId
export function isNetworkId(obj: unknown): obj is NetworkId {
  try {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "ledgerType" in obj &&
      "id" in obj &&
      typeof obj.id === "string" &&
      Object.values(LedgerType).includes(obj.ledgerType as LedgerType)
    );
  } catch (error) {
    return false;
  }
}

export function isSupportedDLT(obj: unknown): obj is LedgerType {
  try {
    return Object.values(LedgerType).includes(obj as LedgerType);
  } catch (error) {
    return false;
  }
}

// Type guard for an array of NetworkId
function isNetworkIdArray(input: unknown): input is Array<NetworkId> {
  return Array.isArray(input) && input.every(isNetworkId);
}
function isSupportedDLTsArray(input: unknown): input is Array<NetworkId> {
  return Array.isArray(input) && input.every(isSupportedDLT);
}

// Type guard for GatewayIdentity
export function isGatewayIdentity(obj: unknown): obj is GatewayIdentity {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "id" in obj &&
    typeof (obj as Record<string, unknown>).id === "string" &&
    "version" in obj &&
    isPrivacyDraftVersionsArray((obj as Record<string, unknown>).version) &&
    "connectedDLTs" in obj &&
    isNetworkIdArray((obj as Record<string, unknown>).connectedDLTs) &&
    (!("supportedDLTs" in obj) ||
      isSupportedDLTsArray((obj as Record<string, unknown>).supportedDLTs)) &&
    (!("pubKey" in obj) ||
      typeof (obj as Record<string, unknown>).pubKey === "string") &&
    (!("name" in obj) ||
      typeof (obj as Record<string, unknown>).name === "string") &&
    (!("proofID" in obj) ||
      typeof (obj as Record<string, unknown>).proofID === "string") &&
    (!("gatewayServerPort" in obj) ||
      typeof (obj as Record<string, unknown>).gatewayServerPort === "number") &&
    (!("gatewayClientPort" in obj) ||
      typeof (obj as Record<string, unknown>).gatewayClientPort === "number") &&
    (!("gatewayOpenAPIPort" in obj) ||
      typeof (obj as Record<string, unknown>).gatewayOpenAPIPort ===
        "number") &&
    (!("gatewayUIPort" in obj) ||
      typeof (obj as Record<string, unknown>).gatewayUIPort === "number") &&
    (!("address" in obj) || isAddress((obj as Record<string, unknown>).address))
  );
}

export function validateSatpGatewayIdentity(opts: {
  readonly configValue: unknown;
}): GatewayIdentity {
  if (
    !opts ||
    !opts.configValue ||
    typeof opts.configValue !== "object" ||
    !isGatewayIdentity(opts.configValue)
  ) {
    throw new TypeError(
      `Invalid config.gid: ${JSON.stringify(opts.configValue)}`,
    );
  }
  return opts.configValue;
}
