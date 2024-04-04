import { supabase } from "../../../../common/supabase-client";
import CardWrapper from "../../../../components/ui/CardWrapper";
import { Transaction, TokenTransfer } from "../../../../common/supabase-types";

import styles from "./Details.module.css";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const TransactionsDetails = () => {
  const [details, setDetails] = useState<Transaction | any>({});
  const [transfers, setTransfers] = useState<TokenTransfer[]>([]);
  const params = useParams();

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

  const fetchDetails = async () => {
    try {
      const { data } = await supabase
        .from("transaction")
        .select("*")
        .match({ id: params.id });
      if (data?.[0]) {
        setDetails(data[0]);
      } else {
        throw new Error("Failed to load transaction details");
      }
    } catch (error: any) {
      console.error(error.message);
    }
  };

  const fetchTransfers = async () => {
    try {
      const { data } = await supabase
        .from("token_transfer")
        .select("*")
        .match({ transaction_id: params.id });
      if (data) {
        setTransfers(data);
      } else {
        throw new Error("Failed to load transfers");
      }
    } catch (error: any) {
      console.error(error.message);
    }
  };

  useEffect(() => {
    fetchDetails();
    fetchTransfers();
  }, []);

  return (
    <div className={styles.details}>
      <div className={styles["details-card"]}>
        <h1> Details of Transaction</h1>
        <p>
          {" "}
          <b>Hash:</b> {details.hash}{" "}
        </p>
        <p>
          <b>Block: </b>
          {details.block_number}
        </p>
        <p>
          <b>From: </b>
          {details.from}
        </p>
        <p>
          <b>To: </b>
          {details.to}{" "}
        </p>
        <p>
          {" "}
          <b>Value: </b>&nbsp;&nbsp;{details.eth_value}
        </p>
      </div>
      <CardWrapper
        columns={detailsTableProps}
        data={transfers}
        title={"Transfer list"}
        display={"small"}
        filters={["id", "sender", "recipient"]}
        trimmed={false}
      />
    </div>
  );
};

export default TransactionsDetails;
