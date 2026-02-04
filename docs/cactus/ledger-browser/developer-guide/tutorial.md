# Tutorial - Adding new application

This tutorial will show you step by step how to create a new app inside ledger browser. The app we're going to create will be very simple and static because it's purpose is just to ilustrate the steps and is meant as a starting point for your application.

## Setup Ledger Browser

Follow our setup guide to run Supabase instance and start the Ledger Browser.

## Create basic app structure

All applications should be located in the `apps` directory within the ledger-browser source code. Create a new directory for your app and create its main entry point as `index.tsx`.

```shell
# We assume you're at the root of cacti repository
cd packages/cacti-ledger-browser/src/main/typescript/apps/
mkdir my-tutorial-app
cd my-tutorial-app
code index.tsx # Use any editor you want, this code assumes Visual Studio Code is used
```

Each app should define an `index.tsx` file that includes its `AppDefinition`.

```typescript
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { AppDefinition } from "../../common/types/app";
import { GuiAppConfig } from "../../common/supabase-types";
import { AppCategory } from "../../common/app-category";

const myTutorialAppDefinition: AppDefinition = {
  appName: "My Tutorial App",
  category: AppCategory.SampleApp,
  defaultInstanceName: "My App",
  defaultDescription: "This is a tutorial application.",
  defaultPath: "/my-tutorial",
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
      appName: myTutorialAppDefinition.appName,
      instanceName: app.instance_name,
      description: app.description,
      path: app.path,
      options: app.options,
      menuEntries: [],
      routes: [],
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
      appSetupGuideURL: myTutorialAppDefinition.appSetupGuideURL,
      appDocumentationURL: myTutorialAppDefinition.appDocumentationURL,
    };
  },
};

export default myTutorialAppDefinition;
```

Add the newly created application to the main `AppConfig` mapping.

```shell
code ../../common/config.tsx
```

```typescript
import myTutorialAppDefinition from "../apps/my-tutorial-app";
import { AppDefinition } from "./types/app";

const config = new Map<string, AppDefinition>([
  // ...

  // Add new application
  ["myTutorialApplication", myTutorialAppDefinition],
]);

export default config;
```

