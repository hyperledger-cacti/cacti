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
