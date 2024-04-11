import DashFabric from "./pages/DashFabric/DashFabric";
import TransactionsFabric from "./pages/TransactionsFabric/TransactionsFabric";
import BlocksFabric from "./pages/BlocksFabric/BlocksFabric";
import FabricTransaction from "./pages/FabricTransaction/FabricTransaction";
import FabricBlock from "./pages/FabricBlock/FabricBlock";
import { Outlet } from "react-router-dom";
import { AppConfig } from "../../common/types/app";

const fabricConfig: AppConfig = {
  name: "Fabric",
  path: "/fabric",
  menuEntries: [
    {
      title: "Dashboard",
      url: "/",
    },
  ],
  routes: [
    {
      element: <DashFabric />,
    },
    {
      path: "transactions",
      element: <TransactionsFabric />,
    },
    {
      path: "blocks",
      element: <BlocksFabric />,
    },
    {
      path: "txn-details",
      element: <Outlet />,
      children: [
        {
          path: ":id",
          element: <FabricTransaction />,
        },
      ],
    },
    {
      path: "block-details",
      element: <Outlet />,
      children: [
        {
          path: ":id",
          element: <FabricBlock />,
        },
      ],
    },
  ],
};

export default fabricConfig;
