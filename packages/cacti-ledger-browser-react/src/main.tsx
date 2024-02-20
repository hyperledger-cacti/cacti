import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import Root from "./routes/Root.tsx";
import Dashboard from "./pages/eth/Dashboard/Dashboard.tsx";

import Blocks from "./pages/eth/Blocks/Blocks.tsx";
import Transactions from "./pages/eth/Transactions/Transactions.tsx";
import Accounts from "./pages/eth/Accounts/Accounts.tsx";
import BlockDetails from "./pages/eth/Details/BlockDetails.tsx";
import TokenTransactionDetails from "./pages/eth/Details/TokenTransactionDetails.tsx";
import TokenDetails from "./pages/eth/Details/TokenDetails.tsx";
import TransactionDetails from "./pages/eth/Details/TransactionDetails.tsx";
import ERC20 from "./pages/eth/ERC20/ERC20.tsx";
import SingleTokenHistory from "./pages/eth/SingleTokenHistory/SingleTokenHistory.tsx";
import ERC721 from "./pages/eth/ERC721/ERC721.tsx";
import TransactionsFabric from "./pages/fabric/TransactionsFabric/TransactionsFabric.tsx";
import DashFabric from "./pages/fabric/DashFabric/DashFabric.tsx";
import BlocksFabric from "./pages/fabric/BlocksFabric/BlocksFabric.tsx";
import FabricTransaction from "./pages/fabric/FabricTransaction/FabricTransaction.tsx";
import FabricBlock from "./pages/fabric/FabricBlock/FabricBlock.tsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      {
        path: "eth",
        element: (
          <div>
            <Outlet></Outlet>
          </div>
        ),
        children: [
          // MAIN
          { path: "dashboard", element: <Dashboard></Dashboard> },
          {
            path: "blocks",
            element: (
              <div>
                blocks
                <Blocks></Blocks>
              </div>
            ),
          },
          {
            path: "transactions",
            element: (
              <div>
                transactions
                <Transactions></Transactions>
              </div>
            ),
          },
          // ACCOUNTS
          {
            path: "accounts",
            element: <Outlet></Outlet>,
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
            element: <Outlet></Outlet>,
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
            path: "token-detail",
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
      },
      // FABRIC ROUTES
      {
        path: "fabric",
        element: <Outlet></Outlet>,
        children: [
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
                    block-details/:id
                    <FabricBlock></FabricBlock>
                  </div>
                ),
              },
            ],
          },
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  // <React.StrictMode>
  <RouterProvider router={router} />,
  // </React.StrictMode>,
);
