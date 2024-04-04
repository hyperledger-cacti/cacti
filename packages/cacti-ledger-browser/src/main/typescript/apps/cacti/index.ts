import StatusPage from "./pages/status-page";

const appConfig = {
  name: "Cacti",
  url: "cacti",
  menuEntries: [
    {
      title: "Plugin Status",
      url: "/",
    },
  ],
  routes: [
    {
      path: "/",
      component: StatusPage,
    },
  ],
};

export default appConfig;
