import { AppConfig } from "../../common/types/app";
import StatusPage from "./pages/status-page";

const appConfig: AppConfig = {
  name: "Status",
  path: "/cacti",
  menuEntries: [
    {
      title: "Plugin Status",
      url: "/",
    },
  ],
  routes: [
    {
      element: <StatusPage />,
    },
  ],
};

export default appConfig;
