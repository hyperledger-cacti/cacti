import type { ReactNode } from "react";
import Typography from "@mui/material/Typography";

export interface SectionTitleProps {
  children: ReactNode;
  /** Rendered on the right end of the section header row (optional). */
  action?: ReactNode;
}

/**
 * Consistent section heading used across the SATP inspector pages.
 * Follows the Cacti Design System: Barlow font with strong typography.
 */
export default function SectionTitle({ children, action }: SectionTitleProps) {
  return (
    <Typography
      variant="h6"
      color="text.primary"
      sx={{
        fontFamily: '"Barlow", Arial, sans-serif',
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
