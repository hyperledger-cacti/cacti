import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";
import ReceiptOutlinedIcon from "@mui/icons-material/ReceiptOutlined";
import HubIcon from "@mui/icons-material/Hub";

import PageTitle from "../../../../components/ui/PageTitle";
import TitleWithIcon from "../../../../components/ui/TitleWithIcon";
import TransactionSummary from "./TransactionSummary";
import BlockSummary from "./BlockSummary";

function Dashboard() {
  return (
    <Box>
      <PageTitle>Dashboard</PageTitle>
      <Stack
        direction={{ lg: "column", xl: "row" }}
        spacing={5}
        divider={<Divider orientation="vertical" flexItem />}
        justifyContent="space-between"
        alignItems="center"
      >
        <Box width={"80%"}>
          <TitleWithIcon icon={HubIcon}>Blocks</TitleWithIcon>
          <BlockSummary />
        </Box>

        <Box width={"80%"}>
          <TitleWithIcon icon={ReceiptOutlinedIcon}>Transactions</TitleWithIcon>
          <TransactionSummary />
        </Box>
      </Stack>
    </Box>
  );
}

export default Dashboard;
