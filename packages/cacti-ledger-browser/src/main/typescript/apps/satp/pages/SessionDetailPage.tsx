import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import DescriptionIcon from "@mui/icons-material/Description";
import DownloadIcon from "@mui/icons-material/Download";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FlagIcon from "@mui/icons-material/Flag";
import GavelIcon from "@mui/icons-material/Gavel";
import KeyIcon from "@mui/icons-material/Key";
import LockIcon from "@mui/icons-material/Lock";
import PendingIcon from "@mui/icons-material/Pending";
import RouteIcon from "@mui/icons-material/Route";
import SendIcon from "@mui/icons-material/Send";
import UndoIcon from "@mui/icons-material/Undo";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Timeline from "@mui/lab/Timeline";
import TimelineConnector from "@mui/lab/TimelineConnector";
import TimelineContent from "@mui/lab/TimelineContent";
import TimelineDot from "@mui/lab/TimelineDot";
import TimelineItem from "@mui/lab/TimelineItem";
import TimelineOppositeContent from "@mui/lab/TimelineOppositeContent";
import TimelineSeparator from "@mui/lab/TimelineSeparator";

import { useNotification } from "../../../common/context/NotificationContext";
import PageTitleWithGoBack from "../../../components/ui/PageTitleWithGoBack";
import CopyableField from "../components/CopyableField";
import SectionTitle from "../components/SectionTitle";
import StatusChip from "../components/StatusChip";
import DualGatewayFlowCard from "../components/DualGatewayFlowCard";
import { ManageGatewaysDialog } from "../components/SatpGatewayToolbar";
import { useSatpOptions } from "../hooks";
import { satpSessionDetailQuery } from "../queries";
import { formatDuration } from "../format";
import { buildAuditBundle, downloadJson } from "../audit-bundle";
import {
  collectLatestClaims,
  deriveFailureInfo,
  deriveStage,
  isRollbackType,
  stageLabel,
  type SatpSessionSnapshot,
  type SatpTimelineEvent,
} from "../transform";

const SNAPSHOT_PRE_SX = {
  margin: 0,
  padding: 1.5,
  overflowX: "auto",
  maxHeight: 320,
  fontSize: 12,
  bgcolor: "grey.50",
  border: "1px solid",
  borderColor: "grey.200",
  borderRadius: 1,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
} as const;

function claimIdOf(claim: unknown): string | undefined {
  if (claim && typeof claim === "object") {
    const candidate = (claim as Record<string, unknown>).claimId;
    return typeof candidate === "string" ? candidate : undefined;
  }
  return undefined;
}

const CLAIM_LABELS: Record<string, string> = {
  transferInitClaims: "Transfer Init Claims",
  lockAssertionClaim: "Lock Assertion Claim",
  mintAssertionClaim: "Mint Assertion Claim",
  burnAssertionClaim: "Burn Assertion Claim",
  assignmentAssertionClaim: "Assignment Assertion Claim",
  senderWrapAssertionClaim: "Sender Wrap Assertion Claim",
  receiverWrapAssertionClaim: "Receiver Wrap Assertion Claim",
};

function claimEntries(
  claims: Partial<Record<string, unknown>>,
): Array<{ label: string; claim: unknown }> {
  return Object.entries(claims)
    .filter(([, claim]) => claim !== undefined && claim !== null)
    .map(([field, claim]) => ({
      label: CLAIM_LABELS[field] ?? field,
      claim,
    }));
}

/** Maps a SATP log type to a timeline icon + semantic color. */
function eventPresentation(type: string): {
  icon: React.ReactNode;
  color: "success" | "error" | "primary" | "warning" | "default";
} {
  const t = type.toUpperCase();
  if (t.includes("ROLLBACK")) {
    return { icon: <UndoIcon />, color: "warning" };
  }
  if (t.includes("ERROR") || t.includes("REJECT")) {
    return { icon: <ErrorOutlineIcon />, color: "error" };
  }
  if (
    t.includes("COMMIT_FINAL") ||
    t.includes("COMPLETE") ||
    t.includes("ACK")
  ) {
    return { icon: <CheckCircleIcon />, color: "success" };
  }
  if (t.includes("LOCK")) {
    return { icon: <LockIcon />, color: "primary" };
  }
  if (t.includes("COMMENCE")) {
    return { icon: <SendIcon />, color: "primary" };
  }
  if (t.includes("PROPOSAL")) {
    return { icon: <DescriptionIcon />, color: "primary" };
  }
  if (t.includes("INIT")) {
    return { icon: <FlagIcon />, color: "primary" };
  }
  if (t.includes("COMMIT")) {
    return { icon: <GavelIcon />, color: "primary" };
  }
  return { icon: <PendingIcon />, color: "default" };
}