(Re)start the `Ledger Browser` application and add the newly created app by clicking the `Add Application` card on the main page. Select the `Sample App` category and choose `My Tutorial App`. On the `App Specific Setup` page, enter your name and click `Save`. The application configuration should be stored in the database, and the new application should appear on the main page. Clicking the `Status` button should display the hardcoded response defined in `StatusComponent`, and opening the app should navigate to [http://localhost:3001/my-tutorial](http://localhost:3001/my-tutorial), where nothing will be shown since no pages have been created yet.

## Add the Home page

Now it's time to add an actual page to our application. Our Home page will display a simple "Hello World" greeting using the name provided in the app configuration. To begin, create a new page component. Note that we're using the `PageTitle` component from the common UI components to maintain visual consistency with the rest of the application.

```shell
mkdir pages
code pages/Home.tsx
```

```typescript
import Box from "@mui/material/Box";
import PageTitle from "../../../components/ui/PageTitle";

export default function Home() {
  return (
    <Box>
      <PageTitle>Hello World!</PageTitle>
    </Box>
  );
}
```

Next, we will add our Home page to the `AppDefinition` by including it in the routes and menu entries.

```typescript
// ...
import Home from "./pages/Home";


const myTutorialAppDefinition: AppDefinition = {
  // ...

  createAppInstance(app: GuiAppConfig) {
    // ...
    return {
      // ...
      menuEntries: [
        {
          title: "Home",
          url: "/",
        },
      ],
      routes: [
        {
          element: <Home />,
        },
      ],
      // ...
    };
  },
};
```

Navigating to [http://localhost:3001/my-tutorial](http://localhost:3001/my-tutorial) should now display our "Hello World" message! To show a more personalized greeting, we need to access the custom app options stored in the app's React Router outer context. To simplify the retrieval of these options, we'll create a custom hook.

```shell
code hooks.tsx
```

```typescript
import { useOutletContext } from "react-router-dom";

type TutorialOptionsType = {
  name: string;
};

export function useAppOptions() {
  return useOutletContext<TutorialOptionsType>();
}
```

Now we can use our custom hook to retrieve the name and display it to the user.

```typescript
import Box from "@mui/material/Box";
import PageTitle from "../../../components/ui/PageTitle";
import { useAppOptions } from "../hooks";

export default function Home() {
  const appOptions = useAppOptions();

  return (
    <Box>
      <PageTitle>Hello {appOptions.name}!</PageTitle>
    </Box>
  );
}
```

The home page should now display a personalized greeting.

## Data fetching and displaying notifications

To illustrate how to fetch data from an external server, we'll create another page. We will use [restful-api.dev](https://restful-api.dev/) as a dummy backend for our requests. Begin by creating a new page called `DataFetch`.

```shell
code pages/DataFetch.tsx
```

```typescript
import Box from "@mui/material/Box";
import PageTitle from "../../../components/ui/PageTitle";

export default function DataFetch() {
  return (
    <Box>
      <PageTitle>Data Fetch Sample</PageTitle>
    </Box>
  );
}
```

Next, add the new `DataFetch` page to the `AppDefinition`.

```typescript
// ...
import DataFetch from "./pages/DataFetch";


const myTutorialAppDefinition: AppDefinition = {
  // ...

  createAppInstance(app: GuiAppConfig) {
    // ...
    return {
      // ...
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
      // ...
    };
  },
};
```

Ensure that the header bar now includes a link to "Data Fetch" and that it correctly navigates to the newly created page at [http://localhost:3001/my-tutorial/data-fetch](http://localhost:3001/my-tutorial/data-fetch). Next, we'll use [react-query](https://tanstack.com/query/v3) to fetch data from the test REST server and display it on the page.

```typescript
import axios from "axios";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import PageTitle from "../../../components/ui/PageTitle";
import { useQuery } from "@tanstack/react-query";

/**
 * Simple method for fetching test data from restful-api.dev
 */
async function fetchSampleData() {
  const response = await axios.get("https://api.restful-api.dev/objects/7");
  return response.data;
}

export default function DataFetch() {
  const { data } = useQuery({
    queryKey: ["sampleFetch"],
    queryFn: fetchSampleData,
  });

  return (
    <Box>
      <PageTitle>Data Fetch Sample</PageTitle>

      <Box>
        <Typography variant="h5">Fetched object: {data?.name ?? ""}</Typography>
      </Box>
    </Box>
  );
}
```

You should see some object name displayed after the `Fetched object` text. Next, we'll display a success notification when our query finishes using the `useEffect` React hook.

```typescript
import React from "react";
import { useNotification } from "../../../common/context/NotificationContext";
// ...

export default function DataFetch() {
  const { showNotification } = useNotification();
  const { data, isPending } = useQuery({
    queryKey: ["sampleFetch"],
    queryFn: fetchSampleData,
  });

  React.useEffect(() => {
    !isPending &&
      data &&
      showNotification(`Fetched data: ${data.name}`, "success");
  }, [data, isPending]);

  // ...
}
```

Try refreshing the page, and you should see a green notification in the bottom left corner with the fetched data name. Lastly, we'll handle query failures by displaying an error notification in such cases.

```typescript
const { data, isPending, isError, error } = useQuery({
  queryKey: ["sampleFetch"],
  queryFn: fetchSampleData,
});

React.useEffect(() => {
  isError && showNotification(`Could not fetch sample data: ${error}`, "error");
}, [isError]);
```

This concludes the tutorial. You should now have a basic understanding of how to add a new application to the Ledger Browser. If you have any questions, please reach out for support on the Hyperledger Discord Cacti channel. The final tutorial application can be found in `apps/tutorial-app`.

## Future improvements

- Extend the Data Fetch page with sub-pages to demonstrate how to use child routes.
- Implement a simple status hook and component.
