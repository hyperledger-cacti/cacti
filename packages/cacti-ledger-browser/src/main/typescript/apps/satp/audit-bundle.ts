/**
 * Compliance export of one session's audit evidence: everything the
 * inspector knows about a transfer, serialized to a standalone JSON file.
 *
 * The bundle is self-describing (schema version + generatedAt) so archived
 * exports remain interpretable, and it embeds the raw audit snapshots as the
 * gateway produced them - the export is evidence, not a report, so no
 * view-model transformation is applied beyond ordering.
 */
import {
  collectLatestClaims,
  type SatpSessionDetail,
  type SatpStatusInput,
} from "./transform";

export const AUDIT_BUNDLE_SCHEMA_VERSION = "cacti.satp.auditBundle.v1";

export interface AuditBundle {
  schemaVersion: string;
  /** ISO 8601 creation time of the export. */
  generatedAt: string;
  sessionId: string;
  status?: {
    status?: string;
    substatus?: string;
    stage?: string;
    startTime?: string;
  };
  eventCount: number;
  /** Proofs/claims merged across the timeline (highest sequence wins). */
  claims: Record<string, unknown>;
  timeline: Array<{
    sequenceNumber: number;
    auditEntryId?: string;
    type: string;
    operation: string;
    /** ISO 8601 event time; omitted when the entry had none. */
    timestamp?: string;
    /** Raw session snapshot at the time of logging, as the gateway wrote it. */
    snapshot?: unknown;
  }>;
}

/**
 * Builds the export payload from the session detail view model. `nowMs`
 * exists for deterministic tests.
 */
export function buildAuditBundle(
  detail: SatpSessionDetail,
  status?: SatpStatusInput,
  nowMs: number = Date.now(),
): AuditBundle {
  return {
    schemaVersion: AUDIT_BUNDLE_SCHEMA_VERSION,
    generatedAt: new Date(nowMs).toISOString(),
    sessionId: detail.sessionId,
    status: status
      ? {
          status: status.status,
          substatus: status.substatus,
          stage: status.stage,
          startTime: status.startTime,
        }
      : undefined,
    eventCount: detail.events.length,
    claims: collectLatestClaims(detail.events) as Record<string, unknown>,
    timeline: detail.events.map((event) => ({
      sequenceNumber: event.sequenceNumber,
      auditEntryId: event.auditEntryId,
      type: event.type,
      operation: event.operation,
      timestamp:
        event.timestampMs !== undefined
          ? new Date(event.timestampMs).toISOString()
          : undefined,
      snapshot: event.snapshot,
    })),
  };
}

/**
 * Triggers a browser download of `data` as pretty-printed JSON. Kept as a
 * standalone function so components stay render-only and the flow is
 * testable with a `URL.createObjectURL` spy.
 */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
