import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";

import ERC20TokenList from "./ERC20TokenList";
import ERC20TokenDetails from "./ERC20TokenDetails";
import { TokenERC20 } from "../../supabase-types";

export type AccountERC20ViewProps = {
  accountAddress: string;
};

export default function AccountERC20View({
  accountAddress,
}: AccountERC20ViewProps) {
  const [selectedToken, setSelectedToken] = React.useState<
    TokenERC20 | undefined
  >(undefined);

  const tokenDetailsId = selectedToken
    ? `${selectedToken.token_address}-${selectedToken.account_address}`
    : "token-not-selected";

  return (
    <Box>
      <Typography variant="h5" color="secondary">
        ERC20
      </Typography>
      <Box
        display="flex"
        flexDirection="row"
        justifyContent="space-around"
        alignContent="center"
        gap={5}
      >
        <Box flex={5}>
          <ERC20TokenList
            accountAddress={accountAddress}
            onTokenSelected={(token) => setSelectedToken(token)}
          />
        </Box>

        <Divider orientation="vertical" flexItem />

        <Box flex={7}>
          <ERC20TokenDetails key={tokenDetailsId} token={selectedToken} />
        </Box>
      </Box>
    </Box>
  );
}
