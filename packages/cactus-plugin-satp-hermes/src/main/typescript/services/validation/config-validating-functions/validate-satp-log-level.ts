import { LogLevelDesc } from "@hyperledger-cacti/cactus-common";

// Type guard for LogLevelDesc
export function isLogLevelDesc(input: unknown): input is LogLevelDesc {
  if (typeof input === "number") {
    return Number.isInteger(input) && input >= 0 && input <= 5;
  }
  if (typeof input === "string") {
    const normalizedInput = input.toUpperCase();
    return ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "SILENT"].includes(
      normalizedInput,
    );
  }
  return false;
}

export function validateSatpLogLevel(opts: {
  readonly configValue: unknown;
}): LogLevelDesc {
  if (!opts || !opts.configValue) {
    return "INFO";
  }

  if (!isLogLevelDesc(opts.configValue)) {
    throw new TypeError(
      `Invalid config.logLevel: ${JSON.stringify(opts.configValue)}. Valid levels are: TRACE, DEBUG, INFO, WARN, ERROR, SILENT`,
    );
  }
  return opts.configValue;
}
