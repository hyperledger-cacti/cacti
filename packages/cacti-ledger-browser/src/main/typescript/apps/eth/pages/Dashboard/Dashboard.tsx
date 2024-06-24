import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { SvgIconComponent } from "@mui/icons-material";
import ReceiptOutlinedIcon from "@mui/icons-material/ReceiptOutlined";
import HubIcon from "@mui/icons-material/Hub";

import PageTitle from "../../../../components/ui/PageTitle";
import TransactionSummary from "./TransactionSummary";
import BlockSummary from "./BlockSummary";

interface TitleWithIconProps {
  icon: SvgIconComponent;
  children: React.ReactNode;
}

const TitleWithIcon: React.FC<TitleWithIconProps> = ({
  children,
  icon: Icon,
}) => {
  return (
    <Box display="flex" alignItems="center" marginBottom={2}>
      <Icon sx={{ fontSize: 35 }} color="primary" />
      <Typography variant="h6" component="h3" marginLeft={1}>
        {children}
      </Typography>
    </Box>
  );
};

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
