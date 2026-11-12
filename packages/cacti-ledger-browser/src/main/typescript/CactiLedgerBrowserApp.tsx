import { useState } from "react";
import {
  useRoutes,
  BrowserRouter,
  RouteObject,
  Outlet,
} from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { themeOptions } from "./theme";
import ContentLayout from "./components/Layout/ContentLayout";
import HeaderBar from "./components/Layout/HeaderBar";
import Sidebar from "./components/Layout/Sidebar";
import HomePage from "./pages/home/HomePage";
import { AppInstance } from "./common/types/app";
import { patchAppRoutePath } from "./common/utils";
import { NotificationProvider } from "./common/context/NotificationContext";
import { guiAppConfig } from "./common/queries";
import createApplications from "./common/createApplications";
import ConnectionFailedDialog from "./components/ConnectionFailedDialog/ConnectionFailedDialog";
import ErrorBoundary from "./components/ui/ErrorBoundary";

/**
 * Create header bar for each app based on app menuEntries field in config.
 */
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
          appName={app.instanceName}
        />
      ),
    };
  });
  headerRoutesConfig.push({
    key: "home",
    path: `*`,
    element: (
      <HeaderBar
        appDocumentationURL="https://hyperledger-cacti.github.io/cacti/latest/"
        appName="Overview"
      />
    ),
  });
  return useRoutes(headerRoutesConfig);
}

/**
 * Create content routes
 */
function getContentRoutes(appConfig: AppInstance[]) {
  const appRoutes: RouteObject[] = appConfig.map((app) => {
    return {
      key: app.path,
      path: app.path,
      // Crash guard: a throwing plugin-app page must not take the shell
      // (header, navigation, other apps) down with it.
      element: (
        <ErrorBoundary
          contextLabel={app.instanceName}
          setupGuideURL={app.appSetupGuideURL}
        >
          <Outlet context={app.options} />
        </ErrorBoundary>
      ),
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

  // Include landing / welcome page
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

export function App() {
  const { isError, isPending, isFetching, data, refetch } =
    useQuery(guiAppConfig());
  const [dialogDismissed, setDialogDismissed] = useState(false);

  // The shell (sidebar, header, routes) is always rendered - a config store
  // outage is surfaced as a dismissible dialog plus a persistent inline
  // banner instead of replacing the whole screen. This also keeps the hook
  // call order (`useRoutes` below) stable across error/success renders.
  const appConfig = createApplications(isError ? undefined : data);

  const headerRoutes = getHeaderBarRoutes(appConfig);
  const contentRoutes = getContentRoutes(appConfig);

  const retry = () => {
    void refetch();
  };

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      {isPending && (
        <CircularProgress
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            zIndex: 9999,
          }}
        />
      )}
      <Sidebar appConfig={appConfig} />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
          minWidth: 0,
          minHeight: "100vh",
        }}
      >
        {headerRoutes}
        {isError && (
          <Alert
            severity="error"
            role="alert"
            sx={{ mx: 2, mt: 2 }}
            action={
              <>
                <Button
                  color="inherit"
                  size="small"
                  onClick={retry}
                  disabled={isFetching}
                >
                  Retry
                </Button>
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => setDialogDismissed(false)}
                >
                  Details
                </Button>
              </>
            }
          >
            Could not load the app configuration store. Installed apps are
            unavailable until the connection is restored.
          </Alert>
        )}
        <ConnectionFailedDialog
          open={isError && !dialogDismissed}
          onClose={() => setDialogDismissed(true)}
          onRetry={retry}
          retrying={isFetching}
        />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
          }}
        >
          {contentRoutes}
        </Box>
      </Box>
    </Box>
  );
}

// MUI Theme
const theme = createTheme(themeOptions);

// React Query client
const queryClient = new QueryClient();

export default function CactiLedgerBrowserApp() {
  return (
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <QueryClientProvider client={queryClient}>
          <NotificationProvider>
            <CssBaseline />
            {/* Last-resort crash guard around the whole routed shell. */}
            <ErrorBoundary contextLabel="Cacti Ledger Browser">
              <App />
            </ErrorBoundary>
            {/* <ReactQueryDevtools initialIsOpen={false} /> */}
          </NotificationProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
