/**
 *
 * @param maybePrefixed
 * @returns The string itself if it was 0x prefixed or a new 0x prefixed version of if it wasn't.
 */
export function ensure0xPrefix(maybePrefixed: string): string & `0x${string}` {
  const fn = "ensure-0x-prefix.ts";
  if (!maybePrefixed) throw new Error(`${fn} Input cannot be empty`);
  if (typeof maybePrefixed !== "string")
    throw new Error(`${fn} Input must be a string`);

  if (!maybePrefixed.startsWith("0x")) {
    return `0x${maybePrefixed}`;
  }
  return maybePrefixed as `0x${string}`;
}
