import React from "react";
import {
  useRoutes,
  BrowserRouter,
  RouteObject,
  Outlet,
} from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import CircularProgress from "@mui/material/CircularProgress";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";

import { themeOptions } from "./theme";
import ContentLayout from "./components/Layout/ContentLayout";
import HeaderBar from "./components/Layout/HeaderBar";
import HomePage from "./pages/home/HomePage";
import { AppInstance } from "./common/types/app";
import { patchAppRoutePath } from "./common/utils";
import { NotificationProvider } from "./common/context/NotificationContext";
import { guiAppConfig } from "./common/queries";
import createApplications from "./common/createApplications";
import { GuiAppConfig } from "./common/supabase-types";

const isoNow = new Date().toISOString();

const STANDALONE_DEFAULT_APPS: GuiAppConfig[] = [
  {
    id: "satp-inspector-default",
    app_id: "satpInspector",
    instance_name: "SATP Gateway Inspector",
    description: "Inspect cross-chain asset transfers, protocols, and audit logs",
    path: "/satp",
    options: {
      gatewayApiUrl: "http://localhost:3000",
      refreshIntervalMs: 5000,
    },
    created_at: isoNow,
    updated_at: isoNow,
  },
  {
    id: "tutorial-app-default",
    app_id: "tutorialApplication",
    instance_name: "Tutorial App",
    description: "Sample tutorial application",
    path: "/tutorial",
    options: {
      name: "Cacti",
    },
    created_at: isoNow,
    updated_at: isoNow,
  },
];

function getHeaderBarRoutes(appConfig: AppInstance[]) {
  const headerRoutesConfig = appConfig.map((app) => {
    return {
      key: app.path,
      path: `${app.path}/*`,
      element: (
        <HeaderBar
          path={app.path}
          menuEntries={app.menuEntries}
          appDocumentationURL={app.appDocumentationURL}
        />
      ),
    };
  });
  headerRoutesConfig.push({
    key: "home",
    path: `*`,
    element: (
      <HeaderBar appDocumentationURL="https://github.com/hyperledger/cacti" />
    ),
  });
  return useRoutes(headerRoutesConfig);
}

function getContentRoutes(appConfig: AppInstance[]) {
  const appRoutes: RouteObject[] = appConfig.map((app) => {
    return {
      key: app.path,
      path: app.path,
      element: <Outlet context={app.options} />,
      children: app.routes.map((route) => {
        return {
          key: route.path,
          path: patchAppRoutePath(app.path, route.path),
          element: route.element,
          children: route.children,
        };
      }),
    };
  });

  appRoutes.push({
    index: true,
    element: <HomePage appConfig={appConfig} />,
  });

  return useRoutes([
    {
      path: "/",
      element: <ContentLayout />,
      children: appRoutes,
    },
  ]);
}

function App() {
  const { isError, isPending, data } = useQuery(guiAppConfig());

  // Use database apps if available; otherwise fallback to standalone apps seamlessly
  const hasDbApps = Boolean(data && Array.isArray(data) && data.length > 0);
  const activeApps = hasDbApps ? (data as GuiAppConfig[]) : STANDALONE_DEFAULT_APPS;
  const appConfig = createApplications(activeApps);

  const headerRoutes = getHeaderBarRoutes(appConfig);
  const contentRoutes = getContentRoutes(appConfig);

  return (
    <div>
      {isPending && !isError && !hasDbApps && (
        <CircularProgress
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            zIndex: 9999,
          }}
        />
      )}
      {headerRoutes}
      {contentRoutes}
    </div>
  );
}

const theme = createTheme(themeOptions);
const queryClient = new QueryClient();

export default function CactiLedgerBrowserApp() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <NotificationProvider>
            <CssBaseline />
            <App />
          </NotificationProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
