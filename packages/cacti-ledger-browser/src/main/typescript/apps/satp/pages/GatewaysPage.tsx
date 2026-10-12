import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CallMadeIcon from "@mui/icons-material/CallMade";
import CallReceivedIcon from "@mui/icons-material/CallReceived";
import DnsIcon from "@mui/icons-material/Dns";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

import PageTitle from "../../../components/ui/PageTitle";
import ShortenedTypography from "../../../components/ui/ShortenedTypography";
import {
  StyledTableCell,
  StyledTableCellHeader,
} from "../../../components/ui/UITableListing/StyledTableCell";
import CopyableField from "../components/CopyableField";
import SectionTitle from "../components/SectionTitle";
import { useSatpOptions } from "../hooks";
import {
  satpAnalyticsQuery,
  satpHealthQuery,
  satpSupportedLedgersQuery,
} from "../queries";
import type { SatpGatewayStat } from "../transform";

const MONOSPACE = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

function GatewayCard({
  gateway,
  isLocal,
}: {
  gateway: SatpGatewayStat;
  isLocal: boolean;
}) {
  const navigate = useNavigate();
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
              bgcolor: isLocal ? "primary.main" : "secondary.main",
              color: "common.white",
              "& svg": { fontSize: 22 },
            }}
          >
            <DnsIcon />
          </Stack>
        }
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            {isLocal && (
              <Chip
                label="This gateway"
                size="small"
                color="primary"
                sx={{ height: 20, fontSize: 11 }}
              />
            )}
          </Stack>
        }
        subheader={
          <Box
            component="span"
            sx={{ fontFamily: MONOSPACE, fontSize: 12, wordBreak: "break-all" }}
          >
            {gateway.gatewayId}
          </Box>
        }
        titleTypographyProps={{ variant: "subtitle1", fontWeight: 600 }}
      />
      <CardContent sx={{ paddingTop: 0 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ flexWrap: "wrap", rowGap: 1, marginBottom: 1.5 }}
        >
          <Chip
            size="small"
            icon={<CallMadeIcon />}
            label={`${gateway.asSenderCount} as sender`}
            variant="outlined"
          />
          <Chip
            size="small"
            icon={<CallReceivedIcon />}
            label={`${gateway.asRecipientCount} as recipient`}
            variant="outlined"
          />
        </Stack>

        <Stack
          direction="row"
          spacing={1}
          sx={{ flexWrap: "wrap", rowGap: 1, marginBottom: 1.5 }}
        >
          {gateway.completedCount > 0 && (
            <Chip
              size="small"
              label={`${gateway.completedCount} completed`}
              color="success"
              variant="outlined"
            />
          )}
          {gateway.failedCount > 0 && (
            <Chip
              size="small"
              label={`${gateway.failedCount} failed`}
              color="error"
              variant="outlined"
            />
          )}
          {gateway.ongoingCount > 0 && (
            <Chip
              size="small"
              label={`${gateway.ongoingCount} ongoing`}
              color="warning"
              variant="outlined"
            />
          )}
        </Stack>

        {gateway.ledgers.length > 0 && (
          <Stack spacing={0.5} sx={{ marginBottom: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              LEDGERS TOUCHED
            </Typography>
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ flexWrap: "wrap", rowGap: 0.75 }}
            >
              {gateway.ledgers.map((ledger) => (
                <Chip
                  key={ledger}
                  label={ledger}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Stack>
        )}

        {gateway.ownerIds.length > 0 && (
          <Stack spacing={0.5} sx={{ marginBottom: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              OWNER
            </Typography>
            {gateway.ownerIds.map((owner) => (
              <Typography key={owner} variant="body2">
                {owner}
              </Typography>
            ))}
          </Stack>
        )}

        {gateway.pubkeys.length > 0 && (
          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary">
              PUBLIC KEYS
            </Typography>
            {gateway.pubkeys.map((pubkey) => (
              <CopyableField key={pubkey} label="Pubkey" value={pubkey} />
            ))}
          </Stack>
        )}

        <Stack spacing={0.5} sx={{ marginTop: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            SESSIONS ({gateway.sessionIds.length})
          </Typography>
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ flexWrap: "wrap", rowGap: 0.75 }}
          >
            {gateway.sessionIds.slice(0, 6).map((sessionId) => (
              <Chip
                key={sessionId}
                label={
                  sessionId.length > 26
                    ? `${sessionId.slice(0, 26)}…`
                    : sessionId
                }
                size="small"
                onClick={() =>
                  navigate(`../session/${encodeURIComponent(sessionId)}`)
                }
                sx={{ fontFamily: MONOSPACE, fontSize: 11, cursor: "pointer" }}
              />
            ))}
            {gateway.sessionIds.length > 6 && (
              <Chip
                label={`+${gateway.sessionIds.length - 6} more`}
                size="small"
                variant="outlined"
              />
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

/**
 * Gateway deployment view: this gateway, every counterparty gateway seen in
 * the audit window, and the transfer pairings between them.
 */
export default function GatewaysPage() {
  const options = useSatpOptions();
  const analytics = useQuery(satpAnalyticsQuery(options));
  const health = useQuery(satpHealthQuery(options));
  const ledgers = useQuery(satpSupportedLedgersQuery(options));

  const gatewayStats = analytics.data?.gatewayStats ?? [];
  const pairStats = analytics.data?.pairStats ?? [];
  const localGatewayIds = new Set(analytics.data?.localGatewayIds ?? []);

  return (
    <Box>
      <PageTitle>Gateways</PageTitle>

      <SectionTitle
        action={
          <Stack direction="row" spacing={1} alignItems="center">
            {health.data !== undefined && (
              <Chip
                size="small"
                label="gateway online"
                color="success"
                variant="outlined"
              />
            )}
            {ledgers.data && (
              <Typography variant="caption" color="text.secondary">
                serves {ledgers.data.length} ledger(s)
              </Typography>
            )}
          </Stack>
        }
      >
        Counterparty Gateways ({gatewayStats.length})
      </SectionTitle>

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ marginBottom: 2 }}
      >
        Gateways observed in the audit window, derived from the transfer
        snapshots: participation, outcomes, pubkeys and the ledgers they touch.
      </Typography>

      {analytics.isPending ? (
        <Grid container spacing={2}>
          {[0, 1].map((i) => (
            <Grid item xs={12} md={6} key={i}>
              <Skeleton variant="rounded" height={280} />
            </Grid>
          ))}
        </Grid>
      ) : gatewayStats.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          No gateway activity found in the audit window.
        </Typography>
      ) : (
        <Grid container spacing={2} sx={{ marginBottom: 3 }}>
          {gatewayStats.map((gateway) => (
            <Grid item xs={12} md={6} key={gateway.gatewayId}>
              <GatewayCard
                gateway={gateway}
                isLocal={localGatewayIds.has(gateway.gatewayId)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {pairStats.length > 0 && (
        <>
          <SectionTitle>Deployment Paths</SectionTitle>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ marginBottom: 1 }}
          >
            Transfer volume per gateway pairing (sender → recipient).
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small" aria-label="gateway pairings">
              <TableHead>
                <TableRow>
                  <StyledTableCellHeader>Sender Gateway</StyledTableCellHeader>
                  <StyledTableCellHeader>
                    Recipient Gateway
                  </StyledTableCellHeader>
                  <StyledTableCellHeader>Sessions</StyledTableCellHeader>
                  <StyledTableCellHeader>Outcomes</StyledTableCellHeader>
                  <StyledTableCellHeader>Ledgers</StyledTableCellHeader>
                  <StyledTableCellHeader>Last Activity</StyledTableCellHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {pairStats.map((pair) => (
                  <TableRow
                    key={`${pair.senderGateway}-${pair.recipientGateway}`}
                  >
                    <StyledTableCell>
                      <Box sx={{ fontFamily: MONOSPACE, fontSize: 12 }}>
                        <ShortenedTypography
                          text={pair.senderGateway}
                          maxWidth={220}
                        />
                      </Box>
                    </StyledTableCell>
                    <StyledTableCell>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <ArrowForwardIcon
                          fontSize="inherit"
                          sx={{ color: "primary.main" }}
                        />
                        <Box sx={{ fontFamily: MONOSPACE, fontSize: 12 }}>
                          <ShortenedTypography
                            text={pair.recipientGateway}
                            maxWidth={220}
                          />
                        </Box>
                      </Stack>
                    </StyledTableCell>
                    <StyledTableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {pair.sessionCount}
                      </Typography>
                    </StyledTableCell>
                    <StyledTableCell>
                      <Stack direction="row" spacing={0.75}>
                        {pair.completedCount > 0 && (
                          <Chip
                            size="small"
                            label={`${pair.completedCount} ✓`}
                            color="success"
                            variant="outlined"
                          />
                        )}
                        {pair.failedCount > 0 && (
                          <Chip
                            size="small"
                            label={`${pair.failedCount} ✕`}
                            color="error"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                    </StyledTableCell>
                    <StyledTableCell>
                      <Typography variant="body2">
                        {pair.ledgers.join(" → ")}
                      </Typography>
                    </StyledTableCell>
                    <StyledTableCell>
                      <Typography variant="body2">
                        {pair.lastActivityMs
                          ? new Date(pair.lastActivityMs).toLocaleString()
                          : "—"}
                      </Typography>
                    </StyledTableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
