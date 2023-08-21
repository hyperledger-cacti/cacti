export function isRecord(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object" && x !== null;
}
