/**
 * Parses optional audit GET query timestamp parameters (`startTimestamp`, `endTimestamp`)
 * without Express response side effects — callers map failures to HTTP 400.
 */
import type { Request } from "express";

export type NormalizedAuditTimestampQueryValue =
  | "absent"
  | "invalid"
  | string;

export type ParsedAuditTimestampRange =
  | { ok: true; startTimestamp: number; endTimestamp: number }
  | { ok: false; message: string };

export function normalizeAuditTimestampQueryValue(
  raw: Request["query"][string],
): NormalizedAuditTimestampQueryValue {
  if (raw === undefined) {
    return "absent";
  }
  if (typeof raw === "string") {
    return raw;
  }
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (typeof first === "string") {
      return first;
    }
    return "invalid";
  }
  return "invalid";
}

function parseOptionalFiniteAuditMs(
  raw: Request["query"][string],
  name: string,
  defaultMs: number,
): { ok: true; value: number } | { ok: false; message: string } {
  const asString = normalizeAuditTimestampQueryValue(raw);
  if (asString === "invalid") {
    return {
      ok: false,
      message: `${name} query parameter must be a single numeric string.`,
    };
  }
  if (asString === "absent") {
    return { ok: true, value: defaultMs };
  }

  const trimmed = asString.trim();
  if (!trimmed.length) {
    return {
      ok: false,
      message: `${name} query parameter cannot be empty.`,
    };
  }

  const num = Number(trimmed);
  if (!Number.isFinite(num)) {
    return {
      ok: false,
      message: `${name} query parameter must be a finite number.`,
    };
  }

  return { ok: true, value: num };
}

/**
 * @param query - Express `req.query`
 * @param options.nowMs - Override wall clock for default `endTimestamp` (omit param); tests use this to avoid flakiness.
 */
export function parseAuditTimestampRange(
  query: Request["query"],
  options?: { nowMs?: number },
): ParsedAuditTimestampRange {
  const endDefaultMs = options?.nowMs ?? Date.now();

  const startResult = parseOptionalFiniteAuditMs(
    query["startTimestamp"],
    "startTimestamp",
    0,
  );
  if (!startResult.ok) {
    return startResult;
  }

  const endResult = parseOptionalFiniteAuditMs(
    query["endTimestamp"],
    "endTimestamp",
    endDefaultMs,
  );
  if (!endResult.ok) {
    return endResult;
  }

  if (startResult.value > endResult.value) {
    return {
      ok: false,
      message: "startTimestamp must be less than or equal to endTimestamp.",
    };
  }

  return {
    ok: true,
    startTimestamp: startResult.value,
    endTimestamp: endResult.value,
  };
}
