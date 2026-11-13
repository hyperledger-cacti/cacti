import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";

import {
  SatpGatewayProvider,
  useSatpGatewayContext,
} from "../context/GatewayContext";
import { SatpPollingProvider } from "../context/PollingContext";
import { gatewayStorageKeys } from "../gateways";
import { fallbackSatpGatewayUrl } from "../hooks";
import SatpGatewayToolbar, { ManageGatewaysDialog } from "./SatpGatewayToolbar";
import SatpGatewayOnboarding from "./SatpGatewayOnboarding";
import type { SatpAppOptions } from "../types";

export interface SatpPageLayoutProps {
  /** ID of the app instance (scopes the viewer's stored choices). */
  appInstanceId: string;
  /** Instance options from the config store. */
  options: SatpAppOptions;
}

/** Routed page, or the onboarding card while no gateway is known. */
function SatpPageContent({ options }: { options: SatpAppOptions }) {
  const { gateways, activeGatewayUrl } = useSatpGatewayContext();
  const { pathname } = useLocation();
  // Owned here (not by the onboarding card) so the dialog stays open after
  // the first gateway is added and the user can add the counterparty too.
  const [managerOpen, setManagerOpen] = useState(false);
  const noGateway = gateways.length === 0 && !activeGatewayUrl;
  const manager = (
    <ManageGatewaysDialog
      open={managerOpen}
      onClose={() => setManagerOpen(false)}
      options={options}
    />
  );
  // The guide stays reachable before any gateway exists.
  if (noGateway && !/\/guide\/?$/.test(pathname)) {
    return (
      <>
        {/* Same position as below, so the open dialog is kept on the switch. */}
        {manager}
        <SatpGatewayOnboarding onAddGateway={() => setManagerOpen(true)} />
      </>
    );
  }
  return (
    <>
      {manager}
      {!noGateway && (
        <Box sx={{ mb: 2 }}>
          <SatpGatewayToolbar options={options} />
        </Box>
      )}
      <Outlet context={options} />
    </>
  );
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
        <SatpPageContent options={options} />
      </SatpPollingProvider>
    </SatpGatewayProvider>
  );
}
