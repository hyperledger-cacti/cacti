/**
 * Cross-gateway view of one SATP session: looks the session up on every
 * configured gateway (both sides of a transfer log it under the same ID)
 * and shows, per gateway, how far it got. The protocol progress bar
 * combines all gateways.
 */
import { useQueries } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";

import { satpSessionDetailQuery } from "../queries";
import {
  STAGE_LABELS,
  deriveFailureInfo,
  deriveStage,
  isRollbackType,
  stageLabel,
  type SatpSessionDetail,
  type SatpStatusInput,
} from "../transform";
import { formatRelativeTime } from "../format";
import { sameGatewayUrl } from "../gateways";
import type { SatpGatewayEndpoint, SatpQueryOptions } from "../types";

const MONOSPACE = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/** Stage number from a `/status` stage value (`STAGE_2`, `2`, ...). */
export function parseStatusStage(stage?: string): number | undefined {
  if (!stage) {
    return undefined;
  }
  const match = stage.match(/(\d+)/);
  if (!match) {
    return undefined;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

/** Furthest stage a gateway reached: `/status` or, failing that, the audit log. */
export function furthestStage(
  status?: SatpStatusInput,
  detail?: SatpSessionDetail,
): number | undefined {
  const fromStatus = parseStatusStage(status?.stage);
  const fromEvents = (detail?.events ?? [])
    .filter((event) => !isRollbackType(event.type))
    .map((event) => deriveStage(event.type))
    .filter((stage): stage is number => stage !== undefined);
  const candidates = [
    ...(fromStatus !== undefined ? [fromStatus] : []),
    ...fromEvents,
  ];
  return candidates.length ? Math.max(...candidates) : undefined;
}

type SideOutcome = "completed" | "failed" | "in-flight" | "unknown";

/** Outcome of one gateway's side of the session. */
export function sideOutcome(
  status?: SatpStatusInput,
  detail?: SatpSessionDetail,
): SideOutcome {
  const failure = deriveFailureInfo(detail?.latestSnapshot, status);
  if (failure.failed) {
    return "failed";
  }
  if (
    status?.status === "DONE" ||
    failure.stateLabel === "COMPLETED" ||
    failure.stateLabel === "RECOVERED"
  ) {
    return "completed";
  }
  if (status || detail?.events.length) {
    return "in-flight";
  }
  return "unknown";
}

export interface DualGatewayFlowCardProps {
  sessionId: string;
  /** Gateways to look the session up on. */
  gateways: SatpGatewayEndpoint[];
  /** Base query options (polling settings etc.). */
  options: SatpQueryOptions;
  /** Gateway whose audit timeline the page shows below. */
  timelineGatewayUrl?: string;
  onSelectTimelineGateway?: (url: string) => void;
  onOpenManageGateways?: () => void;
}

export default function DualGatewayFlowCard({
  sessionId,
  gateways,
  options,
  timelineGatewayUrl,
  onSelectTimelineGateway,
  onOpenManageGateways,
}: DualGatewayFlowCardProps) {
  const results = useQueries({
    queries: gateways.map((gw) =>
      satpSessionDetailQuery({ ...options, gatewayUrl: gw.url }, sessionId),
    ),
  });

  const sides = gateways.map((gateway, index) => {
    const result = results[index];
    const detail = result?.data?.detail;
    const status = result?.data?.status;
    const seen = Boolean(status) || (detail?.events.length ?? 0) > 0;
    return {
      gateway,
      result,
      detail,
      status,
      seen,
      stage: furthestStage(status, detail),
      outcome: sideOutcome(status, detail),
      lastEventMs: detail?.events.reduce<number | undefined>(
        (latest, event) =>
          event.timestampMs !== undefined &&
          (latest === undefined || event.timestampMs > latest)
            ? event.timestampMs
            : latest,
        undefined,
      ),
    };
  });

  const seenSides = sides.filter((side) => side.seen);
  const anyFailed = seenSides.some((side) => side.outcome === "failed");
  const allCompleted =
    seenSides.length >= 2 &&
    seenSides.every((side) => side.outcome === "completed");
  const reachedStages = seenSides
    .map((side) => side.stage)
    .filter((stage): stage is number => stage !== undefined);
  const furthest = reachedStages.length
    ? Math.max(...reachedStages)
    : undefined;

  const snapshot = seenSides.find((side) => side.detail?.latestSnapshot)?.detail
    ?.latestSnapshot;

  const summary = anyFailed
    ? {
        label: "Failed or rolled back on a gateway",
        color: "error" as const,
        icon: <ErrorOutlineIcon />,
      }
    : allCompleted
      ? {
          label: "Settled on both sides",
          color: "success" as const,
          icon: <CheckCircleIcon />,
        }
      : seenSides.length >= 2
        ? {
            label: "In flight between gateways",
            color: "warning" as const,
            icon: <HourglassEmptyIcon />,
          }
        : undefined;

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
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
              "& svg": { fontSize: 24 },
            }}
          >
            <CompareArrowsIcon />
          </Stack>
        }
        title={
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            rowGap={0.5}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              Session across gateways
            </Typography>
            {summary && (
              <Chip
                size="small"
                icon={summary.icon}
                label={summary.label}
                color={summary.color}
                sx={{ height: 24, fontSize: 11 }}
              />
            )}
            <Typography variant="caption" color="text.secondary">
              seen on {seenSides.length} of {gateways.length} gateway
              {gateways.length === 1 ? "" : "s"}
            </Typography>
          </Stack>
        }
        subheader={
          snapshot?.senderGatewayNetworkId ||
          snapshot?.recipientGatewayNetworkId ? (
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              sx={{ mt: 0.5 }}
            >
              <Typography variant="caption" sx={{ fontFamily: MONOSPACE }}>
                {snapshot?.senderGatewayNetworkId ?? "unknown sender"}
              </Typography>
              <ArrowForwardIcon sx={{ fontSize: 14, color: "primary.main" }} />
              <Typography variant="caption" sx={{ fontFamily: MONOSPACE }}>
                {snapshot?.recipientGatewayNetworkId ?? "unknown recipient"}
              </Typography>
            </Stack>
          ) : (
            "The same session ID is looked up on every configured gateway"
          )
        }
      />
      <CardContent sx={{ pt: 0 }}>
        <Box
          sx={{
            mb: 2.5,
            p: 1.5,
            bgcolor: "background.default",
            borderRadius: 1,
            border: 1,
            borderColor: "divider",
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mb: 1, display: "block", fontWeight: 600 }}
          >
            PROTOCOL PROGRESS (furthest stage reached on any gateway)
          </Typography>
          <Grid container spacing={1}>
            {Object.keys(STAGE_LABELS).map((key) => {
              const stage = Number(key);
              const reached = furthest !== undefined && furthest > stage;
              const current = furthest === stage;
              const done = reached || (current && allCompleted && stage === 3);
              const tone = done
                ? "success"
                : current
                  ? anyFailed
                    ? "error"
                    : "warning"
                  : undefined;
              return (
                <Grid item xs={12} sm={6} md={3} key={stage}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      border: 1,
                      borderColor: tone ? `${tone}.main` : "divider",
                      bgcolor: (theme) =>
                        tone
                          ? alpha(theme.palette[tone].main, 0.06)
                          : theme.palette.background.paper,
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="body2" fontWeight={600}>
                        {stageLabel(stage)}
                      </Typography>
                      {done ? (
                        <CheckCircleIcon
                          sx={{ fontSize: 16, color: "success.main" }}
                        />
                      ) : current ? (
                        anyFailed ? (
                          <ErrorOutlineIcon
                            sx={{ fontSize: 16, color: "error.main" }}
                          />
                        ) : (
                          <HourglassEmptyIcon
                            sx={{ fontSize: 16, color: "warning.main" }}
                          />
                        )
                      ) : null}
                    </Stack>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Box>

        <Grid container spacing={2}>
          {sides.map((side) => {
            const isTimelineSource = sameGatewayUrl(
              side.gateway.url,
              timelineGatewayUrl,
            );
            return (
              <Grid
                item
                xs={12}
                md={gateways.length > 2 ? 4 : 6}
                key={side.gateway.id}
              >
                <Card
                  variant="outlined"
                  sx={{
                    height: "100%",
                    borderColor: isTimelineSource ? "primary.main" : "divider",
                  }}
                >
                  <CardContent>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ mb: 0.5 }}
                    >
                      <Typography variant="subtitle2" fontWeight={600} noWrap>
                        {side.gateway.name}
                      </Typography>
                      {side.seen && (
                        <Chip
                          size="small"
                          label={side.outcome}
                          color={
                            side.outcome === "failed"
                              ? "error"
                              : side.outcome === "completed"
                                ? "success"
                                : "warning"
                          }
                          variant="outlined"
                          sx={{ height: 20, fontSize: 11 }}
                        />
                      )}
                    </Stack>
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: MONOSPACE,
                        color: "text.secondary",
                        display: "block",
                        mb: 1.5,
                        wordBreak: "break-all",
                      }}
                    >
                      {side.gateway.url}
                    </Typography>

                    {side.result?.isPending ? (
                      <LinearProgress sx={{ my: 2 }} />
                    ) : side.result?.isError ? (
                      <Typography variant="body2" color="error.main">
                        Gateway unreachable: {String(side.result.error)}
                      </Typography>
                    ) : side.seen ? (
                      <Stack spacing={0.75}>
                        {[
                          [
                            "Stage",
                            side.stage !== undefined
                              ? stageLabel(side.stage)
                              : "—",
                          ],
                          ["Status", side.status?.status ?? "—"],
                          ["Substatus", side.status?.substatus ?? "—"],
                          [
                            "Audit events",
                            String(side.detail?.events.length ?? 0),
                          ],
                          [
                            "Last event",
                            side.lastEventMs !== undefined
                              ? formatRelativeTime(side.lastEventMs)
                              : "—",
                          ],
                        ].map(([label, value]) => (
                          <Stack
                            key={label}
                            direction="row"
                            justifyContent="space-between"
                            spacing={1}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {label}
                            </Typography>
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              sx={{ textAlign: "right" }}
                            >
                              {value}
                            </Typography>
                          </Stack>
                        ))}
                        {onSelectTimelineGateway && (
                          <Button
                            size="small"
                            variant={
                              isTimelineSource ? "contained" : "outlined"
                            }
                            disabled={isTimelineSource}
                            onClick={() =>
                              onSelectTimelineGateway(side.gateway.url)
                            }
                            sx={{ alignSelf: "flex-start", mt: 1 }}
                          >
                            {isTimelineSource
                              ? "Timeline shown below"
                              : "Show this gateway's timeline"}
                          </Button>
                        )}
                      </Stack>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        This gateway has no record of the session.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
          {gateways.length < 2 && (
            <Grid item xs={12} md={6}>
              <Card
                variant="outlined"
                sx={{ height: "100%", bgcolor: "background.default" }}
              >
                <CardContent>
                  <Stack spacing={1.5} alignItems="flex-start">
                    <Typography variant="subtitle2" color="text.secondary">
                      Only one gateway configured
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Add the counterparty gateway of your transfers to see both
                      sides of the session here.
                    </Typography>
                    {onOpenManageGateways && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={onOpenManageGateways}
                      >
                        Add a gateway
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
}
