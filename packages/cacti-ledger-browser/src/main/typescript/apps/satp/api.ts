/**
 * Hand-written minimal typed client for the SATP Hermes gateway admin OAPI
 * (endpoint subset used by this app) plus the Prometheus HTTP API helpers
 * used by the Overview page.
 *
 * The client mirrors the auto-generated `AdminApi` of the plugin package
 * (`generated/gateway-client/typescript-axios`) but lives entirely in this
 * app so that the ledger-browser stays standalone (zero workspace
 * dependencies) and the browser bundle stays free of Node-only plugin code.
 *
 * The gateway OAPI server allows cross-origin requests and needs no
 * authentication, so the browser can call it directly.
 */
import axios, { type AxiosRequestConfig, type AxiosResponse } from "axios";

import {
  type SatpAppOptions,
  type SatpAuditEntry,
  type SatpAuditResponse,
  type SatpHealthcheckResponse,
  type SatpSessionStatusResponse,
  type SatpSupportedLedgersResponse,
} from "./types";

/**
 * Endpoint prefix of the SATP Hermes gateway OAPI (paths from the plugin's
 * OpenAPI spec in `packages/cactus-plugin-satp-hermes/src/main/yml/bol/`).
 */
const SATP_OAPI_PREFIX = "/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes";

/**
 * Minimal typed axios client for the admin endpoints of the SATP Hermes
 * gateway OAPI. Only GET endpoints; query parameters are per the OpenAPI
 * spec (note the capitalized `SessionID`).
 */
export class SatpGatewayAdminApi {
  private readonly basePath: string;

  constructor(options: { basePath?: string } = {}) {
    this.basePath = options.basePath ?? "";
  }

  private get<T>(
    path: string,
    config: AxiosRequestConfig = {},
  ): Promise<AxiosResponse<T>> {
    return axios.get<T>(`${this.basePath}${path}`, config);
  }

  /** Liveness of the gateway OAPI server. */
  getHealthCheck(
    config: AxiosRequestConfig = {},
  ): Promise<AxiosResponse<SatpHealthcheckResponse>> {
    return this.get(`${SATP_OAPI_PREFIX}/healthcheck`, config);
  }

  /** IDs of all SATP transfer sessions known to the gateway. */
  getSessionIds(
    config: AxiosRequestConfig = {},
  ): Promise<AxiosResponse<string[]>> {
    return this.get(`${SATP_OAPI_PREFIX}/get-sessions-ids`, config);
  }

  /** Current status of one SATP transfer session. */
  getStatus(
    sessionId: string,
    config: AxiosRequestConfig = {},
  ): Promise<AxiosResponse<SatpSessionStatusResponse>> {
    return this.get(`${SATP_OAPI_PREFIX}/status`, {
      ...config,
      params: { SessionID: sessionId, ...config.params },
    });
  }

  /** Ledger types supported by this gateway. */
  getSupportedLedgers(
    config: AxiosRequestConfig = {},
  ): Promise<AxiosResponse<SatpSupportedLedgersResponse>> {
    return this.get(`${SATP_OAPI_PREFIX}/supported-ledgers`, config);
  }

  /** Audit log entries of a time window (ISO 8601 bounds). */
  performAudit(
    startTimestamp: string,
    endTimestamp?: string,
    config: AxiosRequestConfig = {},
  ): Promise<AxiosResponse<SatpAuditResponse>> {
    return this.get(`${SATP_OAPI_PREFIX}/audit`, {
      ...config,
      // axios omits query params whose value is undefined.
      params: { startTimestamp, endTimestamp, ...config.params },
    });
  }
}

/**
 * Creates a gateway admin API client for the given instance options.
 * The endpoint paths in the OpenAPI spec already include the
 * `/api/v1/@hyperledger-cacti/cactus-plugin-satp-hermes` prefix, so the
 * base path is just the server origin.
 */
export function createSatpAdminApi(
  options: SatpAppOptions,
): SatpGatewayAdminApi {
  return new SatpGatewayAdminApi({ basePath: options.gatewayUrl });
}

export async function fetchSessionIds(
  api: SatpGatewayAdminApi,
): Promise<string[]> {
  const response = await api.getSessionIds();
  return response.data;
}

export async function fetchSessionStatus(
  api: SatpGatewayAdminApi,
  sessionId: string,
): Promise<SatpSessionStatusResponse> {
  const response = await api.getStatus(sessionId);
  return response.data;
}

export async function fetchAuditEntries(
  api: SatpGatewayAdminApi,
  startTimestampMs: number,
  endTimestampMs?: number,
): Promise<SatpAuditEntry[]> {
  const response = await api.performAudit(
    new Date(startTimestampMs).toISOString(),
    endTimestampMs ? new Date(endTimestampMs).toISOString() : undefined,
  );
  return response.data.auditEntries?.entries ?? [];
}

export async function fetchSupportedLedgers(
  api: SatpGatewayAdminApi,
): Promise<string[]> {
  const response = await api.getSupportedLedgers();
  return response.data.supportedLedgers;
}

export async function fetchGatewayHealth(
  api: SatpGatewayAdminApi,
): Promise<string> {
  const response = await api.getHealthCheck();
  return response.data.status ?? "UNKNOWN";
}

export interface PromSeriesPoint {
  /** Epoch milliseconds. */
  timestampMs: number;
  value: number;
}

export interface PromRangeSeries {
  /** Human readable series name (metric name + distinguishing labels). */
  name: string;
  points: PromSeriesPoint[];
}

interface PromQueryResponse {
  status: string;
  data?: {
    resultType: string;
    result: Array<{
      metric?: Record<string, string>;
      values?: Array<[number, string]>;
      value?: [number, string];
    }>;
  };
}

function formatPromSeriesName(
  metric: Record<string, string> | undefined,
  fallback: string,
): string {
  if (!metric) {
    return fallback;
  }
  const { __name__: name, ...labels } = metric;
  const labelPart = Object.entries(labels)
    .map(([key, value]) => `${key}=${value}`)
    .join(",");
  return labelPart ? `${name ?? fallback}{${labelPart}}` : name ?? fallback;
}

/**
 * Instant (vector) Prometheus query. Returns `null` when the query has no
 * result (e.g. counters that only exist after the first increment). Must
 * not return `undefined` - react-query rejects undefined query results.
 */
export async function fetchPromInstant(
  prometheusUrl: string,
  query: string,
): Promise<number | null> {
  const response = await axios.get<PromQueryResponse>(
    `${prometheusUrl}/api/v1/query`,
    { params: { query } },
  );
  const sample = response.data.data?.result?.[0];
  if (!sample?.value) {
    return null;
  }
  const parsed = Number(sample.value[1]);
  // Prometheus answers "NaN" for empty histogram divisions - treat as no data.
  return Number.isFinite(parsed) ? parsed : null;
}

/** Range query, returns one named series with timestamped numeric values. */
export async function fetchPromRange(
  prometheusUrl: string,
  query: string,
  startTimestampMs: number,
  endTimestampMs: number,
  stepSeconds: number,
): Promise<PromRangeSeries[]> {
  const response = await axios.get<PromQueryResponse>(
    `${prometheusUrl}/api/v1/query_range`,
    {
      params: {
        query,
        start: startTimestampMs / 1000,
        end: endTimestampMs / 1000,
        step: stepSeconds,
      },
    },
  );
  return (response.data.data?.result ?? []).map((series) => ({
    name: formatPromSeriesName(series.metric, query),
    points: (series.values ?? []).map(([seconds, value]) => ({
      timestampMs: seconds * 1000,
      value: Number(value),
    })),
  }));
}
