export function isInstanceId(obj: unknown): obj is string | undefined {
  return typeof obj === "string" || typeof obj === "undefined";
}

export function validateInstanceId(opts: {
  readonly configValue: unknown;
}): string | undefined {
  if (!opts || !opts.configValue) {
    return;
  }

  if (!isInstanceId(opts.configValue)) {
    throw new TypeError(
      `Invalid config.instanceId: ${JSON.stringify(
        opts.configValue,
      )}. Expected a string.`,
    );
  }
  return opts.configValue;
}
