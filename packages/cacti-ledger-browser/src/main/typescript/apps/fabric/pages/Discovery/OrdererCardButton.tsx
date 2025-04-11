import * as React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";

import OrdererDetailsBox from "./OrdererDetailsBox";
import { DiscoveryOrderer } from "../../supabase-types";

interface OrdererCardButtonProps {
  orderer: DiscoveryOrderer;
}

export default function OrdererCardButton({ orderer }: OrdererCardButtonProps) {
  const [openDialog, setOpenDialog] = React.useState(false);

  return (
    <>
      <Button
        style={{ textTransform: "none" }}
        variant="outlined"
        onClick={() => setOpenDialog(true)}
      >
        {orderer.name}
      </Button>
      <Dialog
        fullWidth
        maxWidth="sm"
        onClose={() => setOpenDialog(false)}
        open={openDialog}
      >
        <DialogTitle color="primary">Orderer Details</DialogTitle>
        <DialogContent>
          <OrdererDetailsBox orderer={orderer} />
        </DialogContent>
      </Dialog>
    </>
  );
}
