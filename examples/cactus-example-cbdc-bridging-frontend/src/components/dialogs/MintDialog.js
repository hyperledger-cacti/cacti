import React, { useState, useEffect } from "react";
import makeStyles from "@mui/styles/makeStyles";

import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Alert from "@mui/material/Alert";
import { mintTokensFabric } from "../../api-calls/fabric-api";

const useStyles = makeStyles(() => ({
  errorMessage: {
    marginTop: "1rem",
  },
  amountField: {
    margin: "1rem 0",
  },
}));

export default function MintDialog(props) {
  const classes = useStyles();
  const [amount, setAmount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (props.open) {
      setSending(false);
      setAmount(0);
    }
  }, [props.open]);

  const handleChangeAmount = (event) => {
    const value = event.target.value;

    if (value < 0) {
      setErrorMessage("Amount must be a positive value");
      setAmount(0);
    } else {
      setErrorMessage("");
      setAmount(value);
    }
  };

  const performMintTransaction = async () => {
    if (parseInt(amount) === 0) {
      setErrorMessage("Amount must be a positive value");
    } else {
      setSending(true);
      await mintTokensFabric(props.user, amount.toString());
      props.onClose();
    }
  };

  return (
    <Dialog open={props.open} keepMounted onClose={props.onClose}>
      <DialogTitle>{"Mint CBDC"}</DialogTitle>
      <DialogContent>
        <DialogContentText>
          How many tokens would you like to mint to {props.user}"s address?
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
          className={classes.amountField}
        />
        {errorMessage !== "" && (
          <Alert severity="error" className={classes.errorMessage}>
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
            <Button onClick={performMintTransaction}>Confirm</Button>
          </div>
        )}
      </DialogActions>
    </Dialog>
  );
}
