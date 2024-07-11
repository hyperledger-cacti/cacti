import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { AppInstance } from "../../common/types/app";
import AppCard from "./AppCard";
import AddApplicationPopupCard from "./AddApplicationPopupCard";

type HomePageProps = {
  appConfig: AppInstance[];
};

export default function HomePage({ appConfig }: HomePageProps) {
  return (
    <Box>
      <Typography variant="h5" color="secondary">
        Applications
      </Typography>
      <Box
        display="flex"
        flexWrap="wrap"
        justifyContent="space-between"
        gap={5}
        padding={5}
      >
        <AddApplicationPopupCard />
        {appConfig.map((a) => {
          return <AppCard key={a.id} appConfig={a} />;
        })}
      </Box>
    </Box>
  );
}
