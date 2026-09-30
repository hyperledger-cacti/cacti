import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import RefreshIcon from "@mui/icons-material/Refresh";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DownloadIcon from "@mui/icons-material/Download";
import { useSatpAppConfig } from "../hooks";
import { useSatpSessionStatus, useSatpAuditTrail } from "../queries";
import { parseAuditEntries, buildSessionDetails } from "../utils/parser";
import { DEMO_SESSIONS } from "../utils/demoData";
import { StatusBadge } from "../components/StatusBadge";
import { TimelineStepper } from "../components/TimelineStepper";
import { GatewayTopologyCard } from "../components/GatewayTopologyCard";
import { ProofAuditTrail } from "../components/ProofAuditTrail";
import { FailureLensCard } from "../components/FailureLensCard";
import ShortenedTypography from "../../../components/ui/ShortenedTypography";

export default function SessionDetails() {
  const { sessionId = "" } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const config = useSatpAppConfig();
  const [copiedId, setCopiedId] = React.useState(false);

  // Check if sessionId matches a demo session
  const demoMatch = React.useMemo(() => {
    return DEMO_SESSIONS.find((s) => s.sessionId === sessionId);
  }, [sessionId]);

  const {
    data: statusData,
    isLoading: isStatusLoading,
    refetch: refetchStatus,
  } = useSatpSessionStatus(config.gatewayApiUrl, sessionId, config.refreshIntervalMs);

  const {
    data: auditData,
    isLoading: isAuditLoading,
    refetch: refetchAudit,
  } = useSatpAuditTrail(config.gatewayApiUrl, undefined, undefined, config.refreshIntervalMs);

  const handleCopy = () => {
    navigator.clipboard.writeText(sessionId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleRefresh = () => {
    refetchStatus();
    refetchAudit();
  };

  const auditRecords = React.useMemo(() => {
    if (demoMatch) {
      return demoMatch.auditTrail;
    }
    return parseAuditEntries(auditData?.auditEntries?.entries, sessionId);
  }, [demoMatch, auditData, sessionId]);

  const sessionDetails = React.useMemo(() => {
    if (demoMatch) {
      return demoMatch;
    }
    return buildSessionDetails(sessionId, statusData, auditRecords);
  }, [demoMatch, sessionId, statusData, auditRecords]);

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessionDetails, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `satp-session-${sessionId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (!sessionId) {
    return (
      <Box p={4} textAlign="center">
        <Typography variant="h6" color="text.secondary">
          No Session ID specified.
        </Typography>
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("../")}
        >
          Back to Transfers Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 1 }}>
      {/* Header bar */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={2}
        mb={3}
      >
        <Box display="flex" alignItems="center">
          <IconButton
            edge="start"
            color="primary"
            onClick={() => navigate(-1)}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon sx={{ fontSize: 32 }} />
          </IconButton>
          <Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="h5" fontWeight="bold">
                Session Inspector
              </Typography>
              <StatusBadge
                status={sessionDetails.status}
                hasRollback={sessionDetails.hasRollback}
              />
            </Box>
            <Box display="flex" alignItems="center" mt={0.5}>
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                Session ID:
              </Typography>
              <ShortenedTypography
                text={sessionId}
                variant="body2"
                fontWeight="bold"
                maxWidth={320}
              />
              <Tooltip title={copiedId ? "Copied!" : "Copy Session ID"}>
                <IconButton size="small" onClick={handleCopy} sx={{ ml: 0.5 }}>
                  <ContentCopyIcon fontSize="small" sx={{ fontSize: 16 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={1.5}>
          {sessionDetails.startTime && (
            <Chip
              label={`Started: ${new Date(sessionDetails.startTime).toLocaleTimeString()}`}
              variant="outlined"
              size="small"
            />
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={handleExportJson}
          >
            Export JSON
          </Button>
          <Tooltip title="Refresh session status">
            <IconButton onClick={handleRefresh} color="primary">
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Failure Lens Banner (rendered if failed or rollback) */}
      <FailureLensCard
        hasFailure={sessionDetails.hasFailure}
        hasRollback={sessionDetails.hasRollback}
        failureReason={sessionDetails.failureReason}
        failingStage={sessionDetails.currentStage}
        failingStep={sessionDetails.currentStep}
        substatus={sessionDetails.substatus}
      />

      {/* Timeline Stepper */}
      <TimelineStepper
        stages={sessionDetails.stages}
        activeStepName={sessionDetails.currentStep}
      />

      {/* Gateway & Ledger Topology */}
      <GatewayTopologyCard
        originNetwork={sessionDetails.originNetwork}
        destinationNetwork={sessionDetails.destinationNetwork}
        sourceGatewayName={
          sessionDetails.originNetwork.includes("Besu")
            ? "Gateway 1 (Client Role · Besu)"
            : "Gateway 1 (Client)"
        }
        counterpartyGatewayName={
          sessionDetails.destinationNetwork.includes("Fabric")
            ? "Gateway 2 (Server Role · Fabric)"
            : "Gateway 2 (Server)"
        }
        assetReference={sessionDetails.assetReference}
        amount={sessionDetails.amount}
        senderAddress={sessionDetails.senderAddress}
        recipientAddress={sessionDetails.recipientAddress}
      />

      {/* Audit & Proof Trail */}
      {isStatusLoading && isAuditLoading && auditRecords.length === 0 ? (
        <Box p={4} textAlign="center">
          <CircularProgress size={30} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Fetching audit logs...
          </Typography>
        </Box>
      ) : (
        <ProofAuditTrail auditTrail={auditRecords} />
      )}
    </Box>
  );
}
