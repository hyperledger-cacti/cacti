import DashFabric from "./pages/DashFabric/DashFabric";
import TransactionsFabric from "./pages/TransactionsFabric/TransactionsFabric";
import BlocksFabric from "./pages/BlocksFabric/BlocksFabric";
import FabricTransaction from "./pages/FabricTransaction/FabricTransaction";
import FabricBlock from "./pages/FabricBlock/FabricBlock";
import { Outlet } from "react-router-dom";

interface AppConfig {
  name: string;
  url: string;
  pluginName: string;
  menuEntries: {
    title: string;
    url: string;
  }[];
  routes: any;
}

const fabricConfig: AppConfig = {
  name: "Fabric",
  url: "fabric",
  pluginName: "PluginPersistenceFabric",
  menuEntries: [
    {
      title: "Dashboard",
      url: "/dashboard",
    },
  ],
  routes: [
    {
      path: "dashboard",
      element: (
        <div>
          <DashFabric></DashFabric>
        </div>
      ),
    },
    {
      path: "transactions",
      element: (
        <div>
          <TransactionsFabric></TransactionsFabric>
        </div>
      ),
    },
    {
      path: "blocks",
      element: (
        <div>
          <BlocksFabric></BlocksFabric>
        </div>
      ),
    },
    {
      path: "txn-details",
      element: (
        <div>
          <Outlet></Outlet>
        </div>
      ),
      children: [
        {
          path: ":id",
          element: (
            <div>
              <FabricTransaction></FabricTransaction>
            </div>
          ),
        },
      ],
    },
    {
      path: "block-details",
      element: (
        <div>
          <Outlet></Outlet>
        </div>
      ),
      children: [
        {
          path: ":id",
          element: (
            <div>
              <FabricBlock></FabricBlock>
            </div>
          ),
        },
      ],
    },
  ],
};

export default fabricConfig;
