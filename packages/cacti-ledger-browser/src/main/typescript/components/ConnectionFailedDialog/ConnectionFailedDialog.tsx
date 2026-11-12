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
export const SETUP_GUIDE_URL =
  "https://hyperledger-cacti.github.io/cacti/latest/cactus/ledger-browser/setup/";

export interface ConnectionFailedDialogProps {
  /** Whether the dialog is shown. Defaults to `true`. */
  open?: boolean;
  /**
   * Dismiss handler. When set, a "Dismiss" button is rendered and the
   * dialog can be closed with Escape / backdrop click, so the user can keep
   * using the shell (the caller is expected to keep a non-modal hint, e.g.
   * an inline `Alert`, visible).
   */
  onClose?: () => void;
  /** Retry handler. When set, a "Retry" button is rendered. */
  onRetry?: () => void;
  /** Disables the retry button while a retry is in flight. */
  retrying?: boolean;
}

/**
 * Standardized error dialog shown in case of connection error to the
 * app configuration store.
 *
 * The dialog stays actionable on its own: it shows the resolved store URL
 * (never the API key) and links the setup guide, which documents the local
 * one-command profile.
 */
export default function ConnectionFailedDialog({
  open = true,
  onClose,
  onRetry,
  retrying = false,
}: ConnectionFailedDialogProps = {}) {
  const { supabaseUrl, supabaseSchema } = getLedgerBrowserConfig();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      aria-labelledby="connection-failed-dialog-title"
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
      <Typography
        id="connection-failed-dialog-title"
        variant="h5"
        fontWeight="bold"
        color="error"
      >
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
        {onRetry && (
          <Button variant="outlined" onClick={onRetry} disabled={retrying}>
            {retrying ? "Retrying…" : "Retry"}
          </Button>
        )}
        {onClose && (
          <Button color="inherit" onClick={onClose}>
            Dismiss
          </Button>
        )}
      </Stack>
    </Dialog>
  );
}
