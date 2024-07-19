import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import TranactionInfoCard from "./TranactionInfoCard";
import { fabricTransactionByHash } from "../../queries";
import { useNotification } from "../../../../common/context/NotificationContext";
import PageTitleWithGoBack from "../../../../components/ui/PageTitleWithGoBack";
import TransactionActionsTable from "./TransactionActionsTable";

/**
 * Transaction details page, must be called with valid `hash` in a param.
 * Fetched transaction details from a database.
 */
export default function TransactionDetails() {
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const { hash } = useParams();
  if (!hash) {
    showNotification(`Invalid transaction hash provided: ${hash}`, "error");
    navigate(".."); // Go to home
    return null;
  }

  const { isError, isPending, data, error } = useQuery(
    fabricTransactionByHash(hash),
  );

  React.useEffect(() => {
    isError &&
      showNotification(
        `Could not fetch transaction details: ${error}`,
        "error",
      );
  }, [isError]);

  return (
    <Box>
      <PageTitleWithGoBack>Transaction Details</PageTitleWithGoBack>
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
      <Box width={"50%"}>
        <TranactionInfoCard key={data?.hash ?? "tx-info-loading"} tx={data} />
      </Box>

      <Box width={"80%"}>
        <Typography
          variant="h4"
          color="secondary.main"
          marginTop={4}
          marginBottom={2}
        >
          Actions
        </Typography>
        <TransactionActionsTable
          key={data?.hash ?? "tx-actions-loading"}
          txId={data?.id}
        />
      </Box>
    </Box>
  );
}
