/**
 * react-query setup for the SATP inspector app.
 *
 * Everything is keyed by the instance's gateway URL so that multiple app
 * instances pointing at different gateways do not clash. All polling
 * (`refetchInterval`) goes through `satpRefetchIntervalWithBackoff`, which
 * stretches the interval exponentially while the endpoint keeps failing and
 * returns to the base cadence on success - a dead gateway is not hammered
 * at a fixed rate (see `POLL_BACKOFF_MAX_INTERVAL_MS`).
 */
import { queryOptions } from "@tanstack/react-query";

import {
  createSatpAdminApi,
  fetchAuditEntries,
  fetchPromInstant,
  fetchPromRange,
  fetchSessionIds,
  fetchSessionStatus,
  fetchSupportedLedgers,
  fetchGatewayHealth,
  fetchSessionProofs,
  type PromRangeSeries,
} from "./api";
import {
  buildGatewayPairStats,
  buildGatewayStats,
  buildMessageLog,
  buildMessageTypeStats,
  buildSessionDetail,
  buildSessionRows,
  matchAuditSessionId,
  deriveLocalGatewayIds,
  type SatpGatewayPairStat,
  type SatpGatewayStat,
  type SatpMessageLogEntry,
  type SatpMessageTypeStat,
  type SatpSessionDetail,
  type SatpSessionRow,
  type SatpStatusInput,
} from "./transform";
import type { SatpQueryOptions, SatpSessionProof } from "./types";

/** How far back the audit window queries reach by default. */
export const AUDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * How often live views refresh while the gateway is healthy, unless the
 * viewer picked another interval (`options.polling`).
 */
export const SESSIONS_REFETCH_INTERVAL_MS = 10_000;
export const HEALTH_REFETCH_INTERVAL_MS = 30_000;

/**
 * Ceiling for the exponential polling backoff. A gateway that keeps failing
 * (unreachable, overloaded, rate-limiting) is re-probed at most every five
 * minutes instead of at the fixed base interval - the inspector's own
 * threat-model doc (docs page, "Trust model") warns about hammering a
 * rate-limited gateway.
 */
export const POLL_BACKOFF_MAX_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Pure helper behind {@link satpRefetchIntervalWithBackoff}: the polling
 * interval doubles with every consecutive failed polling cycle and is
 * capped at {@link POLL_BACKOFF_MAX_INTERVAL_MS}. After 5 failed cycles
 * (`2^5 = 32x`) the cap applies. A successful cycle resets the count and
 * thereby the base interval.
 */
export function satpPollIntervalMs(
  baseIntervalMs: number,
  failedCycles: number,
): number {
  const cycles = Math.max(0, Math.floor(failedCycles));
  return Math.min(baseIntervalMs * 2 ** cycles, POLL_BACKOFF_MAX_INTERVAL_MS);
}

/**
 * Structural view of the parts of a react-query v5 `Query` object that the
 * backoff decision needs (react-query passes the whole query to a
 * function-valued `refetchInterval`).
 *
 * Deliberately NOT based on `state.fetchFailureCount`: react-query resets
 * that counter at the start of every fetch cycle, so an attempt-count-based
 * backoff would never compound across failed polling cycles (it would cap
 * out at the per-cycle attempt count). Failed *cycles* are therefore
 * counted explicitly below.
 */
interface PolledQuery {
  state: {
    /** `"fetching" | "paused" | "idle"` - idle means a cycle completed. */
    fetchStatus: string;
    /** `"pending" | "error" | "success"` - how the last cycle ended. */
    status: string;
  };
}

const failedCycleCounts = new WeakMap<PolledQuery, number>();
const prevFetchStatus = new WeakMap<PolledQuery, string>();

/**
 * `refetchInterval` option factory with exponential backoff. Use it instead
 * of a fixed interval so live views back off while the gateway/Prometheus
 * endpoint keeps failing, and return to the base cadence on success:
 *
 * ```
 * refetchInterval: satpRefetchIntervalWithBackoff(HEALTH_REFETCH_INTERVAL_MS)
 * ```
 *
 * react-query re-evaluates the option on every query state change; the
 * consecutive-failed-cycle count is bumped exactly when a fetch cycle
 * completes (`fetchStatus` transitions to `idle`), incremented on `"error"`
 * and reset on `"success"`.
 */
export function satpRefetchIntervalWithBackoff(baseIntervalMs: number) {
  return (query: PolledQuery): number => {
    const { fetchStatus, status } = query.state;
    const wasFetching = prevFetchStatus.get(query);
    prevFetchStatus.set(query, fetchStatus);

    if (fetchStatus === "idle" && wasFetching === "fetching") {
      const failedCycles = failedCycleCounts.get(query) ?? 0;
      failedCycleCounts.set(query, status === "error" ? failedCycles + 1 : 0);
    }

    return satpPollIntervalMs(
      baseIntervalMs,
      failedCycleCounts.get(query) ?? 0,
    );
  };
}

