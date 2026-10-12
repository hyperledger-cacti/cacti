/**
 * Minimal typed error boundary guarding plugin-app render trees.
 *
 * The ledger browser renders user-installable apps (`gui_app_config`
 * instances) inside the shell's React tree. A crashing app - a broken
 * third-party component, an unexpected data shape reaching render code -
 * must not take the whole shell down. This boundary catches render and
 * lifecycle errors of its subtree and swaps in a controlled fallback,
 * keeping the rest of the UI (header, navigation, other app cards) alive.
 *
 * Offers the app setup guide next to error states: `setupGuideURL` is rendered through `SetupGuideLink`, which
 * itself renders nothing for unset/invalid URLs, so app-provided values can
 * be passed through unguarded.
 */
import React from "react";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import SetupGuideLink from "./SetupGuideLink";

export interface ErrorBoundaryProps {
  /**
   * Human-readable name of the guarded subtree (typically the app instance
   * name), shown in the fallback headline.
   */
  contextLabel?: string;
  /**
   * Optional full URL of the app setup guide. Rendered next to the fallback
   * only when it is a valid URL (the `SetupGuideLink` guard).
   */
  setupGuideURL?: string;
  children?: React.ReactNode;
}

interface ErrorBoundaryState {
  /** The caught error, or `undefined` while the subtree renders normally. */
  caught: Error | undefined;
}

/**
 * Class-based React error boundary (error boundaries require class
 * components - there is no hook equivalent). Place one around every
 * third-party app subtree (`CactiLedgerBrowserApp` route elements, home-page
 * app cards) and one around the shell itself as a last resort.
 */
export default class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { caught: undefined };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    // Normalize non-Error throwables (plugin code may `throw "string"` or
    // reject with undefined) so the fallback can always render a message.
    return {
      caught: error instanceof Error ? error : new Error(String(error)),
    };
  }

  componentDidCatch(error: unknown): void {
    // Keep a breadcrumb in the console for debugging; rendering stays
    // controlled and the shell keeps running.
    console.error("ErrorBoundary caught an error:", error);
  }

  render(): React.ReactNode {
    const { caught } = this.state;
    const { children, contextLabel, setupGuideURL } = this.props;

    if (caught === undefined) {
      return children ?? null;
    }

    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <AlertTitle>
          {contextLabel
            ? `${contextLabel} could not be rendered`
            : "This view could not be rendered"}
        </AlertTitle>
        <Stack spacing={1} alignItems="flex-start">
          <Typography variant="body2">
            An unexpected error occurred while rendering this application. The
            rest of the ledger browser is still available.
          </Typography>
          <Typography
            variant="caption"
            sx={{ fontFamily: "monospace", wordBreak: "break-all" }}
          >
            {caught.message}
          </Typography>
          <SetupGuideLink url={setupGuideURL} />
        </Stack>
      </Alert>
    );
  }
}
