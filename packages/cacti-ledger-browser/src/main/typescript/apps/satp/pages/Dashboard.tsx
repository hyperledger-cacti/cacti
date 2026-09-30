import * as React from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableBody from "@mui/material/TableBody";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SearchIcon from "@mui/icons-material/Search";
import ScienceIcon from "@mui/icons-material/Science";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useSatpAppConfig } from "../hooks";
import {
  useSatpSessionIds,
  useSatpAuditTrail,
  useSatpGatewayHealth,
} from "../queries";
import {
  parseAuditEntries,
  buildSessionDetails,
  computeKpiMetrics,
} from "../utils/parser";
import { DEMO_SESSIONS } from "../utils/demoData";
import { StatusBadge } from "../components/StatusBadge";
import { MetricsSummaryCards } from "../components/MetricsSummaryCards";
import ShortenedTypography from "../../../components/ui/ShortenedTypography";

export default function Dashboard() {
  const navigate = useNavigate();
  const config = useSatpAppConfig();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [demoMode, setDemoMode] = React.useState(true); // enabled by default for standalone inspection

  const {
    data: sessionIds = [],
    isLoading: isIdsLoading,
    isError: isIdsError,
    refetch: refetchIds,
  } = useSatpSessionIds(config.gatewayApiUrl, config.refreshIntervalMs);

  const {
    data: auditData,
    isLoading: isAuditLoading,
    refetch: refetchAudit,
  } = useSatpAuditTrail(config.gatewayApiUrl, undefined, undefined, config.refreshIntervalMs);

  const { data: healthData } = useSatpGatewayHealth(config.gatewayApiUrl);

  const handleCopy = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRefresh = () => {
    refetchIds();
    refetchAudit();
  };

  const auditRecords = React.useMemo(() => {
    return parseAuditEntries(auditData?.auditEntries?.entries);
  }, [auditData]);

  const liveSessionIds = React.useMemo(() => {
    const set = new Set<string>(sessionIds);
    for (const record of auditRecords) {
      if (record.parsedPayload && (record.parsedPayload as any).sessionId) {
        set.add((record.parsedPayload as any).sessionId);
      }
    }
    return Array.from(set);
  }, [sessionIds, auditRecords]);

  const liveSessions = React.useMemo(() => {
    return liveSessionIds.map((id) => {
      const recordsForSession = auditRecords.filter(
        (r) =>
          r.key.includes(id) ||
          (r.parsedPayload && (r.parsedPayload as any).sessionId === id),
      );
      return buildSessionDetails(id, null, recordsForSession);
    });
  }, [liveSessionIds, auditRecords]);

  // If demoMode is active or if no live sessions exist, provide demo sessions
  const sessions = React.useMemo(() => {
    if (demoMode) {
      return [...DEMO_SESSIONS, ...liveSessions];
    }
    return liveSessions;
  }, [demoMode, liveSessions]);

  const metrics = React.useMemo(() => {
    return computeKpiMetrics(sessions);
  }, [sessions]);

  const filteredSessions = React.useMemo(() => {
    return sessions.filter((s) => {
      const matchSearch =
        s.sessionId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.originNetwork.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.destinationNetwork.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === "ALL") return true;
      if (statusFilter === "COMPLETED")
        return s.status === "DONE" || s.status === "COMPLETED";
      if (statusFilter === "IN_PROGRESS")
        return s.status === "PENDING" || s.status === "IN_PROGRESS";
      if (statusFilter === "FAILED") return s.hasFailure;
      if (statusFilter === "ROLLBACK") return s.hasRollback;

      return true;
    });
  }, [sessions, searchTerm, statusFilter]);

  const isGatewayOnline = healthData?.status === "AVAILABLE";

  return (
    <Box sx={{ p: 1 }}>
      {/* Top Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={2}
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold">
            SATP Cross-Chain Inspector
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Forensic monitoring and real-time telemetry for SATP gateway asset transfers
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
          <Button
            variant={demoMode ? "contained" : "outlined"}
            color="secondary"
            size="small"
            startIcon={<ScienceIcon />}
            onClick={() => setDemoMode(!demoMode)}
          >
            {demoMode ? "Demo Mode Active" : "Load Demo Data"}
          </Button>

          <Chip
            label={config.gatewayApiUrl}
            variant="outlined"
            size="small"
          />
          <Chip
            label={isGatewayOnline ? "Gateway Online" : "Gateway Offline"}
            color={isGatewayOnline ? "success" : "default"}
            size="small"
          />
          <Tooltip title="Refresh telemetry">
            <IconButton onClick={handleRefresh} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* KPI Cards */}
      <MetricsSummaryCards metrics={metrics} />

      {/* Demo Mode Notice */}
      {demoMode && (
        <Alert
          severity="info"
          icon={<ScienceIcon />}
          sx={{ mb: 3 }}
          action={
            <Button color="inherit" size="small" onClick={() => setDemoMode(false)}>
              Hide Demo
            </Button>
          }
        >
          <b>Demo Mode Active:</b> Inspired by Rafael's{" "}
          <Link
            href="https://rafaelapb.github.io/satp-demo/"
            target="_blank"
            rel="noopener noreferrer"
            underline="always"
            sx={{ fontWeight: "bold", color: "inherit", display: "inline-flex", alignItems: "center" }}
          >
            The Anatomy of SATP Walkthrough
            <OpenInNewIcon sx={{ fontSize: 14, ml: 0.5 }} />
          </Link>
          . Simulating cross-ledger transfers between <b>Alice (Hyperledger Besu)</b> and <b>Bob (Hyperledger Fabric)</b> across all protocol stages.
        </Alert>
      )}

      {/* Live Error Alert (if gateway unreachable and demo disabled) */}
      {!demoMode && isIdsError && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          Could not connect to SATP Gateway at <b>{config.gatewayApiUrl}</b>. Click <b>"Load Demo Data"</b> to preview inspector features.
        </Alert>
      )}

      {/* Table Container */}
      <Paper elevation={2} sx={{ p: 2.5, borderRadius: 2 }}>
        {/* Filters and Search Bar */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={2}
          mb={2}
        >
          <Tabs
            value={statusFilter}
            onChange={(_, val) => setStatusFilter(val)}
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label={`All (${sessions.length})`} value="ALL" />
            <Tab label={`Completed (${metrics.completed})`} value="COMPLETED" />
            <Tab label={`In Progress (${metrics.inProgress})`} value="IN_PROGRESS" />
            <Tab label={`Failed (${metrics.failed})`} value="FAILED" />
            <Tab label={`Rollbacks (${metrics.rollback})`} value="ROLLBACK" />
          </Tabs>

          <TextField
            size="small"
            placeholder="Search session ID or network..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
            }}
            sx={{ width: { xs: "100%", sm: 280 } }}
          />
        </Box>

        {isIdsLoading && isAuditLoading && sessions.length === 0 ? (
          <Box p={6} textAlign="center">
            <CircularProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Connecting to SATP Gateway & loading transfer sessions...
            </Typography>
          </Box>
        ) : filteredSessions.length === 0 ? (
          <Box p={6} textAlign="center">
            <Typography variant="h6" color="text.secondary">
              No SATP transfer sessions found
            </Typography>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<ScienceIcon />}
              sx={{ mt: 2 }}
              onClick={() => setDemoMode(true)}
            >
              Load Demo Transfer Sessions
            </Button>
          </Box>
        ) : (
          <Box sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: (theme) => (theme.palette.mode === "dark" ? "#1e293b" : "#f8fafc") }}>
                  <TableCell><b>Session ID</b></TableCell>
                  <TableCell><b>Status</b></TableCell>
                  <TableCell><b>Current Stage & Step</b></TableCell>
                  <TableCell><b>Transfer Route</b></TableCell>
                  <TableCell><b>Start Time</b></TableCell>
                  <TableCell align="right"><b>Actions</b></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredSessions.map((session) => (
                  <TableRow
                    key={session.sessionId}
                    hover
                    sx={{
                      cursor: "pointer",
                      bgcolor: session.hasRollback
                        ? "rgba(237, 108, 2, 0.04)"
                        : session.hasFailure
                          ? "rgba(211, 47, 47, 0.04)"
                          : "inherit",
                    }}
                    onClick={() => navigate(`session/${session.sessionId}`)}
                  >
                    <TableCell>
                      <Box display="flex" alignItems="center">
                        <ShortenedTypography
                          text={session.sessionId}
                          maxWidth={160}
                          variant="body2"
                          fontWeight="bold"
                        />
                        <Tooltip title={copiedId === session.sessionId ? "Copied!" : "Copy Session ID"}>
                          <IconButton
                            size="small"
                            onClick={(e) => handleCopy(session.sessionId, e)}
                            sx={{ ml: 0.5 }}
                          >
                            <ContentCopyIcon fontSize="small" sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>

                    <TableCell>
                      <StatusBadge
                        status={session.status}
                        hasRollback={session.hasRollback}
                      />
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2" fontWeight="bold">
                        {session.currentStage}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {session.currentStep}
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip
                          label={session.originNetwork}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <ArrowForwardIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                        <Chip
                          label={session.destinationNetwork}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>

                    <TableCell>
                      <Typography variant="body2">
                        {session.startTime
                          ? new Date(session.startTime).toLocaleString()
                          : "Unknown"}
                      </Typography>
                    </TableCell>

                    <TableCell align="right">
                      <Button
                        variant="contained"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`session/${session.sessionId}`);
                        }}
                      >
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
