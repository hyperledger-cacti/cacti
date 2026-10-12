import React from "react";
import { useQuery } from "@tanstack/react-query";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CurrencyExchangeIcon from "@mui/icons-material/CurrencyExchange";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LanIcon from "@mui/icons-material/Lan";
import LocalGasStationIcon from "@mui/icons-material/LocalGasStation";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PendingIcon from "@mui/icons-material/Pending";
import SpeedIcon from "@mui/icons-material/Speed";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import TokenIcon from "@mui/icons-material/Token";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Chart from "react-apexcharts";
import { useTheme } from "@mui/material";

import PageTitle from "../../../components/ui/PageTitle";
import SectionTitle from "../components/SectionTitle";
import { useSatpOptions } from "../hooks";
import {
  satpHealthQuery,
  satpPromInstantQuery,
  satpPromRangeQuery,
  satpSupportedLedgersQuery,
} from "../queries";

const TRANSACTIONS_RANGE_WINDOW_MS = 24 * 60 * 60 * 1000;
const TRANSACTIONS_RANGE_STEP_SECONDS = 300;

type StatTone = "primary" | "success" | "error" | "secondary";

const TONE_BG: Record<StatTone, string> = {
  primary: "primary.main",
  success: "success.main",
  error: "error.main",
  secondary: "secondary.main",
};

/** Small tinted icon bubble used on the stat cards and card headers. */
function IconBubble({ tone, icon }: { tone: StatTone; icon: React.ReactNode }) {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      sx={{
        width: 40,
        height: 40,
        borderRadius: 2,
        flexShrink: 0,
        bgcolor: TONE_BG[tone],
        color: `${TONE_BG[tone].split(".")[0]}.contrastText`,
        "& svg": { fontSize: 22 },
      }}
    >
      {icon}
    </Stack>
  );
}

function formatStatValue(value: number, unit?: string): string {
  const rounded =
    Math.abs(value) < 10 && !Number.isInteger(value)
      ? Number(value.toFixed(1))
      : Math.round(value);
  return `${rounded.toLocaleString()}${unit ? ` ${unit}` : ""}`;
}

/**
 * One SATP metric backed by a single Prometheus instant query. `null` data
 * (metric has no samples yet) renders as a muted em dash; loading renders a
 * skeleton.
 */
