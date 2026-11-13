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
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import VerifiedIcon from "@mui/icons-material/Verified";
import PaidIcon from "@mui/icons-material/Paid";
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
import SatpQueryError from "../components/SatpQueryError";
import { useSatpGatewayContext } from "../context/GatewayContext";
import { sameGatewayUrl } from "../gateways";
import {
  RETRY_OUTLOOK_LABELS,
  classifySatpFailure,
  type SatpFailureClassification,
} from "../failure";
import { ManageGatewaysDialog } from "../components/SatpGatewayToolbar";
import { useSatpOptions } from "../hooks";
import {
  satpPromInstantQuery,
  satpSessionDetailQuery,
  satpSessionProofsQuery,
} from "../queries";
import {
  formatAbsoluteTime,
  formatDuration,
  formatRelativeTime,
} from "../format";
import { buildAuditBundle, downloadJson } from "../audit-bundle";
import {
  collectLatestClaims,
  collectSessionAssets,
  deriveFailureInfo,
  deriveGatewayRole,
  deriveStage,
  isRollbackType,
  promSessionSelector,
  stageLabel,
  type SatpAssetSummary,
  type SatpSessionSnapshot,
  type SatpTimelineEvent,
} from "../transform";
import type { SatpQueryOptions, SatpSessionProof } from "../types";

const SNAPSHOT_PRE_SX = {
  margin: 0,
  padding: 1.5,
  overflowX: "auto",
  maxHeight: 320,
  fontSize: 12,
  bgcolor: "background.default",
  border: "1px solid",
  borderColor: "divider",
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
  default: { bgcolor: "divider", color: "text.primary" },
};

function SummaryHeader({
  sessionId,
  status,
  stateLabel,
  durationMs,
  lastTransition,
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
  /** Latest audit event: the session's last phase transition. */
  lastTransition?: {
    type: string;
    stage?: number;
    rollback?: boolean;
    timestampMs?: number;
  };
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
            {lastTransition && (
              <Tooltip
                title={
                  lastTransition.timestampMs !== undefined
                    ? formatAbsoluteTime(lastTransition.timestampMs)
                    : "unknown time"
                }
              >
                <Typography variant="caption" color="text.secondary">
                  Last transition: <strong>{lastTransition.type}</strong>
                  {lastTransition.rollback
                    ? " (rollback)"
                    : lastTransition.stage !== undefined
                      ? ` (${stageLabel(lastTransition.stage)})`
                      : ""}
                  {lastTransition.timestampMs !== undefined
                    ? ` · ${formatRelativeTime(lastTransition.timestampMs)}`
                    : ""}
                </Typography>
              </Tooltip>
            )}
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

function ProofsCard({
  claims,
  proofs,
  proofsUnsupported,
}: {
  claims: Partial<Record<string, unknown>>;
  /** Signature-verified proofs from `GET /proofs`. */
  proofs?: SatpSessionProof[];
  /** True when the gateway has no `/proofs` endpoint (older version). */
  proofsUnsupported?: boolean;
}) {
  const entries = claimEntries(claims);
  const verified = proofs ?? [];
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
              bgcolor: "primary.dark",
              color: "primary.contrastText",
              "& svg": { fontSize: 22 },
            }}
          >
            <KeyIcon />
          </Stack>
        }
        title="Proofs & Claims"
        subheader={
          verified.length > 0
            ? `${verified.length} signature-verified proof${verified.length === 1 ? "" : "s"} from the gateway audit store`
            : "Assertions extracted from the audit snapshots"
        }
        titleTypographyProps={{ variant: "subtitle1", fontWeight: 600 }}
      />
      <CardContent sx={{ paddingTop: 0 }}>
        {verified.length > 0 && (
          <Stack spacing={1} divider={<Divider flexItem />} sx={{ mb: 2 }}>
            {verified.map((proof, index) => (
              <Box key={`${proof.step.tag}-${index}`}>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 0.5, flexWrap: "wrap", rowGap: 0.5 }}
                >
                  <VerifiedIcon fontSize="small" color="success" />
                  <Typography variant="subtitle2">{proof.step.tag}</Typography>
                  {proof.step.messageType && (
                    <Chip
                      size="small"
                      label={proof.step.messageType}
                      variant="outlined"
                      sx={{ height: 20, fontSize: 11 }}
                    />
                  )}
                  {proof.step.role && (
                    <Chip
                      size="small"
                      label={proof.step.role}
                      variant="outlined"
                      sx={{ height: 20, fontSize: 11 }}
                    />
                  )}
                </Stack>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mb: 1 }}
                >
                  {proof.step.description}
                </Typography>
                <Stack spacing={1}>
                  <CopyableField label="Signature" value={proof.signedClaim} />
                  <Box component="pre" sx={SNAPSHOT_PRE_SX}>
                    {prettyJson(proof.claim)}
                  </Box>
                </Stack>
              </Box>
            ))}
          </Stack>
        )}
        {proofsUnsupported && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 1 }}
          >
            This gateway has no <code>/proofs</code> endpoint; showing the
            claims recorded in the audit snapshots.
          </Typography>
        )}
        {entries.length === 0 && verified.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No proofs recorded in the audit window for this session.
          </Typography>
        ) : (
          entries.length > 0 && (
            <Stack spacing={1} divider={<Divider flexItem />}>
              {verified.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  CLAIMS IN THE AUDIT SNAPSHOTS
                </Typography>
              )}
              {entries.map(({ label, claim }) => {
                const id = claimIdOf(claim);
                const serialized = JSON.stringify(claim, null, 2);
                return (
                  <Box key={label}>
                    <Typography variant="subtitle2" sx={{ marginBottom: 0.5 }}>
                      {label}
                    </Typography>
                    {id && (
                      <Box sx={{ mb: 1 }}>
                        <CopyableField label="Claim ID" value={id} />
                      </Box>
                    )}
                    <Box component="pre" sx={SNAPSHOT_PRE_SX}>
                      {serialized}
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )
        )}
      </CardContent>
    </Card>
  );
}

