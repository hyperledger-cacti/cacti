import React from "react";
import { useQuery } from "@tanstack/react-query";
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
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";

import { satpSessionDetailQuery } from "../queries";
import { stageLabel } from "../transform";
import { useSatpGatewayContext } from "../context/GatewayContext";

const MONOSPACE = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const PROTOCOL_STAGES = [
  {
    stage: 0,
    label: "Stage 0: Init",
    description: "Transfer Initialization & Intent",
  },
  {
    stage: 1,
    label: "Stage 1: Lock",
    description: "Asset Lock & Cryptographic Proof",
  },
  {
    stage: 2,
    label: "Stage 2: Execution",
    description: "Counterparty Verification & Mint",
  },
  {
    stage: 3,
    label: "Stage 3: Settle",
    description: "Final Receipt & Settlement",
  },
];

export interface DualGatewayFlowCardProps {
  sessionId: string;
  primaryGatewayUrl: string;
  counterpartyGatewayUrl?: string;
  onOpenManageGateways?: () => void;
}

export default function DualGatewayFlowCard({
  sessionId,
  primaryGatewayUrl,
  counterpartyGatewayUrl,
  onOpenManageGateways,
}: DualGatewayFlowCardProps) {
  const { gateways, setCounterpartyGatewayUrl } = useSatpGatewayContext();

  const primaryQuery = useQuery(
    satpSessionDetailQuery({ gatewayUrl: primaryGatewayUrl }, sessionId),
  );

  const counterpartyQuery = useQuery(
    counterpartyGatewayUrl
      ? satpSessionDetailQuery(
          { gatewayUrl: counterpartyGatewayUrl },
          sessionId,
        )
      : {
          queryKey: ["disabled-counterparty", sessionId],
          queryFn: () => null,
          enabled: false,
        },
  );

  const primaryStatus = primaryQuery.data?.status;
  const primaryDetail = primaryQuery.data?.detail;
  const counterpartyStatus = counterpartyQuery.data?.status;
  const counterpartyDetail = counterpartyQuery.data?.detail;

  const primaryStageNum = primaryStatus?.stage
    ? parseInt(primaryStatus.stage.replace(/\D/g, ""), 10)
    : undefined;
  const counterpartyStageNum = counterpartyStatus?.stage
    ? parseInt(counterpartyStatus.stage.replace(/\D/g, ""), 10)
    : undefined;

  // Determine cross-gateway synchronization state
  const bothKnown =
    primaryStatus !== undefined && counterpartyStatus !== undefined;
  const isSyncComplete =
    bothKnown &&
    (primaryStatus.status.toUpperCase() === "COMPLETED" ||
      primaryStageNum === 3) &&
    (counterpartyStatus.status.toUpperCase() === "COMPLETED" ||
      counterpartyStageNum === 3);

  const hasRollback =
    primaryStatus?.status.toUpperCase().includes("ROLLBACK") ||
    counterpartyStatus?.status.toUpperCase().includes("ROLLBACK") ||
    primaryStatus?.status.toUpperCase().includes("ERROR") ||
    counterpartyStatus?.status.toUpperCase().includes("ERROR");

  return (
    <Card
      variant="outlined"
      sx={{ mb: 3, borderRadius: 2, borderColor: "#dfe5e3" }}
    >
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
              color: "common.white",
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
          >
            <Typography variant="subtitle1" fontWeight={700}>
              Cross-Gateway Real Flow Telemetry
            </Typography>
            {bothKnown && (
              <Chip
                size="small"
                icon={
                  hasRollback ? (
                    <ErrorOutlineIcon />
                  ) : isSyncComplete ? (
                    <CheckCircleIcon />
                  ) : (
                    <HourglassEmptyIcon />
                  )
                }
                label={
                  hasRollback
                    ? "Rollback / Error Detected"
                    : isSyncComplete
                      ? "Both Gateways Synchronized & Settled"
                      : "Inter-Gateway Transfer In-Flight"
                }
                color={
                  hasRollback ? "error" : isSyncComplete ? "success" : "warning"
                }
                sx={{ fontWeight: 600, height: 24, fontSize: 11 }}
              />
            )}
          </Stack>
        }
        subheader="Live end-to-end verification across origin and destination gateway instances"
        titleTypographyProps={{ variant: "subtitle1" }}
      />
      <CardContent sx={{ pt: 0 }}>
        {/* Stage Progression Bar */}
        <Box
          sx={{
            mb: 3,
            p: 2,
            bgcolor: "#f7f9f6",
            borderRadius: 1.5,
            border: "1px solid #dfe5e3",
          }}
        >
          <Typography
            variant="caption"
            fontWeight={700}
            color="text.secondary"
            sx={{ mb: 1.5, display: "block" }}
          >
            SATP PROTOCOL PROGRESSION (RFC DRAFT-16)
          </Typography>
          <Grid container spacing={1.5}>
            {PROTOCOL_STAGES.map((s) => {
              const primaryReached =
                primaryStageNum !== undefined && primaryStageNum >= s.stage;
              const counterpartyReached =
                counterpartyStageNum !== undefined &&
                counterpartyStageNum >= s.stage;

              const isCompleted =
                primaryReached &&
                (counterpartyGatewayUrl ? counterpartyReached : true);
              const isInProgress =
                (primaryStageNum === s.stage ||
                  counterpartyStageNum === s.stage) &&
                !isCompleted;

              return (
                <Grid item xs={12} sm={6} md={3} key={s.stage}>
                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: isCompleted
                        ? "success.main"
                        : isInProgress
                          ? "warning.main"
                          : "#dfe5e3",
                      bgcolor: isCompleted
                        ? "rgba(46, 125, 50, 0.05)"
                        : isInProgress
                          ? "rgba(237, 108, 2, 0.05)"
                          : "#ffffff",
                    }}
                  >
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography variant="body2" fontWeight={700}>
                        {s.label}
                      </Typography>
                      {isCompleted ? (
                        <CheckCircleIcon
                          sx={{ fontSize: 16, color: "success.main" }}
                        />
                      ) : isInProgress ? (
                        <HourglassEmptyIcon
                          sx={{ fontSize: 16, color: "warning.main" }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 14,
                            height: 14,
                            borderRadius: "50%",
                            bgcolor: "#e0e0e0",
                          }}
                        />
                      )}
                    </Stack>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block", mt: 0.5 }}
                    >
                      {s.description}
                    </Typography>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </Box>

        {/* Side-by-Side Gateway Inspection Columns */}
        <Grid container spacing={2.5}>
          {/* Gateway 1 (Origin) */}
          <Grid item xs={12} md={6}>
            <Card
              variant="outlined"
              sx={{ height: "100%", borderColor: "primary.main" }}
            >
              <CardContent>
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{ mb: 1 }}
                >
                  <Chip
                    size="small"
                    label="Origin Gateway"
                    color="primary"
                    sx={{ height: 20, fontSize: 10 }}
                  />
                  <Typography variant="subtitle2" fontWeight={700}>
                    {primaryDetail?.latestSnapshot?.sourceNetworkId ||
                      "Sender Endpoint"}
                  </Typography>
                </Stack>
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: MONOSPACE,
                    color: "text.secondary",
                    display: "block",
                    mb: 1.5,
                  }}
                >
                  {primaryGatewayUrl}
                </Typography>

                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      Current Stage:
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {primaryStatus ? stageLabel(primaryStatus.stage) : "—"}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      Substatus:
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {primaryStatus?.substatus || "—"}
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      Recorded Events:
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {primaryDetail?.events.length ?? 0} audit logs
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      Ledger ID:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: MONOSPACE, fontSize: 11 }}
                    >
                      {primaryStatus?.originNetwork?.id || "—"}
                    </Typography>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Gateway 2 (Destination) */}
          <Grid item xs={12} md={6}>
            <Card
              variant="outlined"
              sx={{
                height: "100%",
                borderColor: counterpartyGatewayUrl
                  ? "secondary.main"
                  : "#dfe5e3",
                bgcolor: counterpartyGatewayUrl ? "#ffffff" : "#fbfbfb",
              }}
            >
              <CardContent>
                {counterpartyGatewayUrl ? (
                  <>
                    <Stack
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ mb: 1 }}
                    >
                      <Chip
                        size="small"
                        label="Destination Gateway"
                        color="secondary"
                        sx={{ height: 20, fontSize: 10 }}
                      />
                      <Typography variant="subtitle2" fontWeight={700}>
                        {counterpartyDetail?.latestSnapshot
                          ?.recipientNetworkId || "Receiver Endpoint"}
                      </Typography>
                    </Stack>
                    <Typography
                      variant="caption"
                      sx={{
                        fontFamily: MONOSPACE,
                        color: "text.secondary",
                        display: "block",
                        mb: 1.5,
                      }}
                    >
                      {counterpartyGatewayUrl}
                    </Typography>

                    {counterpartyQuery.isPending ? (
                      <LinearProgress sx={{ my: 2 }} />
                    ) : counterpartyStatus ? (
                      <Stack spacing={1}>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">
                            Current Stage:
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {stageLabel(counterpartyStatus.stage)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">
                            Substatus:
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {counterpartyStatus.substatus || "—"}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">
                            Recorded Events:
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {counterpartyDetail?.events.length ?? 0} audit logs
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">
                            Ledger ID:
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ fontFamily: MONOSPACE, fontSize: 11 }}
                          >
                            {counterpartyStatus?.destinationNetwork?.id || "—"}
                          </Typography>
                        </Stack>
                      </Stack>
                    ) : (
                      <Box sx={{ py: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Session not yet observed or pending on counterparty
                          gateway.
                        </Typography>
                      </Box>
                    )}
                  </>
                ) : (
                  <Stack
                    alignItems="center"
                    justifyContent="center"
                    spacing={1.5}
                    sx={{ py: 2 }}
                  >
                    <Typography
                      variant="subtitle2"
                      fontWeight={600}
                      color="text.secondary"
                    >
                      No Counterparty Gateway Connected
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      textAlign="center"
                    >
                      Configure the destination SATP gateway (e.g. Fabric or
                      second Hermes instance) to inspect the real cross-gateway
                      transfer handshake.
                    </Typography>
                    <Stack
                      direction="row"
                      spacing={1}
                      flexWrap="wrap"
                      justifyContent="center"
                    >
                      {gateways
                        .filter(
                          (g) =>
                            g.url.toLowerCase() !==
                            primaryGatewayUrl.toLowerCase(),
                        )
                        .slice(0, 2)
                        .map((g) => (
                          <Button
                            key={g.id}
                            size="small"
                            variant="outlined"
                            onClick={() => setCounterpartyGatewayUrl(g.url)}
                            sx={{ textTransform: "none", fontSize: 11 }}
                          >
                            Use {g.name}
                          </Button>
                        ))}
                      {onOpenManageGateways && (
                        <Button
                          size="small"
                          variant="contained"
                          onClick={onOpenManageGateways}
                          sx={{ textTransform: "none", fontSize: 11 }}
                        >
                          Configure Counterparty
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
