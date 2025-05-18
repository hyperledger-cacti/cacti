/**
 * Small utility functions reused throughout the connector.
 */

import sanitizeHtml from "sanitize-html";
import safeStringify from "fast-safe-stringify";

/**
 * Abstract type that corresponds to length of supplied iterable ('1', '2', etc...)
 */
export type LengthOf<T extends ArrayLike<unknown>> = T["length"];

/**
 * Return secure string representation of error from the input.
 * Handles circular structures and removes HTML.`
 *
 * @param error Any object to return as an error, preferable `Error`
 * @returns Safe string representation of an error.
 *
 * @todo use one from cactus-common after #2089 is merged.
 */
export function safeStringifyException(error: unknown): string {
  if (error instanceof Error) {
    return sanitizeHtml(error.stack || error.message);
  }

  return sanitizeHtml(safeStringify(error));
}

/**
 * `JSON.stringify` replacer function to handle BigInt.
 * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt#use_within_json
 */
export function stringifyBigIntReplacer(key: string, value: bigint): string {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}