function PromStatCard({
  options,
  query,
  title,
  icon,
  tone = "primary",
  unit,
}: {
  options: ReturnType<typeof useSatpOptions>;
  query: string;
  title: string;
  icon: React.ReactNode;
  tone?: StatTone;
  unit?: string;
}) {
  const { data } = useQuery(satpPromInstantQuery(options, query));
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <IconBubble tone={tone} icon={icon} />
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {title}
              </Typography>
              <Tooltip title={`Prometheus: ${query}`}>
                <InfoOutlinedIcon
                  sx={{ fontSize: 14, color: "text.disabled" }}
                />
              </Tooltip>
            </Stack>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {data === undefined ? (
                <Skeleton width={72} />
              ) : data === null ? (
                <Box component="span" sx={{ color: "text.disabled" }}>
                  —
                </Box>
              ) : (
                formatStatValue(data, unit)
              )}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

/**
 * Aggregate view for the SATP gateway: gateway health, supported ledgers and
 * the full metric set exported by the SATP Hermes MonitorService (sessions,
 * transactions, durations, gas, exchanged value, network), matching the
 * provided Grafana dashboards. Missing samples render as an em dash (counters
 * only exist after the first increment); the panels are replaced by an alert
 * when Prometheus is not configured or unreachable.
 */
export default function OverviewPage() {
  const options = useSatpOptions();
  const theme = useTheme();

  const health = useQuery(satpHealthQuery(options));
  const ledgers = useQuery(satpSupportedLedgersQuery(options));

  // Probe query used to detect whether Prometheus is reachable at all.
  const promProbe = useQuery(satpPromInstantQuery(options, "up"));

  // Stable per mount: a fresh object/value every render would change the
  // react-query key on every render and put the range queries in a refetch loop.
  const rangeParams = React.useMemo(() => {
    const endMs = Date.now();
    return {
      startMs: endMs - TRANSACTIONS_RANGE_WINDOW_MS,
      endMs,
      stepSeconds: TRANSACTIONS_RANGE_STEP_SECONDS,
    };
  }, []);
  const transactionsRange = useQuery(
    satpPromRangeQuery(
      options,
      "sum(successful_transactions_total)",
      rangeParams,
    ),
  );
  const failedRange = useQuery(
    satpPromRangeQuery(options, "sum(failed_transactions_total)", rangeParams),
  );

  const promConfigured = Boolean(options.prometheusUrl);
  // A reachable Prometheus may legitimately have no SATP series yet (counters
  // only exist after the first increment) - panels show an em dash in that
  // case. Only treat it as unreachable when the probe query errored.
  const promReachable = promConfigured && !promProbe.isError;

  const chartSeries = [
    {
      name: "Successful transactions",
      data: (transactionsRange.data?.[0]?.points ?? []).map((point) => [
        point.timestampMs,
        point.value,
      ]),
    },
    {
      name: "Failed transactions",
      data: (failedRange.data?.[0]?.points ?? []).map((point) => [
        point.timestampMs,
        point.value,
      ]),
    },
  ];

  return (
    <Box>
      <PageTitle>SATP Overview</PageTitle>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <SectionTitle>Gateway</SectionTitle>
          <Card variant="outlined">
            <CardHeader
              avatar={<IconBubble tone="primary" icon={<LanIcon />} />}
              title="SATP Hermes Gateway"
              subheader={options.gatewayUrl}
              titleTypographyProps={{ variant: "subtitle1", fontWeight: 600 }}
            />
            <CardContent sx={{ paddingTop: 0 }}>
              {health.isPending ? (
                <Stack direction="row" spacing={1} alignItems="center">
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Checking healthcheck endpoint…
                  </Typography>
                </Stack>
              ) : (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    size="small"
                    icon={
                      health.data !== undefined ? (
                        <CheckCircleIcon />
                      ) : (
                        <ErrorOutlineIcon />
                      )
                    }
                    label={
                      health.data !== undefined ? "Reachable" : "Unreachable"
                    }
                    color={health.data !== undefined ? "success" : "error"}
                    variant="outlined"
                  />
                  <Typography variant="caption" color="text.secondary">
                    verified via /healthcheck
                  </Typography>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <SectionTitle>Supported Ledgers</SectionTitle>
          <Card variant="outlined">
            <CardContent>
              {ledgers.isPending ? (
                <Stack spacing={1}>
                  <Skeleton width={120} height={28} />
                  <Skeleton width={100} height={28} />
                </Stack>
              ) : ledgers.data && ledgers.data.length > 0 ? (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ flexWrap: "wrap", rowGap: 1 }}
                >
                  {ledgers.data.map((ledger) => (
                    <Chip
                      key={ledger}
                      label={ledger}
                      size="small"
                      variant="outlined"
                      sx={{
                        borderColor: "primary.main",
                        color: "primary.main",
                      }}
                    />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No supported ledgers reported by the gateway.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <SectionTitle>Metrics</SectionTitle>
          {!promConfigured && (
            <Alert severity="info" variant="outlined" sx={{ marginBottom: 2 }}>
              Aggregate metric panels are hidden: no Prometheus URL is
              configured for this app instance. Set the{" "}
              <code>prometheusUrl</code> option to enable them.
            </Alert>
          )}
          {promConfigured && !promReachable && (
            <Alert
              severity="warning"
              variant="outlined"
              sx={{ marginBottom: 2 }}
            >
              Prometheus is configured at {options.prometheusUrl} but could not
              be reached — metric panels are hidden.
            </Alert>
          )}
          {promConfigured && promReachable && (
            <Stack spacing={2}>
              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ marginBottom: 1 }}
                >
                  SESSIONS &amp; TRANSACTIONS
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4} md={3}>
                    <PromStatCard
                      options={options}
                      query="sum(created_sessions_total)"
                      title="Sessions created"
                      icon={<LanIcon />}
                    />
                  </Grid>
                  <Grid item xs={6} sm={4} md={3}>
                    <PromStatCard
                      options={options}
                      query="sum(initiated_transactions_total)"
                      title="Transactions initiated"
                      icon={<PlayArrowIcon />}
                    />
                  </Grid>
                  <Grid item xs={6} sm={4} md={3}>
                    <PromStatCard
                      options={options}
                      query="sum(ongoing_transactions)"
                      title="Ongoing"
                      icon={<PendingIcon />}
                      tone="secondary"
                    />
                  </Grid>
                  <Grid item xs={6} sm={4} md={3}>
                    <PromStatCard
                      options={options}
                      query="sum(successful_transactions_total)"
                      title="Successful"
                      icon={<CheckCircleIcon />}
                      tone="success"
                    />
                  </Grid>
                  <Grid item xs={6} sm={4} md={3}>
                    <PromStatCard
                      options={options}
                      query="sum(failed_transactions_total)"
                      title="Failed"
                      icon={<ErrorOutlineIcon />}
                      tone="error"
                    />
                  </Grid>
                </Grid>
              </Box>

              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ marginBottom: 1 }}
                >
                  PERFORMANCE
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4} md={3}>
                    <PromStatCard
                      options={options}
                      query="sum(transaction_duration_milliseconds_sum) / sum(transaction_duration_milliseconds_count)"
                      title="Avg transaction duration"
                      icon={<SpeedIcon />}
                      unit="ms"
                    />
                  </Grid>
                  <Grid item xs={6} sm={4} md={3}>
                    <PromStatCard
                      options={options}
                      query="sum(operation_duration_milliseconds_sum) / sum(operation_duration_milliseconds_count)"
                      title="Avg operation duration"
                      icon={<SpeedIcon />}
                      unit="ms"
                    />
                  </Grid>
                  <Grid item xs={6} sm={4} md={3}>
                    <PromStatCard
                      options={options}
                      query="sum(transaction_gas_used)"
                      title="Transaction gas"
                      icon={<LocalGasStationIcon />}
                    />
                  </Grid>
                  <Grid item xs={6} sm={4} md={3}>
                    <PromStatCard
                      options={options}
                      query="sum(operation_gas_used)"
                      title="Operation gas"
                      icon={<LocalGasStationIcon />}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ marginBottom: 1 }}
                >
                  VALUE EXCHANGED
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4} md={3}>
                    <PromStatCard
                      options={options}
                      query="sum(value_exchanged_USD_total)"
                      title="USD"
                      icon={<AttachMoneyIcon />}
                      tone="success"
                    />
                  </Grid>
                  <Grid item xs={6} sm={4} md={3}>
                    <PromStatCard
                      options={options}
                      query="sum(total_value_exchanged_token)"
                      title="Token units"
                      icon={<CurrencyExchangeIcon />}
                      tone="success"
                    />
                  </Grid>
                </Grid>
              </Box>

              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ marginBottom: 1 }}
                >
                  NETWORK
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={4} md={3}>
                    <PromStatCard
                      options={options}
                      query="sum(gateways)"
                      title="Gateways"
                      icon={<LanIcon />}
                    />
                  </Grid>
                  <Grid item xs={6} sm={4} md={3}>
                    <PromStatCard
                      options={options}
                      query="max(connected_DLTs)"
                      title="Connected DLTs"
                      icon={<SwapHorizIcon />}
                    />
                  </Grid>
                  <Grid item xs={6} sm={4} md={3}>
                    <PromStatCard
                      options={options}
                      query="max(number_of_supported_assets)"
                      title="Supported assets"
                      icon={<TokenIcon />}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Card variant="outlined">
                <CardHeader
                  title="Transactions over time"
                  subheader="Cumulative counters over the last 24 hours (source: Prometheus)"
                />
                <CardContent sx={{ paddingTop: 0 }}>
                  <Chart
                    type="line"
                    height={280}
                    options={{
                      chart: { type: "line", toolbar: { show: false } },
                      colors: [
                        theme.palette.primary.main,
                        theme.palette.error.main,
                      ],
                      xaxis: { type: "datetime" },
                      stroke: { curve: "smooth" },
                      legend: { position: "top" },
                    }}
                    series={chartSeries}
                  />
                </CardContent>
              </Card>
            </Stack>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}
