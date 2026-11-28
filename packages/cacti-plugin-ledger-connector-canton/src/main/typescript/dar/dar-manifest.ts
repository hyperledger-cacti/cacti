import { InvalidDarError } from "./invalid-dar-error";

export const DAR_MANIFEST_PATH = "META-INF/MANIFEST.MF";

/**
 * Parses a JAR-style manifest. Long values are wrapped onto continuation
 * lines that start with a single space, which damlc emits for `Dalfs`.
 */
export function parseDarManifest(text: string): Map<string, string> {
  const attributes = new Map<string, string>();
  let lastName: string | undefined;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith(" ")) {
      if (!lastName) {
        throw new InvalidDarError("The DAR manifest is malformed.");
      }
      attributes.set(lastName, attributes.get(lastName) + line.slice(1));
      continue;
    }
    if (line.length === 0) {
      lastName = undefined;
      continue;
    }
    const separator = line.indexOf(": ");
    if (separator <= 0) {
      throw new InvalidDarError("The DAR manifest is malformed.");
    }
    lastName = line.slice(0, separator);
    attributes.set(lastName, line.slice(separator + 2));
  }
  return attributes;
}
