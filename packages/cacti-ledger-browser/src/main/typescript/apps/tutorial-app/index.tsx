import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { AppDefinition } from "../../common/types/app";
import { GuiAppConfig } from "../../common/supabase-types";
import { AppCategory } from "../../common/app-category";
import Home from "./pages/Home";
import DataFetch from "./pages/DataFetch";

const tutorialAppDefinition: AppDefinition = {
  appName: "Tutorial App",
  category: AppCategory.SampleApp,
  defaultInstanceName: "My App",
  defaultDescription: "This is a tutorial application.",
  defaultPath: "/tutorial",
  defaultOptions: {
    // Our app will use this variable to display a greeting later on
    name: "Cacti",
  },

  createAppInstance(app: GuiAppConfig) {
    if (!app.options || !app.options.name) {
      throw new Error(`Missing 'name' in received GuiAppConfig options!`);
    }

    return {
      id: app.id,
      appName: tutorialAppDefinition.appName,
      instanceName: app.instance_name,
      description: app.description,
      path: app.path,
      options: app.options,
      menuEntries: [
        {
          title: "Home",
          url: "/",
        },
        {
          title: "Data Fetch",
          url: "/data-fetch",
        },
      ],
      routes: [
        {
          element: <Home />,
        },
        {
          path: "data-fetch",
          element: <DataFetch />,
        },
      ],
      useAppStatus: () => {
        return {
          isPending: false,
          isInitialized: true,
          status: {
            severity: "success",
            message: "Mocked response!",
          },
        };
      },
      StatusComponent: (
        <Box>
          <Typography>Everything is OK (we hope)</Typography>
        </Box>
      ),
      appSetupGuideURL: tutorialAppDefinition.appSetupGuideURL,
      appDocumentationURL: tutorialAppDefinition.appDocumentationURL,
    };
  },
};

export default tutorialAppDefinition;
