import CardWrapper from "../../../../components/ui/CardWrapper";
import styles from "./Details.module.css";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ethereumTokenTransfersByTxId, ethereumTxById } from "../../queries";

const TransactionsDetails = () => {
  const params = useParams();
  if (typeof params.id === "undefined") {
    throw new Error(`TransactionsDetails called with empty txId ${params}`);
  }
  const {
    isError: txIsError,
    data: txData,
    error: txError,
  } = useQuery({
    ...ethereumTxById(params.id),
    staleTime: Infinity,
  });

  const {
    isError: txTransfersIsError,
    data: txTransfersData,
    error: txTransfersError,
  } = useQuery({
    ...ethereumTokenTransfersByTxId(params.id),
    staleTime: Infinity,
  });

  if (txIsError) {
    console.error("Transaction fetch error:", txError);
  }
  if (txTransfersIsError) {
    console.error("Token transfers fetch error:", txTransfersError);
  }

  const detailsTableProps = {
    onClick: {
      action: () => {},
      prop: "id",
    },
    schema: [
      { display: "transfer id", objProp: ["id"] },
      { display: "sender/recipient", objProp: ["sender", "recipient"] },
      { display: "value", objProp: ["value"] },
    ],
  };

  return (
    <div className={styles.details}>
      <div className={styles["details-card"]}>
        <h1> Details of Transaction</h1>
        <p>
          {" "}
          <b>Hash:</b> {txData?.hash}{" "}
        </p>
        <p>
          <b>Block: </b>
          {txData?.block_number}
        </p>
        <p>
          <b>From: </b>
          {txData?.from}
        </p>
        <p>
          <b>To: </b>
          {txData?.to}{" "}
        </p>
        <p>
          {" "}
          <b>Value: </b>&nbsp;&nbsp;{txData?.eth_value}
        </p>
      </div>
      <CardWrapper
        columns={detailsTableProps}
        data={txTransfersData ?? []}
        title={"Transfer list"}
        display={"small"}
        filters={["id", "sender", "recipient"]}
        trimmed={false}
      />
    </div>
  );
};

export default TransactionsDetails;
