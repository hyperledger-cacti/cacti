import Box from "@mui/material/Box";
import PageTitleWithGoBack from "../../../../components/ui/PageTitleWithGoBack";
import BlockList from "../../components/BlockList/BlockList";
import TablePaginationAction from "../../../../components/ui/UITableListing/UITableListingPaginationAction";

export default function Blocks() {
  return (
    <Box>
      <PageTitleWithGoBack>Blocks</PageTitleWithGoBack>
      <BlockList
        footerComponent={TablePaginationAction}
        columns={["number", "hash", "txCount", "createdAt"]}
        rowsPerPage={40}
        tableSize="small"
      />
    </Box>
  );
}
