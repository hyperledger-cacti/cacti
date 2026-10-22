import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";

export type SatpChipTone = "success" | "info" | "warning" | "error" | "default";

const STATUS_TONES: Record<string, SatpChipTone> = {
  // StatusResponse.status
  DONE: "success",
  PENDING: "warning",
  FAILED: "error",
  INVALID: "error",
  NOT_FOUND: "default",
  // SessionData State labels
  COMPLETED: "success",
  ONGOING: "warning",
  RECOVERING: "info",
  RECOVERED: "success",
  REJECTED: "error",
  CONDITIONAL_REJECTED: "error",
  ERROR: "error",
  UNSPECIFIED: "default",
  // Notable substatuses
  WAIT_SOURCE_CONFIRMATIONS: "warning",
  WAIT_DESTINATION_TRANSACTION: "warning",
  REFUND_IN_PROGRESS: "warning",
  BRIDGE_NOT_AVAILABLE: "error",
  CHAIN_NOT_AVAILABLE: "error",
  RECOVERY_FAILED: "error",
  REFUNDED: "info",
  PARTIAL: "warning",
  NOT_PROCESSABLE_REFUND_NEEDED: "error",
};

const TONE_COLORS: Record<
  SatpChipTone,
  "success" | "info" | "warning" | "error" | "default"
> = {
  success: "success",
  info: "info",
  warning: "warning",
  error: "error",
  default: "default",
};

/**
 * Colored chip for SATP status/substatus/stage/state values. Unknown values
 * render as neutral chips; missing values render as a muted em dash so that
 * unavailable fields do not add chip noise.
 */
export default function StatusChip({ value }: { value?: string }) {
  if (!value) {
    return (
      <Typography component="span" color="text.disabled" sx={{ fontSize: 14 }}>
        —
      </Typography>
    );
  }
  const tone = STATUS_TONES[value] ?? "default";
  return (
    <Chip
      size="small"
      label={value}
      color={TONE_COLORS[tone]}
      variant={tone === "default" ? "outlined" : "filled"}
    />
  );
}
