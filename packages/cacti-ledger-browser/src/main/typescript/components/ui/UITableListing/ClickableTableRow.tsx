import TableRow from "@mui/material/TableRow";
import { styled } from "@mui/material/styles";
import { forwardRef } from "react";

const StyledRow = styled(TableRow)(({ theme }) => ({
  cursor: "pointer",
  "&:hover": {
    backgroundColor: theme.palette.grey[200],
    "& .MuiTableCell-root": {
      color: theme.palette.secondary.main,
    },
  },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: "-2px",
  },
}));

/**
 * Table row that behaves like a link: clickable with the mouse AND fully
 * keyboard operable - Tab focuses it (only when a click handler is attached),
 * Enter/Space activate it, and focus is visible. The keydown handler adapts
 * the KeyboardEvent to the MouseEvent signature MUI's `onClick` declares;
 * activation handlers must not depend on mouse-specific fields.
 */
export const ClickableTableRow = forwardRef<
  HTMLTableRowElement,
  React.ComponentProps<typeof TableRow>
>(function ClickableTableRow({ onClick, children, ...rest }, ref) {
  return (
    <StyledRow
      ref={ref}
      tabIndex={onClick ? 0 : -1}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick(
                  event as unknown as React.MouseEvent<HTMLTableRowElement>,
                );
              }
            }
          : undefined
      }
      {...rest}
    >
      {children}
    </StyledRow>
  );
});
