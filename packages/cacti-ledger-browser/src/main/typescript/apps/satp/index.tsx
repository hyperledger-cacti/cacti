import { useQuery } from "@tanstack/react-query";
import { Outlet } from "react-router-dom";
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
  DEFAULT_SATP_GATEWAY_URL,
  SATP_APP_SETUP_GUIDE_URL,
  useSatpAppStatus,
  useSatpOptions,
} from "./hooks";
import { satpHealthQuery } from "./queries";
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
function SatpGatewayStatus() {
  const options = useSatpOptions();
  const { isPending, data } = useQuery(satpHealthQuery(options));

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
    "https://hyperledger-cacti.github.io/cacti/cactus/ledger-browser/plugin-apps/satp-inspector/",
  appSetupGuideURL: SATP_APP_SETUP_GUIDE_URL,
  category: AppCategory.LedgerBrowser,
  defaultInstanceName: "My SATP Inspector",
  defaultDescription:
    "Inspect SATP cross-chain transfer sessions: status, audit timeline, gateways, ledgers and proofs. Requires a reachable SATP Hermes gateway OAPI server (default port 4010).",
  defaultPath: "/satp",
  defaultOptions: {
    gatewayUrl: DEFAULT_SATP_GATEWAY_URL,
    counterpartyGatewayUrl: "",
    prometheusUrl: "http://localhost:9090",
  },

  createAppInstance(app: GuiAppConfig) {
    const satpOptions = app.options as unknown as SatpAppOptions;

    if (!satpOptions || !satpOptions.gatewayUrl) {
      throw new Error(
        `Invalid SATP inspector app specific options in the database: ${JSON.stringify(satpOptions)}`,
      );
    }

    // The gateway, counterparty gateway, and Prometheus URLs are user-provided
    // (stored in the `gui_app_config` table) and the browser will send requests
    // there, so only accept well-formed absolute http(s) URLs.
    if (!isHttpUrl(satpOptions.gatewayUrl)) {
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
      routes: [
        {
          element: (
            <SatpPageLayout>
              <SessionsPage />
            </SatpPageLayout>
          ),
        },
        {
          path: "session",
          element: <Outlet context={satpOptions} />,
          children: [
            {
              path: ":sessionId",
              element: (
                <SatpPageLayout>
                  <SessionDetailPage />
                </SatpPageLayout>
              ),
            },
          ],
        },
        {
          path: "gateways",
          element: (
            <SatpPageLayout>
              <GatewaysPage />
            </SatpPageLayout>
          ),
        },
        {
          path: "messages",
          element: (
            <SatpPageLayout>
              <MessagesPage />
            </SatpPageLayout>
          ),
        },
        {
          path: "overview",
          element: (
            <SatpPageLayout>
              <OverviewPage />
            </SatpPageLayout>
          ),
        },
        {
          path: "guide",
          element: (
            <SatpPageLayout>
              <GuidePage />
            </SatpPageLayout>
          ),
        },
      ],
      useAppStatus: () => useSatpAppStatus(),
      StatusComponent: <SatpGatewayStatus />,
    };
  },
};

export default satpAppDefinition;
