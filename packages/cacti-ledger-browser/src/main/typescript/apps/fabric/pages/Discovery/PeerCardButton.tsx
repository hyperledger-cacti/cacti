import * as React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";

import PeerDetailsBox from "./PeerDetailsBox";
import { DiscoveryPeer } from "../../supabase-types";

interface PeerCardButtonProps {
  peer: DiscoveryPeer;
}

export default function PeerCardButton({ peer }: PeerCardButtonProps) {
  const [openDialog, setOpenDialog] = React.useState(false);

  return (
    <>
      <Button
        style={{ textTransform: "none" }}
        variant="outlined"
        onClick={() => setOpenDialog(true)}
      >
        {peer.name}
      </Button>
      <Dialog
        fullWidth
        maxWidth="sm"
        onClose={() => setOpenDialog(false)}
        open={openDialog}
      >
        <DialogTitle color="primary">Peer Details</DialogTitle>
        <DialogContent>
          <PeerDetailsBox peer={peer} />
        </DialogContent>
      </Dialog>
    </>
  );
}
