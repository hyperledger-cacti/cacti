export function validateSatpEnableOpenAPI(opts: {
  readonly configValue: unknown;
}): boolean {
  if (!opts || !opts.configValue) {
    return true;
  }

  if (typeof opts.configValue !== "boolean") {
    throw new TypeError(
      `Invalid config.enableOpenAPI: ${opts.configValue}. Expected a boolean`,
    );
  }
  return opts.configValue;
}
