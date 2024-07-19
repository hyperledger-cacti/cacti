import { AppConfig } from "../../common/types/app";
import Dashboard from "./pages/Dashboard/Dashboard";
import Blocks from "./pages/Blocks/Blocks";
import Transactions from "./pages/Transactions/Transactions";
import { Outlet } from "react-router-dom";
import TransactionDetails from "./pages/TransactionDetails/TransactionDetails";

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
};

export default fabricConfig;
