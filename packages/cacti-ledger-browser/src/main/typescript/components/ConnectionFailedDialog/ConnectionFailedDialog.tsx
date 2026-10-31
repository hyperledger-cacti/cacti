import * as React from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Slide from "@mui/material/Slide";
import Box from "@mui/material/Box";
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
 * Standardized error dialog shown in case of connection error to the
 * app configuration store.
 *
 * The dialog stays actionable on its own: it shows the resolved store URL
 * (never the API key) and links the setup guide, which documents the local
 * one-command profile.
 */
export default function ConnectionFailedDialog() {
  const { supabaseUrl, supabaseSchema } = getLedgerBrowserConfig();

  return (
    <Dialog
      open={true}
      maxWidth="md"
      fullWidth
      TransitionComponent={Transition}
      PaperProps={{
        elevation: 3,
        sx: {
          borderRadius: 2,
          p: 4,
        },
      }}
    >
      <Typography variant="h5" fontWeight="bold" color="error">
        Connection Error
      </Typography>

      <Typography variant="body1" sx={{ marginTop: 2 }}>
        We were unable to connect to the app configuration store
        (Supabase-compatible REST API) backing this GUI.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ marginTop: 1 }}>
        Please follow the setup guide to resolve the issue.
      </Typography>

      <Typography variant="subtitle1" fontWeight="bold" sx={{ marginTop: 3 }}>
        Connection details
      </Typography>
      <ul>
        <li>
          <span style={{ fontWeight: "bold" }}>Store URL:</span> {supabaseUrl}
        </li>
        <li>
          <span style={{ fontWeight: "bold" }}>Schema:</span> {supabaseSchema}
        </li>
      </ul>

      <Typography variant="body2" sx={{ marginTop: 2 }}>
        For local development the zero-config profile is one command (the
        built-in default already points at <code>http://localhost:8000</code>):
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
        tools/docker/ledger-browser-config-postgrest/docker-compose.yml up -d
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
    </Dialog>
  );
}
