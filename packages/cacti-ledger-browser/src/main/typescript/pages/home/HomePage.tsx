import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { appConfig } from "../../common/config";
import AppCard from "./AppCard";

export default function HomePage() {
  return (
    <Box>
      <Typography variant="h5" color="secondary">
        Applications
      </Typography>
      <Box
        display="flex"
        flexWrap="wrap"
        justifyContent="space-around"
        gap={5}
        padding={5}
      >
        {appConfig.map((a) => {
          return (
            <AppCard
              key={`${a.appName}_${a.options.instanceName}`}
              appConfig={a}
            />
          );
        })}
      </Box>
    </Box>
  );
}
