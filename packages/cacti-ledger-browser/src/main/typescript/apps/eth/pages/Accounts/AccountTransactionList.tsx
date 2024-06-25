import Box from "@mui/material/Box";

import PageTitle from "../../../../components/ui/PageTitle";
import TransactionList from "../../components/TransactionList/TransactionList";
import { ethAccountTransactionsQuery } from "../../queries";
import UITableListingPaginationAction from "../../../../components/ui/UITableListing/UITableListingPaginationAction";

export type AccountTransactionListProps = {
  accountAddress: string;
};

export default function AccountTransactionList({
  accountAddress,
}: AccountTransactionListProps) {
  return (
    <Box>
      <PageTitle>Transactions</PageTitle>
      <TransactionList
        queryFunction={(page, pageSize) =>
          ethAccountTransactionsQuery(page, pageSize, accountAddress)
        }
        footerComponent={UITableListingPaginationAction}
        columns={["hash", "from", "to", "value", "method"]}
        rowsPerPage={7}
        tableSize="small"
      />
    </Box>
  );
}
