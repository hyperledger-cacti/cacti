export function validateSatpEnableMonitorService(opts: {
  readonly configValue: unknown;
}): boolean {
  if (!opts || opts.configValue === undefined) {
    return false;
  }

  if (typeof opts.configValue !== "boolean") {
    throw new TypeError(
      `Invalid config.enableMonitorService: ${opts.configValue}. Expected a boolean`,
    );
  }
  return opts.configValue;
}