/**
 * `refetchInterval` of a live view: honours the viewer's polling settings
 * (`options.polling`: paused, or a different base interval) and keeps the
 * exponential backoff on failure. Always a function, so pausing and
 * resuming takes effect on the next render without remounting the query.
 *
 * `followViewerInterval: false` keeps `defaultBaseMs` (health and
 * Prometheus probes) while still honouring pause.
 */
export function satpLiveRefetchInterval(
  options: SatpQueryOptions,
  defaultBaseMs: number,
  followViewerInterval = true,
) {
  const base = followViewerInterval
    ? options.polling?.intervalMs ?? defaultBaseMs
    : defaultBaseMs;
  const backoff = satpRefetchIntervalWithBackoff(base);
  const paused = options.polling?.paused === true;
  return (query: PolledQuery): number | false =>
    paused ? false : backoff(query);
}

/**
 * Gateway queries only run once the instance (or the viewer) named a
 * gateway: the inspector never probes a default host on its own.
 */
export function hasGateway(
  options: Pick<SatpQueryOptions, "gatewayUrl">,
): boolean {
  return Boolean(options.gatewayUrl);
}

export function satpQueryKeys(gatewayUrl: string) {
  const base = ["satp", gatewayUrl] as const;
  return {
    all: base,
    health: [...base, "health"] as const,
    supportedLedgers: [...base, "supported-ledgers"] as const,
    sessions: [...base, "sessions"] as const,
    session: (sessionId: string) => [...base, "session", sessionId] as const,
    proofs: (sessionId: string) => [...base, "proofs", sessionId] as const,
    promInstant: (query: string) => [...base, "prom-instant", query] as const,
    promRange: (query: string) => [...base, "prom-range", query] as const,
  };
}

export function satpHealthQuery(options: SatpQueryOptions) {
  const keys = satpQueryKeys(options.gatewayUrl);
  return queryOptions({
    queryKey: keys.health,
    queryFn: async () => {
      const api = createSatpAdminApi(options);
      return fetchGatewayHealth(api);
    },
    enabled: hasGateway(options),
    refetchInterval: satpLiveRefetchInterval(
      options,
      HEALTH_REFETCH_INTERVAL_MS,
      false,
    ),
    retry: 1,
  });
}

export function satpSupportedLedgersQuery(options: SatpQueryOptions) {
  const keys = satpQueryKeys(options.gatewayUrl);
  return queryOptions({
    queryKey: keys.supportedLedgers,
    queryFn: async () => {
      const api = createSatpAdminApi(options);
      return fetchSupportedLedgers(api);
    },
    enabled: hasGateway(options),
    retry: 1,
  });
}

/**
 * Joins `get-sessions-ids`, per-session `status` and the audit window into
 * the session list rows.
 */
export function satpSessionsQuery(options: SatpQueryOptions) {
  const keys = satpQueryKeys(options.gatewayUrl);
  return queryOptions({
    queryKey: keys.sessions,
    queryFn: async (): Promise<SatpSessionRow[]> => {
      const api = createSatpAdminApi(options);
      const endTimestampMs = Date.now();
      const startTimestampMs = endTimestampMs - AUDIT_WINDOW_MS;

      const [sessionIds, auditEntries] = await Promise.all([
        fetchSessionIds(api),
        fetchAuditEntries(api, startTimestampMs, endTimestampMs),
      ]);

      const statusResults = await Promise.allSettled(
        sessionIds.map((sessionId) => fetchSessionStatus(api, sessionId)),
      );
      const statuses: Record<string, SatpStatusInput> = {};
      statusResults.forEach((result, index) => {
        if (result.status === "fulfilled") {
          statuses[sessionIds[index]] = result.value;
        }
      });

      return buildSessionRows({ sessionIds, statuses, auditEntries });
    },
    enabled: hasGateway(options),
    refetchInterval: satpLiveRefetchInterval(
      options,
      SESSIONS_REFETCH_INTERVAL_MS,
    ),
    retry: 1,
  });
}

/** Audit timeline of one session plus its current status. */
export function satpSessionDetailQuery(
  options: SatpQueryOptions,
  sessionId: string,
) {
  const keys = satpQueryKeys(options.gatewayUrl);
  return queryOptions({
    queryKey: keys.session(sessionId),
    queryFn: async (): Promise<{
      detail: SatpSessionDetail;
      status?: SatpStatusInput;
    }> => {
      const api = createSatpAdminApi(options);
      const endTimestampMs = Date.now();
      const startTimestampMs = endTimestampMs - AUDIT_WINDOW_MS;

      const auditEntries = await fetchAuditEntries(
        api,
        startTimestampMs,
        endTimestampMs,
      );

      // The audit session ID may carry correlation suffixes - select the
      // whole group matching this session.
      const auditSessionIds = [
        ...new Set(auditEntries.map((entry) => entry.session.sessionId)),
      ];
      const auditId = matchAuditSessionId(auditSessionIds, sessionId);
      const sessionEntries = auditEntries.filter(
        (entry) => auditId !== undefined && entry.session.sessionId === auditId,
      );

      let status: SatpStatusInput | undefined;
      try {
        status = await fetchSessionStatus(api, sessionId);
      } catch {
        // Status endpoint may not know this session - timeline is still shown.
      }

      return {
        detail: buildSessionDetail(sessionId, sessionEntries),
        status,
      };
    },
    enabled: hasGateway(options),
    refetchInterval: satpLiveRefetchInterval(
      options,
      SESSIONS_REFETCH_INTERVAL_MS,
    ),
    retry: 1,
  });
}

