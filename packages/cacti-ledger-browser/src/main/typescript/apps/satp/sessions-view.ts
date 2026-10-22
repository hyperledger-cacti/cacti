/**
 * Pure view logic for the SATP sessions dashboard: bucketing rows into
 * outcome categories, free-text filtering, column sorting and KPI counts.
 * Kept free of React so every rule is unit-testable in isolation; the page
 * component only holds the UI state and renders.
 */
import { isFailedStateLabel, type SatpSessionRow } from "./transform";

/** Outcome buckets shown as filter cards above the sessions table. */
export type SessionBucket =
  | "all"
  | "in-progress"
  | "completed"
  | "failed"
  | "rollback";

export const SESSION_BUCKETS: readonly SessionBucket[] = [
  "all",
  "in-progress",
  "completed",
  "failed",
  "rollback",
];

export const BUCKET_LABELS: Record<SessionBucket, string> = {
  all: "Total",
  "in-progress": "In progress",
  completed: "Completed",
  failed: "Failed",
  rollback: "Rollbacks",
};

/** KPI counter that backs each bucket card. */
export const BUCKET_KPI_KEY: Record<SessionBucket, keyof SessionKpis> = {
  all: "total",
  "in-progress": "inProgress",
  completed: "completed",
  failed: "failed",
  rollback: "rollbacks",
};

/**
 * A row matches a bucket when:
 * - `all`: always;
 * - `in-progress`: the session state is ONGOING or RECOVERING;
 * - `completed`: COMPLETED or RECOVERED;
 * - `failed`: a failed state (REJECTED / CONDITIONAL_REJECTED / ERROR);
 * - `rollback`: any audit event of the session was a rollback step -
 *   orthogonal to the outcome (a rolled-back session may still recover).
 * Sessions without a known state (no audit snapshot) only match `all`.
 */
export function matchesBucket(
  row: SatpSessionRow,
  bucket: SessionBucket,
): boolean {
  switch (bucket) {
    case "all":
      return true;
    case "in-progress":
      return row.stateLabel === "ONGOING" || row.stateLabel === "RECOVERING";
    case "completed":
      return row.stateLabel === "COMPLETED" || row.stateLabel === "RECOVERED";
    case "failed":
      return isFailedStateLabel(row.stateLabel);
    case "rollback":
      return row.hasRollback;
  }
}

/** Text fields the free-text search matches against (case-insensitive). */
function searchableText(row: SatpSessionRow): string {
  return [
    row.sessionId,
    row.status,
    row.substatus,
    row.stage,
    row.stateLabel,
    row.sourceLedger,
    row.destinationLedger,
    row.senderGateway,
    row.recipientGateway,
    row.assetId,
  ]
    .filter((value) => value !== undefined && value !== "")
    .join(" \n")
    .toLowerCase();
}

export interface SessionFilter {
  /** Free-text query; empty string matches everything. */
  query: string;
  bucket: SessionBucket;
}

/** Bucket first, then the free-text query across all row text fields. */
export function filterSessions(
  rows: SatpSessionRow[],
  { query, bucket }: SessionFilter,
): SatpSessionRow[] {
  const needle = query.trim().toLowerCase();
  return rows.filter(
    (row) =>
      matchesBucket(row, bucket) &&
      (needle === "" || searchableText(row).includes(needle)),
  );
}

/** Sortable columns of the sessions table. */
export type SessionSortField =
  | "sessionId"
  | "state"
  | "lastActivity"
  | "eventCount";

export interface SessionSort {
  field: SessionSortField;
  direction: "asc" | "desc";
}

/** Sort key per column; undefined values sort last regardless of direction. */
function sortValue(
  row: SatpSessionRow,
  field: SessionSortField,
): string | number | undefined {
  switch (field) {
    case "sessionId":
      return row.sessionId;
    case "state":
      return row.stateLabel ?? row.status;
    case "lastActivity":
      return row.lastActivityMs;
    case "eventCount":
      return row.eventCount;
  }
}

export function sortSessions(
  rows: SatpSessionRow[],
  { field, direction }: SessionSort,
): SatpSessionRow[] {
  const factor = direction === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const valueA = sortValue(a, field);
    const valueB = sortValue(b, field);
    if (valueA === undefined && valueB === undefined) {
      return 0;
    }
    if (valueA === undefined) {
      return 1; // undefined always last
    }
    if (valueB === undefined) {
      return -1;
    }
    if (typeof valueA === "number" && typeof valueB === "number") {
      return (valueA - valueB) * factor;
    }
    return String(valueA).localeCompare(String(valueB)) * factor;
  });
}

export interface SessionKpis {
  total: number;
  inProgress: number;
  completed: number;
  failed: number;
  rollbacks: number;
}

/** Outcome counts for the KPI cards; buckets are filters, not a partition,
 * so a rolled-back-and-failed session counts in both `failed` and
 * `rollbacks`, and unknown-state sessions only in `total`. */
export function sessionKpis(rows: SatpSessionRow[]): SessionKpis {
  return {
    total: rows.length,
    inProgress: rows.filter((row) => matchesBucket(row, "in-progress")).length,
    completed: rows.filter((row) => matchesBucket(row, "completed")).length,
    failed: rows.filter((row) => matchesBucket(row, "failed")).length,
    rollbacks: rows.filter((row) => matchesBucket(row, "rollback")).length,
  };
}
