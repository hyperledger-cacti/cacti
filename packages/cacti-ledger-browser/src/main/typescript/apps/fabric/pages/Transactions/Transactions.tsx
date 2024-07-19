import Box from "@mui/material/Box";
import TransactionList from "../../components/TransactionList/TransactionList";
import PageTitleWithGoBack from "../../../../components/ui/PageTitleWithGoBack";
import UITableListingPaginationAction from "../../../../components/ui/UITableListing/UITableListingPaginationAction";
import { fabricAllTransactionsQuery } from "../../queries";

export default function Transactions() {
  return (
    <Box>
      <PageTitleWithGoBack>Transactions</PageTitleWithGoBack>
      <TransactionList
        queryFunction={fabricAllTransactionsQuery}
        footerComponent={UITableListingPaginationAction}
        columns={["hash", "block", "timestamp", "channel_id", "type"]}
        rowsPerPage={40}
        tableSize="small"
      />
    </Box>
  );
}
