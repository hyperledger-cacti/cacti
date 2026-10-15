import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
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
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import RefreshIcon from "@mui/icons-material/Refresh";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";

import { useNotification } from "../../../common/context/NotificationContext";
import PageTitle from "../../../components/ui/PageTitle";
import ShortenedTypography from "../../../components/ui/ShortenedTypography";
import {
  StyledTableCell,
  StyledTableCellHeader,
} from "../../../components/ui/UITableListing/StyledTableCell";
import { ClickableTableRow } from "../../../components/ui/UITableListing/ClickableTableRow";
import StatusChip from "../components/StatusChip";
import SectionTitle from "../components/SectionTitle";
import RefreshStatus from "../components/RefreshStatus";
import { formatAbsoluteTime, formatRelativeTime } from "../format";
import { SATP_APP_SETUP_GUIDE_URL, useSatpOptions } from "../hooks";
import { satpSessionsQuery } from "../queries";
import {
  BUCKET_KPI_KEY,
  BUCKET_LABELS,
  SESSION_BUCKETS,
  filterSessions,
  sessionKpis,
  sortSessions,
  type SessionBucket,
  type SessionSort,
  type SessionSortField,
} from "../sessions-view";
import SetupGuideLink from "../../../components/ui/SetupGuideLink";
import type { SatpSessionRow } from "../transform";

const MONOSPACE = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

function LedgerPath({ row }: { row: SatpSessionRow }) {
  if (!row.sourceLedger && !row.destinationLedger) {
    return <Typography variant="body2">—</Typography>;
  }
  return (
    <Stack
      direction="row"
      spacing={0.75}
      alignItems="center"
      sx={{ color: "text.primary" }}
    >
      <Typography variant="body2" noWrap sx={{ maxWidth: 130 }}>
        {row.sourceLedger ?? "unknown"}
      </Typography>
      <ArrowForwardIcon fontSize="inherit" sx={{ color: "primary.main" }} />
      <Typography variant="body2" noWrap sx={{ maxWidth: 130 }}>
        {row.destinationLedger ?? "unknown"}
      </Typography>
    </Stack>
  );
}

function SessionRowCells({ row }: { row: SatpSessionRow }) {
  return (
    <>
      <StyledTableCell>
        <Box sx={{ fontFamily: MONOSPACE, fontSize: 13 }}>
          <ShortenedTypography text={row.sessionId} maxWidth={260} />
        </Box>
      </StyledTableCell>
      <StyledTableCell>
        <Stack spacing={0.5} alignItems="flex-start">
          <StatusChip value={row.status} />
          <StatusChip value={row.stateLabel} />
        </Stack>
      </StyledTableCell>
      <StyledTableCell>
        <StatusChip value={row.substatus} />
      </StyledTableCell>
      <StyledTableCell>
        {row.stage ? (
          <StatusChip value={row.stage} />
        ) : (
          <Typography variant="body2">—</Typography>
        )}
      </StyledTableCell>
      <StyledTableCell>
        <LedgerPath row={row} />
      </StyledTableCell>
      <StyledTableCell>
        {row.assetId ? (
          <ShortenedTypography
            text={row.assetId}
            maxWidth={150}
            variant="body2"
          />
        ) : (
          <Typography variant="body2">—</Typography>
        )}
      </StyledTableCell>
      <StyledTableCell>
        {row.lastActivityMs !== undefined ? (
          <Tooltip title={formatAbsoluteTime(row.lastActivityMs)}>
            <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
              {formatRelativeTime(row.lastActivityMs)}
            </Typography>
          </Tooltip>
        ) : (
          <Typography variant="body2">—</Typography>
        )}
      </StyledTableCell>
      <StyledTableCell>
        <Tooltip title="Audit events (proofs) recorded for this session">
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {row.eventCount}
          </Typography>
        </Tooltip>
      </StyledTableCell>
    </>
  );
}

function LoadingRows({ rows, columns }: { rows: number; columns: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <TableRow key={`skeleton-${rowIndex}`}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <StyledTableCell key={`skeleton-${rowIndex}-${colIndex}`}>
              <Skeleton
                variant="text"
                width={colIndex % 3 === 0 ? 180 : 90}
                height={24}
              />
            </StyledTableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

/**
 * KPI summary card doubling as the bucket filter: clicking a card filters
 * the table to that outcome; clicking the selected card again clears back
 * to `all`. Zero-count cards stay clickable (they clear the filter).
 */
function KpiCard({
  label,
  value,
  selected,
  onClick,
}: {
  label: string;
  value: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: "100%",
        borderRadius: "8px",
        borderColor: selected ? "primary.main" : "var(--cacti-ink-100, #dfe5e3)",
        bgcolor: selected ? "var(--cacti-green-100, #e6f2e7)" : "background.paper",
        boxShadow: selected ? "0 1px 3px rgba(78, 140, 94, 0.2)" : "0 1px 2px rgba(16, 19, 20, 0.08)",
        transition: "all 0.15s ease-in-out",
      }}
    >
      <CardActionArea
        onClick={onClick}
        aria-pressed={selected}
        sx={{ height: "100%", p: 1.5 }}
      >
        <Stack spacing={0.25}>
          <Typography
            variant="h5"
            component="div"
            sx={{
              fontWeight: 700,
              fontFamily: '"Barlow", Arial, sans-serif',
              color: selected ? "primary.dark" : "text.primary",
            }}
          >
            {value}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 600,
              color: selected ? "primary.dark" : "text.secondary",
            }}
          >
            {label}
          </Typography>
        </Stack>
      </CardActionArea>
    </Card>
  );
}

