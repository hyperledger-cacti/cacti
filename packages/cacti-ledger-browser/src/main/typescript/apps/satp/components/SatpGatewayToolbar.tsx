import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DnsIcon from "@mui/icons-material/Dns";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import TuneIcon from "@mui/icons-material/Tune";
import ElectricBoltIcon from "@mui/icons-material/ElectricBolt";

import { useSatpGatewayContext } from "../context/GatewayContext";
import { satpHealthQuery } from "../queries";
import { isHttpUrl } from "../../../common/utils";

export function GatewayHealthBadge({ url }: { url: string }) {
  const { data, isPending, isError } = useQuery(
    satpHealthQuery({ gatewayUrl: url }),
  );
  if (isPending) {
    return (
      <Chip
        size="small"
        label="checking..."
        variant="outlined"
        sx={{ height: 20, fontSize: 10 }}
      />
    );
  }
  if (!isError && data !== undefined) {
    return (
      <Chip
        size="small"
        icon={<CheckCircleIcon sx={{ fontSize: "14px !important" }} />}
        label="online"
        color="success"
        variant="outlined"
        sx={{ height: 20, fontSize: 10 }}
      />
    );
  }
  return (
    <Chip
      size="small"
      icon={<ErrorIcon sx={{ fontSize: "14px !important" }} />}
      label="offline"
      color="error"
      variant="outlined"
      sx={{ height: 20, fontSize: 10 }}
    />
  );
}

