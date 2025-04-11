import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import List from "@mui/material/List/List";
import ListItem from "@mui/material/ListItem/ListItem";
import ListItemText from "@mui/material/ListItemText/ListItemText";
import { styled } from "@mui/material/styles";
import { DiscoveryPeer, DiscoveryPeerChaincodes } from "../../supabase-types";
import StackedRowItems from "../../../../components/ui/StackedRowItems";

const ListHeaderTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.secondary.main,
  fontWeight: "bold",
}));

export interface PeerDetailsBoxProps {
  peer: DiscoveryPeer;
}

export default function PeerDetailsBox({ peer }: PeerDetailsBoxProps) {
  const parsedChaincodes: DiscoveryPeerChaincodes[] = JSON.parse(
    peer.chaincodes,
  );

  return (
    <Box>
      <StackedRowItems>
        <ListHeaderTypography>Name:</ListHeaderTypography>
        <Typography>{peer.name}</Typography>
      </StackedRowItems>
      <StackedRowItems>
        <ListHeaderTypography>Endpoint:</ListHeaderTypography>
        <Typography>{peer.endpoint}</Typography>
      </StackedRowItems>
      <StackedRowItems>
        <ListHeaderTypography>Ledger Height:</ListHeaderTypography>
        <Typography>{peer.ledger_height}</Typography>
      </StackedRowItems>

      <ListHeaderTypography sx={{ marginTop: "2em", color: "primary.main" }}>
        Chaincodes
      </ListHeaderTypography>
      <List dense disablePadding>
        {parsedChaincodes.map((cc) => {
          return (
            <ListItem key={cc.name}>
              <ListItemText
                primaryTypographyProps={{ fontSize: "1em" }}
                primary={cc.name}
                secondary={`Version ${cc.version}`}
              />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}
