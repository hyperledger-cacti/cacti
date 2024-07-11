import * as React from "react";
import { useQuery } from "@tanstack/react-query";
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
import CircularProgress from "@mui/material/CircularProgress";

import { useNotification } from "../../../../common/context/NotificationContext";
import { ethAllERC20TokensByAccount } from "../../queries";
import { TokenERC20 } from "../../supabase-types";

const StyledHeaderCell = styled(TableCell)(({ theme }) => ({
  color: theme.palette.primary.main,
  fontWeight: "bold",
}));

export type ERC20TokenListProps = {
  accountAddress: string;
  onTokenSelected: (token?: TokenERC20) => void;
};

export default function ERC20TokenList({
  accountAddress,
  onTokenSelected,
}: ERC20TokenListProps) {
  const { isError, isPending, data, error } = useQuery(
    ethAllERC20TokensByAccount(accountAddress),
  );
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const { showNotification } = useNotification();
  const tokenList = data ?? [];

  React.useEffect(() => {
    isError &&
      showNotification(`Could get ERC20 balance list: ${error}`, "error");
  }, [isError]);

  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - tokenList.length) : 0;

  return (
    <Box>
      <TableContainer
        component={Paper}
        sx={{
          minWidth: 300,
          marginY: 2,
        }}
      >
        {isPending && (
          <CircularProgress
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              zIndex: 9999,
            }}
          />
        )}
        <Table aria-label="erc20 token balances">
          <TableHead>
            <TableRow>
              <StyledHeaderCell>Name</StyledHeaderCell>
              <StyledHeaderCell align="right">Symbol</StyledHeaderCell>
              <StyledHeaderCell align="right">Balance</StyledHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(rowsPerPage > 0
              ? tokenList.slice(
                  page * rowsPerPage,
                  page * rowsPerPage + rowsPerPage,
                )
              : tokenList
            ).map((row) => (
              <TableRow
                hover
                sx={{ cursor: "pointer" }}
                onClick={() => {
                  onTokenSelected(
                    tokenList.find(
                      (t) =>
                        t.account_address === row.account_address &&
                        t.token_address === t.token_address,
                    ),
                  );
                }}
                key={row.name}
              >
                <TableCell scope="row">{row.name}</TableCell>
                <TableCell align="right">{row.symbol}</TableCell>
                <TableCell align="right">{row.balance}</TableCell>
              </TableRow>
            ))}
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
                count={tokenList.length}
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
    </Box>
  );
}
