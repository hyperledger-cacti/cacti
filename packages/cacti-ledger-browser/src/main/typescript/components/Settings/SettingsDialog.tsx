import { useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";

import {
  CONNECTION_OVERRIDE_STORAGE_KEY,
  getLedgerBrowserConfig,
  getLedgerBrowserConfigSources,
  saveConnectionOverride,
  type LedgerBrowserConfigSource,
} from "../../common/runtime-config";

const SOURCE_LABELS: Record<LedgerBrowserConfigSource, string> = {
  browser: "set in this browser",
  runtime: "from config.js",
  env: "from the build",
  default: "built-in default",
};

/** localStorage prefixes of per-viewer preferences (gateways, polling, UI). */
const LOCAL_PREFERENCE_PREFIXES = ["cacti.satp.", "cacti_satp_"];

/** Removes this browser's saved preferences; returns how many were removed. */
export function clearLocalPreferences(): number {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && LOCAL_PREFERENCE_PREFIXES.some((p) => key.startsWith(p))) {
        keys.push(key);
      }
    }
    keys.forEach((key) => localStorage.removeItem(key));
    return keys.length;
  } catch {
    return 0;
  }
}

function hasStoredOverride(): boolean {
  try {
    return localStorage.getItem(CONNECTION_OVERRIDE_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  /** Called after a connection change was saved (defaults to a page reload). */
  onConnectionSaved?: () => void;
}

/**
 * Ledger browser settings: which configuration store the shell connects to
 * (and where that value came from), a manual connection override kept in
 * this browser, and resetting this browser's saved preferences.
 */
export default function SettingsDialog({
  open,
  onClose,
  onConnectionSaved = () => window.location.reload(),
}: SettingsDialogProps) {
  const config = getLedgerBrowserConfig();
  const sources = getLedgerBrowserConfigSources();
  const [url, setUrl] = useState(config.supabaseUrl);
  const [schema, setSchema] = useState(config.supabaseSchema);
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | undefined>();

  const save = () => {
    setError(undefined);
    const rejection = saveConnectionOverride({
      supabaseUrl: url.trim(),
      supabaseSchema: schema.trim(),
      ...(key.trim() ? { supabaseKey: key.trim() } : {}),
    });
    if (rejection) {
      setError(rejection);
      return;
    }
    onConnectionSaved();
  };

  const useDefault = () => {
    saveConnectionOverride(null);
    onConnectionSaved();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="settings-dialog-title"
    >
      <DialogTitle
        id="settings-dialog-title"
        sx={{ display: "flex", alignItems: "center", pr: 6 }}
      >
        Settings
        <IconButton
          aria-label="close settings"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Stack spacing={0.5}>
            <Typography variant="h6" component="h3">
              Configuration store
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The Supabase-compatible REST API that stores the installed apps.
              Currently{" "}
              <Typography component="code" variant="body2" fontFamily="monospace">
                {config.supabaseUrl}
              </Typography>{" "}
              <Chip
                size="small"
                variant="outlined"
                label={SOURCE_LABELS[sources.supabaseUrl]}
              />
            </Typography>
          </Stack>
          <TextField
            size="small"
            label="Store URL"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            fullWidth
          />
          <TextField
            size="small"
            label="Schema"
            value={schema}
            onChange={(event) => setSchema(event.target.value)}
            fullWidth
          />
          <TextField
            size="small"
            type="password"
            label="API key (optional)"
            helperText="Leave empty to keep the current key. The key is never shown."
            value={key}
            onChange={(event) => setKey(event.target.value)}
            autoComplete="off"
            fullWidth
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={save}>
              Save and reconnect
            </Button>
            {hasStoredOverride() && (
              <Button onClick={useDefault}>Use the deployment default</Button>
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Saved in this browser only. Deployments set the store for everyone
            with <code>config.js</code> or <code>VITE_SUPABASE_URL</code>.
          </Typography>

          <Divider />

          <Stack spacing={1} alignItems="flex-start">
            <Typography variant="h6" component="h3">
              Saved preferences
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gateways added in this browser, gateway selections and live
              polling settings of every app.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              onClick={() => {
                const removed = clearLocalPreferences();
                setNotice(
                  removed > 0
                    ? `Removed ${removed} saved preference${removed === 1 ? "" : "s"}. Reload to apply.`
                    : "Nothing saved in this browser.",
                );
              }}
            >
              Reset saved preferences
            </Button>
            {notice && <Alert severity="info">{notice}</Alert>}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
