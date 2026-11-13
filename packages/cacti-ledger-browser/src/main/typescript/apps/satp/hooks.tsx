/**
 * Hooks for the SATP inspector app.
 *
 * App pages read the instance options from the router outlet context and
 * the selected gateway from `SatpGatewayContext` (one per app instance,
 * mounted by `SatpAppLayout`). Code outside the app routes (the home-page
 * app card) passes the instance options in explicitly. When nothing names
 * a gateway the URL falls back to the resolved configuration (runtime
 * `config.js` override over the `VITE_SATP_GATEWAY_URL` build-time env, see
 * `common/runtime-config.ts`) and finally to the local default.
 */
import { useQuery } from "@tanstack/react-query";
import { useOutletContext } from "react-router-dom";

import { GetStatusResponse } from "../../common/types/app";
import { getLedgerBrowserConfig } from "../../common/runtime-config";
import { satpHealthQuery } from "./queries";
import type { SatpAppOptions, SatpQueryOptions } from "./types";
import { useSatpGatewayContextSafe } from "./context/GatewayContext";
import { useSatpPolling } from "./context/PollingContext";

/**
 * Suggested gateway URL (the Hermes OAPI default port). Only ever shown as a
 * placeholder/example: the inspector never connects to it on its own.
 */
export const DEFAULT_SATP_GATEWAY_URL = "http://localhost:4010";

/**
 * Full URL of the app setup guide (also set as
 * `satpAppDefinition.appSetupGuideURL`). Surfaced next to connection-error
 * messages so misconfigured instances don't dead-end.
 * Rendering must stay guarded by an `isValidUrl` check (see
 * `SetupGuideLink`) because the value can also come from app definitions.
 */
export const SATP_APP_SETUP_GUIDE_URL =
  "https://hyperledger-cacti.github.io/cacti/latest/cactus/ledger-browser/plugin-apps/satp-inspector/#setup";

/**
 * Gateway URL used when the instance names none: only an operator-provided
 * runtime/env value. Empty when nothing is configured - the user then adds
 * a gateway manually and no request goes out until they do.
 */
export function fallbackSatpGatewayUrl(): string {
  return getLedgerBrowserConfig().satpGatewayUrl || "";
}

/**
 * Query options of the current view: instance options, with `gatewayUrl`
 * set to the gateway selected in the gateway context (the instance's own
 * `gatewayUrl` when nothing else is selected) and the live polling settings.
 */
export function useSatpOptions(): SatpQueryOptions {
  const context = useOutletContext<SatpAppOptions | undefined>();
  const gatewayCtx = useSatpGatewayContextSafe();
  const polling = useSatpPolling();
  const fallbacks = getLedgerBrowserConfig();

  const counterpartyGatewayUrl = gatewayCtx
    ? gatewayCtx.counterpartyGatewayUrl
    : context?.counterpartyGatewayUrl || undefined;

  return {
    ...context,
    gatewayUrl:
      gatewayCtx?.activeGatewayUrl ||
      context?.gatewayUrl ||
      fallbackSatpGatewayUrl(),
    ...(counterpartyGatewayUrl ? { counterpartyGatewayUrl } : {}),
    prometheusUrl: context?.prometheusUrl || fallbacks.satpPrometheusUrl,
    ...(polling
      ? { polling: { paused: polling.paused, intervalMs: polling.intervalMs } }
      : {}),
  };
}

/**
 * Healthcheck-backed app status for the home page app cards. The card is
 * rendered outside the app routes, so the instance options are passed in.
 */
export function useSatpAppStatus(
  instanceOptions?: SatpAppOptions,
): GetStatusResponse {
  const routeOptions = useSatpOptions();
  const options: SatpQueryOptions = instanceOptions
    ? {
        ...instanceOptions,
        gatewayUrl: instanceOptions.gatewayUrl || fallbackSatpGatewayUrl(),
      }
    : routeOptions;
  const { isPending, data } = useQuery(satpHealthQuery(options));

  if (!options.gatewayUrl) {
    return {
      isPending: false,
      isInitialized: false,
      status: {
        severity: "info",
        message: "No SATP gateway added yet. Open the app and add one.",
        setupGuideURL: SATP_APP_SETUP_GUIDE_URL,
      },
    };
  }

  // Any successful healthcheck response means the gateway is reachable
  // (the gateway replies with { status: "AVAILABLE" }).
  const isReachable = data !== undefined;
  return {
    isPending,
    isInitialized: isReachable,
    status: {
      severity: isPending ? "info" : isReachable ? "success" : "error",
      message: isPending
        ? "Checking SATP gateway healthcheck..."
        : isReachable
          ? `SATP gateway is reachable at ${options.gatewayUrl}`
          : `SATP gateway is not reachable at ${options.gatewayUrl}`,
      // Connection errors link to the setup guide; the app card
      // renders it via `SetupGuideLink`, which no-ops on invalid URLs.
      setupGuideURL: isReachable ? undefined : SATP_APP_SETUP_GUIDE_URL,
    },
  };
}
