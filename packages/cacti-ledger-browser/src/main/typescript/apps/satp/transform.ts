/**
 * Pure helpers that turn raw SATP gateway REST responses (audit entries,
 * session status) into the view models used by the UI.
 *
 * The input types below are structural mirrors of the gateway REST payload
 * types (typed in `./types.ts`) so that this module stays dependency-free
 * and can be unit tested in isolation.
 *
 * Data model notes:
 * - `GET /audit` returns log entries of a whole time window. Each entry
 *   carries a `LocalLog` whose `data` field is a JSON-serialized snapshot of
 *   the full `SessionData` protobuf at the time of logging (camelCase field
 *   names, see `session_pb.ts` in the plugin).
 * - `sequenceNumber` orders the entries within a session.
 * - Session IDs from `GET /get-sessions-ids` may differ from the audit
 *   `sessionId` values by a correlation suffix, hence the prefix matching in
 *   `matchAuditSessionId`.
 */

export interface SatpLocalLogInput {
  sessionId: string;
  type: string;
  key?: string;
  operation?: string;
  /** Epoch milliseconds encoded as string. */
  timestamp?: string;
  /** JSON-serialized session state snapshot (SessionData protobuf). */
  data?: string;
  sequenceNumber?: number;
}

/**
 * Coerces an untrusted numeric-ish value (numbers from parsed JSON can be
 * `NaN`/`±Infinity`, e.g. via `1e999`) to a finite number, `undefined`
 * otherwise. Guards every numeric view-model field so that hostile or
 * malformed gateway data can never smuggle non-finite numbers into the UI.
 */
function finiteNumber(value: unknown): number | undefined {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export interface SatpAuditEntryInput {
  auditEntryId?: string;
  /** Epoch milliseconds. */
  timestamp: number;
  session: SatpLocalLogInput;
}

export interface SatpStatusInput {
  status?: string;
  substatus?: string;
  stage?: string;
  /** ISO date-time string. */
  startTime?: string;
}

/** Parsed `SessionData` snapshot (only the fields the UI needs are typed). */
export interface SatpSessionSnapshot {
  id?: string;
  transferContextId?: string;
  /** Numeric protobuf `State` enum, see `satpStateLabel`. */
  state?: number;
  errorCode?: unknown;
  phaseError?: unknown;
  senderGatewayNetworkId?: string;
  recipientGatewayNetworkId?: string;
  senderGatewayOwnerId?: string;
  receiverGatewayOwnerId?: string;
  sourceLedgerAssetId?: string;
  recipientLedgerAssetId?: string;
  sourceBasePath?: string;
  recipientBasePath?: string;
  serverGatewayPubkey?: string;
  clientGatewayPubkey?: string;
  originatorPubkey?: string;
  beneficiaryPubkey?: string;
  verifiedOriginatorEntityId?: string;
  verifiedBeneficiaryEntityId?: string;
  digitalAssetId?: string;
  assetProfileId?: string;
  /** Hash of the last SATP message processed by this gateway (hash chain). */
  lastMessageHash?: string;
  lastSequenceNumber?: string | number;
  hashes?: Record<string, unknown>;
  signatures?: Record<string, unknown>;
  lockAssertionClaim?: unknown;
  mintAssertionClaim?: unknown;
  burnAssertionClaim?: unknown;
  assignmentAssertionClaim?: unknown;
  senderWrapAssertionClaim?: unknown;
  receiverWrapAssertionClaim?: unknown;
  transferInitClaims?: unknown;
  senderAsset?: unknown;
  receiverAsset?: unknown;
  role?: number;
  [key: string]: unknown;
}

export interface SatpTimelineEvent {
  auditEntryId?: string;
  sequenceNumber: number;
  type: string;
  operation: string;
  /** Epoch milliseconds. */
  timestampMs?: number;
  snapshot?: SatpSessionSnapshot;
}

export interface SatpSessionDetail {
  sessionId: string;
  events: SatpTimelineEvent[];
  /** Snapshot from the highest-numbered event that carries one. */
  latestSnapshot?: SatpSessionSnapshot;
}

export interface SatpSessionRow {
  sessionId: string;
  status?: string;
  substatus?: string;
  stage?: string;
  startTimeMs?: number;
  lastActivityMs?: number;
  eventCount: number;
  stateLabel?: string;
  sourceLedger?: string;
  destinationLedger?: string;
  senderGateway?: string;
  recipientGateway?: string;
  assetId?: string;
  /** True when any audit event of the session is a rollback step. */
  hasRollback: boolean;
}

export interface SatpFailureInfo {
  failed: boolean;
  stateLabel?: string;
  errorDetail?: string;
}

/** Session snapshot fields that hold proofs/claims. */
export const SATP_CLAIM_FIELDS = [
  "transferInitClaims",
  "lockAssertionClaim",
  "mintAssertionClaim",
  "burnAssertionClaim",
  "assignmentAssertionClaim",
  "senderWrapAssertionClaim",
  "receiverWrapAssertionClaim",
] as const;

/**
 * Merges the proofs/claims of a session timeline: for every claim field, the
 * value from the highest-numbered event that carries one wins. Claims only
 * appear in the snapshots of the steps that produce them, so reading just
 * the latest snapshot would miss earlier claims.
 */
export function collectLatestClaims(
  events: SatpTimelineEvent[],
): Partial<Record<(typeof SATP_CLAIM_FIELDS)[number], unknown>> {
  const merged: Partial<Record<(typeof SATP_CLAIM_FIELDS)[number], unknown>> =
    {};
  for (const event of events) {
    const snapshot = event.snapshot;
    if (!snapshot) {
      continue;
    }
    for (const field of SATP_CLAIM_FIELDS) {
      const value = snapshot[field];
      if (value !== undefined && value !== null) {
        merged[field] = value;
      }
    }
  }
  return merged;
}

/** Labels of the protobuf `State` enum (`cacti.satp.v02.session.State`). */
const STATE_LABELS: Record<number, string> = {
  0: "UNSPECIFIED",
  1: "ONGOING",
  2: "COMPLETED",
  3: "REJECTED",
  4: "CONDITIONAL_REJECTED",
  5: "ERROR",
  6: "RECOVERED",
  7: "RECOVERING",
};

const FAILED_STATES = new Set(["REJECTED", "CONDITIONAL_REJECTED", "ERROR"]);

/** True for session state labels that mark a transfer as failed. */
export function isFailedStateLabel(stateLabel?: string): boolean {
  return stateLabel !== undefined && FAILED_STATES.has(stateLabel);
}

export function satpStateLabel(state?: number): string | undefined {
  if (state === undefined || state === null) {
    return undefined;
  }
  return STATE_LABELS[state] ?? `UNKNOWN_${state}`;
}

/** Parses the JSON-serialized `SessionData` snapshot of a log entry. */
export function parseSessionSnapshot(
  data?: string,
): SatpSessionSnapshot | undefined {
  if (!data) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(data);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as SatpSessionSnapshot;
    }
  } catch {
    // Malformed snapshot - ignore, the raw string is still shown in the UI.
  }
  return undefined;
}

