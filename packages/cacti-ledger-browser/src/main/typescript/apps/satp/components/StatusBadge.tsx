import * as React from "react";
import Chip, { ChipProps } from "@mui/material/Chip";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import UndoIcon from "@mui/icons-material/Undo";
import PlayCircleOutlineIcon from "@mui/icons-material/PlayCircleOutline";

export interface StatusBadgeProps extends Omit<ChipProps, "color"> {
  status: string;
  hasRollback?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  hasRollback,
  ...chipProps
}) => {
  const norm = (status || "UNKNOWN").toUpperCase();

  if (hasRollback || norm === "ROLLBACK" || norm.includes("REFUND")) {
    return (
      <Chip
        icon={<UndoIcon />}
        label="ROLLBACK"
        color="warning"
        variant="filled"
        size="small"
        sx={{ fontWeight: "bold" }}
        {...chipProps}
      />
    );
  }

  switch (norm) {
    case "DONE":
    case "COMPLETED":
    case "SUCCESS":
      return (
        <Chip
          icon={<CheckCircleIcon />}
          label="COMPLETED"
          color="success"
          variant="filled"
          size="small"
          sx={{ fontWeight: "bold" }}
          {...chipProps}
        />
      );
    case "FAILED":
    case "ERROR":
    case "INVALID":
      return (
        <Chip
          icon={<ErrorIcon />}
          label={norm}
          color="error"
          variant="filled"
          size="small"
          sx={{ fontWeight: "bold" }}
          {...chipProps}
        />
      );
    case "PENDING":
    case "IN_PROGRESS":
    case "ONGOING":
      return (
        <Chip
          icon={<HourglassEmptyIcon />}
          label="IN PROGRESS"
          color="primary"
          variant="filled"
          size="small"
          sx={{ fontWeight: "bold" }}
          {...chipProps}
        />
      );
    default:
      return (
        <Chip
          icon={<PlayCircleOutlineIcon />}
          label={status || "PENDING"}
          color="default"
          variant="outlined"
          size="small"
          {...chipProps}
        />
      );
  }
};
