/**
 * Unit tests for the SATP presentation formatters (relative ages, absolute
 * timestamps, durations). All functions are pure over (value, reference
 * time), so every case pins a fixed `nowMs`.
 */
import { describe, expect, it } from "vitest";

import {
  formatAbsoluteTime,
  formatDuration,
  formatRelativeTime,
} from "../../../main/typescript/apps/satp/format";

const NOW = Date.UTC(2026, 8, 20, 12, 0, 0); // 2026-09-20T12:00:00Z
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("formatRelativeTime", () => {
  it("returns an em dash for missing timestamps", () => {
    expect(formatRelativeTime(undefined, NOW)).toBe("—");
  });

  it("collapses very recent and future timestamps to just now", () => {
    expect(formatRelativeTime(NOW - 4_000, NOW)).toBe("just now");
    expect(formatRelativeTime(NOW + MINUTE, NOW)).toBe("just now");
  });

  it("renders seconds, minutes, hours and days buckets", () => {
    expect(formatRelativeTime(NOW - 42_000, NOW)).toBe("42s ago");
    expect(formatRelativeTime(NOW - 3 * MINUTE, NOW)).toBe("3m ago");
    expect(formatRelativeTime(NOW - 5 * HOUR, NOW)).toBe("5h ago");
    expect(formatRelativeTime(NOW - 2 * DAY, NOW)).toBe("2d ago");
  });

  it("floors instead of rounding at bucket boundaries", () => {
    expect(formatRelativeTime(NOW - 59_999, NOW)).toBe("59s ago");
    expect(formatRelativeTime(NOW - 60_000, NOW)).toBe("1m ago");
  });
});

describe("formatDuration", () => {
  it("returns an em dash for missing and negative (clock skew) spans", () => {
    expect(formatDuration(undefined)).toBe("—");
    expect(formatDuration(-5)).toBe("—");
  });

  it("renders sub-second, sub-minute and longer spans", () => {
    expect(formatDuration(650)).toBe("650ms");
    expect(formatDuration(8_234)).toBe("8.2s");
    expect(formatDuration(3 * 60_000 + 12_000)).toBe("3m 12s");
    expect(formatDuration(2 * HOUR + 5 * MINUTE)).toBe("2h 5m");
  });

  it("omits zero remainder components", () => {
    expect(formatDuration(4 * 60_000)).toBe("4m");
    expect(formatDuration(3 * HOUR)).toBe("3h");
  });
});

describe("formatAbsoluteTime", () => {
  it("returns an em dash for missing timestamps", () => {
    expect(formatAbsoluteTime(undefined)).toBe("—");
  });

  it("formats an epoch value as a locale string", () => {
    // Locale output varies by environment - assert it round-trips through
    // the same Date the component would render.
    const ms = Date.UTC(2026, 8, 20, 12, 0, 0);
    expect(formatAbsoluteTime(ms)).toBe(new Date(ms).toLocaleString());
  });
});
