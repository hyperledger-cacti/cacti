import { useState, useEffect } from "react";
import { styled } from '@mui/material/styles';
import Button, { ButtonProps } from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import CircularProgress from "@mui/material/CircularProgress";
import MintDialog from "./dialogs/MintDialog";
import TransferDialog from "./dialogs/TransferDialog";
import EscrowDialog from "./dialogs/EscrowDialog";
import BridgeOutDialog from "./dialogs/BridgeOutDialog";
import BridgeBackDialog from "./dialogs/BridgeBackDialog";
import { getFabricBalance } from "../api-calls/fabric-api";
import { getBesuBalance } from "../api-calls/besu-api";
import { AssetReference } from "../models/AssetReference";

const NormalButton = styled(Button)<ButtonProps>(({ theme }) => ({
  margin: "auto",
  width: "100%",
  fontSize: "13px",
  textTransform: "none",
  background: "#2B9BF6",
  color: "#FFFFFF",
  border: "0.5px solid #000000",
  '&:disabled': {
    border: "0",
  },
}));

const CriticalButton = styled(Button)<ButtonProps>(({ theme }) => ({
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
  '&:disabled': {
    border: "0",
  },
}));

export interface IActionsContainerOptions {
    user: string;
    ledger: string;
    assetRefs: Array<AssetReference>
}

export default function ActionsContainer(props: IActionsContainerOptions) {
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
          <CircularProgress  sx={{
            marginTop: "1rem",
          }}/>
        </center>
      ) : (
        <Grid container spacing={1}>
          <Grid item lg={5} sx={{
            textAlign: "left",
            fontSize: "17px",
            marginBottom: "0.2rem",
          }}>
            <span>{props.user}</span>
          </Grid>
          <Grid item lg={1} />
          <Grid item lg={6} sx={{
            textAlign: "right",
            fontSize: "17px",
            marginBottom: "0.2rem",
          }}>
            <span>{amount} CBDC</span>
          </Grid>

          {props.user !== "Bridge" && props.ledger !== "Besu" && (
            <Grid item xs={12} lg={6}>
              <NormalButton
                variant="contained"
                onClick={() => setMintDialog(true)}
              >
                Mint
              </NormalButton>
            </Grid>
          )}
          {props.user === "Bridge" ? (
            <Grid item xs={12} lg={12}>
              <NormalButton
                variant="contained"
                fullWidth
                disabled={amount === 0}
                onClick={() => setTransferDialog(true)}
            
              >
                Transfer
              </NormalButton>
            </Grid>
          ) : props.ledger === "Besu" ? (
            <Grid item xs={12} lg={12}>
              <NormalButton
                variant="contained"
                disabled={amount === 0}
                onClick={() => setTransferDialog(true)}
            
              >
                Transfer
              </NormalButton>
            </Grid>
          ) : (
            <Grid item xs={12} lg={6}>
              <NormalButton
                variant="contained"
                disabled={amount === 0}
                onClick={() => setTransferDialog(true)}
            
              >
                Transfer
              </NormalButton>
            </Grid>
          )}
          {props.user !== "Bridge" && (
            <Grid item xs={12} lg={6}>
              <CriticalButton
                variant="contained"
                disabled={amount === 0}
                onClick={() => setEscrowDialog(true)}
            
              >
                Escrow
              </CriticalButton>
            </Grid>
          )}
          {props.ledger === "Fabric" && props.user !== "Bridge" && (
            <Grid item xs={12} lg={6}>
              <CriticalButton
                variant="contained"
                disabled={
                  props.assetRefs.filter(
                    (asset) => asset.recipient === props.user,
                  ).length === 0
                }
                onClick={() => setBridgeOutDialog(true)}
              >
                Bridge Out
              </CriticalButton>
            </Grid>
          )}
          {props.ledger === "Besu" && props.user !== "Bridge" && (
            <Grid item xs={12} lg={6}>
              <CriticalButton
                variant="contained"
                disabled={
                  props.assetRefs.filter(
                    (asset) => asset.recipient === props.user,
                  ).length === 0
                }
                onClick={() => setBridgeBackDialog(true)}
            
              >
                Bridge Back
              </CriticalButton>
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