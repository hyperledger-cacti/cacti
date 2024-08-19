import { GatewayIdentity } from "../core/types";
import { isGatewayIdentity } from "./validateSatpGatewayIdentity";

// Type guard for an array of GatewayIdentity
function isGatewayIdentityArray(
  input: unknown,
): input is Array<GatewayIdentity> {
  return Array.isArray(input) && input.every(isGatewayIdentity);
}

export function validateSatpCounterPartyGateways(opts: {
  readonly configValue: unknown;
}): GatewayIdentity[] {
  if (
    !opts ||
    !opts.configValue ||
    typeof opts.configValue !== "object" ||
    !isGatewayIdentityArray(opts.configValue)
  ) {
    throw new TypeError(
      "Invalid config.counterPartyGateways: " +
        JSON.stringify(opts.configValue),
    );
  }
  return opts.configValue;
}