/** Pretty-prints a JSON string; returns it unchanged when it is not JSON. */
function prettyJson(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

function FailureCard({
  classification,
  stateLabel,
  substatus,
  errorDetail,
}: {
  classification: SatpFailureClassification;
  stateLabel?: string;
  substatus?: string;
  errorDetail?: string;
}) {
  const retryColor =
    classification.retry === "retryable"
      ? "success"
      : classification.retry === "not-retryable"
        ? "error"
        : classification.retry === "in-progress"
          ? "warning"
          : "default";
  return (
    <Alert
      severity="error"
      variant="outlined"
      icon={<ErrorOutlineIcon fontSize="inherit" />}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        This transfer did not complete — session state {stateLabel ?? "unknown"}
        {substatus ? ` (${substatus})` : ""}.
      </Typography>
      <Table size="small" sx={{ mt: 1, maxWidth: 720 }}>
        <TableBody>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, pl: 0 }}>Failed stage</TableCell>
            <TableCell>
              {classification.failedStage !== undefined
                ? stageLabel(classification.failedStage)
                : "unknown"}
              {classification.failedStep
                ? ` · while processing ${classification.failedStep}`
                : ""}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, pl: 0 }}>Error class</TableCell>
            <TableCell>
              {classification.errorClass}
              {classification.errorCode && (
                <>
                  {" "}
                  <Chip
                    size="small"
                    label={classification.errorCode}
                    variant="outlined"
                    sx={{ height: 20, fontSize: 11, fontFamily: "monospace" }}
                  />
                </>
              )}
              {classification.errorDescription
                ? ` — ${classification.errorDescription}`
                : ""}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell sx={{ fontWeight: 600, pl: 0, borderBottom: 0 }}>
              Retry outlook
            </TableCell>
            <TableCell sx={{ borderBottom: 0 }}>
              <Chip
                size="small"
                label={RETRY_OUTLOOK_LABELS[classification.retry]}
                color={retryColor}
                sx={{ height: 20, fontSize: 11, mr: 1 }}
              />
              {classification.retryHint}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {errorDetail && (
        <Box component="pre" sx={{ ...SNAPSHOT_PRE_SX, marginTop: 1 }}>
          {errorDetail}
        </Box>
      )}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mt: 1 }}
      >
        The retry outlook is derived from the SATP error code and gateway
        substatus; SATP itself does not mark errors as retryable.
      </Typography>
    </Alert>
  );
}