/**
 * Signature-verified proofs of one session (`GET /proofs`). Older gateways
 * without the endpoint answer 404: that resolves to `null` ("not
 * supported") instead of an error, so the view can fall back to the claims
 * found in the audit snapshots.
 */
export function satpSessionProofsQuery(
  options: SatpQueryOptions,
  sessionId: string,
) {
  const keys = satpQueryKeys(options.gatewayUrl);
  return queryOptions({
    queryKey: keys.proofs(sessionId),
    queryFn: async (): Promise<SatpSessionProof[] | null> => {
      const api = createSatpAdminApi(options);
      return fetchSessionProofs(api, [sessionId]);
    },
    enabled: hasGateway(options) && Boolean(sessionId),
    refetchInterval: satpLiveRefetchInterval(
      options,
      SESSIONS_REFETCH_INTERVAL_MS,
    ),
    retry: 1,
  });
}

/** Gateway / message analytics derived from one audit window fetch. */
export interface SatpAnalytics {
  gatewayStats: SatpGatewayStat[];
  pairStats: SatpGatewayPairStat[];
  messageTypeStats: SatpMessageTypeStat[];
  /** Network IDs of the gateway that wrote the audit log (role-derived). */
  localGatewayIds: string[];
}

export function satpAnalyticsQuery(options: SatpQueryOptions) {
  const keys = satpQueryKeys(options.gatewayUrl);
  return queryOptions({
    queryKey: [...keys.all, "analytics"] as const,
    queryFn: async (): Promise<SatpAnalytics> => {
      const api = createSatpAdminApi(options);
      const endTimestampMs = Date.now();
      const auditEntries = await fetchAuditEntries(
        api,
        endTimestampMs - AUDIT_WINDOW_MS,
        endTimestampMs,
      );
      return {
        gatewayStats: buildGatewayStats(auditEntries),
        pairStats: buildGatewayPairStats(auditEntries),
        messageTypeStats: buildMessageTypeStats(auditEntries),
        localGatewayIds: deriveLocalGatewayIds(auditEntries),
      };
    },
    enabled: hasGateway(options),
    refetchInterval: satpLiveRefetchInterval(
      options,
      SESSIONS_REFETCH_INTERVAL_MS,
    ),
    retry: 1,
  });
}

/** Flattened cross-session message log (newest first). */
export function satpMessageLogQuery(options: SatpQueryOptions) {
  const keys = satpQueryKeys(options.gatewayUrl);
  return queryOptions({
    queryKey: [...keys.all, "message-log"] as const,
    queryFn: async (): Promise<SatpMessageLogEntry[]> => {
      const api = createSatpAdminApi(options);
      const endTimestampMs = Date.now();
      const auditEntries = await fetchAuditEntries(
        api,
        endTimestampMs - AUDIT_WINDOW_MS,
        endTimestampMs,
      );
      return buildMessageLog(auditEntries);
    },
    enabled: hasGateway(options),
    refetchInterval: satpLiveRefetchInterval(
      options,
      SESSIONS_REFETCH_INTERVAL_MS,
    ),
    retry: 1,
  });
}

/** Instant Prometheus query (single gauge/counter value). */
export function satpPromInstantQuery(options: SatpQueryOptions, query: string) {
  const keys = satpQueryKeys(options.gatewayUrl);
  return queryOptions({
    queryKey: keys.promInstant(query),
    queryFn: async (): Promise<number | null> => {
      if (!options.prometheusUrl) {
        return null;
      }
      return fetchPromInstant(options.prometheusUrl, query);
    },
    enabled: Boolean(options.prometheusUrl),
    refetchInterval: satpLiveRefetchInterval(
      options,
      HEALTH_REFETCH_INTERVAL_MS,
      false,
    ),
    retry: false,
  });
}

/** Range Prometheus query for the Overview charts. */
export function satpPromRangeQuery(
  options: SatpQueryOptions,
  query: string,
  rangeParams?: { startMs: number; endMs: number; stepSeconds: number },
) {
  const keys = satpQueryKeys(options.gatewayUrl);
  return queryOptions({
    queryKey: [...keys.promRange(query), rangeParams] as const,
    queryFn: async (): Promise<PromRangeSeries[]> => {
      if (!options.prometheusUrl || !rangeParams) {
        return [];
      }
      return fetchPromRange(
        options.prometheusUrl,
        query,
        rangeParams.startMs,
        rangeParams.endMs,
        rangeParams.stepSeconds,
      );
    },
    enabled: Boolean(options.prometheusUrl && rangeParams),
    refetchInterval: satpLiveRefetchInterval(
      options,
      HEALTH_REFETCH_INTERVAL_MS,
      false,
    ),
    retry: false,
  });
}
