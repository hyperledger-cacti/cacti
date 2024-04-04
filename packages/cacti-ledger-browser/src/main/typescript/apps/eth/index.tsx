import { Outlet } from "react-router-dom";
import TokenDetails from "./pages/Details/TokenDetails";
import Dashboard from "./pages/Dashboard/Dashboard";
import Blocks from "./pages/Blocks/Blocks";
import Transactions from "./pages/Transactions/Transactions";
import Accounts from "./pages/Accounts/Accounts";
import TokenTransactionDetails from "./pages/Details/TokenTransactionDetails";
import TransactionDetails from "./pages/Details/TransactionDetails";
import ERC20 from "./pages/ERC20/ERC20";
import SingleTokenHistory from "./pages/SingleTokenHistory/SingleTokenHistory";
import ERC721 from "./pages/ERC721/ERC721";
import BlockDetails from "./pages/Details/BlockDetails";

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

const ethConfig: AppConfig = {
  name: "Ethereum",
  url: "eth",
  pluginName: "PluginPersistenceEthereum",
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
    // MAIN
    {
      path: "dashboard",
      element: (
        <div>
          <Dashboard></Dashboard>
        </div>
      ),
    },
    {
      path: "blocks",
      element: (
        <div>
          <Blocks></Blocks>
        </div>
      ),
    },
    {
      path: "transactions",

      element: (
        <div>
          <Transactions />
        </div>
      ),
    },
    // ACCOUNTS
    {
      path: "accounts",
      element: (
        <div>
          <Outlet></Outlet>
        </div>
      ),
      children: [
        {
          path: ":standard",
          element: (
            <div>
              <Accounts></Accounts>
            </div>
          ),
        },
      ],
    },
    //BLOCK
    {
      path: "block-details",
      element: (
        <div>
          <Outlet></Outlet>
        </div>
      ),
      children: [
        {
          path: ":number",
          element: (
            <div>
              <BlockDetails></BlockDetails>
            </div>
          ),
        },
      ],
    },
    // TOKEN TRANSACTION DETAILS
    {
      path: "token-txn-details",
      element: (
        <div>
          <Outlet></Outlet>
        </div>
      ),
      children: [
        {
          path: ":standard/:address",
          element: (
            <div>
              <TokenTransactionDetails></TokenTransactionDetails>
            </div>
          ),
        },
      ],
    },
    // TOKEN DETAILS
    {
      path: "token-details",
      element: (
        <div>
          <Outlet></Outlet>
        </div>
      ),
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
    // TRANSACTION DETAILS
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
              <TransactionDetails></TransactionDetails>
            </div>
          ),
        },
      ],
    },
    // ERC tokens
    {
      path: "erc20",
      element: (
        <div>
          <Outlet></Outlet>
        </div>
      ),
      children: [
        {
          path: ":account",
          element: (
            <div>
              <ERC20></ERC20>
            </div>
          ),
        },
        {
          path: "trend/:account/:address",
          element: (
            <div>
              <SingleTokenHistory></SingleTokenHistory>
            </div>
          ),
        },
      ],
    },
    {
      path: "erc721",
      element: (
        <div>
          <Outlet></Outlet>
        </div>
      ),
      children: [
        {
          path: ":account",
          element: (
            <div>
              <ERC721></ERC721>
            </div>
          ),
        },
      ],
    },
  ],
};

export default ethConfig;
