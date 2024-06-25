import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TransactionList from "../../components/TransactionList/TransactionList";
import { ethAllTransactionsQuery } from "../../queries";

function TransactionListViewAllAction() {
  return (
    <Box display={"flex"}>
      <Box flexGrow={1}></Box>
      <Button
        component={RouterLink}
        to={"transactions"}
        sx={{ margin: 1 }}
        color="secondary"
      >
        View all
      </Button>
    </Box>
  );
}

export default function TransactionSummary() {
  return (
    <TransactionList
      queryFunction={ethAllTransactionsQuery}
      footerComponent={TransactionListViewAllAction}
      columns={["hash", "from", "to"]}
      rowsPerPage={15}
      tableSize="medium"
    />
  );
}
