import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { AppDefinition } from "../../common/types/app";
import { GuiAppConfig } from "../../common/supabase-types";
import { AppCategory } from "../../common/app-category";
import { SatpAppOptions } from "./types";
import Dashboard from "./pages/Dashboard";
import SessionDetails from "./pages/SessionDetails";
import GatewayNetwork from "./pages/GatewayNetwork";

const satpInspectorAppDefinition: AppDefinition = {
  appName: "SATP Inspector",
  category: AppCategory.CrossChain,
  appDocumentationURL:
    "https://hyperledger-cacti.github.io/cacti/cactus/plugins/cactus-plugin-satp-hermes/",
  appSetupGuideURL:
    "https://hyperledger-cacti.github.io/cacti/cactus/plugins/cactus-plugin-satp-hermes/#setup",
  defaultInstanceName: "SATP Gateway Inspector",
  defaultDescription:
    "Cross-chain transfer inspector and telemetry dashboard for Secure Asset Transfer Protocol (SATP) gateways.",
  defaultPath: "/satp",
  defaultOptions: {
    gatewayApiUrl: "http://localhost:3000",
    refreshIntervalMs: 5000,
  },

  createAppInstance(app: GuiAppConfig) {
    const options = (app.options || satpInspectorAppDefinition.defaultOptions) as unknown as SatpAppOptions;

    return {
      id: app.id,
      appName: satpInspectorAppDefinition.appName,
      instanceName: app.instance_name || "SATP Gateway Inspector",
      description: app.description || satpInspectorAppDefinition.defaultDescription,
      path: app.path,
      options,
      menuEntries: [
        {
          title: "Transfers",
          url: "/",
        },
        {
          title: "Gateway & Network",
          url: "/network",
        },
      ],
      routes: [
        {
          element: <Dashboard />,
        },
        {
          path: "session/:sessionId",
          element: <SessionDetails />,
        },
        {
          path: "session",
          element: <SessionDetails />,
        },
        {
          path: "network",
          element: <GatewayNetwork />,
        },
      ],
      useAppStatus: () => {
        return {
          isPending: false,
          isInitialized: true,
          status: {
            severity: "success",
            message: `Connected to ${options.gatewayApiUrl || "SATP Gateway"}`,
          },
        };
      },
      StatusComponent: (
        <Box p={2}>
          <Typography variant="h6" fontWeight="bold">
            SATP Inspector Status
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>
            Gateway API URL: <b>{options.gatewayApiUrl}</b>
          </Typography>
          <Chip label="Telemetry Active" color="success" size="small" />
        </Box>
      ),
      appSetupGuideURL: satpInspectorAppDefinition.appSetupGuideURL,
      appDocumentationURL: satpInspectorAppDefinition.appDocumentationURL,
    };
  },
};

export default satpInspectorAppDefinition;
