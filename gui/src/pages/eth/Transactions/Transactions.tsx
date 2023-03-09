import { createSignal, createEffect, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { supabase } from "../../../supabase-client";
import CardWrapper from "../../../components/CardWrapper/CardWrapper";
import { Transaction } from "../../../schema/supabase-types";
// @ts-expect-error
import styles from "./Transactions.module.css";

const Transactions = () => {
  const navigate = useNavigate();
  const [transactions, setTransactions] = createSignal<Transaction[]>([]);

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
        console.log(JSON.stringify(data))
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
        filters={["id", "from", "to"]}
        trimmed={false}
      ></CardWrapper>
    </div>
  );
};

export default Transactions;
