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
 * One extra gateway entry of the persisted `gateways` app option.
 * Lets one app instance know every gateway taking part in a transfer, so
 * the inspector can look up the same session on each of them.
 */
export interface SatpGatewayOption {
  /** Display label; defaults to the URL. */
  name?: string;
  /** Base URL of the gateway OAPI (REST) server. */
  url: string;
  description?: string;
}

/**
 * Where a gateway endpoint of the gateway list comes from:
 * - `config`: the app instance options in the config store (shared by every
 *   viewer, edited via "Configure app" or "Save to app config"),
 * - `user`: added in this browser only (localStorage, per app instance).
 */
export type SatpGatewaySource = "config" | "user";

/** A resolved gateway endpoint of the gateway list (runtime view model). */
export interface SatpGatewayEndpoint {
  id: string;
  name: string;
  url: string;
  description?: string;
  source: SatpGatewaySource;
}

/**
 * Options stored per instance of this app in the `gui_app_config` table
 * (editable through the "Add Application" wizard).
 */
export interface SatpAppOptions {
  /**
   * Base URL of the primary SATP Hermes gateway OAPI (REST) server, e.g.
   * `http://localhost:4010` (`docker-compose-satp.yml` maps it to host
   * port 3012). This is the gateway shown when no other one is selected.
   */
  gatewayUrl: string;

  /**
   * Optional base URL of the counterparty SATP gateway of a transfer, for
   * inspecting both sides of a real cross-chain flow. Kept for backwards
   * compatibility, `gateways` covers any number of gateways.
   */
  counterpartyGatewayUrl?: string;

  /**
   * Optional additional gateways (any number). The same session is looked
   * up on every configured gateway.
   */
  gateways?: SatpGatewayOption[];

  /**
   * Optional base URL of a Prometheus server scraping the gateway metrics
   * (e.g. `http://localhost:9090`). Used by the Overview page. Aggregate
   * panels are hidden when missing or unreachable.
   */
  prometheusUrl?: string;
}

/** Viewer-selected live polling settings (never persisted to the store). */
export interface SatpPollingSettings {
  /** When true, live views stop polling (manual refresh still works). */
  paused: boolean;
  /** Base polling interval while the gateway is healthy. */
  intervalMs: number;
}

/**
 * Options the query factories consume: the instance options with the
 * currently selected gateway as `gatewayUrl`, plus runtime-only settings.
 */
export interface SatpQueryOptions extends SatpAppOptions {
  polling?: SatpPollingSettings;
}

/** `GET /proofs` - signature-verified session proofs. */
export interface SatpSessionProofsResponse {
  proofs?: SatpSessionProof[];
}

/** One signature-verified claim recorded at a SATP protocol step. */
export interface SatpSessionProof {
  sessionId: string;
  step: {
    tag: string;
    description: string;
    role?: string;
    sequence?: number;
    messageType?: string;
  };
  /** JSON-serialized assertion claim. */
  claim: string;
  /** Signature carried by the claim. */
  signedClaim: string;
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
