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
import { transferTokensFabric } from "../../api-calls/fabric-api";
import { transferTokensBesu } from "../../api-calls/besu-api";
import { bridgeTokens } from "../../api-calls/gateway-api";

const recipients = ["Alice", "Charlie"];
const chains = ["Fabric", "Besu"];
export interface ITransferDialogOptions {
  open: boolean;
  ledger: string;
  user: string;
  onClose: () => any;
}

export default function TransferDialog(props: ITransferDialogOptions) {
  const [recipient, setRecipient] = useState("");
  const [originAmount, setSourceAmount] = useState(0);
  const [destinyAmount, setDestinyAmount] = useState(0);
  const [destinyChain, setDestinyChain] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (props.open) {
      setSending(false);
      setRecipient("");
      setSourceAmount(0);
      setDestinyAmount(0);
      setDestinyChain("");
    }
  }, [props.open]);

  const handleChangeOriginAmount = (
    event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => {
    const value = parseInt(event.target.value);

    if (value < 0) {
      setErrorMessage("Amount must be a positive value");
      setSourceAmount(0);
    } else {
      setErrorMessage("");
      setSourceAmount(value);
    }
  };
  const handleChangeDestinyAmount = (
    event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>,
  ) => {
    const value = parseInt(event.target.value);

    if (value < 0) {
      setErrorMessage("Amount must be a positive value");
      setDestinyAmount(0);
    } else {
      setErrorMessage("");
      setDestinyAmount(value);
    }
  };

  const handleChangeRecipient = (event: SelectChangeEvent<string>) => {
    setRecipient(event.target.value);
  };

  const handleChangeDestinyChain = (event: SelectChangeEvent<string>) => {
    setDestinyChain(event.target.value);
  };

  const performTransferTransaction = async () => {
    if (originAmount === 0 || destinyAmount === 0) {
      setErrorMessage("Amounts must be a positive value");
    } else {
      setSending(true);
      if (props.ledger === destinyChain) {
        if (props.ledger === "Fabric") {
          await transferTokensFabric(
            props.user,
            recipient,
            originAmount.toString(),
          );
        } else {
          await transferTokensBesu(props.user, recipient, originAmount);
        }
      } else {
        await bridgeTokens(
          props.user,
          recipient,
          props.ledger,
          destinyChain,
          originAmount,
          destinyAmount,
        );
      }

      props.onClose();
    }
  };

  return (
    <Dialog open={props.open} keepMounted onClose={props.onClose}>
      <DialogTitle>{"Transfer CBDC"}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Select the recipient of the CBDC, target chain, and how many you would
          transfer from {props.user}"s address?
        </DialogContentText>
        <Select
          fullWidth
          name="recipient"
          value={recipient}
          label="Recipient"
          variant="outlined"
          defaultValue={recipient}
          onChange={handleChangeRecipient}
        >
          {recipients.map((user) => (
            <MenuItem key={user} value={user}>
              {user}
            </MenuItem>
          ))}
        </Select>
        <Select
          required
          fullWidth
          autoFocus
          id="chain"
          name="chain"
          value={destinyChain}
          label="chain"
          variant="outlined"
          placeholder="Destiny Chain"
          defaultValue={destinyChain}
          onChange={handleChangeDestinyChain}
          sx={{ margin: "1rem 0" }}
        >
          {chains.map((chain) => {
            return (
              <MenuItem key={chain} value={chain}>
                {chain}
              </MenuItem>
            );
          })}
        </Select>
        <TextField
          required
          fullWidth
          autoFocus
          id="DestinyAmount"
          name="DestinyAmount"
          value={destinyAmount}
          label="DestinyAmount"
          type="number"
          placeholder="DestinyAmount"
          variant="outlined"
          onChange={handleChangeDestinyAmount}
          sx={{ margin: "1rem 0" }}
        />
        <TextField
          required
          fullWidth
          autoFocus
          id="OriginAmount"
          name="OriginAmount"
          value={originAmount}
          label="OriginAmount"
          type="number"
          placeholder="OriginAmount"
          variant="outlined"
          onChange={handleChangeOriginAmount}
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
            <Button onClick={performTransferTransaction}>Confirm</Button>
          </div>
        )}
      </DialogActions>
    </Dialog>
  );
}
