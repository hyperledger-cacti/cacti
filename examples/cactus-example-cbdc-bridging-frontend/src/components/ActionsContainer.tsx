import { useState, useEffect } from "react";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import CircularProgress from "@mui/material/CircularProgress";
import MintDialog from "./dialogs/MintDialog";
import CrossChainTransferDialog from "./dialogs/CrossChainTransferDialog";
import TransferDialog from "./dialogs/TransferDialog";
import ApprovalDialog from "./dialogs/ApprovalDialog";
import { getBalance } from "../api-calls/ledgers-api";
import { SessionReference } from "@hyperledger/cactus-example-cbdc-bridging-backend/src/main/typescript/types";
import { NormalButton } from "./buttons/NormalButton";
import { CriticalButton } from "./buttons/CriticalButton";

export interface IActionsContainerOptions {
  path: string;
  user: string;
  ledger: string;
  sessionRefs: Array<SessionReference>;
  tokensApproved: number;
}

export default function ActionsContainer(props: IActionsContainerOptions) {
  const [amount, setAmount] = useState(0);
  const [mintDialog, setMintDialog] = useState(false);
  const [transferDialog, setTransferDialog] = useState(false);
  const [, setErrorMessage] = useState<string>("");
  const [crossChainTransferDialog, setCrossChainTransferDialog] =
    useState(false);
  const [approvalDialog, setGiveApprovalDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (props.ledger !== "FABRIC" && props.ledger !== "BESU") {
        setErrorMessage("Invalid ledger");
        return;
      }
      const response = await getBalance(props.path, props.ledger, props.user);
      setAmount(response);
      setLoading(false);
    }

    setLoading(true);
    fetchData();
  }, [props.user, props.ledger]);

  return (
    <Paper
      elevation={0}
      sx={{
        background: "#EAEAEA",
        padding: "0.5rem 1.1rem 1.1rem 1.1rem",
      }}
    >
      {loading ? (
        <center>
          <CircularProgress
            sx={{
              marginTop: "1rem",
            }}
          />
        </center>
      ) : (
        <Grid container spacing={1}>
          <Grid
            item
            lg={5}
            sx={{
              textAlign: "left",
              fontSize: "17px",
              marginBottom: "0.2rem",
            }}
          >
            <span>{props.user}</span>
          </Grid>
          <Grid item lg={1} />
          <Grid
            item
            lg={6}
            sx={{
              textAlign: "right",
              fontSize: "17px",
              marginBottom: "0.2rem",
            }}
          >
            <span>{amount} CBDC</span>
          </Grid>

          {props.user !== "Bridge" && (
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
            <Grid item xs={12} lg={12}></Grid>
          ) : props.ledger === "Besu" ? (
            <Grid item xs={12} lg={6}>
              <NormalButton
                variant="contained"
                disabled={amount <= 0}
                onClick={() => setTransferDialog(true)}
              >
                Transfer
              </NormalButton>
            </Grid>
          ) : (
            <Grid item xs={12} lg={6}>
              <NormalButton
                variant="contained"
                disabled={amount <= 0}
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
                disabled={amount <= 0}
                onClick={() => setGiveApprovalDialog(true)}
              >
                Approval
              </CriticalButton>
            </Grid>
          )}
          {props.user !== "Bridge" && (
            <Grid item xs={12} lg={6}>
              <CriticalButton
                variant="contained"
                disabled={amount <= 0 || props.tokensApproved == 0}
                onClick={() => setCrossChainTransferDialog(true)}
              >
                Bridge
              </CriticalButton>
            </Grid>
          )}
          {props.ledger === "Fabric" && props.user !== "Bridge" && (
            <Grid item xs={12} lg={6}></Grid>
          )}
          {props.ledger === "Besu" && props.user !== "Bridge" && (
            <Grid item xs={12} lg={6}></Grid>
          )}
        </Grid>
      )}
      <MintDialog
        path={props.path}
        open={mintDialog}
        user={props.user}
        ledger={props.ledger}
        onClose={() => setMintDialog(false)}
      />
      <TransferDialog
        path={props.path}
        open={transferDialog}
        user={props.user}
        ledger={props.ledger}
        balance={amount}
        onClose={() => setTransferDialog(false)}
      />
      <CrossChainTransferDialog
        path={props.path}
        open={crossChainTransferDialog}
        user={props.user}
        ledger={props.ledger}
        tokensApproved={props.tokensApproved}
        onClose={() => setCrossChainTransferDialog(false)}
      />
      <ApprovalDialog
        path={props.path}
        open={approvalDialog}
        user={props.user}
        ledger={props.ledger}
        balance={amount}
        onClose={() => setGiveApprovalDialog(false)}
      />
    </Paper>
  );
}
