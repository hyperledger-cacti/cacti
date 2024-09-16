import { useState, useEffect } from "react";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import ActionsContainer from "./ActionsContainer";
import CircularProgress from "@mui/material/CircularProgress";
import { getSessionReferencesBridge } from "../api-calls/gateway-api";
import { fetchAmountApprovedToBridge as fetchAmountApprovedToBridgeFabric } from "../api-calls/fabric-api";
import { fetchAmountApprovedToBridge as fetchAmountApprovedToBridgeBesu } from "../api-calls/besu-api";
import AssetReferencesTable from "./AssetReferencesTable";
import ApprovalsTable from "./ApprovalsTable";

export interface ILedgerOptions {
  ledger: string;
}

export default function Ledger(props: ILedgerOptions) {
  const [sessionReferences, setAssetReferences] = useState([]);
  const [aliceApprovals, setAliceApprovals] = useState(0);
  const [charlieApprovals, setCharlieApprovals] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (props.ledger === "Fabric") {
        const list = await getSessionReferencesBridge("4010");
        setAssetReferences(list);

        const alice = await fetchAmountApprovedToBridgeFabric("Alice");
        setAliceApprovals(alice);

        const charlie = await fetchAmountApprovedToBridgeFabric("Charlie");
        setCharlieApprovals(charlie);
      } else {
        const list = await getSessionReferencesBridge("4110");
        setAssetReferences(list);

        const alice = await fetchAmountApprovedToBridgeBesu("Alice");
        setAliceApprovals(alice);

        const charlie = await fetchAmountApprovedToBridgeBesu("Charlie");
        setCharlieApprovals(charlie);
      }
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
            user={"Alice"}
            ledger={props.ledger}
            sessionRefs={sessionReferences}
            tokensApproved={aliceApprovals}
          />
        </Grid>
        <Grid item sm={12} md={6}>
          <ActionsContainer
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
      <AssetReferencesTable
        ledger={props.ledger}
        sessionRefs={sessionReferences}
      />
    </Paper>
  );
}