const COLOR_SX: Record<string, { bgcolor: string; color: string }> = {
  success: { bgcolor: "success.main", color: "success.contrastText" },
  error: { bgcolor: "error.main", color: "error.contrastText" },
  primary: { bgcolor: "primary.main", color: "primary.contrastText" },
  warning: { bgcolor: "warning.main", color: "warning.contrastText" },
  default: { bgcolor: "grey.300", color: "text.primary" },
};

function SummaryHeader({
  sessionId,
  status,
  stateLabel,
  durationMs,
  onExport,
}: {
  sessionId: string;
  status?: {
    status?: string;
    substatus?: string;
    stage?: string;
    startTime?: string;
  };
  stateLabel?: string;
  /** Elapsed time between the first and last audit event. */
  durationMs?: number;
  /** Downloads the audit bundle; omitted when no detail data is loaded. */
  onExport?: () => void;
}) {
  return (
    <Card variant="outlined" sx={{ marginBottom: 3 }}>
      <CardContent>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          spacing={2}
        >
          <Box sx={{ minWidth: 0, maxWidth: 520 }}>
            <CopyableField label="Session ID" value={sessionId} />
          </Box>
          <Stack spacing={1} alignItems={{ xs: "flex-start", sm: "flex-end" }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{ flexWrap: "wrap", rowGap: 1 }}
            >
              <StatusChip value={status?.status} />
              <StatusChip value={status?.substatus} />
              <StatusChip value={stateLabel} />
              {status?.stage && <StatusChip value={status.stage} />}
            </Stack>
            {(() => {
              const timing = [
                status?.startTime
                  ? `started ${new Date(status.startTime).toLocaleString()}`
                  : undefined,
                durationMs !== undefined
                  ? `took ${formatDuration(durationMs)}`
                  : undefined,
              ]
                .filter((part) => part !== undefined)
                .join(" · ");
              return (
                timing && (
                  <Typography variant="caption" color="text.secondary">
                    {timing}
                  </Typography>
                )
              );
            })()}
            {onExport && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={onExport}
              >
                Export audit bundle
              </Button>
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function TransferPathCard({ snapshot }: { snapshot?: SatpSessionSnapshot }) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardHeader
        avatar={
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: "primary.main",
              color: "primary.contrastText",
              "& svg": { fontSize: 22 },
            }}
          >
            <RouteIcon />
          </Stack>
        }
        title="Transfer Path"
        subheader="Gateways, ledgers and parties involved"
        titleTypographyProps={{ variant: "subtitle1", fontWeight: 600 }}
      />
      <CardContent sx={{ paddingTop: 0 }}>
        {snapshot ? (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Stack spacing={1.5}>
                <CopyableField
                  label="Sender Gateway"
                  value={snapshot.senderGatewayNetworkId ?? "—"}
                />
                <CopyableField
                  label="Source Ledger"
                  value={snapshot.sourceBasePath ?? "—"}
                />
                <CopyableField
                  label="Source Ledger Asset"
                  value={snapshot.sourceLedgerAssetId ?? "—"}
                />
                <CopyableField
                  label="Originator"
                  value={snapshot.verifiedOriginatorEntityId ?? "—"}
                />
              </Stack>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Stack spacing={1.5}>
                <CopyableField
                  label="Recipient Gateway"
                  value={snapshot.recipientGatewayNetworkId ?? "—"}
                />
                <CopyableField
                  label="Destination Ledger"
                  value={snapshot.recipientBasePath ?? "—"}
                />
                <CopyableField
                  label="Destination Ledger Asset"
                  value={snapshot.recipientLedgerAssetId ?? "—"}
                />
                <CopyableField
                  label="Beneficiary"
                  value={snapshot.verifiedBeneficiaryEntityId ?? "—"}
                />
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ marginY: 2 }} />
              <Grid container spacing={1.5}>
                <Grid item xs={12} sm={6}>
                  <CopyableField
                    label="Digital Asset ID"
                    value={snapshot.digitalAssetId ?? "—"}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <CopyableField
                    label="Asset Profile ID"
                    value={snapshot.assetProfileId ?? "—"}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <CopyableField
                    label="Server Gateway Pubkey"
                    value={snapshot.serverGatewayPubkey ?? "—"}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <CopyableField
                    label="Client Gateway Pubkey"
                    value={snapshot.clientGatewayPubkey ?? "—"}
                  />
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No session snapshot available in the audit data yet.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function ProofsCard({ claims }: { claims: Partial<Record<string, unknown>> }) {
  const entries = claimEntries(claims);
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardHeader
        avatar={
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: "secondary.main",
              color: "secondary.contrastText",
              "& svg": { fontSize: 22 },
            }}
          >
            <KeyIcon />
          </Stack>
        }
        title="Proofs & Claims"
        subheader="Assertions extracted from the audit snapshots"
        titleTypographyProps={{ variant: "subtitle1", fontWeight: 600 }}
      />
      <CardContent sx={{ paddingTop: 0 }}>
        {entries.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No proofs recorded in the audit window for this session.
          </Typography>
        ) : (
          <Stack spacing={1} divider={<Divider flexItem />}>
            {entries.map(({ label, claim }) => {
              const id = claimIdOf(claim);
              const serialized = JSON.stringify(claim, null, 2);
              return (
                <Box key={label}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ marginBottom: 0.5 }}
                  >
                    <Typography variant="subtitle2">{label}</Typography>
                    {id && (
                      <Tooltip title="Claim ID">
                        <Chip
                          label={id}
                          size="small"
                          sx={{
                            fontFamily:
                              "ui-monospace, SFMono-Regular, Menlo, monospace",
                            fontSize: 11,
                            maxWidth: 220,
                          }}
                        />
                      </Tooltip>
                    )}
                  </Stack>
                  <Box component="pre" sx={SNAPSHOT_PRE_SX}>
                    {serialized}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function MessageEvidenceCard({ snapshot }: { snapshot?: SatpSessionSnapshot }) {
  if (!snapshot) {
    return null;
  }
  const evidence: Array<{ label: string; value: string }> = [];
  if (snapshot.lastMessageHash) {
    evidence.push({
      label: "Last message hash",
      value: String(snapshot.lastMessageHash),
    });
  }
  if (snapshot.lastSequenceNumber !== undefined) {
    evidence.push({
      label: "Last sequence number",
      value: String(snapshot.lastSequenceNumber),
    });
  }
  if (snapshot.hashes && Object.keys(snapshot.hashes).length > 0) {
    evidence.push({
      label: "Stage hashes",
      value: JSON.stringify(snapshot.hashes, null, 2),
    });
  }
  if (snapshot.signatures && Object.keys(snapshot.signatures).length > 0) {
    evidence.push({
      label: "Signatures",
      value: JSON.stringify(snapshot.signatures, null, 2),
    });
  }
  if (evidence.length === 0) {
    return null;
  }
  return (
    <Card variant="outlined">
      <CardHeader
        title="Message Evidence"
        subheader="Hash chain and signatures - every SATP message commits to its predecessor"
        titleTypographyProps={{ variant: "subtitle1", fontWeight: 600 }}
      />
      <CardContent sx={{ paddingTop: 0 }}>
        <Stack spacing={1.5}>
          {evidence.map(({ label, value }) => (
            <Box key={label}>
              <Typography variant="caption" color="text.secondary">
                {label.toUpperCase()}
              </Typography>
              <Box component="pre" sx={SNAPSHOT_PRE_SX}>
                {value}
              </Box>
            </Box>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}

/** Groups consecutive timeline events by protocol stage. */
function buildStageGroups(
  events: SatpTimelineEvent[],
): Array<{ stage?: number; rollback: boolean; events: SatpTimelineEvent[] }> {
  const groups: Array<{
    stage?: number;
    rollback: boolean;
    events: SatpTimelineEvent[];
  }> = [];
  for (const event of events) {
    const stage = deriveStage(event.type);
    const rollback = isRollbackType(event.type);
    const last = groups[groups.length - 1];
    if (last && last.stage === stage && last.rollback === rollback) {
      last.events.push(event);
    } else {
      groups.push({ stage, rollback, events: [event] });
    }
  }
  return groups;
}

/** Stage header rendered between timeline groups. */
function StageHeaderItem({ label, count }: { label: string; count: number }) {
  return (
    <TimelineItem>
      <TimelineOppositeContent sx={{ maxWidth: 48, flex: "0 0 auto" }} />
      <TimelineSeparator>
        <TimelineDot
          sx={{
            bgcolor: "transparent",
            boxShadow: "none",
            border: 0,
            minHeight: 0,
            padding: 0.5,
          }}
        />
      </TimelineSeparator>
      <TimelineContent>
        <Chip
          label={`${label} · ${count} message${count === 1 ? "" : "s"}`}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 600 }}
        />
      </TimelineContent>
    </TimelineItem>
  );
}

function TimelineEvent({
  event,
  isLast,
  expanded,
  onToggle,
  isOriginGateway,
}: {
  event: SatpTimelineEvent;
  isLast: boolean;
  expanded: boolean;
  onToggle: () => void;
  isOriginGateway?: boolean;
}) {
  const { icon, color } = eventPresentation(event.type);
  const rawSnapshot = event.snapshot
    ? JSON.stringify(event.snapshot, null, 2)
    : undefined;

  return (
    <TimelineItem>
      <TimelineOppositeContent sx={{ maxWidth: 48, flex: "0 0 auto" }}>
        <Typography
          variant="subtitle2"
          color="text.secondary"
          sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
        >
          #{event.sequenceNumber}
        </Typography>
      </TimelineOppositeContent>
      <TimelineSeparator>
        <TimelineDot
          sx={{
            margin: 0,
            boxShadow: "none",
            ...COLOR_SX[color],
            "& svg": { fontSize: 16 },
          }}
        >
          {icon}
        </TimelineDot>
        {!isLast && <TimelineConnector sx={{ bgcolor: "grey.300" }} />}
      </TimelineSeparator>
      <TimelineContent sx={{ paddingTop: 0, minWidth: 0 }}>
        <Card variant="outlined">
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ padding: 1.5, flexWrap: "wrap", rowGap: 1 }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="subtitle2">{event.type}</Typography>
              {event.operation && (
                <Chip
                  label={event.operation}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: 11, height: 20 }}
                />
              )}
              {isOriginGateway && (
                <Chip
                  label="Origin Gateway"
                  size="small"
                  color="primary"
                  variant="outlined"
                  sx={{ fontSize: 10, height: 20 }}
                />
              )}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {event.timestampMs
                  ? new Date(event.timestampMs).toLocaleString()
                  : "unknown time"}
              </Typography>
              {rawSnapshot && (
                <Button
                  size="small"
                  onClick={onToggle}
                  endIcon={
                    <ExpandMoreIcon
                      fontSize="small"
                      sx={{
                        transform: expanded ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s",
                      }}
                    />
                  }
                  sx={{ minWidth: 0, textTransform: "none" }}
                >
                  Snapshot
                </Button>
              )}
            </Stack>
          </Stack>
          <Collapse in={expanded} unmountOnExit>
            <Stack spacing={1.5} sx={{ padding: 1.5, paddingTop: 0 }}>
              {event.auditEntryId && (
                <CopyableField
                  label="Audit Entry ID"
                  value={event.auditEntryId}
                />
              )}
              <Box component="pre" sx={SNAPSHOT_PRE_SX}>
                {rawSnapshot}
              </Box>
            </Stack>
          </Collapse>
        </Card>
      </TimelineContent>
    </TimelineItem>
  );
}

/**
 * Session detail view: status summary, transfer path, proofs/claims, failure
 * details and the ordered audit timeline. Must be called with a valid
 * `sessionId` route param.
 */
export default function SessionDetailPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const options = useSatpOptions();
  const [expandedSeq, setExpandedSeq] = React.useState<number | null>(null);
  const [manageGatewaysOpen, setManageGatewaysOpen] = React.useState(false);

  React.useEffect(() => {
    if (!sessionId) {
      showNotification(`Invalid session id provided: ${sessionId}`, "error");
      navigate("..");
    }
  }, [sessionId]);

  const { isError, isPending, data, error } = useQuery(
    satpSessionDetailQuery(options, sessionId ?? ""),
  );

  React.useEffect(() => {
    isError &&
      showNotification(
        `Could not fetch SATP session details: ${error}`,
        "error",
      );
  }, [isError]);

  const { detail, status } = data ?? {};
  const snapshot = detail?.latestSnapshot;
  const failure = deriveFailureInfo(snapshot, status);
  const events = detail?.events ?? [];

  // Elapsed transfer time from the audit timeline (first to last event with
  // a timestamp); needs at least two events, otherwise there is no span.
  const eventTimestamps = events
    .map((event) => event.timestampMs)
    .filter((value): value is number => value !== undefined);
  const durationMs =
    eventTimestamps.length >= 2
      ? Math.max(...eventTimestamps) - Math.min(...eventTimestamps)
      : undefined;

  if (!sessionId || isPending) {
    return (
      <Box>
        <PageTitleWithGoBack>SATP Session Details</PageTitleWithGoBack>
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={90} />
          <Skeleton variant="rounded" height={220} />
          <Skeleton variant="rounded" height={220} />
        </Stack>
      </Box>
    );
  }

  return (
    <Box>
      <PageTitleWithGoBack>SATP Session Details</PageTitleWithGoBack>

      <SummaryHeader
        sessionId={sessionId}
        status={status}
        stateLabel={failure.stateLabel}
        durationMs={durationMs}
        onExport={
          detail
            ? () =>
                downloadJson(
                  `satp-${sessionId}-audit-bundle.json`,
                  buildAuditBundle(detail, status),
                )
            : undefined
        }
      />

      <DualGatewayFlowCard
        sessionId={sessionId}
        primaryGatewayUrl={options.gatewayUrl}
        counterpartyGatewayUrl={options.counterpartyGatewayUrl}
        onOpenManageGateways={() => setManageGatewaysOpen(true)}
      />

      <Stack spacing={3}>
        {failure.failed && (
          <Alert
            severity="error"
            variant="outlined"
            icon={<ErrorOutlineIcon fontSize="inherit" />}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              This transfer did not complete — session state{" "}
              {failure.stateLabel ?? "unknown"}
              {status?.substatus ? ` (${status.substatus})` : ""}.
            </Typography>
            {failure.errorDetail && (
              <Box component="pre" sx={{ ...SNAPSHOT_PRE_SX, marginTop: 1 }}>
                {failure.errorDetail}
              </Box>
            )}
          </Alert>
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} lg={7}>
            <TransferPathCard snapshot={snapshot} />
          </Grid>
          <Grid item xs={12} lg={5}>
            <ProofsCard claims={collectLatestClaims(events)} />
          </Grid>
        </Grid>

        <MessageEvidenceCard snapshot={snapshot} />

        <Box>
          <SectionTitle>Audit Timeline ({events.length} events)</SectionTitle>
          {events.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No audit entries found for this session in the last 7 days.
            </Typography>
          ) : (
            <Timeline
              position="left"
              sx={{
                paddingLeft: 0,
                marginTop: 1,
                [`& .MuiTimelineItem-root`]: { minHeight: 0 },
              }}
            >
              {buildStageGroups(events).map(
                (
                  { stage, rollback, events: groupEvents },
                  groupIndex,
                  groups,
                ) => (
                  <React.Fragment
                    key={`${stage ?? "unknown"}-${rollback}-${groupIndex}`}
                  >
                    <StageHeaderItem
                      label={`${stageLabel(stage)}${rollback ? " (rollback)" : ""}`}
                      count={groupEvents.length}
                    />
                    {groupEvents.map((event, eventIndex) => (
                      <TimelineEvent
                        key={`${event.sequenceNumber}-${event.auditEntryId ?? event.type}`}
                        event={event}
                        isLast={
                          groupIndex === groups.length - 1 &&
                          eventIndex === groupEvents.length - 1
                        }
                        expanded={expandedSeq === event.sequenceNumber}
                        onToggle={() =>
                          setExpandedSeq(
                            expandedSeq === event.sequenceNumber
                              ? null
                              : event.sequenceNumber,
                          )
                        }
                        isOriginGateway={Boolean(
                          options.counterpartyGatewayUrl,
                        )}
                      />
                    ))}
                  </React.Fragment>
                ),
              )}
            </Timeline>
          )}
        </Box>

        <Alert severity="info" variant="outlined" icon={false}>
          <Typography variant="caption">
            Path information is sourced from the audit snapshots because the
            gateway <code>/status</code> endpoint currently reports a hardcoded
            step and mirrors the origin network as destination.
          </Typography>
        </Alert>
      </Stack>

      <ManageGatewaysDialog
        open={manageGatewaysOpen}
        onClose={() => setManageGatewaysOpen(false)}
      />
    </Box>
  );
}
