import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { appConfig } from "./common/config";
import CactiLedgerBrowserApp from "./CactiLedgerBrowserApp";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <CactiLedgerBrowserApp appConfig={appConfig} />
  </React.StrictMode>,
);
