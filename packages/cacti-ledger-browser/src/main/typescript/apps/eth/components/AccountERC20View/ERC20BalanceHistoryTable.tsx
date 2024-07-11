import * as React from "react";
import { styled } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableFooter from "@mui/material/TableFooter";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import TableHead from "@mui/material/TableHead";
import Typography from "@mui/material/Typography";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";

import ShortenedTypography from "../../../../components/ui/ShortenedTypography";
import { TokenHistoryItem20 } from "../../supabase-types";

const StyledHeaderCell = styled(TableCell)(({ theme }) => ({
  color: theme.palette.primary.main,
  fontWeight: "bold",
}));

export type BalanceAmountTextProps = {
  children: React.ReactNode;
};

function PositiveBalanceAmountText({ children }: BalanceAmountTextProps) {
  return (
    <Box
      display="flex"
      flexDirection="row"
      justifyContent="right"
      alignItems="center"
    >
      <Typography color="green" fontWeight="bold">
        {children}
      </Typography>
      <ArrowDropUpIcon color="success" />
    </Box>
  );
}

function NegativeBalanceAmountText({ children }: BalanceAmountTextProps) {
  return (
    <Box
      display="flex"
      flexDirection="row"
      justifyContent="right"
      alignItems="center"
    >
      <Typography color="red" fontWeight="bold">
        {children}
      </Typography>
      <ArrowDropDownIcon color="error" />
    </Box>
  );
}

export type ERC20BalanceHistoryTableProps = {
  data: TokenHistoryItem20[];
  ownerAddress: string;
};

function formatCreatedAtDate(createdAt: string) {
  const date = new Date(createdAt);
  return date.toUTCString();
}

export default function ERC20BalanceHistoryTable({
  data,
  ownerAddress,
}: ERC20BalanceHistoryTableProps) {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const sortedData = [...data].sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );

  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - sortedData.length) : 0;

  return (
    <TableContainer
      component={Paper}
      sx={{
        minWidth: 500,
      }}
    >
      <Table aria-label="erc20 token history for account">
        <TableHead>
          <TableRow>
            <StyledHeaderCell>Time</StyledHeaderCell>
            <StyledHeaderCell>Hash</StyledHeaderCell>
            <StyledHeaderCell>From/To</StyledHeaderCell>
            <StyledHeaderCell align="right">Amount</StyledHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(rowsPerPage > 0
            ? sortedData.slice(
                page * rowsPerPage,
                page * rowsPerPage + rowsPerPage,
              )
            : sortedData
          ).map((row) => {
            const isReceiving = row.recipient === ownerAddress;

            return (
              <TableRow key={row.transaction_hash}>
                <TableCell>{formatCreatedAtDate(row.created_at)}</TableCell>
                <TableCell>
                  <ShortenedTypography
                    text={row.transaction_hash}
                    minWidth={300}
                  />
                </TableCell>
                <TableCell>
                  {isReceiving ? (
                    <ShortenedTypography text={row.sender} minWidth={200} />
                  ) : (
                    <ShortenedTypography text={row.recipient} minWidth={200} />
                  )}
                </TableCell>
                <TableCell align="right">
                  {isReceiving ? (
                    <PositiveBalanceAmountText>
                      {row.value}
                    </PositiveBalanceAmountText>
                  ) : (
                    <NegativeBalanceAmountText>
                      -{row.value}
                    </NegativeBalanceAmountText>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
          {emptyRows > 0 && (
            <TableRow style={{ height: 53 * emptyRows }}>
              <TableCell colSpan={6} />
            </TableRow>
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, { label: "All", value: -1 }]}
              colSpan={3}
              count={sortedData.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_event, newPage) => {
                setPage(newPage);
              }}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
            />
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
  );
}
