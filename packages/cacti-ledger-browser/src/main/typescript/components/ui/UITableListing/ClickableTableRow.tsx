import TableRow from "@mui/material/TableRow";
import { styled } from "@mui/material/styles";

export const ClickableTableRow = styled(TableRow)(({ theme }) => ({
  cursor: "pointer",
  "&:hover": {
    backgroundColor: theme.palette.grey[200],
    "& .MuiTableCell-root": {
      color: theme.palette.secondary.main,
    },
  },
}));
