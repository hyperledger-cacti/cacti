import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import { NormalButton } from "../buttons/NormalButton";
import { CriticalButton } from "../buttons/CriticalButton";

export default function DummyActionsContainer() {
  return (
    <Paper
      elevation={0}
      sx={{
        background: "#EAEAEA",
        padding: "0.5rem 1.1rem 1.1rem 1.1rem",
        maxWidth: "25rem",
        margin: "auto",
      }}
    >
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
          <span>{"User A"}</span>
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
          <span>XXX CBDC</span>
        </Grid>
        <Grid item xs={12} lg={6}>
          <NormalButton variant="contained">Mint</NormalButton>
        </Grid>
        <Grid item xs={12} lg={6}>
          <NormalButton variant="contained">Transfer</NormalButton>
        </Grid>
        <Grid item xs={12} lg={6}>
          <CriticalButton variant="contained">Approval</CriticalButton>
        </Grid>
        <Grid item xs={12} lg={6}>
          <CriticalButton variant="contained">Bridge</CriticalButton>
        </Grid>
      </Grid>
    </Paper>
  );
}
