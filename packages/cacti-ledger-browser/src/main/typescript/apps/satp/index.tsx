import { useQuery } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import SessionsPage from "./pages/SessionsPage";
import SessionDetailPage from "./pages/SessionDetailPage";
import GatewaysPage from "./pages/GatewaysPage";
import MessagesPage from "./pages/MessagesPage";
import OverviewPage from "./pages/OverviewPage";
import GuidePage from "./pages/GuidePage";
import SatpPageLayout from "./components/SatpPageLayout";
import {
  SATP_APP_SETUP_GUIDE_URL,
  fallbackSatpGatewayUrl,
  useSatpAppStatus,
  useSatpOptions,
} from "./hooks";
import { satpHealthQuery } from "./queries";
import { validateGatewayOptions } from "./gateways";
import { AppDefinition } from "../../common/types/app";
import { GuiAppConfig } from "../../common/supabase-types";
import { AppCategory } from "../../common/app-category";
import { isHttpUrl } from "../../common/utils";
import SetupGuideLink from "../../components/ui/SetupGuideLink";
import type { SatpAppOptions } from "./types";

/**
 * Status component shown in the app status pop up - reports gateway
 * healthcheck reachability.
 */
function SatpGatewayStatus({
  instanceOptions,
}: {
  instanceOptions?: SatpAppOptions;
}) {
  const routeOptions = useSatpOptions();
  const options = instanceOptions
    ? {
        ...instanceOptions,
        gatewayUrl: instanceOptions.gatewayUrl || fallbackSatpGatewayUrl(),
      }
    : routeOptions;
  const { isPending, data } = useQuery(satpHealthQuery(options));

  if (!options.gatewayUrl) {
    return (
      <Box>
        <Typography variant="h5">SATP Gateway Status</Typography>
        <Stack spacing={1} alignItems="flex-start">
          <Typography>
            No gateway added yet. Open the app and use Manage gateways to add
            your SATP Hermes gateway.
          </Typography>
          <SetupGuideLink url={SATP_APP_SETUP_GUIDE_URL} />
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5">SATP Gateway Status</Typography>
      {isPending ? (
        <Stack direction="row" spacing={1} alignItems="center">
          <CircularProgress size={16} />
          <Typography>Checking healthcheck endpoint...</Typography>
        </Stack>
      ) : (
        <Stack spacing={1} alignItems="flex-start">
          <Typography>
            {data !== undefined
              ? `Gateway is reachable at ${options.gatewayUrl}.`
              : `Gateway is NOT reachable at ${options.gatewayUrl}.`}
          </Typography>
          {data === undefined && (
            <SetupGuideLink url={SATP_APP_SETUP_GUIDE_URL} />
          )}
        </Stack>
      )}
    </Box>
  );
}

const satpAppDefinition: AppDefinition = {
  appName: "SATP Inspector",
  appDocumentationURL:
    "https://hyperledger-cacti.github.io/cacti/latest/cactus/ledger-browser/plugin-apps/satp-inspector/",
  appSetupGuideURL: SATP_APP_SETUP_GUIDE_URL,
  category: AppCategory.LedgerBrowser,
  defaultInstanceName: "My SATP Inspector",
  defaultDescription:
    "Inspect SATP cross-chain transfer sessions: status, audit timeline, gateways, ledgers and proofs. Add your SATP Hermes gateways (OAPI server, default port 4010) after installing.",
  defaultPath: "/satp",
  // No gateway by default: the user adds gateways (here or in the app's
  // Manage gateways dialog), the inspector never probes one on its own.
  defaultOptions: {
    gatewayUrl: "",
    counterpartyGatewayUrl: "",
    gateways: [],
    prometheusUrl: "http://localhost:9090",
  },

  createAppInstance(app: GuiAppConfig) {
    const satpOptions = app.options as unknown as SatpAppOptions;

    if (
      !satpOptions ||
      typeof satpOptions !== "object" ||
      Array.isArray(satpOptions) ||
      (satpOptions.gatewayUrl !== undefined &&
        typeof satpOptions.gatewayUrl !== "string")
    ) {
      throw new Error(
        `Invalid SATP inspector app specific options in the database: ${JSON.stringify(satpOptions)}`,
      );
    }

    // The gateway, counterparty gateway, and Prometheus URLs are user-provided
    // (stored in the `gui_app_config` table) and the browser will send requests
    // there, so only accept well-formed absolute http(s) URLs. An empty
    // gatewayUrl is allowed: the instance then waits for the user to add one.
    if (satpOptions.gatewayUrl && !isHttpUrl(satpOptions.gatewayUrl)) {
      throw new Error(
        `Invalid SATP inspector gatewayUrl "${satpOptions.gatewayUrl}": must be an absolute http(s) URL`,
      );
    }
    if (
      satpOptions.counterpartyGatewayUrl !== undefined &&
      satpOptions.counterpartyGatewayUrl !== "" &&
      !isHttpUrl(satpOptions.counterpartyGatewayUrl)
    ) {
      throw new Error(
        `Invalid SATP inspector counterpartyGatewayUrl "${satpOptions.counterpartyGatewayUrl}": must be an absolute http(s) URL or empty`,
      );
    }
    if (
      satpOptions.prometheusUrl !== undefined &&
      satpOptions.prometheusUrl !== "" &&
      !isHttpUrl(satpOptions.prometheusUrl)
    ) {
      throw new Error(
        `Invalid SATP inspector prometheusUrl "${satpOptions.prometheusUrl}": must be an absolute http(s) URL or empty`,
      );
    }
    const gatewaysError = validateGatewayOptions(satpOptions.gateways);
    if (gatewaysError) {
      throw new Error(`Invalid SATP inspector option: ${gatewaysError}`);
    }

    return {
      id: app.id,
      appName: satpAppDefinition.appName,
      instanceName: app.instance_name,
      description: app.description,
      path: app.path,
      options: satpOptions,
      // Surfaces the setup guide from the crash-guard fallbacks too (the
      // per-app route boundary and the home-page app card boundary).
      appSetupGuideURL: satpAppDefinition.appSetupGuideURL,
      menuEntries: [
        {
          title: "Sessions",
          url: "/",
        },
        {
          title: "Gateways",
          url: "/gateways",
        },
        {
          title: "Messages",
          url: "/messages",
        },
        {
          title: "Overview",
          url: "/overview",
        },
        {
          title: "Guide",
          url: "/guide",
        },
      ],
      // One layout route per instance: it mounts the gateway list and the
      // polling settings once for all pages of the instance.
      routes: [
        {
          element: (
            <SatpPageLayout appInstanceId={app.id} options={satpOptions} />
          ),
          children: [
            { index: true, element: <SessionsPage /> },
            { path: "session/:sessionId", element: <SessionDetailPage /> },
            { path: "gateways", element: <GatewaysPage /> },
            { path: "messages", element: <MessagesPage /> },
            { path: "overview", element: <OverviewPage /> },
            { path: "guide", element: <GuidePage /> },
          ],
        },
      ],
      // The home page renders these outside the app routes, so they get the
      // instance options directly (not the runtime-config fallback).
      useAppStatus: () => useSatpAppStatus(satpOptions),
      StatusComponent: <SatpGatewayStatus instanceOptions={satpOptions} />,
    };
  },
};

export default satpAppDefinition;
