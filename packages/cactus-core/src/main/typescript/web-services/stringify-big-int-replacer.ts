/**
 * `JSON.stringify` replacer function to handle BigInt.
 * See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt#use_within_json
 */
export function stringifyBigIntReplacer(
  _key: string,
  value: bigint | unknown,
): string | unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}
