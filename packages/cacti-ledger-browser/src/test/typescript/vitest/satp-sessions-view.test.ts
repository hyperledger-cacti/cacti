/**
 * Unit tests for the sessions dashboard view logic: outcome buckets,
 * free-text filtering, column sorting and KPI counting. These rules back
 * the KPI cards, search box and sortable headers of the sessions table.
 */
import { describe, expect, it } from "vitest";

import type { SatpSessionRow } from "../../../main/typescript/apps/satp/transform";
import {
  filterSessions,
  matchesBucket,
  sessionKpis,
  sortSessions,
} from "../../../main/typescript/apps/satp/sessions-view";

function row(overrides: Partial<SatpSessionRow>): SatpSessionRow {
  return {
    sessionId: "s1",
    eventCount: 1,
    hasRollback: false,
    ...overrides,
  };
}

const COMPLETED = row({ sessionId: "done", stateLabel: "COMPLETED" });
const ONGOING = row({ sessionId: "live", stateLabel: "ONGOING" });
const RECOVERING = row({ sessionId: "rec", stateLabel: "RECOVERING" });
const RECOVERED = row({ sessionId: "recovered", stateLabel: "RECOVERED" });
const REJECTED = row({ sessionId: "rej", stateLabel: "REJECTED" });
const ERRORED = row({
  sessionId: "err",
  stateLabel: "ERROR",
  hasRollback: true,
});
const UNKNOWN = row({ sessionId: "mystery" });

describe("matchesBucket", () => {
  it("assigns every row to the all bucket", () => {
    for (const r of [COMPLETED, ERRORED, UNKNOWN]) {
      expect(matchesBucket(r, "all")).toBe(true);
    }
  });

  it("maps ongoing and recovering to in-progress", () => {
    expect(matchesBucket(ONGOING, "in-progress")).toBe(true);
    expect(matchesBucket(RECOVERING, "in-progress")).toBe(true);
    expect(matchesBucket(COMPLETED, "in-progress")).toBe(false);
  });

  it("maps completed and recovered to completed", () => {
    expect(matchesBucket(COMPLETED, "completed")).toBe(true);
    expect(matchesBucket(RECOVERED, "completed")).toBe(true);
    expect(matchesBucket(REJECTED, "completed")).toBe(false);
  });

  it("maps rejected, conditional-rejected and error to failed", () => {
    expect(matchesBucket(REJECTED, "failed")).toBe(true);
    expect(
      matchesBucket(row({ stateLabel: "CONDITIONAL_REJECTED" }), "failed"),
    ).toBe(true);
    expect(matchesBucket(ERRORED, "failed")).toBe(true);
    expect(matchesBucket(ONGOING, "failed")).toBe(false);
  });

  it("matches rollback rows regardless of the final outcome", () => {
    expect(matchesBucket(ERRORED, "rollback")).toBe(true);
    expect(
      matchesBucket(
        row({ stateLabel: "COMPLETED", hasRollback: true }),
        "rollback",
      ),
    ).toBe(true);
    expect(matchesBucket(COMPLETED, "rollback")).toBe(false);
  });

  it("rows without a known state only match all", () => {
    expect(matchesBucket(UNKNOWN, "in-progress")).toBe(false);
    expect(matchesBucket(UNKNOWN, "completed")).toBe(false);
    expect(matchesBucket(UNKNOWN, "failed")).toBe(false);
  });
});

describe("filterSessions", () => {
  const rows = [
    row({
      sessionId: "alpha",
      stateLabel: "COMPLETED",
      sourceLedger: "Besu",
      destinationLedger: "Fabric",
      assetId: "0xabc",
    }),
    row({ sessionId: "beta", stateLabel: "ONGOING", status: "PENDING" }),
    ERRORED,
  ];

  it("returns everything for the empty query and the all bucket", () => {
    expect(filterSessions(rows, { query: "", bucket: "all" })).toHaveLength(3);
  });

  it("matches free text case-insensitively across row fields", () => {
    expect(
      filterSessions(rows, { query: "ALPHA", bucket: "all" }),
    ).toHaveLength(1);
    expect(
      filterSessions(rows, { query: "fabric", bucket: "all" }),
    ).toHaveLength(1);
    expect(filterSessions(rows, { query: "0xab", bucket: "all" })).toHaveLength(
      1,
    );
    expect(
      filterSessions(rows, { query: "pending", bucket: "all" }),
    ).toHaveLength(1);
  });

  it("combines bucket and query", () => {
    expect(
      filterSessions(rows, { query: "err", bucket: "failed" }),
    ).toHaveLength(1);
    expect(
      filterSessions(rows, { query: "alpha", bucket: "failed" }),
    ).toHaveLength(0);
  });

  it("treats a whitespace-only query as empty", () => {
    expect(filterSessions(rows, { query: "   ", bucket: "all" })).toHaveLength(
      3,
    );
  });
});

describe("sortSessions", () => {
  const rows = [
    row({
      sessionId: "b",
      lastActivityMs: 200,
      eventCount: 5,
      stateLabel: "ONGOING",
    }),
    row({
      sessionId: "a",
      lastActivityMs: 300,
      eventCount: 2,
      stateLabel: "COMPLETED",
    }),
    row({ sessionId: "c", eventCount: 9, stateLabel: undefined }),
  ];

  it("sorts numerically by last activity in both directions", () => {
    const ascending = sortSessions(rows, {
      field: "lastActivity",
      direction: "asc",
    });
    expect(ascending.map((r) => r.sessionId)).toEqual(["b", "a", "c"]);

    const descending = sortSessions(rows, {
      field: "lastActivity",
      direction: "desc",
    });
    expect(descending.map((r) => r.sessionId)).toEqual(["a", "b", "c"]);
  });

  it("sorts lexicographically by session id", () => {
    const sorted = sortSessions(rows, {
      field: "sessionId",
      direction: "asc",
    });
    expect(sorted.map((r) => r.sessionId)).toEqual(["a", "b", "c"]);
  });

  it("sorts by state label with unknown states last", () => {
    const sorted = sortSessions(rows, { field: "state", direction: "asc" });
    expect(sorted.map((r) => r.sessionId)).toEqual(["a", "b", "c"]);
  });

  it("sorts numerically by event count", () => {
    const sorted = sortSessions(rows, {
      field: "eventCount",
      direction: "desc",
    });
    expect(sorted.map((r) => r.sessionId)).toEqual(["c", "b", "a"]);
  });

  it("does not mutate the input array", () => {
    const copy = [...rows];
    sortSessions(rows, { field: "sessionId", direction: "asc" });
    expect(rows).toEqual(copy);
  });
});

describe("sessionKpis", () => {
  it("counts buckets independently (a failed rollback counts twice)", () => {
    const kpis = sessionKpis([
      COMPLETED,
      ONGOING,
      ERRORED, // failed AND rolled back
      UNKNOWN,
    ]);
    expect(kpis).toEqual({
      total: 4,
      inProgress: 1,
      completed: 1,
      failed: 1,
      rollbacks: 1,
    });
  });
});
