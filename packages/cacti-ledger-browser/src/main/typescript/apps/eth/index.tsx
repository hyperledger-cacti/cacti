import Dashboard from "./pages/Dashboard/Dashboard";
import Blocks from "./pages/Blocks/Blocks";
import Transactions from "./pages/Transactions/Transactions";
import Accounts from "./pages/Accounts/Accounts";
import { AppConfig } from "../../common/types/app";
import { usePersistenceAppStatus } from "../../common/hook/use-persistence-app-status";
import PersistencePluginStatus from "../../components/PersistencePluginStatus/PersistencePluginStatus";

const ethConfig: AppConfig = {
  appName: "Ethereum Browser",
  options: {
    instanceName: "Ethereum",
    description:
      "Applicaion for browsing Ethereum ledger blocks, transactions and tokens. Requires Ethereum persistence plugin to work correctly.",
    path: "/eth",
  },
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
};

export default ethConfig;
