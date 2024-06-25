import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { useQuery } from "@tanstack/react-query";

import { ethAllERC721TokensByAccount } from "../../queries";
import { useNotification } from "../../../../common/context/NotificationContext";
import NFTCard from "./NFTCard";

export type AccountERC721ViewProps = {
  accountAddress: string;
};

export default function AccountERC721View({
  accountAddress,
}: AccountERC721ViewProps) {
  const { isError, isPending, data, error } = useQuery(
    ethAllERC721TokensByAccount(accountAddress),
  );
  const { showNotification } = useNotification();
  const tokenList = data ?? [];

  React.useEffect(() => {
    isError && showNotification(`Could get NFT list: ${error}`, "error");
  }, [isError]);

  return (
    <Box>
      <Typography variant="h5" color="secondary">
        ERC721
      </Typography>
      <Box
        display="flex"
        flexWrap="wrap"
        justifyContent="space-around"
        gap={5}
        padding={5}
      >
        {isPending && (
          <CircularProgress
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              zIndex: 9999,
            }}
          />
        )}
        {tokenList.map((t) => {
          return (
            <NFTCard
              key={`${t.token_metadata_erc721.address}_${t.token_id}`}
              tokenDetails={t}
            />
          );
        })}
      </Box>
    </Box>
  );
}
