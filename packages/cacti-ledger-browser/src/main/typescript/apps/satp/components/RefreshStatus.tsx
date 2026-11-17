import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import React from "react";

import { formatAbsoluteTime, formatRelativeTime } from "../format";

/**
 * Live refresh indicator for polled views: shows how old the displayed data
 * is ("Updated 12s ago", ticking) and the honest polling state - `live`
 * while healthy, `refreshing` during a fetch, `backing off` while the
 * endpoint keeps failing (the polling backoff then stretches the interval,
 * so a fixed "every Ns" caption would be a lie).
 *
 * `nowMs` exists for tests; production ticks once per second.
 */
export default function RefreshStatus({
  updatedAtMs,
  isError,
  isFetching,
  nowMs,
}: {
  /** `dataUpdatedAt` of the backing react-query query. */
  updatedAtMs?: number;
  isError: boolean;
  isFetching: boolean;
  nowMs?: number;
}) {
  const [tickedNow, setTickedNow] = React.useState<number>(nowMs ?? Date.now());

  React.useEffect(() => {
    if (nowMs !== undefined) {
      return; // deterministic mode for tests - no ticking
    }
    const timer = window.setInterval(() => setTickedNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [nowMs]);

  const now = nowMs ?? tickedNow;

  const age =
    updatedAtMs === undefined || updatedAtMs === 0 ? (
      "not updated yet"
    ) : (
      <Tooltip title={formatAbsoluteTime(updatedAtMs)}>
        <span>Updated {formatRelativeTime(updatedAtMs, now)}</span>
      </Tooltip>
    );

  const chip = isFetching ? (
    <Chip size="small" variant="outlined" color="info" label="refreshing" />
  ) : isError ? (
    <Chip size="small" color="warning" label="backing off" />
  ) : (
    <Chip size="small" variant="outlined" color="success" label="live" />
  );

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="caption" color="text.secondary">
        {age}
      </Typography>
      {chip}
    </Stack>
  );
}
