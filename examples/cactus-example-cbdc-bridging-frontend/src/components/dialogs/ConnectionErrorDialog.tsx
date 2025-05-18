import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Dialog from "@mui/material/Dialog";
import Alert from "@mui/material/Alert";

export interface IConnectionErrorDialogOptions {
  open: boolean
  onClose: () => any
}

export default function ConnectionErrorDialog(props: IConnectionErrorDialogOptions) {
  const handleClose = (event: any, reason: any) => {
    if (reason && reason === "backdropClick") {
      return;
    }

    props.onClose();
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
        <Alert severity="error" sx={{ marginBottom: "1rem" }}>
          Please check the connection with the API Servers and refresh the page.
        </Alert>
      </DialogContent>
    </Dialog>
  );
}
