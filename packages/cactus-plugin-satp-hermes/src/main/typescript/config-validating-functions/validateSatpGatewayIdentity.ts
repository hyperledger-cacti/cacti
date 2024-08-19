import {
  Address,
  CurrentDrafts,
  DraftVersions,
  GatewayIdentity,
  SupportedChain,
} from "../core/types";

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

// Type guard for SupportedChain
export function isSupportedChain(obj: unknown): obj is SupportedChain {
  return (
    typeof obj === "string" &&
    obj !== null &&
    Object.values(SupportedChain).includes(obj as SupportedChain)
  );
}

// Type guard for an array of SupportedChain
function isSupportedChainArray(input: unknown): input is Array<SupportedChain> {
  return Array.isArray(input) && input.every(isSupportedChain);
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
    "supportedDLTs" in obj &&
    isSupportedChainArray((obj as Record<string, unknown>).supportedDLTs) &&
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
      "Invalid config.gid: " + JSON.stringify(opts.configValue),
    );
  }
  return opts.configValue;
}
