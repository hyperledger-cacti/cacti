import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import SetupGuideLink from "../../../components/ui/SetupGuideLink";
import { SATP_APP_SETUP_GUIDE_URL } from "../hooks";

export interface SatpQueryErrorProps {
  /** What failed to load, e.g. "SATP sessions". */
  what: string;
  /** Gateway the request went to. */
  gatewayUrl?: string;
  error?: unknown;
  onRetry?: () => void;
  /** Disables the retry button while a refetch is in flight. */
  retrying?: boolean;
}

function errorMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }
  return error === undefined || error === null ? undefined : String(error);
}

/**
 * Inline, in-place error state for a failed SATP query: says what failed and
 * where, offers a retry and the setup guide, and leaves the rest of the page
 * (and the shell) usable. Used instead of toasts or full-screen takeovers.
 */
export default function SatpQueryError({
  what,
  gatewayUrl,
  error,
  onRetry,
  retrying = false,
}: SatpQueryErrorProps) {
  const message = errorMessage(error);
  return (
    <Alert
      severity="error"
      variant="outlined"
      role="alert"
      sx={{ marginBottom: 2 }}
      action={
        onRetry && (
          <Button
            color="inherit"
            size="small"
            onClick={onRetry}
            disabled={retrying}
          >
            {retrying ? "Retrying…" : "Retry"}
          </Button>
        )
      }
    >
      <AlertTitle>Could not load {what}</AlertTitle>
      <Stack spacing={0.5} alignItems="flex-start">
        {gatewayUrl && (
          <Typography variant="body2">
            Gateway: <code>{gatewayUrl}</code>
          </Typography>
        )}
        {message && (
          <Typography
            variant="caption"
            sx={{ fontFamily: "monospace", wordBreak: "break-all" }}
          >
            {message}
          </Typography>
        )}
        <SetupGuideLink url={SATP_APP_SETUP_GUIDE_URL} />
      </Stack>
    </Alert>
  );
}
