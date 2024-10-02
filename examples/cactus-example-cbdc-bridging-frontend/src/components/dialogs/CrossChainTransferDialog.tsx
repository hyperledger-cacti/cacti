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
import { transactTokens } from "../../api-calls/gateway-api";
import FormControl from "@mui/material/FormControl";
import { InputLabel } from "@mui/material";

const recipients = ["Alice", "Charlie"];

export interface ICrossChainTransferDialogOptions {
  path: string;
  open: boolean;
  ledger: string;
  user: string;
  tokensApproved: number;
  onClose: () => unknown;
}

export default function CrossChainTransferDialog(
  props: ICrossChainTransferDialogOptions,
) {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
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

    if (value > props.tokensApproved) {
      setErrorMessage(
        "Amount must be lower or equal to the amount approved to the bridge",
      );
      setAmount(props.tokensApproved);
    } else {
      setErrorMessage("");
      setAmount(value);
    }
  };

  const handleChangeRecipient = (event: SelectChangeEvent<string>) => {
    setRecipient(event.target.value);
  };

  const performCrossChainTransaction = async () => {
    if (amount === 0) {
      setErrorMessage("Amounts must be a positive value");
    } else {
      setSending(true);
      if (props.ledger !== "FABRIC" && props.ledger !== "BESU") {
        setErrorMessage("Invalid ledger");
        return;
      }

      if (
        await transactTokens(
          props.path,
          props.user,
          recipient,
          props.ledger,
          props.ledger === "FABRIC" ? "BESU" : "FABRIC",
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
      <DialogTitle>{"Cross-Chain Transfer CBDC"}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Select the tokens' recipient and the amount to be transferred to the
          other blockchain
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
          label="Amount"
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
          <Button disabled>Running SATP...</Button>
        ) : (
          <div>
            <Button onClick={props.onClose}>Cancel</Button>
            <Button onClick={performCrossChainTransaction}>Confirm</Button>
          </div>
        )}
      </DialogActions>
    </Dialog>
  );
}
