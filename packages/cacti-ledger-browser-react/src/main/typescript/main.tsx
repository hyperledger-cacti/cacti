import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import Root from "./components/AppShell/Root";
import ethConfig from "./apps/eth/index";
import fabricConfig from "./apps/fabric";

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
        children: ethConfig.routes,
      },
      {
        path: "fabric",
        element: (
          <div>
            <Outlet></Outlet>
          </div>
        ),
        children: fabricConfig.routes,
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <RouterProvider router={router} />,
);