export function ManageGatewaysDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const {
    activeGatewayUrl,
    counterpartyGatewayUrl,
    gateways,
    setActiveGatewayUrl,
    setCounterpartyGatewayUrl,
    addGateway,
    removeGateway,
    loadCbdcPresets,
  } = useSatpGatewayContext();

  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAdd = () => {
    setErrorMsg(null);
    const trimmedUrl = newUrl.trim();
    if (!isHttpUrl(trimmedUrl)) {
      setErrorMsg("Please enter a valid absolute http(s) URL");
      return;
    }
    const success = addGateway({
      name: newName.trim() || trimmedUrl,
      url: trimmedUrl,
      description: newDesc.trim() || undefined,
    });
    if (!success) {
      setErrorMsg("Failed to add gateway. Check URL format.");
      return;
    }
    setNewName("");
    setNewUrl("");
    setNewDesc("");
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{ pb: 1, display: "flex", alignItems: "center", gap: 1 }}
      >
        <DnsIcon color="primary" />
        <Typography component="span" variant="h6" fontWeight={700}>
          Manage SATP Gateways
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          {/* Quick Presets Notice */}
          <Box
            sx={{
              p: 1.5,
              bgcolor: "#f0f7f2",
              borderRadius: 1.5,
              border: "1px solid #c2e2cb",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="subtitle2" fontWeight={600} color="#1b4d29">
                CBDC Bridging Demo Mode
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Auto-configure dual gateways: Besu (port 4010) as Origin &
                Fabric (port 4020) as Destination.
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="small"
              startIcon={<ElectricBoltIcon />}
              onClick={() => {
                loadCbdcPresets();
                onClose();
              }}
              sx={{
                bgcolor: "#4e8c5e",
                "&:hover": { bgcolor: "#3f734d" },
                textTransform: "none",
              }}
            >
              Load CBDC Preset
            </Button>
          </Box>

          {/* Configured Gateway Endpoints List */}
          <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              Configured Gateway Endpoints
            </Typography>
            <Stack spacing={1}>
              {gateways.map((gw) => {
                const isActive =
                  gw.url.toLowerCase() === activeGatewayUrl.toLowerCase();
                const isCounterparty =
                  counterpartyGatewayUrl &&
                  gw.url.toLowerCase() === counterpartyGatewayUrl.toLowerCase();

                return (
                  <Card
                    key={gw.id}
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      borderColor: isActive
                        ? "primary.main"
                        : isCounterparty
                          ? "secondary.main"
                          : "#dfe5e3",
                      bgcolor: isActive ? "rgba(78, 140, 94, 0.04)" : "#ffffff",
                    }}
                  >
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      alignItems={{ xs: "flex-start", sm: "center" }}
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography variant="subtitle2" fontWeight={600}>
                            {gw.name}
                          </Typography>
                          <GatewayHealthBadge url={gw.url} />
                          {isActive && (
                            <Chip
                              size="small"
                              label="Active"
                              color="primary"
                              sx={{ height: 20, fontSize: 10 }}
                            />
                          )}
                          {isCounterparty && (
                            <Chip
                              size="small"
                              label="Counterparty"
                              color="secondary"
                              sx={{ height: 20, fontSize: 10 }}
                            />
                          )}
                        </Stack>
                        <Typography
                          variant="caption"
                          sx={{
                            fontFamily: "ui-monospace, monospace",
                            color: "text.secondary",
                            display: "block",
                          }}
                        >
                          {gw.url}
                        </Typography>
                        {gw.description && (
                          <Typography variant="caption" color="text.secondary">
                            {gw.description}
                          </Typography>
                        )}
                      </Box>

                      <Stack direction="row" spacing={1} alignItems="center">
                        {!isActive && (
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => setActiveGatewayUrl(gw.url)}
                            sx={{ textTransform: "none", fontSize: 12 }}
                          >
                            Set Active
                          </Button>
                        )}
                        {!isCounterparty && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="secondary"
                            onClick={() => setCounterpartyGatewayUrl(gw.url)}
                            sx={{ textTransform: "none", fontSize: 12 }}
                          >
                            Set Counterparty
                          </Button>
                        )}
                        {isCounterparty && (
                          <Button
                            size="small"
                            color="inherit"
                            onClick={() => setCounterpartyGatewayUrl(undefined)}
                            sx={{
                              textTransform: "none",
                              fontSize: 11,
                              color: "text.secondary",
                            }}
                          >
                            Clear
                          </Button>
                        )}
                        {!gw.isDefault && (
                          <Tooltip title="Remove custom gateway">
                            <IconButton
                              size="small"
                              onClick={() => removeGateway(gw.id)}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </Stack>
                  </Card>
                );
              })}
            </Stack>
          </Box>

          <Divider />

          {/* Add New Custom Gateway Form */}
          <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
              Add New Gateway Connection
            </Typography>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField
                  size="small"
                  label="Gateway Name / Label"
                  placeholder="e.g. Counterparty Hermes Gateway"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  label="Gateway REST (OAPI) URL"
                  placeholder="http://localhost:3014"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  error={Boolean(errorMsg)}
                  helperText={errorMsg}
                  sx={{ flex: 1.5 }}
                />
              </Stack>
              <TextField
                size="small"
                label="Description (optional)"
                placeholder="e.g. Destination Fabric test ledger gateway"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                fullWidth
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAdd}
                  disabled={!newUrl.trim()}
                  sx={{ textTransform: "none" }}
                >
                  Add Gateway Endpoint
                </Button>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5 }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{ textTransform: "none" }}
        >
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function SatpGatewayToolbar() {
  const {
    activeGatewayUrl,
    counterpartyGatewayUrl,
    gateways,
    setCounterpartyGatewayUrl,
  } = useSatpGatewayContext();
  const [dialogOpen, setDialogOpen] = useState(false);

  const activeGw = gateways.find(
    (g) => g.url.toLowerCase() === activeGatewayUrl.toLowerCase(),
  );
  const counterpartyGw = gateways.find(
    (g) =>
      counterpartyGatewayUrl &&
      g.url.toLowerCase() === counterpartyGatewayUrl.toLowerCase(),
  );

  return (
    <>
      <Card
        elevation={0}
        sx={{
          mb: 2.5,
          border: "1px solid",
          borderColor: "#dfe5e3",
          borderRadius: 2,
          bgcolor: "#fcfdfc",
        }}
      >
        <CardContent sx={{ py: "10px !important", px: 2 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            alignItems={{ xs: "flex-start", md: "center" }}
            justifyContent="space-between"
            spacing={1.5}
          >
            {/* Left: Active Gateway & Counterparty Pills */}
            <Stack
              direction="row"
              spacing={1.5}
              alignItems="center"
              flexWrap="wrap"
              rowGap={1}
            >
              <Stack direction="row" spacing={0.75} alignItems="center">
                <DnsIcon sx={{ fontSize: 18, color: "#4e8c5e" }} />
                <Typography
                  variant="caption"
                  fontWeight={700}
                  color="text.secondary"
                >
                  GATEWAY:
                </Typography>
                <Chip
                  size="small"
                  label={
                    activeGw
                      ? `${activeGw.name} (${activeGatewayUrl})`
                      : activeGatewayUrl
                  }
                  color="primary"
                  sx={{
                    fontWeight: 600,
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 12,
                    height: 26,
                  }}
                />
                <GatewayHealthBadge url={activeGatewayUrl} />
              </Stack>

              {counterpartyGatewayUrl && (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <CompareArrowsIcon sx={{ fontSize: 18, color: "#ef9a4f" }} />
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color="text.secondary"
                  >
                    COUNTERPARTY:
                  </Typography>
                  <Chip
                    size="small"
                    label={
                      counterpartyGw
                        ? `${counterpartyGw.name} (${counterpartyGatewayUrl})`
                        : counterpartyGatewayUrl
                    }
                    color="secondary"
                    onDelete={() => setCounterpartyGatewayUrl(undefined)}
                    sx={{
                      fontWeight: 600,
                      fontFamily: "ui-monospace, monospace",
                      fontSize: 12,
                      height: 26,
                    }}
                  />
                  <GatewayHealthBadge url={counterpartyGatewayUrl} />
                </Stack>
              )}
            </Stack>

            {/* Right: Quick Configure Button */}
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                size="small"
                variant="outlined"
                startIcon={<TuneIcon />}
                onClick={() => setDialogOpen(true)}
                sx={{
                  textTransform: "none",
                  fontSize: 12,
                  borderColor: "#dfe5e3",
                  color: "#101314",
                  bgcolor: "#ffffff",
                  "&:hover": { borderColor: "#4e8c5e", bgcolor: "#f7f9f6" },
                }}
              >
                Switch / Manage Gateways
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <ManageGatewaysDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}
