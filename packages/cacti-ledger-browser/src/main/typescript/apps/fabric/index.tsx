import Dashboard from "./pages/Dashboard/Dashboard";
import Blocks from "./pages/Blocks/Blocks";
import Transactions from "./pages/Transactions/Transactions";
import { Outlet } from "react-router-dom";
import TransactionDetails from "./pages/TransactionDetails/TransactionDetails";
import { AppConfig } from "../../common/types/app";
import { usePersistenceAppStatus } from "../../common/hook/use-persistence-app-status";
import PersistencePluginStatus from "../../components/PersistencePluginStatus/PersistencePluginStatus";

const fabricConfig: AppConfig = {
  appName: "Hyperledger Fabric Browser",
  options: {
    instanceName: "Fabric",
    description:
      "Applicaion for browsing Hyperledger Fabric ledger blocks and transactions. Requires Fabric persistence plugin to work correctly.",
    path: "/fabric",
  },
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
      element: <Outlet />,
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
};

export default fabricConfig;
