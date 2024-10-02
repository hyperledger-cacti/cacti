import { useState, useEffect, ChangeEvent } from "react";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Alert from "@mui/material/Alert";
import { transferTokens } from "../../api-calls/ledgers-api";
import { FormControl, InputLabel } from "@mui/material";

const recipients = ["Alice", "Charlie"];

export interface ITransferDialogOptions {
  path: string;
  open: boolean;
  ledger: string;
  user: string;
  balance: number;
  onClose: () => unknown;
}

export default function TransferDialog(props: ITransferDialogOptions) {
  const [errorMessage, setErrorMessage] = useState("");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (props.open) {
      setSending(false);
      setRecipient("");
      setAmount(0);
    }
  }, [props.open]);

  const handleChangeamount = (
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
      setErrorMessage("Amount must be lower or equal to current balance");
      setAmount(props.balance);
    } else {
      setErrorMessage("");
      setAmount(value);
    }
  };

  const handleChangeRecipient = (event: SelectChangeEvent<string>) => {
    setRecipient(event.target.value);
  };

  const performLocalTransferTransaction = async () => {
    if (amount === 0) {
      setErrorMessage("Amounts must be a positive value");
    } else {
      setSending(true);

      if (props.ledger !== "FABRIC" && props.ledger !== "BESU") {
        setErrorMessage("Invalid ledger");
        return;
      }

      if (
        await transferTokens(
          props.path,
          props.ledger,
          props.user,
          recipient,
          amount.toString(),
        )
      ) {
        window.location.reload();
      }
    }
    props.onClose();
  };

  return (
    <Dialog open={props.open} keepMounted onClose={props.onClose}>
      <DialogTitle>{"Transfer CBDC"}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Select the tokens' recipient and the amount to be transferred
        </DialogContentText>
        <FormControl
          fullWidth
          required
          variant="outlined"
          sx={{ marginBottom: "1rem" }}
        >
          <InputLabel shrink={true} id="recipient-label">
            Recipient
          </InputLabel>
          <Select
            labelId="recipient-label"
            name="recipient"
            value={recipient}
            label="Recipient" // Label prop is used with the InputLabel
            onChange={handleChangeRecipient}
            displayEmpty
            renderValue={(selected) => {
              if (!selected) {
                return <em style={{ color: "gray" }}>Select a recipient</em>;
              }
              return selected;
            }}
          >
            {recipients.map((user) => (
              <MenuItem key={user} value={user}>
                {user}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          required
          fullWidth
          autoFocus
          id="amount"
          name="amount"
          value={amount}
          label="amount"
          type="number"
          placeholder="amount"
          variant="outlined"
          onChange={handleChangeamount}
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
            <Button onClick={performLocalTransferTransaction}>Confirm</Button>
          </div>
        )}
      </DialogActions>
    </Dialog>
  );
}
