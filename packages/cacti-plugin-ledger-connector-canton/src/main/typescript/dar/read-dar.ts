import { getDamlLfPackageId } from "./daml-lf-archive";
import { DAR_MANIFEST_PATH, parseDarManifest } from "./dar-manifest";
import { InvalidDarError } from "./invalid-dar-error";
import { readZipEntries, readZipEntry } from "./zip-archive";

const MAX_MANIFEST_BYTES = 64 * 1024;
const MAX_DAR_NAME_LENGTH = 256;

export interface ICantonDarInfo {
  /** Package ID of the DAR's main package, verified against its payload. */
  readonly packageId: string;
  /** The manifest `Name`, for example `my-model-1.0.0`, when present. */
  readonly name?: string;
}

/**
 * Reads the main package ID out of a DAR. The Ledger API upload response does
 * not include it, so the connector derives it from the archive itself rather
 * than trusting a caller-supplied value.
 *
 * @param maxEntryBytes Upper bound on any single inflated entry.
 */
export function readCantonDar(
  dar: Buffer,
  maxEntryBytes: number,
): ICantonDarInfo {
  const entries = readZipEntries(dar);
  const manifestEntry = entries.get(DAR_MANIFEST_PATH);
  if (!manifestEntry) {
    throw new InvalidDarError("The DAR has no META-INF/MANIFEST.MF.");
  }
  const manifest = parseDarManifest(
    readZipEntry(
      dar,
      manifestEntry,
      Math.min(MAX_MANIFEST_BYTES, maxEntryBytes),
    ).toString("utf8"),
  );
  const mainDalfPath = manifest.get("Main-Dalf");
  const mainDalfEntry = mainDalfPath ? entries.get(mainDalfPath) : undefined;
  if (!mainDalfEntry) {
    throw new InvalidDarError("The DAR manifest has no valid Main-Dalf.");
  }
  const packageId = getDamlLfPackageId(
    readZipEntry(dar, mainDalfEntry, maxEntryBytes),
  );
  const name = manifest.get("Name");
  return {
    packageId,
    ...(name && name.length <= MAX_DAR_NAME_LENGTH ? { name } : {}),
  };
}
