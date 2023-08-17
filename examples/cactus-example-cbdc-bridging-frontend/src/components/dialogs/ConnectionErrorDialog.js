import React from "react";
import makeStyles from "@mui/styles/makeStyles";

import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Dialog from "@mui/material/Dialog";
import Alert from "@mui/material/Alert";

const useStyles = makeStyles(() => ({
  alert: {
    marginBottom: "1rem",
  },
}));

export default function ConnectionErrorDialog(props) {
  const classes = useStyles();

  const handleClose = (event, reason) => {
    if (reason && reason === "backdropClick") {
      return;
    }

    props.close();
  };

  return (
    <Dialog
      open={props.open}
      keepMounted
      disableEscapeKeyDown
      onClose={handleClose}
    >
      <DialogTitle>{"API Servers Connection Error"}</DialogTitle>
      <DialogContent>
        <Alert severity="error" className={classes.alert}>
          Please check the connection with the API Servers and refresh the page.
        </Alert>
      </DialogContent>
    </Dialog>
  );
}