function SortableHeaderCell({
  label,
  field,
  sort,
  onSort,
}: {
  label: string;
  field: SessionSortField;
  sort: SessionSort;
  onSort: (field: SessionSortField) => void;
}) {
  const active = sort.field === field;
  return (
    <StyledTableCellHeader>
      <TableSortLabel
        active={active}
        direction={active ? sort.direction : "asc"}
        onClick={() => onSort(field)}
      >
        {label}
      </TableSortLabel>
    </StyledTableCellHeader>
  );
}

/**
 * Lists SATP transfer sessions known to the gateway, most recently active
 * first. Rows link to the session detail view; KPI cards filter by outcome,
 * the search box narrows by any text field, and columns are sortable.
 */
export default function SessionsPage() {
  const options = useSatpOptions();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const {
    isError,
    isPending,
    data,
    error,
    refetch,
    dataUpdatedAt,
    isFetching,
  } = useQuery(satpSessionsQuery(options));

  const [query, setQuery] = React.useState("");
  const [bucket, setBucket] = React.useState<SessionBucket>("all");
  const [sort, setSort] = React.useState<SessionSort>({
    field: "lastActivity",
    direction: "desc",
  });

  React.useEffect(() => {
    isError &&
      showNotification(`Could not fetch SATP sessions: ${error}`, "error");
  }, [isError]);

  const rows = data ?? [];
  const kpis = sessionKpis(rows);
  const visible = sortSessions(filterSessions(rows, { query, bucket }), sort);

  const onSort = (field: SessionSortField) => {
    setSort((current) =>
      current.field === field
        ? {
            field,
            direction: current.direction === "asc" ? "desc" : "asc",
          }
        : { field, direction: "asc" },
    );
  };

  return (
    <Box>
      <PageTitle>SATP Sessions</PageTitle>

      <Grid container spacing={1.5} sx={{ marginBottom: 2 }}>
        {SESSION_BUCKETS.map((bucketKey) => (
          <Grid item xs={6} sm={4} lg key={bucketKey}>
            <KpiCard
              label={BUCKET_LABELS[bucketKey]}
              value={kpis[BUCKET_KPI_KEY[bucketKey]]}
              selected={bucket === bucketKey}
              onClick={() =>
                setBucket((current) =>
                  current === bucketKey ? "all" : bucketKey,
                )
              }
            />
          </Grid>
        ))}
      </Grid>

      <SectionTitle
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              placeholder="Search sessions"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              sx={{ width: 260 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <RefreshStatus
              updatedAtMs={dataUpdatedAt}
              isError={isError}
              isFetching={isFetching}
            />
            <Tooltip title="Refresh now">
              <IconButton
                size="small"
                aria-label="refresh sessions"
                onClick={() => refetch()}
              >
                <RefreshIcon fontSize="inherit" />
              </IconButton>
            </Tooltip>
          </Stack>
        }
      >
        Transfers ({visible.length}
        {visible.length !== rows.length ? ` of ${rows.length}` : ""})
      </SectionTitle>

      <TableContainer component={Paper} sx={{ marginBottom: 1 }}>
        <Table sx={{ minWidth: 900 }} size="small" aria-label="satp sessions">
          <TableHead>
            <TableRow>
              <SortableHeaderCell
                label="Session ID"
                field="sessionId"
                sort={sort}
                onSort={onSort}
              />
              <SortableHeaderCell
                label="Status"
                field="state"
                sort={sort}
                onSort={onSort}
              />
              <StyledTableCellHeader>Substatus</StyledTableCellHeader>
              <StyledTableCellHeader>Stage</StyledTableCellHeader>
              <StyledTableCellHeader>Ledger Path</StyledTableCellHeader>
              <StyledTableCellHeader>Asset</StyledTableCellHeader>
              <SortableHeaderCell
                label="Last Activity"
                field="lastActivity"
                sort={sort}
                onSort={onSort}
              />
              <SortableHeaderCell
                label="Events"
                field="eventCount"
                sort={sort}
                onSort={onSort}
              />
            </TableRow>
          </TableHead>
          <TableBody>
            {isPending && <LoadingRows rows={5} columns={8} />}
            {!isPending &&
              visible.map((row) => (
                <ClickableTableRow
                  key={row.sessionId}
                  onClick={() =>
                    navigate(`session/${encodeURIComponent(row.sessionId)}`)
                  }
                >
                  <SessionRowCells row={row} />
                </ClickableTableRow>
              ))}
            {!isPending && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Stack
                    alignItems="center"
                    spacing={1}
                    sx={{ paddingY: 6, color: "text.secondary" }}
                  >
                    <SwapHorizIcon sx={{ fontSize: 40, opacity: 0.4 }} />
                    <Typography>No SATP transfer sessions found.</Typography>
                    <Typography variant="caption">
                      Is the gateway reachable at {options.gatewayUrl} and were
                      there any transfers in the last 7 days?
                    </Typography>
                    <SetupGuideLink url={SATP_APP_SETUP_GUIDE_URL} />
                    <Button size="small" onClick={() => navigate("/guide")}>
                      Open the in-app guide
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
            {!isPending && rows.length > 0 && visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Stack
                    alignItems="center"
                    spacing={1}
                    sx={{ paddingY: 6, color: "text.secondary" }}
                  >
                    <Typography>
                      No sessions match the current filter.
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => {
                        setQuery("");
                        setBucket("all");
                      }}
                    >
                      Clear filter
                    </Button>
                  </Stack>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" color="text.secondary">
        Showing sessions with audit data from the last 7 days, plus all session
        IDs known to the gateway. Click a row for the full timeline, proofs and
        transfer path.
      </Typography>
    </Box>
  );
}
