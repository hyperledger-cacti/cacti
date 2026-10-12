import * as React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Slide from "@mui/material/Slide";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import { TransitionProps } from "@mui/material/transitions";

import { getLedgerBrowserConfig } from "../../common/runtime-config";

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

/** Ledger browser setup guide (config store options and wiring). */
const SETUP_GUIDE_URL =
  "https://hyperledger-cacti.github.io/cacti/cactus/ledger-browser/setup/";

/**
 * Error dialog that covers entire screen in case of connection error to the
 * app configuration store. Can't be closed or dismissed - it disappears once
 * the store becomes reachable again.
 *
 * The dialog stays actionable on its own: it shows the resolved store URL
 * (never the API key) and links the setup guide, which documents the local
 * one-command profile.
 */
export default function ConnectionFailedDialog() {
  const { supabaseUrl, supabaseSchema } = getLedgerBrowserConfig();

  return (
    <Dialog fullScreen open={true} TransitionComponent={Transition}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "gray",
          flex: 1,
        }}
      >
        <Paper elevation={3} sx={{ margin: 5, padding: 5, width: "100%" }}>
          <Typography variant="h2" fontWeight="bold" color="error">
            Connection Error
          </Typography>

          <Typography variant="h4" sx={{ marginTop: 3 }}>
            We were unable to connect to the app configuration store
            (Supabase-compatible REST API) backing this GUI.
          </Typography>
          <Typography variant="h4" sx={{ marginTop: 3 }}>
            Please follow the setup guide to resolve the issue.
          </Typography>

          <Typography variant="h5" fontWeight="bold" sx={{ marginTop: 4 }}>
            Connection details
          </Typography>
          <ul>
            <li>
              <span style={{ fontWeight: "bold" }}>Store URL:</span>{" "}
              {supabaseUrl}
            </li>
            <li>
              <span style={{ fontWeight: "bold" }}>Schema:</span>{" "}
              {supabaseSchema}
            </li>
          </ul>

          <Typography sx={{ marginTop: 2 }}>
            For local development the zero-config profile is one command (the
            built-in default already points at{" "}
            <code>http://localhost:8000</code>):
          </Typography>
          <Box
            component="pre"
            sx={{
              fontSize: 13,
              margin: 0,
              marginTop: 1,
              padding: 1.5,
              borderRadius: 1,
              bgcolor: "action.hover",
              overflowX: "auto",
            }}
          >
            docker compose -f
            tools/docker/ledger-browser-config-postgrest/docker-compose.yml up
            -d
          </Box>

          <Stack direction="row" spacing={2} sx={{ marginTop: 3 }}>
            <Button
              variant="contained"
              href={SETUP_GUIDE_URL}
              target="_blank"
              rel="noopener"
            >
              Open the setup guide
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Dialog>
  );
}
