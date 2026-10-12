import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import SearchIcon from "@mui/icons-material/Search";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";

import PageTitle from "../../../components/ui/PageTitle";
import ShortenedTypography from "../../../components/ui/ShortenedTypography";
import {
  StyledTableCell,
  StyledTableCellHeader,
} from "../../../components/ui/UITableListing/StyledTableCell";
import { ClickableTableRow } from "../../../components/ui/UITableListing/ClickableTableRow";
import SectionTitle from "../components/SectionTitle";
import { useSatpOptions } from "../hooks";
import { satpAnalyticsQuery, satpMessageLogQuery } from "../queries";
import { stageLabel, type SatpMessageLogEntry } from "../transform";

const MONOSPACE = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

type StageFilter = "all" | "rollback" | "0" | "1" | "2" | "3";

const STAGE_FILTER_LABELS: Record<StageFilter, string> = {
  all: "All stages",
  rollback: "Rollback",
  "0": "Stage 0",
  "1": "Stage 1",
  "2": "Stage 2",
  "3": "Stage 3",
};

function MessageRowCells({ entry }: { entry: SatpMessageLogEntry }) {
  return (
    <>
      <StyledTableCell>
        <Box sx={{ fontFamily: MONOSPACE, fontSize: 12 }}>
          <ShortenedTypography text={entry.sessionId} maxWidth={220} />
        </Box>
      </StyledTableCell>
      <StyledTableCell>
        <Typography
          variant="body2"
          sx={{ fontFamily: MONOSPACE, color: "text.secondary" }}
        >
          #{entry.sequenceNumber}
        </Typography>
      </StyledTableCell>
      <StyledTableCell>
        <Stack direction="row" spacing={0.75} alignItems="center">
          {entry.stage !== undefined && (
            <Chip
              label={`S${entry.stage}`}
              size="small"
              color={entry.rollback ? "warning" : "primary"}
              variant="outlined"
              sx={{ height: 20, fontSize: 11 }}
            />
          )}
          {entry.rollback && (
            <Chip
              label="rollback"
              size="small"
              color="warning"
              variant="outlined"
              sx={{ height: 20, fontSize: 11 }}
            />
          )}
        </Stack>
      </StyledTableCell>
      <StyledTableCell>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {entry.type}
        </Typography>
      </StyledTableCell>
      <StyledTableCell>
        <Typography variant="body2" color="text.secondary">
          {entry.operation || "—"}
        </Typography>
      </StyledTableCell>
      <StyledTableCell>
        <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
          {entry.timestampMs
            ? new Date(entry.timestampMs).toLocaleString()
            : "—"}
        </Typography>
      </StyledTableCell>
    </>
  );
}

/**
 * Cross-session message log: every SATP protocol message recorded in the
 * audit window (newest first), with stage attribution and filters. Click a
 * row to open the session timeline at that message.
 */
export default function MessagesPage() {
  const options = useSatpOptions();
  const navigate = useNavigate();
  const log = useQuery(satpMessageLogQuery(options));
  const analytics = useQuery(satpAnalyticsQuery(options));

  const [search, setSearch] = React.useState("");
  const [stageFilter, setStageFilter] = React.useState<StageFilter>("all");

  const entries = log.data ?? [];
  const filtered = entries.filter((entry) => {
    if (stageFilter === "rollback" && !entry.rollback) {
      return false;
    }
    if (
      stageFilter !== "all" &&
      stageFilter !== "rollback" &&
      entry.stage !== Number(stageFilter)
    ) {
      return false;
    }
    if (search) {
      const needle = search.toLowerCase();
      return (
        entry.sessionId.toLowerCase().includes(needle) ||
        entry.type.toLowerCase().includes(needle) ||
        (entry.operation ?? "").toLowerCase().includes(needle)
      );
    }
    return true;
  });

  return (
    <Box>
      <PageTitle>Messages</PageTitle>

      <SectionTitle>Message Types</SectionTitle>
      <Grid container spacing={1.5} sx={{ marginBottom: 3 }}>
        {log.isPending &&
          [0, 1, 2, 3].map((i) => (
            <Grid item xs={6} sm={3} key={i}>
              <Skeleton variant="rounded" height={80} />
            </Grid>
          ))}
        {!log.isPending &&
          (analytics.data?.messageTypeStats ?? []).slice(0, 8).map((stat) => (
            <Grid item xs={6} sm={3} key={stat.type}>
              <Card variant="outlined">
                <CardContent
                  sx={{ paddingY: 1.5, "&:last-child": { paddingBottom: 1.5 } }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    sx={{ display: "block" }}
                    title={stat.type}
                  >
                    {stat.type}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="baseline">
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {stat.count}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      in {stat.sessionCount} session(s)
                      {stat.stage !== undefined
                        ? ` · ${stageLabel(stat.stage)}`
                        : ""}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
      </Grid>

      <SectionTitle>Execution Log</SectionTitle>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ sm: "center" }}
        sx={{ marginBottom: 1.5 }}
      >
        <TextField
          size="small"
          placeholder="Filter by session, type or operation…"
          inputProps={{ "aria-label": "Filter messages" }}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          sx={{ minWidth: 320 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ flexWrap: "wrap", rowGap: 0.75 }}
        >
          {(Object.keys(STAGE_FILTER_LABELS) as StageFilter[]).map((filter) => (
            <Chip
              key={filter}
              label={STAGE_FILTER_LABELS[filter]}
              size="small"
              color={stageFilter === filter ? "primary" : "default"}
              variant={stageFilter === filter ? "filled" : "outlined"}
              onClick={() => setStageFilter(filter)}
            />
          ))}
        </Stack>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="caption" color="text.secondary">
          {filtered.length} of {entries.length} messages · newest first
        </Typography>
      </Stack>

      <TableContainer component={Paper}>
        <Table size="small" aria-label="satp message log">
          <TableHead>
            <TableRow>
              <StyledTableCellHeader>Session</StyledTableCellHeader>
              <StyledTableCellHeader>Seq</StyledTableCellHeader>
              <StyledTableCellHeader>Stage</StyledTableCellHeader>
              <StyledTableCellHeader>Message Type</StyledTableCellHeader>
              <StyledTableCellHeader>Operation</StyledTableCellHeader>
              <StyledTableCellHeader>Recorded At</StyledTableCellHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {log.isPending &&
              [0, 1, 2, 3, 4].map((i) => (
                <TableRow key={`skeleton-${i}`}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <StyledTableCell key={j}>
                      <Skeleton variant="text" width={110} height={24} />
                    </StyledTableCell>
                  ))}
                </TableRow>
              ))}
            {!log.isPending &&
              filtered.map((entry) => (
                <ClickableTableRow
                  key={`${entry.sessionId}-${entry.sequenceNumber}-${entry.auditEntryId ?? ""}`}
                  onClick={() =>
                    navigate(
                      `../session/${encodeURIComponent(entry.sessionId)}`,
                    )
                  }
                >
                  <MessageRowCells entry={entry} />
                </ClickableTableRow>
              ))}
            {!log.isPending && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ paddingY: 3, textAlign: "center" }}
                  >
                    No messages match the current filters.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", marginTop: 1 }}
      >
        Each row is one SATP protocol message recorded by this gateway. Click a
        row to inspect the session timeline, proofs and snapshot at that step.
      </Typography>
    </Box>
  );
}
