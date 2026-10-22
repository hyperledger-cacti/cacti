import React from "react";
import { useOutletContext } from "react-router-dom";
import Box from "@mui/material/Box";

import { SatpGatewayProvider } from "../context/GatewayContext";
import SatpGatewayToolbar from "./SatpGatewayToolbar";
import type { SatpAppOptions } from "../types";

export interface SatpPageLayoutProps {
  children: React.ReactNode;
}

/**
 * App-level layout wrapper that provides dynamic SATP gateway context
 * and renders the persistent gateway switching toolbar at the top of each page.
 */
export default function SatpPageLayout({ children }: SatpPageLayoutProps) {
  const options = useOutletContext<SatpAppOptions | undefined>();

  return (
    <SatpGatewayProvider
      initialGatewayUrl={options?.gatewayUrl}
      initialCounterpartyGatewayUrl={options?.counterpartyGatewayUrl}
    >
      <Box sx={{ mb: 2 }}>
        <SatpGatewayToolbar />
      </Box>
      {children}
    </SatpGatewayProvider>
  );
}
