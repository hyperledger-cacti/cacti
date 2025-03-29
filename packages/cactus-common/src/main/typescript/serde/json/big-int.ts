/**
 * A JSON replacer that converts BigInt values to strings
 *
 * @returns `"999999999999999999"` for an  input of `BigInt(999999999999999999n)`
 */
export function bigIntToHexReplacer(_key: string, value: any) {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}