/**
 * Sorts audit entries into a chronological timeline (by `sequenceNumber`,
 * falling back to the entry timestamp) and attaches the parsed snapshots.
 * Non-finite (or non-numeric) `sequenceNumber`/timestamp values from the
 * gateway degrade to the documented fallbacks instead of propagating NaN.
 */
export function buildTimeline(
  entries: SatpAuditEntryInput[],
): SatpTimelineEvent[] {
  return [...entries]
    .sort(
      (a, b) =>
        (finiteNumber(a.session.sequenceNumber) ?? 0) -
          (finiteNumber(b.session.sequenceNumber) ?? 0) ||
        (finiteNumber(a.timestamp) ?? 0) - (finiteNumber(b.timestamp) ?? 0),
    )
    .map((entry) => ({
      auditEntryId: entry.auditEntryId,
      sequenceNumber: finiteNumber(entry.session.sequenceNumber) ?? 0,
      type: entry.session.type,
      operation: entry.session.operation ?? "",
      timestampMs:
        finiteNumber(entry.timestamp) ??
        (entry.session.timestamp
          ? finiteNumber(Number(entry.session.timestamp))
          : undefined),
      snapshot: parseSessionSnapshot(entry.session.data),
    }));
}

export function buildSessionDetail(
  sessionId: string,
  entries: SatpAuditEntryInput[],
): SatpSessionDetail {
  const events = buildTimeline(entries);
  const latestSnapshot = [...events]
    .reverse()
    .find((event) => event.snapshot)?.snapshot;
  return { sessionId, events, latestSnapshot };
}

