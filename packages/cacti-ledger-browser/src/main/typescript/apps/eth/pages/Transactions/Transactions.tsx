import CardWrapper from "../../../../components/ui/CardWrapper";

import styles from "./Transactions.module.css";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ethereumAllTransactionsQuery } from "../../queries";

function Transactions() {
  const navigate = useNavigate();
  const { isError, data, error } = useQuery(ethereumAllTransactionsQuery());

  if (isError) {
    console.error("Transactions fetch error:", error);
  }

  const txnTableProps = {
    onClick: {
      action: (param: string) => navigate(`/eth/txn-details/${param}`),
      prop: "id",
    },
    schema: [
      {
        display: "transaction id",
        objProp: ["id"],
      },
      {
        display: "sender/recipient",
        objProp: ["from", "to"],
      },
      {
        display: "token value",
        objProp: ["eth_value"],
      },
    ],
  };

  return (
    <div className={styles["transactions"]}>
      <CardWrapper
        columns={txnTableProps}
        title={"Transactions"}
        display={"All"}
        data={data ?? []}
        filters={["id", "from", "to"]}
        trimmed={false}
      ></CardWrapper>
    </div>
  );
}

export default Transactions;
