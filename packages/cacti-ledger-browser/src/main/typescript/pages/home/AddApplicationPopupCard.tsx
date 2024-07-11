import React from "react";
import { useTheme } from "@mui/material/styles";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import AddNewApp from "../add-new-app/AddNewApp";

export interface NewAppDialogProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

function NewAppDialog({ open, setOpen }: NewAppDialogProps) {
  const handleClose = () => {
    setOpen(false);
  };

  return (
    <>
      <Dialog
        open={open}
        scroll="paper"
        aria-describedby="add new application dialog"
        maxWidth="xl"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          Add Application
          <Button aria-label="close" onClick={handleClose} size="large">
            Close
            <CloseIcon />
          </Button>
        </DialogTitle>
        <DialogContent dividers>
          <AddNewApp handleDone={handleClose} />
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function AddApplicationPopupCard() {
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Card
        variant="outlined"
        sx={{
          display: "flex",
          flexDirection: "column",
          width: 400,
          minHeight: 250,
          backgroundColor: theme.palette.grey[100],
        }}
      >
        <CardActionArea
          onClick={() => {
            setOpen(true);
          }}
          sx={{
            flex: 1,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <AddIcon sx={{ fontSize: 100 }} />
            <Typography fontWeight="bold">Add Application</Typography>
          </Box>
        </CardActionArea>
      </Card>
      <NewAppDialog open={open} setOpen={setOpen} />
    </>
  );
}
