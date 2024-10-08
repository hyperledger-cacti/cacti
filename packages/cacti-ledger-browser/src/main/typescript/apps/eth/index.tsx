import Dashboard from "./pages/Dashboard/Dashboard";
import Blocks from "./pages/Blocks/Blocks";
import Transactions from "./pages/Transactions/Transactions";
import Accounts from "./pages/Accounts/Accounts";
import {
  AppInstancePersistencePluginOptions,
  AppDefinition,
} from "../../common/types/app";
import { usePersistenceAppStatus } from "../../common/hook/use-persistence-app-status";
import PersistencePluginStatus from "../../components/PersistencePluginStatus/PersistencePluginStatus";
import { GuiAppConfig } from "../../common/supabase-types";
import { AppCategory } from "../../common/app-category";

const ethBrowserAppDefinition: AppDefinition = {
  appName: "Ethereum Browser",
  appDocumentationURL: "https://hyperledger-cacti.github.io/cacti/cactus/ledger-browser/plugin-apps/ethereum-browser/",
  appSetupGuideURL: "https://hyperledger-cacti.github.io/cacti/cactus/ledger-browser/plugin-apps/ethereum-browser/#setup",
  category: AppCategory.LedgerBrowser,
  defaultInstanceName: "My Eth Browser",
  defaultDescription:
    "Application for browsing Ethereum ledger blocks, transactions and tokens. Requires Ethereum persistence plugin to work correctly.",
  defaultPath: "/eth",
  defaultOptions: {
    supabaseUrl: "http://localhost:8000",
    supabaseKey:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE",
    supabaseSchema: "ethereum",
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
        `Invalid ethereum app specific options in the database: ${JSON.stringify(supabaseOptions)}`,
      );
    }

    return {
      id: app.id,
      appName: ethBrowserAppDefinition.appName,
      instanceName: app.instance_name,
      description: app.description,
      path: app.path,
      options: supabaseOptions,
      menuEntries: [
        {
          title: "Dashboard",
          url: "/",
        },
        {
          title: "Accounts",
          url: "/accounts",
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
          path: "accounts",
          element: <Accounts />,
        },
      ],
      useAppStatus: () => usePersistenceAppStatus("PluginPersistenceEthereum"),
      StatusComponent: (
        <PersistencePluginStatus pluginName="PluginPersistenceEthereum" />
      ),
      appSetupGuideURL: ethBrowserAppDefinition.appSetupGuideURL,
      appDocumentationURL: ethBrowserAppDefinition.appDocumentationURL,
    };
  },
};

export default ethBrowserAppDefinition;
