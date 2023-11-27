export function hasKey<T extends string>(
  x: unknown,
  key: T,
): x is { [key in T]: unknown } {
  return Boolean(typeof x === "object" && x && key in x);
}
