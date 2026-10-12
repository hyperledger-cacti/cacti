import Button from "@mui/material/Button";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import { isValidUrl } from "../../common/utils";

export interface SetupGuideLinkProps {
  /** Full URL of the app setup guide (rendered as nothing when invalid). */
  url?: string;
  /** Button text (defaults to "Setup Guide"). */
  label?: string;
}

/**
 * Button that opens the app setup guide in a new tab, mirroring the pattern
 * used by the Add-Application wizard ("Setup Guide" button next to each app
 * entry). Renders nothing when the URL is unset or not a valid URL, so
 * callers can pass untrusted/optional values directly.
 */
export default function SetupGuideLink({ url, label }: SetupGuideLinkProps) {
  if (!isValidUrl(url)) {
    return null;
  }

  return (
    <Button
      endIcon={<OpenInNewIcon />}
      size="small"
      onClick={() => window.open(url, "_blank")}
      sx={{ textTransform: "none" }}
    >
      {label ?? "Setup Guide"}
    </Button>
  );
}
