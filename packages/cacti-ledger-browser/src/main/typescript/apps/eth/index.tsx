import { AppConfig } from "../../common/types/app";
import Dashboard from "./pages/Dashboard/Dashboard";
import Blocks from "./pages/Blocks/Blocks";
import Transactions from "./pages/Transactions/Transactions";
import Accounts from "./pages/Accounts/Accounts";

const ethConfig: AppConfig = {
  name: "Ethereum",
  path: "/eth",
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
};

export default ethConfig;
