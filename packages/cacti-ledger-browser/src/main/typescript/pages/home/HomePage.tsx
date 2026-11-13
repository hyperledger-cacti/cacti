import Box from "@mui/material/Box";
import PageTitle from "../../components/ui/PageTitle";

import { AppInstance } from "../../common/types/app";
import ErrorBoundary from "../../components/ui/ErrorBoundary";
import AppCard from "./AppCard";
import AddApplicationPopupCard from "./AddApplicationPopupCard";

type HomePageProps = {
  appConfig: AppInstance[];
};

export default function HomePage({ appConfig }: HomePageProps) {
  return (
    <Box>
      <PageTitle>Applications</PageTitle>
      <Box
        display="grid"
        gridTemplateColumns="repeat(auto-fit, 400px)"
        justifyContent="center"
        gap="2rem"
        padding={5}
      >
        <AddApplicationPopupCard />
        {appConfig.map((a) => {
          // Crash guard: a throwing app status hook/card must not take the
          // home page (and the other app cards) down with it.
          return (
            <ErrorBoundary
              key={a.id}
              contextLabel={a.instanceName}
              setupGuideURL={a.appSetupGuideURL}
            >
              <AppCard appConfig={a} />
            </ErrorBoundary>
          );
        })}
      </Box>
    </Box>
  );
}
