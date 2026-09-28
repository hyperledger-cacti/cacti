import * as React from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableBody from "@mui/material/TableBody";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import VisibilityIcon from "@mui/icons-material/Visibility";
import SecurityIcon from "@mui/icons-material/Security";
import ShortenedTypography from "../../../components/ui/ShortenedTypography";
import { ParsedAuditRecord } from "../types";

export interface ProofAuditTrailProps {
  auditTrail: ParsedAuditRecord[];
}

export const ProofAuditTrail: React.FC<ProofAuditTrailProps> = ({
  auditTrail,
}) => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedLog, setSelectedLog] =
    React.useState<ParsedAuditRecord | null>(null);
  const [copiedKey, setCopiedKey] = React.useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredLogs = auditTrail.filter((log) => {
    const s = searchTerm.toLowerCase();
    return (
      log.operation.toLowerCase().includes(s) ||
      log.auditEntryId.toLowerCase().includes(s) ||
      log.key.toLowerCase().includes(s) ||
      log.type.toLowerCase().includes(s)
    );
  });

  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={2}
        mb={2}
      >
        <Box display="flex" alignItems="center">
          <SecurityIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" fontWeight="bold">
            Audit & Cryptographic Proof Trail ({auditTrail.length} Records)
          </Typography>
        </Box>
        <TextField
          size="small"
          placeholder="Filter by operation, proof ID, or key..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ width: { xs: "100%", sm: 300 } }}
        />
      </Box>

      {filteredLogs.length === 0 ? (
        <Box p={4} textAlign="center" color="text.secondary">
          <Typography variant="body1">
            No audit records matching criteria or recorded yet for this session.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow
                sx={{
                  bgcolor: (theme) =>
                    theme.palette.mode === "dark" ? "#1e293b" : "#f1f5f9",
                }}
              >
                <TableCell width={60}>
                  <b>Seq</b>
                </TableCell>
                <TableCell>
                  <b>Operation / Event</b>
                </TableCell>
                <TableCell>
                  <b>Audit Proof / Claim Key</b>
                </TableCell>
                <TableCell width={100}>
                  <b>Type</b>
                </TableCell>
                <TableCell>
                  <b>Timestamp</b>
                </TableCell>
                <TableCell align="center" width={110}>
                  <b>Actions</b>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow
                  key={log.auditEntryId}
                  hover
                  sx={{
                    bgcolor: log.isRollback
                      ? "rgba(237, 108, 2, 0.08)"
                      : log.isError
                        ? "rgba(211, 47, 47, 0.08)"
                        : "inherit",
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      #{log.sequenceNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {log.operation}
                    </Typography>
                    {log.isRollback && (
                      <Chip
                        label="Rollback"
                        size="small"
                        color="warning"
                        sx={{ height: 18, fontSize: "0.65rem", mr: 0.5 }}
                      />
                    )}
                    {log.isError && (
                      <Chip
                        label="Error"
                        size="small"
                        color="error"
                        sx={{ height: 18, fontSize: "0.65rem" }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <ShortenedTypography
                        text={log.key || log.auditEntryId}
                        maxWidth={160}
                        variant="body2"
                      />
                      <Tooltip
                        title={
                          copiedKey === log.auditEntryId
                            ? "Copied!"
                            : "Copy proof key"
                        }
                      >
                        <IconButton
                          size="small"
                          onClick={() =>
                            handleCopy(
                              log.key || log.auditEntryId,
                              log.auditEntryId,
                            )
                          }
                          sx={{ ml: 0.5 }}
                        >
                          <ContentCopyIcon
                            fontSize="small"
                            sx={{ fontSize: 16 }}
                          />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={log.type} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(log.timestamp).toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Inspect raw JSON payload">
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => setSelectedLog(log)}
                        sx={{ fontSize: "0.75rem", py: 0.2 }}
                      >
                        Inspect
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* JSON Viewer Dialog */}
      <Dialog
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>
            Audit Log Payload: #{selectedLog?.sequenceNumber} -{" "}
            {selectedLog?.operation}
          </span>
          <Chip label={selectedLog?.type} size="small" color="primary" />
        </DialogTitle>
        <DialogContent dividers>
          <Box mb={2}>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              <b>Audit Entry ID:</b> {selectedLog?.auditEntryId}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              <b>Claim/Proof Key:</b> {selectedLog?.key || "N/A"}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              <b>Timestamp:</b> {selectedLog?.isoTime}
            </Typography>
          </Box>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: (theme) =>
                theme.palette.mode === "dark" ? "#0f172a" : "#1e293b",
              color: "#38bdf8",
              fontFamily: "monospace",
              fontSize: "0.85rem",
              maxHeight: 400,
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              borderRadius: 1.5,
            }}
          >
            {selectedLog?.parsedPayload
              ? JSON.stringify(selectedLog.parsedPayload, null, 2)
              : selectedLog?.rawData || "No data payload"}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button
            startIcon={<ContentCopyIcon />}
            onClick={() => {
              if (selectedLog) {
                const text = selectedLog.parsedPayload
                  ? JSON.stringify(selectedLog.parsedPayload, null, 2)
                  : selectedLog.rawData;
                navigator.clipboard.writeText(text);
              }
            }}
          >
            Copy JSON
          </Button>
          <Button onClick={() => setSelectedLog(null)} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