function AssetColumn({
  title,
  asset,
}: {
  title: string;
  asset?: SatpAssetSummary;
}) {
  return (
    <Stack spacing={1.25}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600 }}
      >
        {title.toUpperCase()}
      </Typography>
      {asset ? (
        <>
          <CopyableField label="Amount" value={asset.amount ?? "—"} />
          <CopyableField
            label="Token"
            value={asset.tokenId ?? asset.contractName ?? "—"}
          />
          <CopyableField label="Network" value={asset.networkId ?? "—"} />
          <CopyableField label="Owner" value={asset.owner ?? "—"} />
          {asset.contractAddress && (
            <CopyableField label="Contract" value={asset.contractAddress} />
          )}
        </>
      ) : (
        <Typography variant="body2" color="text.secondary">
          Not recorded in the audit snapshots.
        </Typography>
      )}
    </Stack>
  );
}

function GasValue({
  options,
  metric,
  sessionId,
}: {
  options: SatpQueryOptions;
  metric: string;
  sessionId: string;
}) {
  const { data, isPending, isError } = useQuery(
    satpPromInstantQuery(
      options,
      `sum(${metric}${promSessionSelector(sessionId)})`,
    ),
  );
  if (!options.prometheusUrl) {
    return <>n/a</>;
  }
  if (isPending) {
    return <Skeleton width={60} sx={{ display: "inline-block" }} />;
  }
  if (isError) {
    return <>unavailable</>;
  }
  return (
    <>
      {data === null || data === undefined ? "no data" : data.toLocaleString()}
    </>
  );
}

