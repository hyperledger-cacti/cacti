import { useOutletContext } from "react-router-dom";
import { SatpAppOptions } from "./types";

export const DEFAULT_SATP_OPTIONS: SatpAppOptions = {
  gatewayApiUrl: "http://localhost:3000",
  refreshIntervalMs: 5000,
};

export function useSatpAppConfig(): SatpAppOptions {
  const context = useOutletContext<SatpAppOptions | undefined>();
  if (!context || !context.gatewayApiUrl) {
    return DEFAULT_SATP_OPTIONS;
  }
  return {
    gatewayApiUrl: context.gatewayApiUrl.replace(/\/+$/, ""),
    refreshIntervalMs: context.refreshIntervalMs ?? 5000,
  };
}
