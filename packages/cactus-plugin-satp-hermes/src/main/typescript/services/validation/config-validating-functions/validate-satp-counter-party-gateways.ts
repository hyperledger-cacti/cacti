import { Logger } from "@hyperledger/cactus-common";
import type { GatewayIdentity } from "../../../core/types";
import { isGatewayIdentity } from "./validate-satp-gateway-identity";

// Type guard for an array of GatewayIdentity
function isGatewayIdentityArray(
  input: unknown,
  log: Logger,
): input is Array<GatewayIdentity> {
  return (
    Array.isArray(input) && input.every((item) => isGatewayIdentity(item, log))
  );
}

export function validateSatpCounterPartyGateways(
  opts: {
    readonly configValue: unknown;
  },
  log: Logger,
): GatewayIdentity[] {
  if (
    !opts ||
    !opts.configValue ||
    typeof opts.configValue !== "object" ||
    !isGatewayIdentityArray(opts.configValue, log)
  ) {
    throw new TypeError(
      `Invalid config.counterPartyGateways: ${JSON.stringify(opts.configValue)}`,
    );
  }
  return opts.configValue;
}
