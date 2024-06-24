import TableCell from "@mui/material/TableCell";
import { styled } from "@mui/material/styles";

export const tableCellHeight = 39;

export const StyledTableCellHeader = styled(TableCell)(({ theme }) => ({
  fontSize: 17,
  fontWeight: "bold",
  color: theme.palette.primary.main,
  height: tableCellHeight,
  borderColor: theme.palette.primary.main,
}));

export const StyledTableCell = styled(TableCell)(() => ({
  height: tableCellHeight,
}));
