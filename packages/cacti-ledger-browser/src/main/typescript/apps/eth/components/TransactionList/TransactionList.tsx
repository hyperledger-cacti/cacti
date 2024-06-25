import * as React from "react";
import { UseQueryOptions } from "@tanstack/react-query";
import { transactionColumnsConfig } from "./transactionColumnsConfig";
import type { UITableListingPaginationActionProps } from "../../../../components/ui/UITableListing/UITableListingPaginationAction";
import UITableListing from "../../../../components/ui/UITableListing/UITableListing";

/**
 * List of columns that can be rendered in a transaction list table
 */
export type TransactionListColumn = keyof typeof transactionColumnsConfig;

/**
 * TransactionList properties.
 */
export interface TransactionListProps<T> {
  queryFunction: (
    page: number,
    pageSize: number,
  ) => UseQueryOptions<T[], any, any, any>;
  footerComponent: React.ComponentType<UITableListingPaginationActionProps>;
  columns: TransactionListColumn[];
  rowsPerPage: number;
  tableSize?: "small" | "medium";
}

/**
 * TransactionList - Show table with ethereum transactions.
 *
 * @param footerComponent component will be rendered in a footer of a transaction list table.
 * @param columns list of columns to be rendered.
 * @param rowsPerPage how many rows to show per page.
 */

export default function TransactionList<
  T extends {
    [key: string]: any;
  },
>({
  queryFunction,
  footerComponent,
  columns,
  rowsPerPage,
  tableSize,
}: TransactionListProps<T>) {
  return (
    <UITableListing
      queryFunction={queryFunction}
      label="transaction"
      columnConfig={transactionColumnsConfig}
      footerComponent={footerComponent}
      columns={columns}
      rowsPerPage={rowsPerPage}
      tableSize={tableSize}
    />
  );
}
