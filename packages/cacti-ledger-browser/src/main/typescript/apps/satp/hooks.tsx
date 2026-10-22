/**
 * Hooks for the SATP inspector app.
 *
 * App pages read the instance options from the router outlet context or the
 * dynamic `SatpGatewayContext`. The app status card on the home page lives
 * *outside* the app routes, so there `useOutletContext` returns nothing - in
 * that case the gateway URL falls back to the resolved configuration (runtime
 * `config.js` override over the `VITE_SATP_GATEWAY_URL` build-time env, see
 * `common/runtime-config.ts`) and finally to the local default.
 */
import { useQuery } from "@tanstack/react-query";
import { useOutletContext } from "react-router-dom";

import { GetStatusResponse } from "../../common/types/app";
import { getLedgerBrowserConfig } from "../../common/runtime-config";
import { satpHealthQuery } from "./queries";
import type { SatpAppOptions } from "./types";
import { useSatpGatewayContextSafe } from "./context/GatewayContext";

export const DEFAULT_SATP_GATEWAY_URL = "http://localhost:4010";

/**
 * Full URL of the app setup guide (also set as
 * `satpAppDefinition.appSetupGuideURL`). Surfaced next to connection-error
 * messages so misconfigured instances don't dead-end.
 * Rendering must stay guarded by an `isValidUrl` check (see
 * `SetupGuideLink`) because the value can also come from app definitions.
 */
export const SATP_APP_SETUP_GUIDE_URL =
  "https://hyperledger-cacti.github.io/cacti/cactus/ledger-browser/plugin-apps/satp-inspector/#setup";

export function useSatpOptions(): SatpAppOptions {
  const context = useOutletContext<SatpAppOptions | undefined>();
  const gatewayCtx = useSatpGatewayContextSafe();
  const fallbacks = getLedgerBrowserConfig();
  return {
    gatewayUrl:
      gatewayCtx?.activeGatewayUrl ||
      context?.gatewayUrl ||
      fallbacks.satpGatewayUrl ||
      DEFAULT_SATP_GATEWAY_URL,
    counterpartyGatewayUrl:
      gatewayCtx?.counterpartyGatewayUrl || context?.counterpartyGatewayUrl,
    configuredGateways: gatewayCtx?.gateways,
    prometheusUrl: context?.prometheusUrl || fallbacks.satpPrometheusUrl,
  };
}

/** Healthcheck-backed app status for the home page app cards. */
export function useSatpAppStatus(): GetStatusResponse {
  const options = useSatpOptions();
  const { isPending, data } = useQuery(satpHealthQuery(options));

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
