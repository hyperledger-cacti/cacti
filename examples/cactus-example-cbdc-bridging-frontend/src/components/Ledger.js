import React, { useState, useEffect } from "react";
import makeStyles from "@mui/styles/makeStyles";

import AssetReferencesTable from "./AssetReferencesTable";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import ActionsContainer from "./ActionsContainer";
import { getAssetReferencesFabric } from "../api-calls/fabric-api";
import { getAssetReferencesBesu } from "../api-calls/besu-api";

const useStyles = makeStyles(() => ({
  container: {
    width: "95%",
  },
  paper: {
    border: "0.5px solid #000000",
    margin: "auto",
    padding: "0 1rem 1rem 1rem",
  },
  button: {
    margin: "auto",
    width: "130px",
  },
  buttonItem: {
    width: "130px",
  },
  userContainer: {
    background: "#EAEAEA",
    padding: "0.5rem 1.1rem 1.1rem 1.1rem",
  },
  spacing: {
    marginTop: "5rem",
  },
  label: {
    textAlign: "left",
    margin: "3rem 0 1rem 0.5rem",
    color: "#999999",
  },
}));

export default function Ledger(props) {
  const classes = useStyles();
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
    <Paper elevation={1} className={classes.paper}>
      <h2>Hyperledger {props.ledger}</h2>
      {props.ledger === "Fabric" ? (
        <p className={classes.label}>Org1</p>
      ) : (
        <div className={classes.spacing}></div>
      )}
      <Grid container spacing={2}>
        <Grid item sm={12} md={6}>
          <Paper elevation={0} className={classes.userContainer}>
            <ActionsContainer
              user={"Alice"}
              ledger={props.ledger}
              assetRefs={assetReferences}
            />
          </Paper>
        </Grid>
        <Grid item sm={12} md={6}>
          <Paper elevation={0} className={classes.userContainer}>
            <ActionsContainer
              user={"Charlie"}
              ledger={props.ledger}
              assetRefs={assetReferences}
            />
          </Paper>
        </Grid>
      </Grid>
      {props.ledger === "Fabric" ? (
        <p className={classes.label}>Org2</p>
      ) : (
        <div className={classes.spacing}></div>
      )}
      <Paper elevation={0} className={classes.userContainer}>
        <ActionsContainer
          user={"Bridge"}
          ledger={props.ledger}
          assetRefs={assetReferences}
        />
      </Paper>
      <p className={classes.label}>Asset References</p>
      <AssetReferencesTable ledger={props.ledger} assetRefs={assetReferences} />
    </Paper>
  );
}
