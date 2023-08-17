import React, { useState, useEffect } from "react";
import makeStyles from "@mui/styles/makeStyles";

import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import CircularProgress from "@mui/material/CircularProgress";
import MintDialog from "./dialogs/MintDialog";
import TransferDialog from "./dialogs/TransferDialog";
import EscrowDialog from "./dialogs/EscrowDialog";
import BridgeOutDialog from "./dialogs/BridgeOutDialog";
import BridgeBackDialog from "./dialogs/BridgeBackDialog";
import { getFabricBalance } from "../api-calls/fabric-api";
import { getBesuBalance } from "../api-calls/besu-api";

const useStyles = makeStyles((theme) => ({
  buttonTransfer: {
    margin: "auto",
    width: "100%",
    fontSize: "13px",
    textTransform: "none",
    background: "#2B9BF6",
    color: "#FFFFFF",
    border: "0.5px solid #000000",
    "&:hover": {
      backgroundColor: "#444444",
      color: "#FFFFFF",
    },
    [theme.breakpoints.down("md")]: {
      width: "100%",
    },
  },
  buttonMint: {
    margin: "auto",
    width: "100%",
    fontSize: "13px",
    textTransform: "none",
    background: "#2B9BF6",
    color: "#FFFFFF",
    border: "0.5px solid #000000",
    "&:hover": {
      backgroundColor: "#444444",
      color: "#FFFFFF",
    },
    [theme.breakpoints.down("md")]: {
      width: "100%",
    },
  },
  buttonEscrow: {
    margin: "auto",
    width: "100%",
    fontSize: "13px",
    textTransform: "none",
    background: "#FF584B",
    color: "#FFFFFF",
    border: "0.5px solid #000000",
    "&:hover": {
      backgroundColor: "#444444",
      color: "#FFFFFF",
    },
    [theme.breakpoints.down("md")]: {
      width: "100%",
    },
  },
  buttonBridge: {
    margin: "auto",
    width: "100%",
    fontSize: "13px",
    textTransform: "none",
    background: "#FF584B",
    color: "#FFFFFF",
    border: "0.5px solid #000000",
    "&:hover": {
      backgroundColor: "#444444",
      color: "#FFFFFF",
    },
    [theme.breakpoints.down("md")]: {
      width: "100%",
    },
  },
  buttonTransferFullWidth: {
    margin: "auto",
    width: "100%",
    fontSize: "13px",
    textTransform: "none",
    background: "#2B9BF6",
    color: "#FFFFFF",
    border: "0.5px solid #000000",
    "&:hover": {
      backgroundColor: "#444444",
      color: "#FFFFFF",
    },
  },
  actionsContainer: {
    padding: "1rem",
    marginBottom: "1rem",
  },
  username: {
    textAlign: "left",
    fontSize: "15px",
    marginBottom: "1rem",
  },
  userAmount: {
    textAlign: "right",
    fontSize: "13px",
    marginBottom: "1rem",
  },
  blur: {
    opacity: "0.5",
  },
  progress: {
    marginTop: "1rem",
  },
}));

export default function Ledger(props) {
  const classes = useStyles();
  const [amount, setAmount] = useState(0);
  const [mintDialog, setMintDialog] = useState(false);
  const [transferDialog, setTransferDialog] = useState(false);
  const [escrowDialog, setEscrowDialog] = useState(false);
  const [bridgeOutDialog, setBridgeOutDialog] = useState(false);
  const [bridgeBackDialog, setBridgeBackDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      let response;
      if (props.ledger === "Fabric") {
        response = await getFabricBalance(props.user);
        setAmount(response);
      } else if (props.ledger === "Besu") {
        response = await getBesuBalance(props.user);
        setAmount(response);
      }
      setLoading(false);
    }

    setLoading(true);
    fetchData();
  }, [props.user, props.ledger]);

  return (
    <div>
      {loading ? (
        <center>
          <CircularProgress className={classes.progress} />
        </center>
      ) : (
        <Grid container spacing={1}>
          <Grid item lg={5} className={classes.username}>
            <span>{props.user}</span>
          </Grid>
          <Grid item lg={1} />
          <Grid item lg={6} className={classes.userAmount}>
            <span>{amount} CBDC</span>
          </Grid>

          {props.user !== "Bridge" && props.ledger !== "Besu" && (
            <Grid item xs={12} lg={6}>
              <Button
                variant="contained"
                className={classes.buttonMint}
                onClick={() => setMintDialog(true)}
              >
                Mint
              </Button>
            </Grid>
          )}
          {props.user === "Bridge" ? (
            <Grid item xs={12} lg={12}>
              <Button
                variant="contained"
                fullWidth
                disabled={amount === 0}
                onClick={() => setTransferDialog(true)}
                className={classes.buttonTransferFullWidth}
              >
                Transfer
              </Button>
            </Grid>
          ) : props.ledger === "Besu" ? (
            <Grid item xs={12} lg={12}>
              <Button
                variant="contained"
                disabled={amount === 0}
                onClick={() => setTransferDialog(true)}
                className={classes.buttonTransferFullWidth}
              >
                Transfer
              </Button>
            </Grid>
          ) : (
            <Grid item xs={12} lg={6}>
              <Button
                variant="contained"
                disabled={amount === 0}
                onClick={() => setTransferDialog(true)}
                className={classes.buttonTransfer}
              >
                Transfer
              </Button>
            </Grid>
          )}
          {props.user !== "Bridge" && (
            <Grid item xs={12} lg={6}>
              <Button
                variant="contained"
                disabled={amount === 0}
                onClick={() => setEscrowDialog(true)}
                className={classes.buttonEscrow}
              >
                Escrow
              </Button>
            </Grid>
          )}
          {props.ledger === "Fabric" && props.user !== "Bridge" && (
            <Grid item xs={12} lg={6}>
              <Button
                variant="contained"
                disabled={
                  props.assetRefs.filter(
                    (asset) => asset.recipient === props.user,
                  ).length === 0
                }
                onClick={() => setBridgeOutDialog(true)}
                className={classes.buttonBridge}
              >
                Bridge Out
              </Button>
            </Grid>
          )}
          {props.ledger === "Besu" && props.user !== "Bridge" && (
            <Grid item xs={12} lg={6}>
              <Button
                variant="contained"
                disabled={
                  props.assetRefs.filter(
                    (asset) => asset.recipient === props.user,
                  ).length === 0
                }
                onClick={() => setBridgeBackDialog(true)}
                className={classes.buttonBridge}
              >
                Bridge Back
              </Button>
            </Grid>
          )}
        </Grid>
      )}
      <MintDialog
        open={mintDialog}
        user={props.user}
        onClose={() => setMintDialog(false)}
      />
      <TransferDialog
        open={transferDialog}
        user={props.user}
        ledger={props.ledger}
        onClose={() => setTransferDialog(false)}
      />
      <EscrowDialog
        open={escrowDialog}
        user={props.user}
        ledger={props.ledger}
        onClose={() => setEscrowDialog(false)}
      />
      <BridgeOutDialog
        open={bridgeOutDialog}
        user={props.user}
        onClose={() => setBridgeOutDialog(false)}
      />
      <BridgeBackDialog
        open={bridgeBackDialog}
        user={props.user}
        onClose={() => setBridgeBackDialog(false)}
      />
    </div>
  );
}