/** Groups audit entries by their exact audit `sessionId`. */
export function groupAuditEntriesBySession(
  entries: SatpAuditEntryInput[],
): Map<string, SatpAuditEntryInput[]> {
  const groups = new Map<string, SatpAuditEntryInput[]>();
  for (const entry of entries) {
    const list = groups.get(entry.session.sessionId) ?? [];
    list.push(entry);
    groups.set(entry.session.sessionId, list);
  }
  return groups;
}

/**
 * Matches a session ID from `GET /get-sessions-ids` against the session IDs
 * found in audit entries, which may carry extra correlation suffixes
 * (transfer context ID + suffix). Exact match wins, then the longest prefix
 * match in either direction. Empty audit IDs never prefix-match anything
 * (the empty string is a prefix of every ID).
 */
export function matchAuditSessionId(
  auditSessionIds: string[],
  sessionId: string,
): string | undefined {
  if (auditSessionIds.includes(sessionId)) {
    return sessionId;
  }
  const prefixMatch = auditSessionIds
    .filter(
      (auditId) =>
        auditId.length > 0 &&
        (auditId.startsWith(sessionId) || sessionId.startsWith(auditId)),
    )
    .sort((a, b) => b.length - a.length)[0];
  return prefixMatch;
}

/** Derives the failure view model from the latest snapshot and status. */
export function deriveFailureInfo(
  snapshot?: SatpSessionSnapshot,
  status?: SatpStatusInput,
): SatpFailureInfo {
  const stateLabel = satpStateLabel(snapshot?.state);
  const failed = isFailedStateLabel(stateLabel) || status?.status === "FAILED";

  let errorDetail: string | undefined;
  if (snapshot?.errorCode !== undefined && snapshot?.errorCode !== null) {
    errorDetail =
      typeof snapshot.errorCode === "string"
        ? snapshot.errorCode
        : JSON.stringify(snapshot.errorCode);
  }

  return { failed, stateLabel, errorDetail };
}

export interface BuildSessionRowsParams {
  sessionIds: string[];
  /** Statuses keyed by session ID as returned by `GET /status`. */
  statuses: Record<string, SatpStatusInput | undefined>;
  auditEntries: SatpAuditEntryInput[];
}

/**
 * Joins `GET /get-sessions-ids`, the per-session `GET /status` responses and
 * the `GET /audit` window into one row per session. Audit sessions that
 * prefix-match a listed session ID are merged into its row; audit-only
 * sessions get their own row.
 */
export function buildSessionRows({
  sessionIds,
  statuses,
  auditEntries,
}: BuildSessionRowsParams): SatpSessionRow[] {
  const groups = groupAuditEntriesBySession(auditEntries);
  const auditSessionIds = [...groups.keys()];
  const consumedAuditIds = new Set<string>();

  const toRow = (
    sessionId: string,
    entries: SatpAuditEntryInput[],
  ): SatpSessionRow => {
    const detail = buildSessionDetail(sessionId, entries);
    const snapshot = detail.latestSnapshot;
    const status = statuses[sessionId];

    // Ignore non-finite timestamps instead of letting `Math.max` turn them
    // into NaN `lastActivityMs`.
    const finiteActivityMs = entries
      .map((entry) => finiteNumber(entry.timestamp))
      .filter((n): n is number => n !== undefined);
    const lastActivityMs = finiteActivityMs.length
      ? Math.max(...finiteActivityMs)
      : undefined;

    return {
      sessionId,
      status: status?.status,
      substatus: status?.substatus,
      stage: status?.stage,
      startTimeMs:
        status?.startTime !== undefined && status.startTime !== ""
          ? finiteNumber(new Date(status.startTime).getTime())
          : undefined,
      lastActivityMs,
      eventCount: entries.length,
      stateLabel: satpStateLabel(snapshot?.state),
      sourceLedger: snapshot?.sourceBasePath,
      destinationLedger: snapshot?.recipientBasePath,
      senderGateway: snapshot?.senderGatewayNetworkId,
      recipientGateway: snapshot?.recipientGatewayNetworkId,
      assetId: snapshot?.digitalAssetId,
      hasRollback: entries.some((entry) => isRollbackType(entry.session.type)),
    };
  };

  const rows: SatpSessionRow[] = [];
  for (const sessionId of sessionIds) {
    const auditId = matchAuditSessionId(auditSessionIds, sessionId);
    const entries = auditId !== undefined ? groups.get(auditId) ?? [] : [];
    if (auditId !== undefined) {
      consumedAuditIds.add(auditId);
    }
    rows.push(toRow(sessionId, entries));
  }

  // Sessions that only appear in the audit data.
  for (const auditId of auditSessionIds) {
    if (!consumedAuditIds.has(auditId)) {
      rows.push(toRow(auditId, groups.get(auditId) ?? []));
    }
  }

  // Most recently active sessions first, sessions without audit data last.
  return rows.sort((a, b) => (b.lastActivityMs ?? 0) - (a.lastActivityMs ?? 0));
}

