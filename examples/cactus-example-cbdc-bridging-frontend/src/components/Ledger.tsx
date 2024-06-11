import { useState, useEffect } from "react";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import ActionsContainer from "./ActionsContainer";
import { getAssetReferencesFabric } from "../api-calls/fabric-api";
import { getAssetReferencesBesu } from "../api-calls/besu-api";
import AssetReferencesTable from "./AssetReferencesTable";

export interface ILedgerOptions {
  ledger: string;
}

export default function Ledger(props: ILedgerOptions) {
  const [assetReferences, setAssetReferences] = useState([]);

  useEffect(() => {
    async function fetchData() {
      if (props.ledger === "Fabric") {
        let list = await getAssetReferencesFabric("Alice");
        setAssetReferences(list);
      } else {
        let list = await getAssetReferencesBesu("Alice");
        setAssetReferences(list);
      }
    }

    fetchData();
  }, [props.ledger]);

  return (
    <Paper elevation={1} sx={{
      border: "0.5px solid #000000",
      margin: "auto",
      padding: "0 1rem 1rem 1rem",
    }}>
      <h2>Hyperledger {props.ledger}</h2>
      {props.ledger === "Fabric" ? <p style={{ textAlign: "left", margin: "3rem 0 1rem 0.5rem", color: "#999999"}}>Org1</p> : <p style={{ textAlign: "left", margin: "3rem 0 1rem 0.5rem", color: "#999999"}}>--</p>}
      <Grid container spacing={2}>
        <Grid item sm={12} md={6}>
          <Paper elevation={0} sx={{
            background: "#EAEAEA",
            padding: "0.5rem 1.1rem 1.1rem 1.1rem",
          }}>
            <ActionsContainer
              user={"Alice"}
              ledger={props.ledger}
              assetRefs={assetReferences}
            />
          </Paper>
        </Grid>
        <Grid item sm={12} md={6}>
          <Paper elevation={0} sx={{
            background: "#EAEAEA",
            padding: "0.5rem 1.1rem 1.1rem 1.1rem",
          }}>
            <ActionsContainer
              user={"Charlie"}
              ledger={props.ledger}
              assetRefs={assetReferences}
            />
          </Paper>
        </Grid>
      </Grid>
      {props.ledger === "Fabric" ? <p style={{ textAlign: "left", margin: "3rem 0 1rem 0.5rem", color: "#999999"}}>Org2</p> : <p style={{ textAlign: "left", margin: "3rem 0 1rem 0.5rem", color: "#999999"}}>--</p>}
      <Paper elevation={0} sx={{
            baground: "#EAEAEA",
            padding: "0.5rem 1.1rem 1.1rem 1.1rem",
      }}>
        <ActionsContainer
          user={"Bridge"}
          ledger={props.ledger}
          assetRefs={assetReferences}
        />
      </Paper>
      <p>Asset References</p>
      <AssetReferencesTable ledger={props.ledger} assetRefs={assetReferences} />
    </Paper>
  );
}