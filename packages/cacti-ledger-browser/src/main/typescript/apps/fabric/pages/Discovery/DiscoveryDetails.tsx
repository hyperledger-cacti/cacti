import React from "react";
import { useQuery } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography/Typography";
import Card from "@mui/material/Card/Card";
import CardContent from "@mui/material/CardContent/CardContent";
import List from "@mui/material/List/List";
import ListItem from "@mui/material/ListItem/ListItem";
import ListItemText from "@mui/material/ListItemText/ListItemText";
import CircularProgress from "@mui/material/CircularProgress/CircularProgress";

import { useNotification } from "../../../../common/context/NotificationContext";
import { fabricDiscoveryNodes } from "../../queries";
import { DiscoveryMSP } from "../../supabase-types";
import PeerCardButton from "./PeerCardButton";
import OrdererCardButton from "./OrdererCardButton";

function NothingSelectedMessage() {
  return (
    <Box display="flex" alignItems="center" sx={{ height: "100%" }}>
      <Typography>
        Select MSP on the left to display ledger components.
      </Typography>
    </Box>
  );
}

function LoadingSpinner() {
  return (
    <Box display="flex" alignItems="center" sx={{ height: "100%" }}>
      <CircularProgress />
    </Box>
  );
}

interface DiscoveryDetailsProps {
  msp: DiscoveryMSP | undefined;
}

function DiscoveryDetails({ msp }: DiscoveryDetailsProps) {
  const { showNotification } = useNotification();
  const { isError, isPending, data, error } = useQuery(
    fabricDiscoveryNodes(msp?.id),
  );
  React.useEffect(() => {
    isError &&
      showNotification(
        `Could not fetch ledger components for MSP ${msp?.name ?? "(Unknown)"}: ${error}`,
        "error",
      );
  }, [isError]);

  if (!msp) {
    return <NothingSelectedMessage />;
  }

  if (isPending) {
    return <LoadingSpinner />;
  }

  const mspOUString = JSON.parse(msp.organizational_unit_identifiers).join(
    ", ",
  );

  const peers = data?.peers ?? [];
  const orderers = data?.orderers ?? [];

  return (
    <Box>
      <Card sx={{ width: "50%" }} variant="outlined">
        <CardContent>
          <Typography variant="h6">
            {msp.name} ({msp.mspid})
          </Typography>
          <List dense disablePadding>
            <ListItem>
              <ListItemText
                primary={mspOUString ? mspOUString : "-"}
                secondary={"Organizational Units"}
              />
            </ListItem>
            <ListItem>
              <ListItemText
                primary={msp.admins ? msp.admins : "-"}
                secondary={"Admins"}
              />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      <Typography variant="h6" marginY="1em">
        Peers
      </Typography>
      <Box
        display="grid"
        gap="2rem"
        gridTemplateColumns="repeat(auto-fit, minmax(300px, 400px))"
      >
        {peers.map((p) => (
          <PeerCardButton key={p.id} peer={p} />
        ))}
        {peers.length === 0 && (
          <Typography>No peers defined for this MSP</Typography>
        )}
      </Box>

      <Typography variant="h6" marginY="1em">
        Orderers
      </Typography>
      <Box
        display="grid"
        gap="2rem"
        gridTemplateColumns="repeat(auto-fit, minmax(300px, 400px))"
      >
        {orderers.map((o) => (
          <OrdererCardButton key={o.id} orderer={o} />
        ))}
        {orderers.length === 0 && (
          <Typography>No orderers defined for this MSP</Typography>
        )}
      </Box>
    </Box>
  );
}

export default DiscoveryDetails;
