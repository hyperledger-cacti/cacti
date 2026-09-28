import * as React from "react";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Chip from "@mui/material/Chip";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import RouterIcon from "@mui/icons-material/Router";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import TokenIcon from "@mui/icons-material/Token";
import ShortenedTypography from "../../../components/ui/ShortenedTypography";

export interface GatewayTopologyCardProps {
  originNetwork?: string;
  destinationNetwork?: string;
  sourceGatewayName?: string;
  counterpartyGatewayName?: string;
  assetReference?: string;
  amount?: string;
  senderAddress?: string;
  recipientAddress?: string;
}

export const GatewayTopologyCard: React.FC<GatewayTopologyCardProps> = ({
  originNetwork = "Origin DLT",
  destinationNetwork = "Destination DLT",
  sourceGatewayName = "Gateway 1 (Client)",
  counterpartyGatewayName = "Gateway 2 (Server)",
  assetReference,
  amount,
  senderAddress,
  recipientAddress,
}) => {
  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 2,
        background: (theme) =>
          theme.palette.mode === "dark"
            ? "linear-gradient(135deg, #111827 0%, #1f2937 100%)"
            : "linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)",
        border: "1px solid rgba(140, 140, 160, 0.15)",
      }}
    >
      <Box display="flex" alignItems="center" mb={2}>
        <AccountTreeIcon color="primary" sx={{ mr: 1 }} />
        <Typography variant="h6" fontWeight="bold">
          Gateway & Ledger Transfer Topology
        </Typography>
      </Box>

      <Grid container spacing={2} alignItems="center" justifyContent="center">
        {/* Node 1: Origin Ledger */}
        <Grid item xs={12} sm={3}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              textAlign: "center",
              borderColor: "primary.main",
              borderRadius: 2,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "#0f172a" : "#f0f9ff",
            }}
          >
            <Chip
              label="Origin Ledger"
              size="small"
              color="primary"
              sx={{ mb: 1 }}
            />
            <Typography variant="subtitle1" fontWeight="bold" noWrap>
              {originNetwork}
            </Typography>
            {senderAddress && (
              <Box mt={1}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Sender:
                </Typography>
                <ShortenedTypography
                  text={senderAddress}
                  variant="caption"
                  maxWidth={140}
                  sx={{ mx: "auto" }}
                />
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Arrow 1 */}
        <Grid item xs={12} sm={1} textAlign="center">
          <ArrowForwardIcon color="action" sx={{ fontSize: 32 }} />
        </Grid>

        {/* Node 2: Source Gateway */}
        <Grid item xs={12} sm={2.5}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              textAlign: "center",
              borderRadius: 2,
              borderColor: "info.main",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "#1e1b4b" : "#eef2ff",
            }}
          >
            <Box display="flex" justifyContent="center" mb={0.5}>
              <RouterIcon color="info" fontSize="small" sx={{ mr: 0.5 }} />
              <Typography variant="caption" color="info.main" fontWeight="bold">
                Source SATP Gateway
              </Typography>
            </Box>
            <Typography variant="subtitle2" fontWeight="bold" noWrap>
              {sourceGatewayName}
            </Typography>
            <Chip
              label="TLS / gRPC-Web"
              size="small"
              variant="outlined"
              color="info"
              sx={{ mt: 1, height: 18, fontSize: "0.65rem" }}
            />
          </Paper>
        </Grid>

        {/* Arrow 2 (Bridge) */}
        <Grid item xs={12} sm={1} textAlign="center">
          <Box display="flex" flexDirection="column" alignItems="center">
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: "0.65rem" }}
            >
              SATP v2
            </Typography>
            <ArrowForwardIcon color="primary" sx={{ fontSize: 32 }} />
          </Box>
        </Grid>

        {/* Node 3: Counterparty Gateway */}
        <Grid item xs={12} sm={2.5}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              textAlign: "center",
              borderRadius: 2,
              borderColor: "secondary.main",
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "#311042" : "#fdf4ff",
            }}
          >
            <Box display="flex" justifyContent="center" mb={0.5}>
              <RouterIcon color="secondary" fontSize="small" sx={{ mr: 0.5 }} />
              <Typography
                variant="caption"
                color="secondary.main"
                fontWeight="bold"
              >
                Counterparty Gateway
              </Typography>
            </Box>
            <Typography variant="subtitle2" fontWeight="bold" noWrap>
              {counterpartyGatewayName}
            </Typography>
            <Chip
              label="TLS / gRPC-Web"
              size="small"
              variant="outlined"
              color="secondary"
              sx={{ mt: 1, height: 18, fontSize: "0.65rem" }}
            />
          </Paper>
        </Grid>

        {/* Arrow 3 */}
        <Grid item xs={12} sm={1} textAlign="center">
          <ArrowForwardIcon color="action" sx={{ fontSize: 32 }} />
        </Grid>

        {/* Node 4: Destination Ledger */}
        <Grid item xs={12} sm={3}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              textAlign: "center",
              borderColor: "success.main",
              borderRadius: 2,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "#064e3b" : "#ecfdf5",
            }}
          >
            <Chip
              label="Destination Ledger"
              size="small"
              color="success"
              sx={{ mb: 1 }}
            />
            <Typography variant="subtitle1" fontWeight="bold" noWrap>
              {destinationNetwork}
            </Typography>
            {recipientAddress && (
              <Box mt={1}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  Recipient:
                </Typography>
                <ShortenedTypography
                  text={recipientAddress}
                  variant="caption"
                  maxWidth={140}
                  sx={{ mx: "auto" }}
                />
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {(assetReference || amount) && (
        <Box
          mt={3}
          p={1.5}
          borderRadius={1.5}
          bgcolor={(theme) =>
            theme.palette.mode === "dark" ? "rgba(255,255,255,0.05)" : "#f8fafc"
          }
          display="flex"
          alignItems="center"
          justifyContent="space-around"
          flexWrap="wrap"
          gap={2}
        >
          {assetReference && (
            <Box display="flex" alignItems="center">
              <TokenIcon color="primary" fontSize="small" sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                Asset Identifier:
              </Typography>
              <ShortenedTypography
                text={assetReference}
                variant="body2"
                fontWeight="bold"
                maxWidth={220}
              />
            </Box>
          )}
          {amount && (
            <Box display="flex" alignItems="center">
              <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                Transfer Amount:
              </Typography>
              <Chip
                label={amount}
                color="primary"
                size="small"
                variant="outlined"
              />
            </Box>
          )}
        </Box>
      )}
    </Paper>
  );
};