/**
 * Best-effort attribution of a SATP log type to a protocol stage
 * (0 = session setup, 1 = transfer proposal/commence, 2 = lock assertion,
 * 3 = commit/finalization). Rollback steps are attributed to their base step
 * where the name allows it. Unknown types return `undefined`.
 */
export function deriveStage(type: string): number | undefined {
  const t = type.toUpperCase();
  if (t.includes("INIT") || t.includes("PRE_SATP") || t.includes("SETUP")) {
    return 0;
  }
  if (t.includes("PROPOSAL") || t.includes("COMMENCE")) {
    return 1;
  }
  if (t.includes("LOCK")) {
    return 2;
  }
  if (
    t.includes("COMMIT") ||
    t.includes("MINT") ||
    t.includes("BURN") ||
    t.includes("ASSIGN") ||
    t.includes("COMPLETE")
  ) {
    return 3;
  }
  return undefined;
}

export const STAGE_LABELS: Record<number, string> = {
  0: "Stage 0 · Setup",
  1: "Stage 1 · Transfer Proposal",
  2: "Stage 2 · Lock Assertion",
  3: "Stage 3 · Commit Finalization",
};

export function stageLabel(stage?: number): string {
  if (stage === undefined) {
    return "Stage unknown";
  }
  return STAGE_LABELS[stage] ?? `Stage ${stage}`;
}

/** True when the log type represents a rollback (crash-recovery) step. */
export function isRollbackType(type: string): boolean {
  return type.toUpperCase().includes("ROLLBACK");
}

/** Aggregated message counts by SATP log type across all sessions. */
export interface SatpMessageTypeStat {
  type: string;
  stage?: number;
  rollback: boolean;
  count: number;
  sessionCount: number;
  lastTimestampMs?: number;
}

