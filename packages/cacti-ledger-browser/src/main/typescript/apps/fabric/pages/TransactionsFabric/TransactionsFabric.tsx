import { supabase } from "../../../../common/supabase-client";
import { Transaction } from "../../../../common/supabase-types";
import CardWrapper from "../../../../components/ui/CardWrapper";
import styles from "./TransactionsFabric.module.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function TransactionsFabric() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const txnTableProps = {
    onClick: {
      action: (param: string) => {
        navigate(`/fabric/txn-details/${param}`);
      },
      prop: "id",
    },
    schema: [
      { display: "created at", objProp: ["created_at"] },
      { display: "transaction id", objProp: ["transaction_id"] },
      { display: "channel name", objProp: ["channel_id"] },
      { display: "block id", objProp: ["block_id"] },
      { display: "status", objProp: ["status"] },
    ],
  };

  const fetchTransactions = async () => {
    try {
      const { data } = await supabase.from("fabric_transactions").select("*");
      if (data) {
        setTransactions(data);
      } else {
        throw new Error("Failed to load transactions");
      }
    } catch (error: any) {
      console.error(error.message);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <div className={styles["transactions"]}>
      <CardWrapper
        columns={txnTableProps}
        title={"Transactions"}
        display={"All"}
        data={transactions}
        filters={["transaction_id", "block_id"]}
        trimmed={false}
      ></CardWrapper>
    </div>
  );
}

export default TransactionsFabric;
