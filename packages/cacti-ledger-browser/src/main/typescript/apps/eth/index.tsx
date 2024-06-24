import { Outlet } from "react-router-dom";
import TokenDetails from "./pages/Details/TokenDetails";
import Dashboard from "./pages/Dashboard/Dashboard";
import Blocks from "./pages/Blocks/Blocks";
import Transactions from "./pages/Transactions/Transactions";
import Accounts from "./pages/Accounts/Accounts";
import TransactionDetails from "./pages/Details/TransactionDetails";
import ERC20 from "./pages/ERC20/ERC20";
import SingleTokenHistory from "./pages/SingleTokenHistory/SingleTokenHistory";
import ERC721 from "./pages/ERC721/ERC721";
import BlockDetails from "./pages/Details/BlockDetails";
import { AppConfig } from "../../common/types/app";

const ethConfig: AppConfig = {
  name: "Ethereum",
  path: "/eth",
  menuEntries: [
    {
      title: "Dashboard",
      url: "/",
    },
    {
      title: "ERC20",
      url: "/accounts/erc20",
    },
    {
      title: "ERC721 (NFT)",
      url: "/accounts/erc721",
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
      element: <Outlet />,
      children: [
        {
          path: ":standard",
          element: <Accounts />,
        },
      ],
    },
    {
      path: "block-details",
      element: <Outlet />,
      children: [
        {
          path: ":number",
          element: <BlockDetails />,
        },
      ],
    },
    {
      path: "token-details",
      element: <Outlet />,
      children: [
        {
          path: ":standard/:address",
          element: (
            <div>
              <TokenDetails></TokenDetails>
            </div>
          ),
        },
      ],
    },
    {
      path: "txn-details",
      element: <Outlet />,
      children: [
        {
          path: ":id",
          element: <TransactionDetails />,
        },
      ],
    },
    {
      path: "erc20",
      element: <Outlet />,
      children: [
        {
          path: ":account",
          element: <ERC20 />,
        },
        {
          path: "trend/:account/:address",
          element: <SingleTokenHistory />,
        },
      ],
    },
    {
      path: "erc721",
      element: <Outlet />,
      children: [
        {
          path: ":account",
          element: <ERC721 />,
        },
      ],
    },
  ],
};

export default ethConfig;
