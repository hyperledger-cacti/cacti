import fs from "fs";

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

  // Validate that the path exists and is a directory
  const path = opts.configValue;
  if (
    typeof path === "string" &&
    (!fs.existsSync(path) || !fs.statSync(path).isDirectory())
  ) {
    throw new TypeError(
      `Invalid config.ontologyPath: ${path}. Directory does not exist or is not a folder.`,
    );
  }
  return opts.configValue;
}
