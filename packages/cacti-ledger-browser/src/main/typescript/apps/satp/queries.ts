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
import type { SatpAppOptions } from "./types";

/** How far back the audit window queries reach by default. */
export const AUDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** How often live views refresh while the gateway is healthy. */
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

export function satpQueryKeys(gatewayUrl: string) {
  const base = ["satp", gatewayUrl] as const;
  return {
    all: base,
    health: [...base, "health"] as const,
    supportedLedgers: [...base, "supported-ledgers"] as const,
    sessions: [...base, "sessions"] as const,
    session: (sessionId: string) => [...base, "session", sessionId] as const,
    promInstant: (query: string) => [...base, "prom-instant", query] as const,
    promRange: (query: string) => [...base, "prom-range", query] as const,
  };
}

export function satpHealthQuery(options: SatpAppOptions) {
  const keys = satpQueryKeys(options.gatewayUrl);
  return queryOptions({
    queryKey: keys.health,
    queryFn: async () => {
      const api = createSatpAdminApi(options);
      return fetchGatewayHealth(api);
    },
    refetchInterval: satpRefetchIntervalWithBackoff(HEALTH_REFETCH_INTERVAL_MS),
    retry: 1,
  });
}

export function satpSupportedLedgersQuery(options: SatpAppOptions) {
  const keys = satpQueryKeys(options.gatewayUrl);
  return queryOptions({
    queryKey: keys.supportedLedgers,
    queryFn: async () => {
      const api = createSatpAdminApi(options);
      return fetchSupportedLedgers(api);
    },
    retry: 1,
  });
}

/**
 * Joins `get-sessions-ids`, per-session `status` and the audit window into
 * the session list rows.
 */
export function satpSessionsQuery(options: SatpAppOptions) {
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
    refetchInterval: satpRefetchIntervalWithBackoff(
      SESSIONS_REFETCH_INTERVAL_MS,
    ),
    retry: 1,
  });
}

/** Audit timeline of one session plus its current status. */
export function satpSessionDetailQuery(
  options: SatpAppOptions,
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
    refetchInterval: satpRefetchIntervalWithBackoff(
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

export function satpAnalyticsQuery(options: SatpAppOptions) {
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
    refetchInterval: satpRefetchIntervalWithBackoff(
      SESSIONS_REFETCH_INTERVAL_MS,
    ),
    retry: 1,
  });
}

/** Flattened cross-session message log (newest first). */
export function satpMessageLogQuery(options: SatpAppOptions) {
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
    refetchInterval: satpRefetchIntervalWithBackoff(
      SESSIONS_REFETCH_INTERVAL_MS,
    ),
    retry: 1,
  });
}

/** Instant Prometheus query (single gauge/counter value). */
export function satpPromInstantQuery(options: SatpAppOptions, query: string) {
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
    refetchInterval: satpRefetchIntervalWithBackoff(HEALTH_REFETCH_INTERVAL_MS),
    retry: false,
  });
}

/** Range Prometheus query for the Overview charts. */
export function satpPromRangeQuery(
  options: SatpAppOptions,
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
    refetchInterval: satpRefetchIntervalWithBackoff(HEALTH_REFETCH_INTERVAL_MS),
    retry: false,
  });
}
