import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { Grid } from "@mui/material";
import DummyActionsContainer from "../components/docs/DummyActionsContainer";
import { NormalButton } from "../components/buttons/NormalButton";
import { CriticalButton } from "../components/buttons/CriticalButton";

export default function Helper() {
  return (
    <Box sx={{ margin: "0 20rem 0 20rem" }}>
      <Typography sx={{ marginTop: "6rem" }} align="center" variant="h4">
        Instructions
      </Typography>
      <Typography sx={{ marginTop: "2rem" }} align="left" variant="h6">
        This application is a demonstration of a Central Bank Digital Currency
        (CBDC) bridging solution between two blockchains (Hyperledger Fabric and
        Hyperledger Besu) using the Secure Asset Transfer Protocol (SATP). The
        application allows users to transfer tokens between the two blockchains.
      </Typography>

      <Typography sx={{ marginTop: "3rem" }} align="center" variant="h4">
        How to Use
      </Typography>
      <Typography sx={{ marginTop: "2rem" }} align="left" variant="h6">
        Each user starts with a balance of 0 CBDC tokens on both Fabric and
        Besu. Each user has a box that displays the user's name, the balance of
        CBDC tokens, and the actions that the user can perform. The actions have
        different colors based on being related to local actions (i.e., in the
        same blockchain) (in blue) or related to cross-chain functionality
        (red).
      </Typography>
      <Box sx={{ marginTop: "2rem", marginBottom: "2rem" }}>
        <DummyActionsContainer />
      </Box>
      <Grid container spacing={3} alignItems="top" justifyContent="top">
        <Grid item lg={2}>
          <NormalButton variant="contained">Mint</NormalButton>
        </Grid>
        <Grid item lg={10} sx={{ textAlign: "right" }}>
          <Typography align="left" variant="h6">
            To mint tokens to the user's account, click on the "Mint" button and
            enter the amount of tokens to mint.
          </Typography>
        </Grid>
        <Grid item lg={2}>
          <NormalButton variant="contained">Transfer</NormalButton>
        </Grid>
        <Grid item lg={10} sx={{ textAlign: "right" }}>
          <Typography align="left" variant="h6">
            The "Transfer" button allows the user to transfer a certain amount
            of tokens in the same blockchain -- i.e., in the context of the same
            smart contract. Select the recipient of the tokens and the amount to
            transfer. The amount of tokens to transfer is capped by the user's
            balance. The Transfer button is disabled if the user has no tokens.
          </Typography>
        </Grid>
        <Grid item lg={2}>
          <CriticalButton variant="contained">Approval</CriticalButton>
        </Grid>
        <Grid item lg={10} sx={{ textAlign: "right" }}>
          <Typography align="left" variant="h6">
            The "Approval" button is used to approve the bridge to spend tokens
            on on behalf of the user. This is a necessary step before initiating
            cross-chain interaction. The approval button is disabled if the user
            has no tokens.
          </Typography>
        </Grid>
        <Grid item lg={2}>
          <CriticalButton variant="contained">Bridge</CriticalButton>
        </Grid>
        <Grid item lg={10} sx={{ textAlign: "right" }}>
          <Typography align="left" variant="h6">
            The "Bridge" button is used to transfer tokens between the two
            blockchains using SATP. The bridge button is disabled if the user
            has no tokens or if the user has not approved the bridge to spend
            tokens on behalf of the user. The user must select the amount of
            tokens to transfer and the recipient's address. The amount is capped
            by the amount of tokens the user has approved the bridge to spend.
            Once this action is executed, the user's balance is updated on both
            blockchains and the id and status of the session are displayed on
            the screen.
          </Typography>
        </Grid>
      </Grid>

      <Typography sx={{ marginTop: "3rem" }} align="center" variant="h4">
        Other Relevant Resources
      </Typography>
      <Typography sx={{ marginTop: "2rem" }} align="left" variant="h6">
        For more information, visit the following resources:
        <ul>
          <li>
            <a href="https://datatracker.ietf.org/doc/draft-ietf-satp-core/05/">
              SATP Core Draft Specification
            </a>
          </li>
          <li>
            <a href="https://ieeexplore.ieee.org/document/10174953">
              CBDC Bridging between Hyperledger Fabric and Permissioned
              EVM-based Blockchains
            </a>
          </li>
        </ul>
      </Typography>
    </Box>
  );
}
