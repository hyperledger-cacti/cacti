import { Link as RouterLink } from "react-router-dom";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import BlockList from "../../components/BlockList/BlockList";

function BlockListViewAllAction() {
  return (
    <Box display={"flex"}>
      <Box flexGrow={1}></Box>
      <Button
        component={RouterLink}
        to={"blocks"}
        sx={{ margin: 1 }}
        color="secondary"
      >
        View all
      </Button>
    </Box>
  );
}

export default function BlockSummary() {
  return (
    <BlockList
      footerComponent={BlockListViewAllAction}
      columns={["number", "hash", "createdAt"]}
      rowsPerPage={15}
      tableSize="medium"
    />
  );
}
