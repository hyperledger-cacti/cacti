import Box from "@mui/material/Box";
import TransactionList from "../../components/TransactionList/TransactionList";
import PageTitleWithGoBack from "../../../../components/ui/PageTitleWithGoBack";
import UITableListingPaginationAction from "../../../../components/ui/UITableListing/UITableListingPaginationAction";
import { ethAllTransactionsQuery } from "../../queries";

export default function Transactions() {
  return (
    <Box>
      <PageTitleWithGoBack>Transactions</PageTitleWithGoBack>
      <TransactionList
        queryFunction={ethAllTransactionsQuery}
        footerComponent={UITableListingPaginationAction}
        columns={["hash", "block", "from", "to", "value", "method"]}
        rowsPerPage={40}
        tableSize="small"
      />
    </Box>
  );
}
