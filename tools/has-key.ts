export function hasKey<T extends string>(
  obj: unknown,
  key: T,
): obj is { [key in T]: unknown } {
  return Boolean(typeof obj === "object" && obj && key in obj);
}
