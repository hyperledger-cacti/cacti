import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DnsIcon from "@mui/icons-material/Dns";
import ErrorIcon from "@mui/icons-material/Error";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import RefreshIcon from "@mui/icons-material/Refresh";
import TuneIcon from "@mui/icons-material/Tune";

import {
  guiAppConfigById,
  invalidateGuiAppConfig,
  updateGuiAppConfig,
} from "../../../common/queries";
import { useNotification } from "../../../common/context/NotificationContext";
import { isHttpUrl } from "../../../common/utils";
import { useSatpGatewayContext } from "../context/GatewayContext";
import {
  POLL_INTERVAL_CHOICES_MS,
  useSatpPolling,
} from "../context/PollingContext";
import { buildPersistedGatewayOptions, sameGatewayUrl } from "../gateways";
import { satpHealthQuery } from "../queries";
import type { SatpAppOptions, SatpGatewayEndpoint } from "../types";

const MONOSPACE = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export function GatewayHealthBadge({ url }: { url: string }) {
  const polling = useSatpPolling();
  const { data, isPending, isError } = useQuery(
    satpHealthQuery({
      gatewayUrl: url,
      ...(polling
        ? {
            polling: { paused: polling.paused, intervalMs: polling.intervalMs },
          }
        : {}),
    }),
  );
  if (!url) {
    return null;
  }
  if (isPending) {
    return (
      <Chip
        size="small"
        label="checking…"
        variant="outlined"
        sx={{ height: 20, fontSize: 11 }}
      />
    );
  }
  const online = !isError && data !== undefined;
  return (
    <Chip
      size="small"
      icon={
        online ? (
          <CheckCircleIcon sx={{ fontSize: "14px !important" }} />
        ) : (
          <ErrorIcon sx={{ fontSize: "14px !important" }} />
        )
      }
      label={online ? "online" : "offline"}
      color={online ? "success" : "error"}
      variant="outlined"
      sx={{ height: 20, fontSize: 11 }}
    />
  );
}

function SourceChip({ gateway }: { gateway: SatpGatewayEndpoint }) {
  return gateway.source === "config" ? (
    <Tooltip title="Stored in the app configuration (shared by every viewer)">
      <Chip
        size="small"
        label="App config"
        variant="outlined"
        sx={{ height: 20, fontSize: 11 }}
      />
    </Tooltip>
  ) : (
    <Tooltip title="Added in this browser only. Use 'Save to app config' to share it.">
      <Chip
        size="small"
        label="This browser"
        variant="outlined"
        color="secondary"
        sx={{ height: 20, fontSize: 11 }}
      />
    </Tooltip>
  );
}

/**
 * Saves the current gateway list (and counterparty) into the app instance
 * options in the config store, so every viewer and every reload sees the
 * same gateways. Reads the stored record first so no other field is lost.
 */
function useSaveGatewaysToConfig(options?: SatpAppOptions) {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  const { appInstanceId, gateways, counterpartyGatewayUrl } =
    useSatpGatewayContext();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!appInstanceId) {
        throw new Error("no app instance to save to");
      }
      const record = await queryClient.fetchQuery(
        guiAppConfigById(appInstanceId),
      );
      const stored = (record.options ??
        options ??
        {}) as unknown as SatpAppOptions;
      return updateGuiAppConfig(appInstanceId, {
        instance_name: record.instance_name,
        description: record.description,
        path: record.path,
        options: buildPersistedGatewayOptions(
          stored,
          gateways,
          counterpartyGatewayUrl,
        ),
      });
    },
    onSuccess: () => {
      invalidateGuiAppConfig(queryClient);
      showNotification("Gateways saved to the app configuration", "success");
    },
    onError: (error) => {
      showNotification(`Could not save gateways: ${error}`, "error");
    },
  });

  return {
    canSave: Boolean(appInstanceId),
    hasUnsaved: gateways.some((gw) => gw.source === "user"),
    save: () => mutation.mutate(),
    saving: mutation.isPending,
  };
}