/** Transferred asset and value on each side, plus gas from Prometheus. */
function ValueCard({
  events,
  options,
  sessionId,
}: {
  events: SatpTimelineEvent[];
  options: SatpQueryOptions;
  sessionId: string;
}) {
  const { sender, receiver } = collectSessionAssets(events);
  return (
    <Card variant="outlined">
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
            <PaidIcon />
          </Stack>
        }
        title="Value & Gas"
        subheader="Asset moved on each ledger and gas spent for this session"
        titleTypographyProps={{ variant: "subtitle1", fontWeight: 600 }}
      />
      <CardContent sx={{ paddingTop: 0 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <AssetColumn title="Sent (source ledger)" asset={sender} />
          </Grid>
          <Grid item xs={12} md={4}>
            <AssetColumn
              title="Received (destination ledger)"
              asset={receiver}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack spacing={1.25}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                GAS (PROMETHEUS)
              </Typography>
              <Typography variant="body2">
                Transaction gas:{" "}
                <strong>
                  <GasValue
                    options={options}
                    metric="transaction_gas_used"
                    sessionId={sessionId}
                  />
                </strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Gas recorded for this session (Prometheus{" "}
                <code>transaction_gas_used</code>, summed over every gateway the
                Prometheus server scrapes).
              </Typography>
              {!options.prometheusUrl && (
                <Typography variant="caption" color="text.secondary">
                  Set <code>prometheusUrl</code> in the app options to show gas
                  usage.
                </Typography>
              )}
            </Stack>
          </Grid>
        </Grid>
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
}: {
  event: SatpTimelineEvent;
  isLast: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const role = deriveGatewayRole(event.snapshot);
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
        {!isLast && <TimelineConnector sx={{ bgcolor: "divider" }} />}
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
              {role && (
                <Tooltip
                  title={
                    role === "client"
                      ? "Logged by the gateway that started the transfer"
                      : "Logged by the counterparty gateway"
                  }
                >
                  <Chip
                    label={role === "client" ? "client side" : "server side"}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: 11, height: 20 }}
                  />
                </Tooltip>
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
  const { gateways } = useSatpGatewayContext();
  const [expandedSeq, setExpandedSeq] = React.useState<number | null>(null);
  const [manageGatewaysOpen, setManageGatewaysOpen] = React.useState(false);
  const [timelineGatewayUrl, setTimelineGatewayUrl] = React.useState<
    string | undefined
  >(undefined);

  React.useEffect(() => {
    if (!sessionId) {
      showNotification(`Invalid session id provided: ${sessionId}`, "error");
      navigate("..");
    }
  }, [sessionId]);

  // The timeline, proofs and failure details come from one gateway: the
  // one picked in the cross-gateway card, else the active gateway.
  const sourceGatewayUrl =
    timelineGatewayUrl &&
    gateways.some((gw) => sameGatewayUrl(gw.url, timelineGatewayUrl))
      ? timelineGatewayUrl
      : options.gatewayUrl;
  const sourceOptions: SatpQueryOptions = {
    ...options,
    gatewayUrl: sourceGatewayUrl,
  };
  const sourceGateway = gateways.find((gw) =>
    sameGatewayUrl(gw.url, sourceGatewayUrl),
  );
  const crossGateways =
    gateways.length > 0
      ? gateways
      : [
          {
            id: "options",
            name: "Gateway",
            url: options.gatewayUrl,
            source: "config" as const,
          },
        ];

  const { isError, isPending, data, error, refetch, isFetching } = useQuery(
    satpSessionDetailQuery(sourceOptions, sessionId ?? ""),
  );
  const proofsQuery = useQuery(
    satpSessionProofsQuery(sourceOptions, sessionId ?? ""),
  );

  const { detail, status } = data ?? {};
  const snapshot = detail?.latestSnapshot;
  const failure = deriveFailureInfo(snapshot, status);
  const events = detail?.events ?? [];
  const classification = failure.failed
    ? classifySatpFailure({ snapshot, substatus: status?.substatus, events })
    : undefined;
  const lastEvent = events[events.length - 1];

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
        lastTransition={
          lastEvent
            ? {
                type: lastEvent.type,
                rollback: isRollbackType(lastEvent.type),
                stage: deriveStage(lastEvent.type),
                timestampMs: lastEvent.timestampMs,
              }
            : undefined
        }
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

      {isError && (
        <SatpQueryError
          what="the session details"
          gatewayUrl={sourceGatewayUrl}
          error={error}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      )}

      <DualGatewayFlowCard
        sessionId={sessionId}
        gateways={crossGateways}
        options={options}
        timelineGatewayUrl={sourceGatewayUrl}
        onSelectTimelineGateway={setTimelineGatewayUrl}
        onOpenManageGateways={() => setManageGatewaysOpen(true)}
      />

      <Stack spacing={3}>
        {failure.failed && classification && (
          <FailureCard
            classification={classification}
            stateLabel={failure.stateLabel}
            substatus={status?.substatus}
            errorDetail={failure.errorDetail}
          />
        )}

        <Grid container spacing={3}>
          <Grid item xs={12} lg={7}>
            <TransferPathCard snapshot={snapshot} />
          </Grid>
          <Grid item xs={12} lg={5}>
            <ProofsCard
              claims={collectLatestClaims(events)}
              proofs={proofsQuery.data ?? undefined}
              proofsUnsupported={proofsQuery.data === null}
            />
          </Grid>
        </Grid>

        <ValueCard
          events={events}
          options={sourceOptions}
          sessionId={sessionId}
        />

        <MessageEvidenceCard snapshot={snapshot} />

        <Box>
          <SectionTitle>Audit Timeline ({events.length} events)</SectionTitle>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 1 }}
          >
            Recorded by {sourceGateway?.name ?? "gateway"} (
            <code>{sourceGatewayUrl}</code>). Pick another gateway in the card
            above to compare its side of the transfer.
          </Typography>
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
        options={options}
      />
    </Box>
  );
}
