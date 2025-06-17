export function isOntologyPath(obj: unknown): obj is string | undefined {
  return typeof obj === "string" || typeof obj === "undefined";
}

export function validateOntologyPath(opts: {
  readonly configValue: unknown;
}): string | undefined {
  if (!opts || !opts.configValue) {
    return;
  }

  if (!isOntologyPath(opts.configValue)) {
    throw new TypeError(
      `Invalid config.ontologyPath: ${JSON.stringify(
        opts.configValue,
      )}. Expected a string.`,
    );
  }
  return opts.configValue;
}
