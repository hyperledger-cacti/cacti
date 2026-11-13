import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";

import { getLedgerBrowserConfig } from "../../common/runtime-config";
import SettingsDialog from "../Settings/SettingsDialog";

/** Ledger browser setup guide (config store options and wiring). */
export const SETUP_GUIDE_URL =
  "https://hyperledger-cacti.github.io/cacti/latest/cactus/ledger-browser/setup/";

export interface ConnectionFailedDialogProps {
  /** Whether the dialog is shown. Defaults to `true`. */
  open?: boolean;
  /**
   * Dismiss handler. When set, the dialog can be closed (close button,
   * "Dismiss", Escape, backdrop click), so the user can keep using the shell;
   * the caller keeps a non-modal hint (an inline banner) visible.
   */
  onClose?: () => void;
  /** Retry handler. When set, a "Retry" button is rendered. */
  onRetry?: () => void;
  /** Disables the retry button while a retry is in flight. */
  retrying?: boolean;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1}>
      <Typography variant="body2" fontWeight={600} sx={{ minWidth: 88 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontFamily="monospace">
        {value}
      </Typography>
    </Stack>
  );
}

/**
 * Standardized error dialog shown when the app configuration store cannot
 * be reached. Self-actionable: shows the resolved store URL (never the API
 * key), the one-command local profile, the setup guide, and lets the user
 * change the connection, retry or dismiss.
 */
export default function ConnectionFailedDialog({
  open = true,
  onClose,
  onRetry,
  retrying = false,
}: ConnectionFailedDialogProps = {}) {
  const { supabaseUrl, supabaseSchema } = getLedgerBrowserConfig();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        aria-labelledby="connection-failed-dialog-title"
      >
        <DialogTitle
          id="connection-failed-dialog-title"
          color="error"
          sx={{ pr: onClose ? 6 : undefined }}
        >
          Connection Error
          {onClose && (
            <IconButton
              aria-label="close"
              onClick={onClose}
              sx={{ position: "absolute", right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body1">
              We were unable to connect to the app configuration store
              (Supabase-compatible REST API) backing this GUI.
            </Typography>
            <Stack spacing={0.5}>
              <Typography variant="subtitle2">Connection details</Typography>
              <DetailRow label="Store URL" value={supabaseUrl} />
              <DetailRow label="Schema" value={supabaseSchema} />
            </Stack>
            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                For local development the zero-config profile is one command
                (the built-in default already points at http://localhost:8000):
              </Typography>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 1.5,
                  fontSize: 13,
                  borderRadius: 1,
                  bgcolor: "background.default",
                  border: 1,
                  borderColor: "divider",
                  overflowX: "auto",
                }}
              >
                docker compose -f
                tools/docker/ledger-browser-config-postgrest/docker-compose.yml
                up -d
              </Box>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ flexWrap: "wrap", gap: 1, px: 3, py: 1.5 }}>
          {onClose && (
            <Button color="inherit" onClick={onClose} sx={{ mr: "auto" }}>
              Dismiss
            </Button>
          )}
          <Button
            variant="contained"
            href={SETUP_GUIDE_URL}
            target="_blank"
            rel="noopener"
          >
            Open the setup guide
          </Button>
          <Button variant="outlined" onClick={() => setSettingsOpen(true)}>
            Change connection
          </Button>
          {onRetry && (
            <Button variant="outlined" onClick={onRetry} disabled={retrying}>
              {retrying ? "Retrying…" : "Retry"}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
