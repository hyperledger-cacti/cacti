/**
 * Helper methods
 */

import web3Utils from "web3-utils";
import { RuntimeError } from "run-time-error";

/**
 * Get error cause for RuntimeError (instance of `Error`, string or undefined)
 * @param err unknown error type.
 * @returns valid `RuntimeError` cause
 */
export function getRuntimeErrorCause(err: unknown): Error | string | undefined {
  if (err instanceof Error || typeof err === "string") {
    return err;
  }

  return undefined;
}

/**
 * Convert supplied address to checksum form, ensure it's a valid ethereum address afterwards.
 * In case of error an exception is thrown.
 *
 * @param address ethereum hex address to normalize
 * @returns valid checksum address
 */
export function normalizeAddress(address?: string): string {
  if (!address) {
    return "";
  }

  const checksumAddress = web3Utils.toChecksumAddress(address);

  if (!web3Utils.isAddress(checksumAddress)) {
    throw new RuntimeError(
      `Provided address ${address} is not a valid ethereum address!`,
    );
  }

  return checksumAddress;
}
