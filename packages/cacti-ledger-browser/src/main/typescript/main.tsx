// Needed to fix vite caching error of MUI - see https://github.com/vitejs/vite/issues/12423
import "@mui/material/styles/styled";

import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { appConfig } from "./common/config";
import CactiLedgerBrowserApp from "./CactiLedgerBrowserApp";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CactiLedgerBrowserApp appConfig={appConfig} />
  </React.StrictMode>,
);
