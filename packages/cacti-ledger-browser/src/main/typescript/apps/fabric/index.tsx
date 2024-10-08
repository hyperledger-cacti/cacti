import { Outlet } from "react-router-dom";

import Dashboard from "./pages/Dashboard/Dashboard";
import Blocks from "./pages/Blocks/Blocks";
import Transactions from "./pages/Transactions/Transactions";
import TransactionDetails from "./pages/TransactionDetails/TransactionDetails";
import {
  AppInstancePersistencePluginOptions,
  AppDefinition,
} from "../../common/types/app";
import { usePersistenceAppStatus } from "../../common/hook/use-persistence-app-status";
import PersistencePluginStatus from "../../components/PersistencePluginStatus/PersistencePluginStatus";
import { GuiAppConfig } from "../../common/supabase-types";
import { AppCategory } from "../../common/app-category";

const fabricBrowserAppDefinition: AppDefinition = {
  appName: "Hyperledger Fabric Browser",
  appDocumentationURL: "https://hyperledger-cacti.github.io/cacti/cactus/ledger-browser/plugin-apps/fabric-browser/",
  appSetupGuideURL: "https://hyperledger-cacti.github.io/cacti/cactus/ledger-browser/plugin-apps/fabric-browser/#setup",
  category: AppCategory.LedgerBrowser,
  defaultInstanceName: "My Fabric Browser",
  defaultDescription:
    "Application for browsing Hyperledger Fabric ledger blocks and transactions. Requires Fabric persistence plugin to work correctly.",
  defaultPath: "/fabric",
  defaultOptions: {
    supabaseUrl: "http://localhost:8000",
    supabaseKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE",
    supabaseSchema: "fabric",
  },

  createAppInstance(app: GuiAppConfig) {
    const supabaseOptions =
      app.options as any as AppInstancePersistencePluginOptions;

    if (
      !supabaseOptions ||
      !supabaseOptions.supabaseUrl ||
      !supabaseOptions.supabaseKey ||
      !supabaseOptions.supabaseSchema
    ) {
      throw new Error(
        `Invalid fabric app specific options in the database: ${JSON.stringify(supabaseOptions)}`,
      );
    }

    return {
      id: app.id,
      appName: fabricBrowserAppDefinition.appName,
      instanceName: app.instance_name,
      description: app.description,
      path: app.path,
      options: supabaseOptions,
      menuEntries: [
        {
          title: "Dashboard",
          url: "/",
        },
      ],
      routes: [
        {
          element: <Dashboard />,
        },
        {
          path: "blocks",
          element: <Blocks />,
        },
        {
          path: "transactions",
          element: <Transactions />,
        },
        {
          path: "transaction",
          element: <Outlet context={supabaseOptions} />,
          children: [
            {
              path: ":hash",
              element: (
                <div>
                  <TransactionDetails />
                </div>
              ),
            },
          ],
        },
      ],
      useAppStatus: () => usePersistenceAppStatus("PluginPersistenceFabric"),
      StatusComponent: (
        <PersistencePluginStatus pluginName="PluginPersistenceFabric" />
      ),
      appSetupGuideURL: fabricBrowserAppDefinition.appSetupGuideURL,
      appDocumentationURL: fabricBrowserAppDefinition.appDocumentationURL,
    };
  },
};

export default fabricBrowserAppDefinition;
