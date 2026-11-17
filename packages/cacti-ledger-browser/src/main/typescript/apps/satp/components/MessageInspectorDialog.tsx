import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";

import { annotateSnapshot, isEvidenceKind } from "../message-annotations";
import { stageLabel, type SatpMessageLogEntry } from "../transform";

const MONOSPACE = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const PRE_SX = {
  margin: 0,
  padding: 1,
  overflowX: "auto",
  maxHeight: 220,
  fontSize: 12,
  fontFamily: MONOSPACE,
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
} as const;

export interface MessageInspectorDialogProps {
  entry?: SatpMessageLogEntry;
  onClose: () => void;
  onOpenSession: (sessionId: string) => void;
}

/**
 * Inspects one recorded SATP message: the session state snapshot stored
 * with it, field by field with a plain-language note (hashes, signatures and
 * claims highlighted as evidence), or raw as the gateway stored it.
 */
export default function MessageInspectorDialog({
  entry,
  onClose,
  onOpenSession,
}: MessageInspectorDialogProps) {
  const [view, setView] = useState<"annotated" | "raw">("annotated");
  const fields = annotateSnapshot(entry?.snapshot);

  return (
    <Dialog open={Boolean(entry)} onClose={onClose} maxWidth="md" fullWidth>
      {entry && (
        <>
          <DialogTitle>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              rowGap={0.5}
            >
              <Typography component="span" variant="h6">
                {entry.type}
              </Typography>
              <Chip
                size="small"
                label={`#${entry.sequenceNumber}`}
                variant="outlined"
              />
              <Chip
                size="small"
                label={stageLabel(entry.stage)}
                variant="outlined"
              />
              {entry.rollback && (
                <Chip size="small" label="rollback" color="warning" />
              )}
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontFamily: MONOSPACE,
                display: "block",
                wordBreak: "break-all",
              }}
            >
              {entry.sessionId}
              {entry.timestampMs
                ? ` · ${new Date(entry.timestampMs).toLocaleString()}`
                : ""}
            </Typography>
          </DialogTitle>
          <DialogContent dividers>
            <ToggleButtonGroup
              size="small"
              exclusive
              value={view}
              onChange={(_, next) => next && setView(next)}
              sx={{ mb: 2 }}
            >
              <ToggleButton value="annotated">Annotated</ToggleButton>
              <ToggleButton value="raw">Raw</ToggleButton>
            </ToggleButtonGroup>

            {!entry.snapshot ? (
              <Typography variant="body2" color="text.secondary">
                This audit entry carries no session snapshot.
              </Typography>
            ) : view === "raw" ? (
              <Box
                component="pre"
                sx={{
                  ...PRE_SX,
                  maxHeight: 520,
                  bgcolor: "background.default",
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                }}
              >
                {JSON.stringify(entry.snapshot, null, 2)}
              </Box>
            ) : (
              <Stack spacing={1}>
                {fields.map((field) => {
                  const evidence = isEvidenceKind(field.kind);
                  return (
                    <Box
                      key={field.field}
                      data-evidence={evidence || undefined}
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        border: 1,
                        borderColor: evidence ? "primary.main" : "divider",
                        bgcolor: (theme) =>
                          evidence
                            ? alpha(theme.palette.primary.main, 0.05)
                            : theme.palette.background.paper,
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        sx={{ mb: 0.5 }}
                      >
                        <Typography
                          variant="subtitle2"
                          sx={{ fontFamily: MONOSPACE }}
                        >
                          {field.field}
                        </Typography>
                        <Chip
                          size="small"
                          label={field.kind}
                          variant="outlined"
                          color={evidence ? "primary" : "default"}
                          sx={{ height: 18, fontSize: 10 }}
                        />
                      </Stack>
                      {field.note && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mb: 0.5 }}
                        >
                          {field.note}
                        </Typography>
                      )}
                      <Box component="pre" sx={PRE_SX}>
                        {field.value}
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => onOpenSession(entry.sessionId)}>
              Open session
            </Button>
            <Button variant="contained" onClick={onClose}>
              Close
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
