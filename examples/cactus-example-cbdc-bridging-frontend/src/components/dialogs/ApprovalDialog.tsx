import { useState, useEffect, ChangeEvent } from "react";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Alert from "@mui/material/Alert";
import { approveNTokens } from "../../api-calls/ledgers-api";
export interface IPermissionDialogOptions {
  path: string;
  open: boolean;
  user: string;
  ledger: string;
  balance: number;
  onClose: () => unknown;
}

export default function setGivePermissionDialog(
  props: IPermissionDialogOptions,
) {
  const [amount, setAmount] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [sending, setSending] = useState<boolean>(false);

  useEffect(() => {
    if (props.open) {
      setSending(false);
      setAmount(0);
    }
  }, [props.open]);

  const handleChangeAmount = (
    event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => {
    const value = parseInt(event.target.value);

    if (value < 0) {
      setErrorMessage("Amount must be a positive value");
      setAmount(0);
    } else {
      setErrorMessage("");
      setAmount(value);
    }

    if (value > props.balance) {
      setErrorMessage("Amount must be lower or equal to user's balance");
      setAmount(props.balance);
    } else {
      setErrorMessage("");
      setAmount(value);
    }
  };

  const performAccessTransaction = async () => {
    if (amount === 0) {
      setErrorMessage("Amount must be a positive value");
    } else {
      setSending(true);
      if (props.ledger !== "FABRIC" && props.ledger !== "BESU") {
        setErrorMessage("Invalid ledger");
        return;
      }

      if (
        await approveNTokens(
          props.path,
          props.ledger,
          props.user,
          amount.toString(),
        )
      ) {
        window.location.reload();
      }

      props.onClose();
    }
  };

  return (
    <Dialog open={props.open} keepMounted onClose={props.onClose}>
      <DialogTitle>{"Approve Funds to Bridge"}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          How many tokens can the bridge use on your behalf?
        </DialogContentText>
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
            <Button onClick={performAccessTransaction}>Approve</Button>
          </div>
        )}
      </DialogActions>
    </Dialog>
  );
}
