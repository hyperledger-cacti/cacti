import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";
import { DiscoveryOrderer } from "../../supabase-types";
import StackedRowItems from "../../../../components/ui/StackedRowItems";

const ListHeaderTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.secondary.main,
  fontWeight: "bold",
}));

export interface OrdererDetailsBoxProps {
  orderer: DiscoveryOrderer;
}

export default function OrdererDetailsBox({ orderer }: OrdererDetailsBoxProps) {
  return (
    <Box>
      <StackedRowItems>
        <ListHeaderTypography>Name:</ListHeaderTypography>
        <Typography>{orderer.name}</Typography>
      </StackedRowItems>
      <StackedRowItems>
        <ListHeaderTypography>Host:</ListHeaderTypography>
        <Typography>{orderer.host}</Typography>
      </StackedRowItems>
      <StackedRowItems>
        <ListHeaderTypography>Port:</ListHeaderTypography>
        <Typography>{orderer.port}</Typography>
      </StackedRowItems>
    </Box>
  );
}
