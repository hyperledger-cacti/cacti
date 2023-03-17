import { createSignal, createEffect, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { supabase } from "../../../supabase-client";
import CardWrapper from "../../../components/CardWrapper/CardWrapper";
import { Transaction } from "../../../schema/supabase-types";
// @ts-expect-error
import styles from "./TransactionsFabric.module.css";

const TransactionsFabric = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = createSignal<Transaction[]>([]);

  const txnTableProps = {
    onClick: {
      action: (param: string) => {
        navigate(`/fabric/txn-details/${param}`);
      },
      prop:"id",
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
    } catch (error:any) {
      console.error(error.message);
    }
  };

  createEffect(async () => {
    await fetchTransactions();
  }, []);

  return (
    <div class={styles["transactions"]}>
      <CardWrapper
        columns={txnTableProps}
        title={"Transactions"}
        display={"All"}
        data={transactions()}
        filters={["transaction_id", "block_id"]}
        trimmed={false}
      ></CardWrapper>
    </div>
  );
};

export default TransactionsFabric;
