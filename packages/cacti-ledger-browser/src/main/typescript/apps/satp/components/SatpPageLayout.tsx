import { Outlet } from "react-router-dom";
import Box from "@mui/material/Box";

import { SatpGatewayProvider } from "../context/GatewayContext";
import { SatpPollingProvider } from "../context/PollingContext";
import { gatewayStorageKeys } from "../gateways";
import { fallbackSatpGatewayUrl } from "../hooks";
import SatpGatewayToolbar from "./SatpGatewayToolbar";
import type { SatpAppOptions } from "../types";

export interface SatpPageLayoutProps {
  /** ID of the app instance (scopes the viewer's stored choices). */
  appInstanceId: string;
  /** Instance options from the config store. */
  options: SatpAppOptions;
}

/**
 * Layout route of one SATP inspector instance: mounts the instance's gateway
 * list and polling settings once (shared by every page of the instance, so
 * switching pages keeps the selection) and renders the gateway toolbar above
 * the routed page. Pages read the instance options from the outlet context.
 */
export default function SatpPageLayout({
  appInstanceId,
  options,
}: SatpPageLayoutProps) {
  return (
    <SatpGatewayProvider
      appInstanceId={appInstanceId}
      options={options}
      fallbackGatewayUrl={fallbackSatpGatewayUrl()}
    >
      <SatpPollingProvider
        storageKey={gatewayStorageKeys(appInstanceId).polling}
      >
        <Box sx={{ mb: 2 }}>
          <SatpGatewayToolbar options={options} />
        </Box>
        <Outlet context={options} />
      </SatpPollingProvider>
    </SatpGatewayProvider>
  );
}
