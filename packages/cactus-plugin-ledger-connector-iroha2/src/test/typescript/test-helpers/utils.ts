/**
 * Utility functions used throughout the tests.
 */

import crypto from "crypto";

/**
 * Adds random suffix to given string.
 * Can be used to generate unique names for testing.
 *
 * @param name
 * @returns unique string
 */
export function addRandomSuffix(name: string): string {
  const buf = Buffer.alloc(4);
  crypto.randomFillSync(buf, 0, 4);
  return name + buf.toString("hex");
}
