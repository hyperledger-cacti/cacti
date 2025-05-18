import { ChangeEvent, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Alert from "@mui/material/Alert";
import { escrowTokensFabric } from "../../api-calls/fabric-api";
import { escrowTokensBesu } from "../../api-calls/besu-api";

export interface IEscrowDialogOptions {
  open: boolean
  user: string
  ledger: string
  onClose: () => any
}

export default function EscrowDialog(props: IEscrowDialogOptions) {
  const [assetRefID, setAssetRefID] = useState("");
  const [amount, setAmount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (props.open) {
      setSending(false);
      setAssetRefID(uuidv4());
      setAmount(0);
    }
  }, [props.open]);

  const handleChangeAmount = (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const value = parseInt(event.target.value);

    if (value < 0) {
      setErrorMessage("Amount must be a positive value");
      setAmount(0);
    } else {
      setErrorMessage("");
      setAmount(value);
    }
  };

  const performEscrowTransaction = async () => {
    if (amount === 0) {
      setErrorMessage("Amount must be a positive value");
    } else {
      setSending(true);
      if (props.ledger === "Fabric") {
        await escrowTokensFabric(props.user, amount.toString(), assetRefID);
      } else {
        await escrowTokensBesu(props.user, amount, assetRefID);
      }

      props.onClose();
    }
  };

  return (
    <Dialog open={props.open} keepMounted onClose={props.onClose}>
      <DialogTitle>{"Escrow CBDC"}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Select the recipient of the CBDC and how many you would like to
          transfer from {props.user}"s address?
        </DialogContentText>
        <TextField
          fullWidth
          disabled
          id="assetRef"
          name="assetRef"
          value={assetRefID}
          label="Asset Reference ID"
          placeholder="Asset Reference ID"
          variant="outlined"
          sx={{ margin: "1rem 0" }}
        />
        <TextField
          required
          fullWidth
          autoFocus
          id="amount"
          name="amount"
          value={amount}
          label="Amount"
          type="number"
          placeholder="Amount"
          variant="outlined"
          onChange={handleChangeAmount}
          sx={{ margin: "1rem 0" }}
        />
        {errorMessage !== "" && (
          <Alert severity="error" sx={{ marginTop: "1rem" }}>
            {errorMessage}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        {sending ? (
          <Button disabled>Sending...</Button>
        ) : (
          <div>
            <Button onClick={props.onClose}>Cancel</Button>
            <Button onClick={performEscrowTransaction}>Confirm</Button>
          </div>
        )}
      </DialogActions>
    </Dialog>
  );
}
