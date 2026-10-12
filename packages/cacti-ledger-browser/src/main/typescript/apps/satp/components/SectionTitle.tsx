import type { ReactNode } from "react";
import Typography from "@mui/material/Typography";

export interface SectionTitleProps {
  children: ReactNode;
  /** Rendered on the right end of the section header row (optional). */
  action?: ReactNode;
}

/**
 * Consistent section heading used across the SATP inspector pages: brown
 * (theme secondary) h6 with a caption-styled optional action slot.
 */
export default function SectionTitle({ children, action }: SectionTitleProps) {
  return (
    <Typography
      variant="h6"
      color="secondary.main"
      sx={{
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      {children}
      {action}
    </Typography>
  );
}
