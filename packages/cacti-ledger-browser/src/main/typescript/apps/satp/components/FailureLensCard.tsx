import * as React from "react";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import UndoIcon from "@mui/icons-material/Undo";

export interface FailureLensCardProps {
  hasFailure: boolean;
  hasRollback: boolean;
  failureReason?: string;
  failingStep?: string;
  failingStage?: string;
  substatus?: string;
}

export const FailureLensCard: React.FC<FailureLensCardProps> = ({
  hasFailure,
  hasRollback,
  failureReason,
  failingStep,
  failingStage,
  substatus,
}) => {
  if (!hasFailure && !hasRollback) {
    return null;
  }

  const severity = hasRollback ? "warning" : "error";
  const title = hasRollback
    ? "Transfer Halted: Automated Rollback / Refund Initiated"
    : "Transfer Failure Detected";

  return (
    <Paper
      elevation={3}
      sx={{
        mb: 3,
        borderRadius: 2,
        overflow: "hidden",
        border: (theme) =>
          hasRollback
            ? `1px solid ${theme.palette.warning.main}`
            : `1px solid ${theme.palette.error.main}`,
      }}
    >
      <Alert
        severity={severity}
        icon={
          hasRollback ? (
            <UndoIcon fontSize="large" />
          ) : (
            <ReportProblemIcon fontSize="large" />
          )
        }
        sx={{ borderRadius: 0 }}
      >
        <AlertTitle sx={{ fontWeight: "bold", fontSize: "1.1rem" }}>
          {title}
        </AlertTitle>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {failureReason ||
            "An error occurred while executing the Secure Asset Transfer Protocol step."}
        </Typography>

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {failingStage && (
            <Grid item xs={12} sm={4}>
              <Box display="flex" alignItems="center">
                <Typography variant="caption" fontWeight="bold" sx={{ mr: 1 }}>
                  Failing Stage:
                </Typography>
                <Chip
                  label={failingStage}
                  size="small"
                  color={severity}
                  variant="outlined"
                />
              </Box>
            </Grid>
          )}
          {failingStep && (
            <Grid item xs={12} sm={4}>
              <Box display="flex" alignItems="center">
                <Typography variant="caption" fontWeight="bold" sx={{ mr: 1 }}>
                  Failing Step:
                </Typography>
                <Chip label={failingStep} size="small" color={severity} />
              </Box>
            </Grid>
          )}
          {substatus && (
            <Grid item xs={12} sm={4}>
              <Box display="flex" alignItems="center">
                <Typography variant="caption" fontWeight="bold" sx={{ mr: 1 }}>
                  Protocol Substatus:
                </Typography>
                <Chip label={substatus} size="small" variant="filled" />
              </Box>
            </Grid>
          )}
        </Grid>

        <Box mt={2} pt={1} borderTop="1px dashed rgba(140, 140, 160, 0.3)">
          <Typography variant="caption" color="text.secondary">
            <b>Forensic Recommendation:</b> Inspect the audit trail records
            below to verify the rejection reason or check whether rollback
            assertions have completed on both gateways.
          </Typography>
        </Box>
      </Alert>
    </Paper>
  );
};
