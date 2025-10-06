import React from "react";
import { useQuery } from "@tanstack/react-query";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import List from "@mui/material/List/List";
import ListItem from "@mui/material/ListItem/ListItem";
import ListItemButton from "@mui/material/ListItemButton/ListItemButton";
import ListItemText from "@mui/material/ListItemText/ListItemText";
import DoubleArrowIcon from "@mui/icons-material/DoubleArrow";
import ListItemIcon from "@mui/material/ListItemIcon/ListItemIcon";
import CircularProgress from "@mui/material/CircularProgress/CircularProgress";
import Divider from "@mui/material/Divider/Divider";

import { DiscoveryMSP } from "../../supabase-types";
import PageTitle from "../../../../components/ui/PageTitle";
import { useNotification } from "../../../../common/context/NotificationContext";
import { fabricDiscoveryMSPs } from "../../queries";
import DiscoveryDetails from "./DiscoveryDetails";

function Discovery() {
  const { showNotification } = useNotification();
  const [selectedMSP, setSelectedMSP] = React.useState<
    DiscoveryMSP | undefined
  >(undefined);
  const { isError, isPending, data, error } = useQuery(fabricDiscoveryMSPs());

  React.useEffect(() => {
    isError &&
      showNotification(`Could not fetch discovery MSPs: ${error}`, "error");
  }, [isError]);

  const msps = data ?? [];

  return (
    <Box>
      <PageTitle>Discovery</PageTitle>

      <Box display="flex" gap="2rem">
        <Box flexGrow={1} maxWidth="300px">
          <Typography variant="h5" marginTop="2rem">
            Select MSP
          </Typography>
          <Box>
            {isPending && (
              <Box
                paddingY="1em"
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  width: "100%",
                }}
              >
                <CircularProgress />
              </Box>
            )}
          </Box>

          {msps && (
            <List>
              {msps.map((msp) => (
                <ListItem disablePadding key={msp.id}>
                  <ListItemButton
                    onClick={() => setSelectedMSP(msp)}
                    selected={msp.id === (selectedMSP?.id ?? "")}
                    sx={(theme) => ({
                      "&.Mui-selected": {
                        backgroundColor: theme.palette.primary.main,
                        color: "white",
                      },
                    })}
                  >
                    <ListItemIcon>
                      <DoubleArrowIcon />
                    </ListItemIcon>
                    <ListItemText primary={msp.name} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        <Divider orientation="vertical" flexItem />

        <Box flexGrow={7}>{<DiscoveryDetails msp={selectedMSP} />}</Box>
      </Box>
    </Box>
  );
}

export default Discovery;
