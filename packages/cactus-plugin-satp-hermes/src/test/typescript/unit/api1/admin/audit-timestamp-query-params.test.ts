import type { Request } from "express";
import {
  normalizeAuditTimestampQueryValue,
  parseAuditTimestampRange,
} from "../../../../../main/typescript/api1/admin/audit-timestamp-query-params";

describe("parseAuditTimestampRange()", () => {
  const fixedNowMs = 1_704_000_000_000;

  function q(
    query: Record<string, string | string[] | undefined>,
  ): Request["query"] {
    return query as unknown as Request["query"];
  }

  it("uses defaults when timestamp params are omitted", () => {
    const result = parseAuditTimestampRange(q({}), { nowMs: fixedNowMs });
    expect(result).toEqual({
      ok: true,
      startTimestamp: 0,
      endTimestamp: fixedNowMs,
    });
  });

  it("accepts valid explicit startTimestamp and endTimestamp", () => {
    const result = parseAuditTimestampRange(
      q({ startTimestamp: "100", endTimestamp: "200" }),
      { nowMs: fixedNowMs },
    );
    expect(result).toEqual({
      ok: true,
      startTimestamp: 100,
      endTimestamp: 200,
    });
  });

  it("fails when startTimestamp is present but not numeric", () => {
    const result = parseAuditTimestampRange(
      q({ startTimestamp: "not-a-number" }),
      { nowMs: fixedNowMs },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("startTimestamp");
    }
  });

  it("fails when startTimestamp is empty after trim", () => {
    const result = parseAuditTimestampRange(
      q({ startTimestamp: "" }),
      { nowMs: fixedNowMs },
    );
    expect(result.ok).toBe(false);
  });

  it("fails when startTimestamp is greater than endTimestamp", () => {
    const result = parseAuditTimestampRange(
      q({ startTimestamp: "300", endTimestamp: "100" }),
      { nowMs: fixedNowMs },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("startTimestamp");
    }
  });

  it("fails when startTimestamp array head is not a string", () => {
    const result = parseAuditTimestampRange(
      {
        startTimestamp: [42] as unknown as Request["query"][string],
      } as Request["query"],
      { nowMs: fixedNowMs },
    );
    expect(result.ok).toBe(false);
  });

  it("uses first element when duplicate startTimestamp keys collapse to array", () => {
    const result = parseAuditTimestampRange(
      q({
        startTimestamp: ["400", "999"],
        endTimestamp: "500",
      }),
      { nowMs: fixedNowMs },
    );
    expect(result).toEqual({
      ok: true,
      startTimestamp: 400,
      endTimestamp: 500,
    });
  });
});

describe("normalizeAuditTimestampQueryValue()", () => {
  it("returns absent for undefined", () => {
    expect(normalizeAuditTimestampQueryValue(undefined)).toBe("absent");
  });

  it("returns string for string input", () => {
    expect(normalizeAuditTimestampQueryValue("42")).toBe("42");
  });
});
