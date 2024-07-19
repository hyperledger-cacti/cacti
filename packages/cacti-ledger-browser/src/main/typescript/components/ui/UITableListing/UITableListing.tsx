import * as React from "react";
import {
  UseQueryOptions,
  keepPreviousData,
  useQuery,
} from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import TableHead from "@mui/material/TableHead";
import CircularProgress from "@mui/material/CircularProgress";

import { useNotification } from "../../../common/context/NotificationContext";
import ShortenedTypography from "../ShortenedTypography";
import {
  StyledTableCell,
  StyledTableCellHeader,
  tableCellHeight,
} from "./StyledTableCell";
import type { UITableListingPaginationActionProps } from "./UITableListingPaginationAction";
import { ClickableTableRow } from "./ClickableTableRow";

/**
 * Table column configuration entry
 *
 * @param name Name of the column to be displayed in the header.
 * @param field Name of the field in data returned from react-query
 * @param isLongString? boolean if value is hash or not (i.e. should be shortened when necessary)
 * @param isDate? boolean if value is a date (should be formatted differently)
 * @param isUnique? boolean if value is unique (can be used as key)
 */
export type ColumnConfigEntry = {
  name: string;
  field: string;
  isLongString?: boolean;
  isDate?: boolean;
  isUnique?: boolean;
};

export type ColumnConfigType = { [key: string]: ColumnConfigEntry };

/**
 * UITableListing parameters
 */
export interface UITableListingProps<T> {
  queryFunction: (
    page: number,
    pageSize: number,
  ) => UseQueryOptions<T[], any, any, any>;
  label: string;
  columnConfig: ColumnConfigType;
  footerComponent: React.ComponentType<UITableListingPaginationActionProps>;
  columns: string[];
  rowsPerPage: number;
  tableSize?: "small" | "medium";
  onClick?: (row: Record<string, unknown>) => void;
}

function getKeyField(columnConfig: ColumnConfigType) {
  const keyField = Object.entries(columnConfig)
    .find(([, config]) => config.isUnique)
    ?.map((entry) => (entry as ColumnConfigEntry).field)
    ?.pop();

  if (!keyField) {
    throw new Error(
      `Could not find unique field to display UITableListing. Config: ${columnConfig}`,
    );
  }

  return keyField;
}

function formatCellValue(config: ColumnConfigEntry, value: any) {
  if (config.isLongString) {
    return <ShortenedTypography text={value} />;
  } else if (config.isDate) {
    const date = new Date(value);
    return date.toLocaleString();
  }
  // Return plain value by default
  return value;
}

function createTableRow(
  row: Record<string, unknown>,
  columns: string[],
  columnConfig: ColumnConfigType,
) {
  return columns.map((colName) => {
    const config = columnConfig[colName];
    const value = row[config.field];
    return (
      <StyledTableCell key={`${row.number}-${colName}`}>
        {formatCellValue(config, value)}
      </StyledTableCell>
    );
  });
}

/**
 * UITableListing - Show table with paged data fetched from react-query.
 *
 * Use higher level component when possible.
 * Supports paging and error handling. Will show empty entries if number of entries
 * is smaller then requested `rowsPerPage` to keep UI in place.
 *
 * @param footerComponent component will be rendered in a footer of a transaction list table.
 * @param columns list of columns to be rendered.
 * @param rowsPerPage how many rows to show per page.
 */
export default function UITableListing<
  T extends {
    [key: string]: any;
  },
>({
  queryFunction,
  label,
  columnConfig,
  footerComponent: FooterComponent,
  columns,
  rowsPerPage,
  tableSize,
  onClick,
}: UITableListingProps<T>) {
  const [page, setPage] = React.useState(0);
  const { isError, isPending, data, error, refetch } = useQuery({
    ...queryFunction(page, rowsPerPage),
    placeholderData: keepPreviousData,
  });
  const { showNotification } = useNotification();
  const displayData: T[] = data ?? [];

  React.useEffect(() => {
    isError && showNotification(`Could not fetch data: ${error}`, "error");
  }, [isError]);

  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows = Math.max(0, rowsPerPage - displayData.length);

  return (
    <Box position="relative">
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
      <TableContainer component={Paper}>
        <Table
          sx={{ minWidth: 700 }}
          size={tableSize}
          aria-label={`table ${label}`}
        >
          <TableHead>
            <TableRow>
              {columns.map((colName) => {
                return (
                  <StyledTableCellHeader
                    key={`${label}-${colName}-header-cell`}
                  >
                    {columnConfig[colName].name}
                  </StyledTableCellHeader>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {displayData.map((row) => {
              if (onClick) {
                return (
                  <ClickableTableRow
                    key={row[getKeyField(columnConfig)]}
                    onClick={() => onClick(row)}
                  >
                    {createTableRow(row, columns, columnConfig)}
                  </ClickableTableRow>
                );
              } else {
                return (
                  <TableRow key={row[getKeyField(columnConfig)]}>
                    {createTableRow(row, columns, columnConfig)}
                  </TableRow>
                );
              }
            })}
            {emptyRows > 0 && (
              <TableRow style={{ height: tableCellHeight * emptyRows }}>
                <StyledTableCell colSpan={6} />
              </TableRow>
            )}
          </TableBody>
        </Table>
        <FooterComponent
          page={page}
          onPageChange={(newPage: number) => {
            setPage(newPage);
          }}
          onPageRefresh={() => {
            refetch();
          }}
          disableNext={emptyRows > 0}
        />
      </TableContainer>
    </Box>
  );
}