export function ManageGatewaysDialog({
  open,
  onClose,
  options,
}: {
  open: boolean;
  onClose: () => void;
  /** Instance options; used when the stored record has no options. */
  options?: SatpAppOptions;
}) {
  const {
    activeGatewayUrl,
    counterpartyGatewayUrl,
    gateways,
    setActiveGatewayUrl,
    setCounterpartyGatewayUrl,
    addGateway,
    removeGateway,
  } = useSatpGatewayContext();
  const { canSave, hasUnsaved, save, saving } =
    useSaveGatewaysToConfig(options);

  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAdd = () => {
    setErrorMsg(null);
    const trimmedUrl = newUrl.trim();
    if (!isHttpUrl(trimmedUrl)) {
      setErrorMsg("Enter an absolute http(s) URL, e.g. http://localhost:4010");
      return;
    }
    if (!addGateway({ name: newName, url: trimmedUrl, description: newDesc })) {
      setErrorMsg("Could not add the gateway. Check the URL.");
      return;
    }
    setNewName("");
    setNewUrl("");
    setNewDesc("");
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <DnsIcon color="primary" />
        <Typography component="span" variant="h6">
          Manage SATP gateways
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Typography variant="body2" color="text.secondary">
            Add every gateway that takes part in your transfers (for example the
            source and the destination gateway). Sessions are looked up on all
            of them, so both sides of a transfer show up together.
          </Typography>

          <Stack spacing={1}>
            {gateways.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No gateway configured yet. Add one below.
              </Typography>
            )}
            {gateways.map((gw) => {
              const isActive = sameGatewayUrl(gw.url, activeGatewayUrl);
              const isCounterparty = sameGatewayUrl(
                gw.url,
                counterpartyGatewayUrl,
              );
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
                        : "divider",
                    bgcolor: (theme) =>
                      isActive
                        ? alpha(theme.palette.primary.main, 0.05)
                        : "background.paper",
                  }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        flexWrap="wrap"
                        rowGap={0.5}
                      >
                        <Typography variant="subtitle2">{gw.name}</Typography>
                        <GatewayHealthBadge url={gw.url} />
                        <SourceChip gateway={gw} />
                        {isActive && (
                          <Chip
                            size="small"
                            label="Active"
                            color="primary"
                            sx={{ height: 20, fontSize: 11 }}
                          />
                        )}
                        {isCounterparty && (
                          <Chip
                            size="small"
                            label="Counterparty"
                            color="secondary"
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
                          wordBreak: "break-all",
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
                        >
                          Set active
                        </Button>
                      )}
                      {!isActive && !isCounterparty && (
                        <Button
                          size="small"
                          variant="outlined"
                          color="secondary"
                          onClick={() => setCounterpartyGatewayUrl(gw.url)}
                        >
                          Set counterparty
                        </Button>
                      )}
                      {isCounterparty && (
                        <Button
                          size="small"
                          color="inherit"
                          onClick={() => setCounterpartyGatewayUrl(undefined)}
                        >
                          Clear
                        </Button>
                      )}
                      {gw.source === "user" && (
                        <Tooltip title="Remove this browser's gateway">
                          <IconButton
                            size="small"
                            aria-label={`remove ${gw.name}`}
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

          <Divider />

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Add a gateway
            </Typography>
            <Stack spacing={1.5}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <TextField
                  size="small"
                  label="Name"
                  placeholder="e.g. Destination gateway"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <TextField
                  size="small"
                  label="Gateway OAPI (REST) URL"
                  placeholder="http://localhost:4110"
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
                >
                  Add gateway
                </Button>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 1.5, justifyContent: "space-between" }}>
        <Tooltip
          title={
            canSave
              ? "Store this gateway list in the app configuration so every viewer gets it"
              : "Only available inside an installed app instance"
          }
        >
          <span>
            <Button
              startIcon={<CloudUploadIcon />}
              onClick={save}
              disabled={!canSave || saving}
            >
              {saving
                ? "Saving…"
                : hasUnsaved
                  ? "Save to app config"
                  : "Save to app config (no changes)"}
            </Button>
          </span>
        </Tooltip>
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function formatInterval(ms: number): string {
  return ms < 60_000 ? `${ms / 1000}s` : `${ms / 60_000}m`;
}

/** Pause/resume, interval picker and "refresh now" for every live view. */
export function PollingControls() {
  const polling = useSatpPolling();
  const queryClient = useQueryClient();
  if (!polling) {
    return null;
  }
  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <Tooltip
        title={polling.paused ? "Resume live updates" : "Pause live updates"}
      >
        <IconButton
          size="small"
          aria-label={
            polling.paused ? "resume live updates" : "pause live updates"
          }
          aria-pressed={polling.paused}
          onClick={() => polling.setPaused(!polling.paused)}
        >
          {polling.paused ? (
            <PlayArrowIcon fontSize="small" />
          ) : (
            <PauseIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
      <FormControl size="small" sx={{ minWidth: 92 }}>
        <InputLabel id="satp-poll-interval-label">Refresh</InputLabel>
        <Select
          labelId="satp-poll-interval-label"
          label="Refresh"
          value={polling.intervalMs}
          disabled={polling.paused}
          onChange={(event) =>
            polling.setIntervalMs(Number(event.target.value))
          }
          inputProps={{ "aria-label": "refresh interval" }}
        >
          {POLL_INTERVAL_CHOICES_MS.map((ms) => (
            <MenuItem key={ms} value={ms}>
              every {formatInterval(ms)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Tooltip title="Refresh now">
        <IconButton
          size="small"
          aria-label="refresh now"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["satp"] })}
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      {polling.paused && (
        <Chip size="small" label="Paused" color="warning" variant="outlined" />
      )}
    </Stack>
  );
}

function GatewaySelect({
  label,
  value,
  gateways,
  onChange,
  allowNone,
}: {
  label: string;
  value?: string;
  gateways: SatpGatewayEndpoint[];
  onChange: (url: string | undefined) => void;
  allowNone?: boolean;
}) {
  const id = `satp-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const selected =
    gateways.find((gw) => sameGatewayUrl(gw.url, value))?.url ?? "";
  return (
    <FormControl size="small" sx={{ minWidth: 220, maxWidth: 340 }}>
      <InputLabel id={`${id}-label`}>{label}</InputLabel>
      <Select
        labelId={`${id}-label`}
        label={label}
        value={selected}
        onChange={(event) =>
          onChange(
            event.target.value === "" ? undefined : String(event.target.value),
          )
        }
        renderValue={(url) => {
          const gw = gateways.find((g) => g.url === url);
          return gw ? `${gw.name} · ${gw.url}` : allowNone ? "None" : url;
        }}
        displayEmpty={allowNone}
      >
        {allowNone && (
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
        )}
        {gateways.map((gw) => (
          <MenuItem key={gw.id} value={gw.url}>
            <Stack>
              <Typography variant="body2">{gw.name}</Typography>
              <Typography
                variant="caption"
                sx={{ fontFamily: MONOSPACE, color: "text.secondary" }}
              >
                {gw.url}
              </Typography>
            </Stack>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

/**
 * Gateway toolbar above every SATP page: which gateway the views read
 * from, the counterparty of the transfer, live polling controls, and the
 * gateway manager.
 */
export default function SatpGatewayToolbar({
  options,
}: {
  options?: SatpAppOptions;
}) {
  const {
    activeGatewayUrl,
    counterpartyGatewayUrl,
    gateways,
    setActiveGatewayUrl,
    setCounterpartyGatewayUrl,
  } = useSatpGatewayContext();
  const [dialogOpen, setDialogOpen] = useState(false);

  const counterpartyChoices = gateways.filter(
    (gw) => !sameGatewayUrl(gw.url, activeGatewayUrl),
  );

  return (
    <>
      <Card
        elevation={0}
        sx={{
          px: 2,
          py: 1.25,
          bgcolor: "background.paper",
          borderColor: "divider",
        }}
      >
        <Stack
          direction={{ xs: "column", lg: "row" }}
          alignItems={{ xs: "stretch", lg: "center" }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <GatewaySelect
                label="Gateway"
                value={activeGatewayUrl}
                gateways={gateways}
                onChange={(url) => url && setActiveGatewayUrl(url)}
              />
              <GatewayHealthBadge url={activeGatewayUrl} />
            </Stack>
            {counterpartyChoices.length > 0 && (
              <Stack direction="row" spacing={1} alignItems="center">
                <GatewaySelect
                  label="Counterparty"
                  value={counterpartyGatewayUrl}
                  gateways={counterpartyChoices}
                  onChange={setCounterpartyGatewayUrl}
                  allowNone
                />
                {counterpartyGatewayUrl && (
                  <GatewayHealthBadge url={counterpartyGatewayUrl} />
                )}
              </Stack>
            )}
          </Stack>

          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="flex-end"
            flexWrap="wrap"
            rowGap={1}
          >
            <PollingControls />
            <Button
              size="small"
              variant="outlined"
              startIcon={<TuneIcon />}
              onClick={() => setDialogOpen(true)}
            >
              Manage gateways ({gateways.length})
            </Button>
          </Stack>
        </Stack>
      </Card>

      <ManageGatewaysDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        options={options}
      />
    </>
  );
}
