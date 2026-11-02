import Long from "long";
import {
  FabricSigningCredential,
  GatewayOptions,
} from "../generated/openapi/typescript-axios/api";

/**
 * Check if provided variable is a function. Throws otherwise.
 * To be used with unsafe `require()` imports from fabric SDK packages.
 *
 * @param functionVariable function imported from fabric SDK
 * @param functionName name of the imported function (for logging purposes)
 */
export function assertFabricFunctionIsAvailable(
  functionVariable: unknown,
  functionName: string,
) {
  if (typeof functionVariable !== "function") {
    throw new Error(`${functionName} could not be imported from fabric SDK`);
  }
}

/**
 * Matches any character that must not appear in a single file system path
 * segment derived from a request: path separators (which would escape into
 * other directories) plus null bytes and control characters.
 */
// eslint-disable-next-line no-control-regex
export const UNSAFE_PATH_SEGMENT_CHARS = /[/\\\u0000-\u001f\u007f]/;

/**
 * Validates a single file or directory name that arrived as part of a
 * DeployContractV1 request before it gets joined onto one of the temporary
 * directories created by this plugin. A value such as "." or "..", or one
 * containing a path separator, would otherwise let the caller place files
 * outside of the temporary directory that the connector owns (path traversal
 * on the certificate / chaincode file writes in deployContract()).
 *
 * @param segment The untrusted path segment to validate.
 * @param fnTag Used to prefix the error message.
 * @returns The very same segment, when it is safe to join.
 */
export function assertSafePathSegment(segment: string, fnTag: string): string {
  if (
    !segment ||
    segment === "." ||
    segment === ".." ||
    UNSAFE_PATH_SEGMENT_CHARS.test(segment)
  ) {
    throw new Error(
      `${fnTag} refusing unsafe path segment: ${JSON.stringify(segment)}`,
    );
  }
  return segment;
}

/**
 * Splits a caller-supplied relative directory path (the `filepath` field of
 * the files in a DeployContractV1 request) into segments that are each
 * validated by {@link assertSafePathSegment}. Blank and "." components (as
 * produced by leading "./" or repeated slashes) are dropped so that the
 * result can only ever describe directories inside the temporary directory
 * it is joined onto.
 */
export function splitSafeRelativePath(
  relativePath: string,
  fnTag: string,
): string[] {
  return relativePath
    .split("/")
    .filter((segment) => segment.length > 0 && segment !== ".")
    .map((segment) => assertSafePathSegment(segment, fnTag));
}

/**
 * Convert input bytes into Buffer. Handle cases where input is undefined or null.
 *
 * @note method comes from Fabric Node SDK.
 *
 * @param bytes input byte array
 * @returns `Buffer` object
 */
export function asBuffer(bytes: Uint8Array | null | undefined): Buffer {
  if (!bytes) {
    return Buffer.alloc(0);
  }

  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength); // Create a Buffer view to avoid copying
}

export type FabricLong = {
  low: number;
  hight: number | undefined;
  unsigned: boolean | undefined;
};

/**
 * Convert Long value returned by some low-level fabric API to regular number.
 *
 * @param longNumberObject Long object (with low and hight fields)
 *
 * @returns number
 */
export function fabricLongToNumber(longNumberObject: FabricLong) {
  const longValue = new Long(
    longNumberObject.low,
    longNumberObject.hight,
    longNumberObject.unsigned,
  );
  return longValue.toNumber();
}

export interface CreateListenerRequest {
  /**
   * Fabric channel we want to connect to. If not provided, then one from channelName parameter will be used
   * @type {string}
   * @memberof CreateListenerRequest
   */
  channelName: string;
  /**
   *
   * @type {string}
   * @memberof CreateListenerRequest
   */
  contractName: string;
  /**
   *
   * @type {GatewayOptions}
   * @memberof CreateListenerRequest
   */
  gatewayOptions?: GatewayOptions;
  /**
   *
   * @type {FabricSigningCredential}
   * @memberof CreateListenerRequest
   */
  signingCredential?: FabricSigningCredential;
}