export function buildMessageTypeStats(
  entries: SatpAuditEntryInput[],
): SatpMessageTypeStat[] {
  const byType = new Map<
    string,
    SatpMessageTypeStat & { sessions: Set<string> }
  >();
  for (const entry of entries) {
    const type = entry.session.type;
    const stat = byType.get(type) ?? {
      type,
      stage: deriveStage(type),
      rollback: isRollbackType(type),
      count: 0,
      sessionCount: 0,
      lastTimestampMs: undefined,
      sessions: new Set<string>(),
    };
    stat.count += 1;
    stat.sessions.add(entry.session.sessionId);
    const entryTs = finiteNumber(entry.timestamp);
    if (entryTs !== undefined) {
      stat.lastTimestampMs =
        stat.lastTimestampMs === undefined
          ? entryTs
          : Math.max(stat.lastTimestampMs, entryTs);
    }
    byType.set(type, stat);
  }
  return [...byType.values()]
    .map(({ sessions, ...stat }) => ({ ...stat, sessionCount: sessions.size }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
}

/** Per-gateway view derived from the audit snapshots. */
export interface SatpGatewayStat {
  /** Gateway network ID (e.g. `http://gateway:3010`). */
  gatewayId: string;
  /** Distinct pubkeys observed for this gateway (may be empty). */
  pubkeys: string[];
  ownerIds: string[];
  /** Sessions in which this gateway participates. */
  sessionIds: string[];
  /** Sessions where the gateway is on the sender side of the asset flow. */
  asSenderCount: number;
  /** Sessions where the gateway is on the recipient side of the asset flow. */
  asRecipientCount: number;
  completedCount: number;
  failedCount: number;
  ongoingCount: number;
  ledgers: string[];
  assets: string[];
  lastActivityMs?: number;
}

/**
 * Builds the per-gateway deployment view: every gateway network ID seen in
 * the audit snapshots (this gateway and its counterparties), the sessions it
 * participates in, its role split and the ledgers/assets it touched.
 */
export function buildGatewayStats(
  entries: SatpAuditEntryInput[],
): SatpGatewayStat[] {
  const byGateway = new Map<string, SatpGatewayStat>();

  const touch = (gatewayId: string): SatpGatewayStat => {
    const existing = byGateway.get(gatewayId);
    if (existing) {
      return existing;
    }
    const stat: SatpGatewayStat = {
      gatewayId,
      pubkeys: [],
      ownerIds: [],
      sessionIds: [],
      asSenderCount: 0,
      asRecipientCount: 0,
      completedCount: 0,
      failedCount: 0,
      ongoingCount: 0,
      ledgers: [],
      assets: [],
    };
    byGateway.set(gatewayId, stat);
    return stat;
  };

  const pushUnique = (list: string[], value?: string) => {
    if (value && !list.includes(value)) {
      list.push(value);
    }
  };

  // Latest snapshot per session (role split and state are read from there).
  const latestBySession = new Map<string, SatpSessionSnapshot>();
  for (const entry of entries) {
    const snapshot = parseSessionSnapshot(entry.session.data);
    if (snapshot) {
      latestBySession.set(entry.session.sessionId, snapshot);
    }
  }

  for (const [sessionId, snapshot] of latestBySession) {
    const stateLabel = satpStateLabel(snapshot.state);
    const isCompleted =
      stateLabel === "COMPLETED" || stateLabel === "RECOVERED";
    const isFailed = stateLabel !== undefined && FAILED_STATES.has(stateLabel);

    const participants: Array<{
      gatewayId?: string;
      senderSide: boolean;
      pubkey?: string;
      ownerId?: string;
    }> = [
      {
        gatewayId: snapshot.senderGatewayNetworkId,
        senderSide: true,
        pubkey: snapshot.serverGatewayPubkey,
        ownerId: snapshot.senderGatewayOwnerId,
      },
      {
        gatewayId: snapshot.recipientGatewayNetworkId,
        senderSide: false,
        pubkey: snapshot.clientGatewayPubkey,
        ownerId: snapshot.receiverGatewayOwnerId,
      },
    ];

    for (const { gatewayId, senderSide, pubkey, ownerId } of participants) {
      if (!gatewayId) {
        continue;
      }
      const stat = touch(gatewayId);
      if (!stat.sessionIds.includes(sessionId)) {
        stat.sessionIds.push(sessionId);
        if (isCompleted) stat.completedCount += 1;
        if (isFailed) stat.failedCount += 1;
        if (!isCompleted && !isFailed) stat.ongoingCount += 1;
      }
      if (senderSide) {
        stat.asSenderCount += 1;
      } else {
        stat.asRecipientCount += 1;
      }
      pushUnique(stat.pubkeys, pubkey);
      pushUnique(stat.ownerIds, ownerId);
      pushUnique(
        stat.ledgers,
        senderSide ? snapshot.sourceBasePath : snapshot.recipientBasePath,
      );
      pushUnique(stat.assets, snapshot.digitalAssetId);
    }
  }

  // Last activity per gateway from all entries involving it.
  for (const entry of entries) {
    const snapshot = parseSessionSnapshot(entry.session.data);
    if (!snapshot) {
      continue;
    }
    const entryTs = finiteNumber(entry.timestamp);
    if (entryTs === undefined) {
      continue;
    }
    for (const gatewayId of [
      snapshot.senderGatewayNetworkId,
      snapshot.recipientGatewayNetworkId,
    ]) {
      if (!gatewayId) {
        continue;
      }
      const stat = byGateway.get(gatewayId);
      if (stat) {
        stat.lastActivityMs =
          stat.lastActivityMs === undefined
            ? entryTs
            : Math.max(stat.lastActivityMs, entryTs);
      }
    }
  }

  return [...byGateway.values()].sort(
    (a, b) =>
      b.sessionIds.length - a.sessionIds.length ||
      a.gatewayId.localeCompare(b.gatewayId),
  );
}

/** A gateway pairing (sender → recipient) with session aggregates. */
export interface SatpGatewayPairStat {
  senderGateway: string;
  recipientGateway: string;
  sessionCount: number;
  completedCount: number;
  failedCount: number;
  ledgers: string[];
  lastActivityMs?: number;
}

/** Aggregates sessions by their gateway pairing (deployment paths). */
export function buildGatewayPairStats(
  entries: SatpAuditEntryInput[],
): SatpGatewayPairStat[] {
  const latestBySession = new Map<string, SatpSessionSnapshot>();
  const latestTimestampBySession = new Map<string, number>();
  for (const entry of entries) {
    const entryTs = finiteNumber(entry.timestamp);
    if (entryTs !== undefined) {
      latestTimestampBySession.set(
        entry.session.sessionId,
        Math.max(
          latestTimestampBySession.get(entry.session.sessionId) ?? 0,
          entryTs,
        ),
      );
    }
    const snapshot = parseSessionSnapshot(entry.session.data);
    if (snapshot) {
      latestBySession.set(entry.session.sessionId, snapshot);
    }
  }

  const byPair = new Map<string, SatpGatewayPairStat>();
  for (const [sessionId, snapshot] of latestBySession) {
    const { senderGatewayNetworkId, recipientGatewayNetworkId } = snapshot;
    if (!senderGatewayNetworkId || !recipientGatewayNetworkId) {
      continue;
    }
    const pairKey = `${senderGatewayNetworkId} → ${recipientGatewayNetworkId}`;
    const stat = byPair.get(pairKey) ?? {
      senderGateway: senderGatewayNetworkId,
      recipientGateway: recipientGatewayNetworkId,
      sessionCount: 0,
      completedCount: 0,
      failedCount: 0,
      ledgers: [],
    };
    stat.sessionCount += 1;
    const stateLabel = satpStateLabel(snapshot.state);
    if (stateLabel === "COMPLETED" || stateLabel === "RECOVERED") {
      stat.completedCount += 1;
    }
    if (stateLabel !== undefined && FAILED_STATES.has(stateLabel)) {
      stat.failedCount += 1;
    }
    if (
      snapshot.sourceBasePath &&
      !stat.ledgers.includes(snapshot.sourceBasePath)
    ) {
      stat.ledgers.push(snapshot.sourceBasePath);
    }
    if (
      snapshot.recipientBasePath &&
      !stat.ledgers.includes(snapshot.recipientBasePath)
    ) {
      stat.ledgers.push(snapshot.recipientBasePath);
    }
    stat.lastActivityMs = Math.max(
      stat.lastActivityMs ?? 0,
      latestTimestampBySession.get(sessionId) ?? 0,
    );
    byPair.set(pairKey, stat);
  }

  return [...byPair.values()].sort((a, b) => b.sessionCount - a.sessionCount);
}

/**
 * All distinct local gateway network IDs in the audit window (the gateway
 * writing the log, per snapshot role).
 */
export function deriveLocalGatewayIds(
  entries: SatpAuditEntryInput[],
): string[] {
  const ids = new Set<string>();
  for (const entry of entries) {
    const snapshot = parseSessionSnapshot(entry.session.data);
    if (!snapshot) {
      continue;
    }
    const local = deriveLocalGatewayId(snapshot);
    if (local) {
      ids.add(local);
    }
  }
  return [...ids];
}

/**
 * Network ID of the gateway that wrote the audit log, derived from the
 * snapshot `role` field (in SATP the sender gateway takes the SERVER role).
 * Returns `undefined` when the role is unknown (TYPE_UNSPECIFIED / missing).
 */
export function deriveLocalGatewayId(
  snapshot: SatpSessionSnapshot,
): string | undefined {
  if (snapshot.role === 2) {
    return snapshot.senderGatewayNetworkId;
  }
  if (snapshot.role === 1) {
    return snapshot.recipientGatewayNetworkId;
  }
  return undefined;
}

/** A single audit event flattened for the cross-session message log. */
export type SatpMessageLogEntry = SatpTimelineEvent & {
  sessionId: string;
  stage?: number;
  rollback: boolean;
};

/** Flattens the audit window into one message log across all sessions. */
export function buildMessageLog(
  entries: SatpAuditEntryInput[],
): SatpMessageLogEntry[] {
  return entries
    .map((entry) => ({
      sessionId: entry.session.sessionId,
      auditEntryId: entry.auditEntryId,
      sequenceNumber: finiteNumber(entry.session.sequenceNumber) ?? 0,
      type: entry.session.type,
      operation: entry.session.operation ?? "",
      timestampMs:
        finiteNumber(entry.timestamp) ??
        (entry.session.timestamp
          ? finiteNumber(Number(entry.session.timestamp))
          : undefined),
      snapshot: parseSessionSnapshot(entry.session.data),
      stage: deriveStage(entry.session.type),
      rollback: isRollbackType(entry.session.type),
    }))
    .sort((a, b) => (b.timestampMs ?? 0) - (a.timestampMs ?? 0));
}
