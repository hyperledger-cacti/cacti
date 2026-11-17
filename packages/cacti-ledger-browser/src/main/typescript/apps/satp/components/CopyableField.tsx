import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import { useNotification } from "../../../common/context/NotificationContext";
import ShortenedTypography from "../../../components/ui/ShortenedTypography";

export type CopyableFieldProps = {
  label: string;
  value: string;
  /** Show the beginning (default) or the end of long values. */
  direction?: "ltr" | "rtl";
};

const MONOSPACE = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/**
 * Label + value pair where the value is shortened (with a full-value
 * tooltip), rendered in a monospace face, and can be copied to the clipboard
 * with one click. Used for session IDs, claim/proof hashes and gateway
 * public keys.
 */
export default function CopyableField({
  label,
  value,
  direction,
}: CopyableFieldProps) {
  const { showNotification } = useNotification();

  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(value);
      showNotification(`Copied ${label} to clipboard`, "success");
    } catch (error) {
      showNotification(`Could not copy ${label}: ${error}`, "error");
    }
  };

  return (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Box sx={{ minWidth: 120, maxWidth: 340, flexGrow: 1 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {label}
        </Typography>
        <Box sx={{ fontFamily: MONOSPACE, fontSize: 13 }}>
          <ShortenedTypography text={value} direction={direction} />
        </Box>
      </Box>
      <Tooltip title={`Copy ${label.toLowerCase()}`}>
        <IconButton
          size="small"
          aria-label={`copy ${label}`}
          onClick={copyValue}
          sx={{ color: "text.secondary" }}
        >
          <ContentCopyIcon fontSize="inherit" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
