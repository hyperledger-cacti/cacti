import { useState, useEffect } from "react";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import ActionsContainer from "./ActionsContainer";
import CircularProgress from "@mui/material/CircularProgress";
import { getSessionReferencesBridge } from "../api-calls/gateway-api";
import { fetchAmountApprovedToBridge as fetchAmountApprovedToBridge } from "../api-calls/ledgers-api";
import SessionReferencesTable from "./SessionReferencesTable";
import ApprovalsTable from "./ApprovalsTable";
import { SessionReference } from "@hyperledger/cactus-example-cbdc-bridging-backend/src/main/typescript/types";

export interface ILedgerOptions {
  path: string;
  ledger: string;
}

export default function Ledger(props: ILedgerOptions) {
  const [sessionReferences, setAssetReferences] = useState<SessionReference[]>(
    [],
  );
  const [aliceApprovals, setAliceApprovals] = useState(0);
  const [charlieApprovals, setCharlieApprovals] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (props.ledger !== "FABRIC" && props.ledger !== "BESU") {
        console.log("Invalid ledger");
        return;
      }
      const list = await getSessionReferencesBridge(props.path, props.ledger);
      setAssetReferences(list);

      const alice = await fetchAmountApprovedToBridge(
        props.path,
        props.ledger,
        "Alice",
      );

      setAliceApprovals(alice ?? 0);

      const charlie = await fetchAmountApprovedToBridge(
        props.path,
        props.ledger,
        "Charlie",
      );
      setCharlieApprovals(charlie ?? 0);
      setLoading(false);
    }

    fetchData();
  }, [props.ledger]);

  return (
    <Paper
      elevation={1}
      sx={{
        border: "0.5px solid #000000",
        margin: "auto",
        padding: "0 1rem 1rem 1rem",
      }}
    >
      <h2>Hyperledger {props.ledger}</h2>
      <Grid container spacing={2}>
        <Grid item sm={12} md={6}>
          <ActionsContainer
            path={props.path}
            user={"Alice"}
            ledger={props.ledger}
            sessionRefs={sessionReferences}
            tokensApproved={aliceApprovals}
          />
        </Grid>
        <Grid item sm={12} md={6}>
          <ActionsContainer
            path={props.path}
            user={"Charlie"}
            ledger={props.ledger}
            sessionRefs={sessionReferences}
            tokensApproved={charlieApprovals}
          />
        </Grid>
      </Grid>
      <p>Token Approvals to Bridge</p>
      {loading ? (
        <center>
          <CircularProgress
            sx={{
              marginTop: "1rem",
            }}
          />
        </center>
      ) : (
        <ApprovalsTable
          ledger={props.ledger}
          sessionRefs={sessionReferences}
          aliceApprovals={aliceApprovals}
          charlieApprovals={charlieApprovals}
        />
      )}
      <p>Sessions Status</p>
      <SessionReferencesTable
        ledger={props.ledger}
        sessionRefs={sessionReferences}
      />
    </Paper>
  );
}
