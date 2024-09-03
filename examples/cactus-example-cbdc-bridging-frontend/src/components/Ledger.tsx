import { useState, useEffect } from "react";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import ActionsContainer from "./ActionsContainer";
import { getSessionReferencesBridge } from "../api-calls/gateway-api";
import AssetReferencesTable from "./AssetReferencesTable";

export interface ILedgerOptions {
  ledger: string;
}

export default function Ledger(props: ILedgerOptions) {
  const [sessionReferences, setAssetReferences] = useState([]);

  useEffect(() => {
    async function fetchData() {
      if (props.ledger === "Fabric") {
        const list = await getSessionReferencesBridge("4010");
        setAssetReferences(list);
      } else {
        const list = await getSessionReferencesBridge("4110");
        setAssetReferences(list);
      }
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
      {props.ledger === "Fabric" ? (
        <p
          style={{
            textAlign: "left",
            margin: "3rem 0 1rem 0.5rem",
            color: "#999999",
          }}
        >
          Org1
        </p>
      ) : (
        <p
          style={{
            textAlign: "left",
            margin: "3rem 0 1rem 0.5rem",
            color: "#999999",
          }}
        >
          --
        </p>
      )}
      <Grid container spacing={2}>
        <Grid item sm={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              background: "#EAEAEA",
              padding: "0.5rem 1.1rem 1.1rem 1.1rem",
            }}
          >
            <ActionsContainer
              user={"Alice"}
              ledger={props.ledger}
              sessionRefs={sessionReferences}
            />
          </Paper>
        </Grid>
        <Grid item sm={12} md={6}>
          <Paper
            elevation={0}
            sx={{
              background: "#EAEAEA",
              padding: "0.5rem 1.1rem 1.1rem 1.1rem",
            }}
          >
            <ActionsContainer
              user={"Charlie"}
              ledger={props.ledger}
              sessionRefs={sessionReferences}
            />
          </Paper>
        </Grid>
      </Grid>
      {props.ledger === "Fabric" ? (
        <p
          style={{
            textAlign: "left",
            margin: "3rem 0 1rem 0.5rem",
            color: "#999999",
          }}
        >
          Org2
        </p>
      ) : (
        <p
          style={{
            textAlign: "left",
            margin: "3rem 0 1rem 0.5rem",
            color: "#999999",
          }}
        >
          --
        </p>
      )}
      <Paper
        elevation={0}
        sx={{
          baground: "#EAEAEA",
          padding: "0.5rem 1.1rem 1.1rem 1.1rem",
        }}
      >
        <ActionsContainer
          user={"Bridge"}
          ledger={props.ledger}
          sessionRefs={sessionReferences}
        />
      </Paper>
      <p>Sessions Status</p>
      <AssetReferencesTable
        ledger={props.ledger}
        sessionRefs={sessionReferences}
      />
    </Paper>
  );
}
