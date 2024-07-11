import { styled } from "@mui/material/styles";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";

import { FabricTransaction } from "../../supabase-types";
import ShortenedTypography from "../../../../components/ui/ShortenedTypography";
import StackedRowItems from "../../../../components/ui/StackedRowItems";

const ListHeaderTypography = styled(Typography)(({ theme }) => ({
  color: theme.palette.secondary.main,
  fontWeight: "bold",
}));

export interface TranactionInfoCardProps {
  tx?: FabricTransaction;
}

/**
 * Card with basic transaction information.
 *
 * @param tx transaction object from a database
 */
export default function TranactionInfoCard({ tx }: TranactionInfoCardProps) {
  if (!tx) {
    return <Skeleton variant="rounded" width="100%" height={250} />;
  }

  return (
    <Paper sx={{ padding: 2 }}>
      <Stack spacing={1}>
        <StackedRowItems>
          <ListHeaderTypography>Common Name:</ListHeaderTypography>
          <ShortenedTypography text={tx.hash} maxWidth={350} />
        </StackedRowItems>
        <StackedRowItems>
          <ListHeaderTypography>Timestamp:</ListHeaderTypography>
          <Typography>{new Date(tx.timestamp).toLocaleString()}</Typography>
        </StackedRowItems>
        <StackedRowItems>
          <ListHeaderTypography>Block Number:</ListHeaderTypography>
          <Typography>{tx.block_number ?? "unknown"}</Typography>
        </StackedRowItems>
        <StackedRowItems>
          <ListHeaderTypography>Channel ID:</ListHeaderTypography>
          <Typography>{tx.channel_id}</Typography>
        </StackedRowItems>
        <StackedRowItems>
          <ListHeaderTypography>Type:</ListHeaderTypography>
          <Typography>{tx.type}</Typography>
        </StackedRowItems>
        <StackedRowItems>
          <ListHeaderTypography>Epoch:</ListHeaderTypography>
          <Typography>{tx.epoch}</Typography>
        </StackedRowItems>
        <StackedRowItems>
          <ListHeaderTypography>Protocol Version:</ListHeaderTypography>
          <Typography>{tx.protocol_version}</Typography>
        </StackedRowItems>
      </Stack>
    </Paper>
  );
}
