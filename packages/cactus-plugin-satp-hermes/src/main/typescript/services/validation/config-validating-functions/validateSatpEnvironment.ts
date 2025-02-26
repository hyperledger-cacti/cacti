export function validateSatpEnvironment(opts: {
  readonly configValue: unknown;
}): "development" | "production" {
  if (!opts || !opts.configValue) {
    return "development";
  }

  if (
    typeof opts.configValue !== "string" ||
    (opts.configValue !== "development" && opts.configValue !== "production")
  ) {
    throw new TypeError(
      `Invalid config.environment: ${opts.configValue}. Expected "development" or "production"`,
    );
  }
  return opts.configValue;
}
