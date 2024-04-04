import { supabase } from "../../../../common/supabase-client";
import { Transaction } from "../../../../common/supabase-types";
import CardWrapper from "../../../../components/ui/CardWrapper";

import styles from "./Transactions.module.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

function Transactions() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

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

  const fetchTransactions = async () => {
    try {
      const { data } = await supabase.from("transaction").select("*");
      if (data) {
        console.log(JSON.stringify(data));
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
        filters={["id", "from", "to"]}
        trimmed={false}
      ></CardWrapper>
    </div>
  );
}

export default Transactions;
