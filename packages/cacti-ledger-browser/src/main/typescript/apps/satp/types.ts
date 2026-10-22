/**
 * Hand-written, browser-safe types for the SATP Hermes gateway OAPI
 * responses used by this app. They mirror the small subset of the
 * auto-generated gateway client that the app actually consumes (see
 * `packages/cactus-plugin-satp-hermes/src/main/typescript/generated/
 * gateway-client/typescript-axios/`, itself generated from the plugin's
 * OpenAPI spec in `src/main/yml/bol/`).
 *
 * Keeping local copies avoids importing the plugin package entirely: that
 * would add a workspace dependency to the ledger-browser and risk pulling
 * Node-only plugin code into the browser bundle.
 */

/**
 * Descriptor for a configured SATP gateway endpoint.
 * Enables un-hardcoded multi-gateway connections and cross-gateway inspection.
 */
export interface SatpGatewayEndpoint {
  id: string;
  name: string;
  url: string;
  description?: string;
  isDefault?: boolean;
}

/**
 * Options stored per instance of this app in the `gui_app_config` table
 * (editable through the "Add Application" wizard).
 */
export interface SatpAppOptions {
  /**
   * Base URL of the primary/active SATP Hermes gateway OAPI (REST) server, e.g.
   * `http://localhost:4010` (`docker-compose-satp.yml` maps it to host
   * port 3012).
   */
  gatewayUrl: string;

  /**
   * Optional base URL of the counterparty SATP gateway (e.g. `http://localhost:4020`),
   * allowing end-to-end inspection of real cross-chain flows.
   */
  counterpartyGatewayUrl?: string;

  /**
   * Additional configured gateway endpoints for dynamic switching.
   */
  configuredGateways?: SatpGatewayEndpoint[];

  /**
   * Optional base URL of a Prometheus server scraping the gateway metrics
   * (e.g. `http://localhost:9090`). Used by the Overview page. Aggregate
   * panels are hidden when missing or unreachable.
   */
  prometheusUrl?: string;
}

/** `GET /healthcheck` - availability of the gateway OAPI server. */
export interface SatpHealthcheckResponse {
  /** `AVAILABLE` or `UNAVAILABLE` (absent when the server is unhealthy). */
  status?: string;
}

/** `GET /supported-ledgers` - ledger types handled by the gateway. */
export interface SatpSupportedLedgersResponse {
  supportedLedgers: string[];
}

/** `GET /status` - current status of one SATP transfer session. */
export interface SatpSessionStatusResponse {
  status: string;
  substatus: string;
  stage: string;
  step: string;
  /** ISO date-time string. */
  startTime: string;
  originNetwork?: SatpNetwork;
  destinationNetwork?: SatpNetwork;
}

/** Network descriptor embedded in status responses. */
export interface SatpNetwork {
  id?: string;
  dltProtocol?: unknown;
  dltSubnetworkID?: unknown;
}

/** `GET /audit` response - all log entries recorded in a time window. */
export interface SatpAuditResponse {
  auditEntries?: { entries?: SatpAuditEntry[] };
  /** ISO 8601 timestamps echoing the requested window. */
  startTimestamp?: string;
  endTimestamp?: string;
}

/** One persisted gateway audit/log record (entry of the audit response). */
export interface SatpAuditEntry {
  auditEntryId?: string;
  /** Epoch milliseconds. */
  timestamp: number;
  session: SatpLocalLog;
}

/**
 * Session log embedded in an audit entry (serialized `LocalLog` of the
 * gateway). `data` carries a JSON-serialized `SessionData` snapshot.
 */
export interface SatpLocalLog {
  sessionId: string;
  type: string;
  key: string;
  operation: string;
  /** Epoch milliseconds encoded as string. */
  timestamp?: string;
  data: string;
  sequenceNumber: number;
}
