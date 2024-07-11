import React from "react";
import { useQuery } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Skeleton from "@mui/material/Skeleton";

import { ethERC20TokenHistory } from "../../queries";
import ShortenedTypography from "../../../../components/ui/ShortenedTypography";
import { useNotification } from "../../../../common/context/NotificationContext";
import ERC20BalanceHistoryChart from "./ERC20BalanceHistoryChart";
import ERC20BalanceHistoryTable from "./ERC20BalanceHistoryTable";
import { createBalanceHistoryList } from "./balanceHistory";
import { TokenERC20 } from "../../supabase-types";

function TokenDetailsPlaceholder() {
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      height="100%"
      border={1}
      borderColor="lightgray"
    >
      <Typography color="secondary" marginBottom={1}>
        Click on a token from the list on the left to display it's details.
      </Typography>
    </Box>
  );
}

export type ERC20TokenDetailsHeaderProps = {
  token: TokenERC20;
};

function ERC20TokenDetailsHeader({ token }: ERC20TokenDetailsHeaderProps) {
  return (
    <Card elevation={2} sx={{ padding: 1 }}>
      <CardContent>
        <Typography variant="h5" color="secondary" marginBottom={1}>
          {token.name} [{token.symbol}]
        </Typography>
        <Box display="flex" flexDirection="row" gap={1}>
          Contract:
          <ShortenedTypography text={token.token_address} maxWidth={400} />
        </Box>
        <Box>Supply: {token.total_supply}</Box>
        <Box>Balance: {token.balance}</Box>
      </CardContent>
    </Card>
  );
}

export type ERC20TokenDetailsProps = {
  token?: TokenERC20;
};

export default function ERC20TokenDetails({ token }: ERC20TokenDetailsProps) {
  if (!token) {
    return <TokenDetailsPlaceholder />;
  }

  const { showNotification } = useNotification();

  const { isError, isPending, data, error } = useQuery(
    ethERC20TokenHistory(token.token_address, token.account_address),
  );
  const txData = data ?? [];

  React.useEffect(() => {
    isError &&
      showNotification(`Could get ERC20 balance history: ${error}`, "error");
  }, [isError]);

  const balanceHistory = createBalanceHistoryList(
    txData,
    token.account_address,
  );

  return (
    <Box>
      {/* Token information header */}
      <Box marginBottom={3}>
        {isPending ? (
          <Skeleton variant="rounded" height={150} animation="wave" />
        ) : (
          <ERC20TokenDetailsHeader token={token} />
        )}
      </Box>

      {/* Balance history chart */}
      <Box>
        <ERC20BalanceHistoryChart
          key={`${token.token_address}-${token.account_address}`}
          data={balanceHistory}
          height={300}
        />
      </Box>

      {/* Balance history table */}
      <Box>
        <Typography variant="h5" color="secondary" marginBottom={2}>
          Token History
        </Typography>
        <ERC20BalanceHistoryTable
          key={`${token.token_address}-${token.account_address}`}
          data={txData}
          ownerAddress={token.account_address}
        />
      </Box>
    </Box>
  );
}
