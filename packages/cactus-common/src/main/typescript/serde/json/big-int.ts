/**
 * A JSON replacer that converts BigInt values to strings
 *
 * @returns `"999999999999999999"` for an  input of `BigInt(999999999999999999n)`
 */
export function bigIntToDecimalStringReplacer(_key: string, value: unknown) {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}
