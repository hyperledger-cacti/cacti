import * as React from "react";
import { fabricAllBlocksQuery } from "../../queries";
import { blockColumnsConfig } from "./blockColumnsConfig";
import type { UITableListingPaginationActionProps } from "../../../../components/ui/UITableListing/UITableListingPaginationAction";
import UITableListing from "../../../../components/ui/UITableListing/UITableListing";

/**
 * List of columns that can be rendered in a block list table
 */
export type BlockListColumn = keyof typeof blockColumnsConfig;

/**
 * BlockList properties.
 */
export interface BlockListProps {
  footerComponent: React.ComponentType<UITableListingPaginationActionProps>;
  columns: BlockListColumn[];
  rowsPerPage: number;
  tableSize?: "small" | "medium";
}

/**
 * BlockList - Show table with fabric blocks.
 *
 * @param footerComponent component will be rendered in a footer of a transaction list table.
 * @param columns list of columns to be rendered.
 * @param rowsPerPage how many rows to show per page.
 */
const BlockList: React.FC<BlockListProps> = ({
  footerComponent,
  columns,
  rowsPerPage,
  tableSize,
}) => {
  return (
    <UITableListing
      queryFunction={fabricAllBlocksQuery}
      label="block"
      columnConfig={blockColumnsConfig}
      footerComponent={footerComponent}
      columns={columns}
      rowsPerPage={rowsPerPage}
      tableSize={tableSize}
    />
  );
};

export default BlockList;
