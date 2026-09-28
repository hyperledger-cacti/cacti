import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Grid from "@mui/material/Grid";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import HubIcon from "@mui/icons-material/Hub";
import DnsIcon from "@mui/icons-material/Dns";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useSatpAppConfig } from "../hooks";
import { useSatpGatewayHealth, useSatpSupportedLedgers } from "../queries";

export default function GatewayNetwork() {
  const config = useSatpAppConfig();

  const {
    data: health,
    refetch: refetchHealth,
  } = useSatpGatewayHealth(config.gatewayApiUrl);

  const {
    data: ledgers,
    refetch: refetchLedgers,
  } = useSatpSupportedLedgers(config.gatewayApiUrl);

  const isAvailable = health?.status === "AVAILABLE";

  const handleRefresh = () => {
    refetchHealth();
    refetchLedgers();
  };

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
            SATP Gateway & Network Health
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gateway telemetry, connected ledger connectors, and protocol
            capabilities
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
        >
          Refresh Telemetry
        </Button>
      </Box>

      {/* Health status banner */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={2}
        >
          <Box display="flex" alignItems="center">
            {isAvailable ? (
              <CheckCircleIcon color="success" sx={{ fontSize: 40, mr: 2 }} />
            ) : (
              <ErrorIcon color="error" sx={{ fontSize: 40, mr: 2 }} />
            )}
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {isAvailable
                  ? "Gateway Operational & Available"
                  : "Gateway Ping Failed / Unavailable"}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configured endpoint: <b>{config.gatewayApiUrl}</b>
              </Typography>
            </Box>
          </Box>

          <Chip
            label={isAvailable ? "HEALTHCHECK OK" : "UNAVAILABLE"}
            color={isAvailable ? "success" : "error"}
            sx={{ fontWeight: "bold" }}
          />
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Connected Ledgers */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Box display="flex" alignItems="center" mb={2}>
              <DnsIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6" fontWeight="bold">
                Supported Ledger Networks
              </Typography>
            </Box>

            {ledgers?.supportedLedgers &&
            ledgers.supportedLedgers.length > 0 ? (
              <Box display="flex" flexWrap="wrap" gap={1} mt={2}>
                {ledgers.supportedLedgers.map((ledger) => (
                  <Chip
                    key={ledger}
                    label={ledger}
                    color="primary"
                    variant="outlined"
                    sx={{ fontWeight: "bold" }}
                  />
                ))}
              </Box>
            ) : (
              <Alert severity="info" sx={{ mt: 1 }}>
                Gateway connectors enabled: Ethereum (Besu/GoQuorum) &
                Hyperledger Fabric.
              </Alert>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
              SATP gateways operate as trust-anchored intermediaries that
              interface with these underlying networks via Cacti connector
              plugins to lock, mint, and burn assets.
            </Typography>
          </Paper>
        </Grid>

        {/* Protocol Capabilities */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Box display="flex" alignItems="center" mb={2}>
              <HubIcon color="secondary" sx={{ mr: 1 }} />
              <Typography variant="h6" fontWeight="bold">
                Protocol Specifications
              </Typography>
            </Box>

            <Box display="flex" flexDirection="column" gap={1.5} mt={2}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="body2" fontWeight="bold">
                  SATP Draft Core:
                </Typography>
                <Chip label="draft-ietf-satp-core-02" size="small" />
              </Box>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="body2" fontWeight="bold">
                  Transport Protocol:
                </Typography>
                <Chip
                  label="gRPC-Web / HTTP/2 Connect"
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              </Box>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="body2" fontWeight="bold">
                  Crash Recovery Protocol:
                </Typography>
                <Chip
                  label="Enabled (State Log Journaling)"
                  size="small"
                  color="success"
                  variant="outlined"
                />
              </Box>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
              >
                <Typography variant="body2" fontWeight="bold">
                  Cryptographic Signatures:
                </Typography>
                <Chip label="SECP256K1" size="small" />
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
