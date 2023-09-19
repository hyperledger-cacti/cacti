import { createSignal, createEffect, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { supabase } from "../../../supabase-client";
import CardWrapper from "../../../components/CardWrapper/CardWrapper";
import { Transaction } from "../../../schema/supabase-types";
import { Block } from "../../../schema/supabase-types";
// @ts-expect-error
import styles from "./Dashboard.module.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const [transaction, setTransaction] = createSignal<Transaction[]>([]);
  const [block, setBlock] = createSignal<Block[]>([]);

  const txnTableProps = {
    onClick: {
      action: (param: string) => {
        navigate(`/eth/txn-details/${param}`);
      },
      prop: "id",
    },
    schema: [
      { display: "transaction id", objProp: ["id"] },
      { display: "sender/recipient", objProp: ["from", "to"] },
      { display: "token value", objProp: ["eth_value"] },
    ],
  };
  const blocksTableProps = {
    onClick: {
      action: (param: string) => {
        navigate(`/eth/block-details/${param}`);
      },
      prop: "number",
    },
    schema: [
      { display: "created at", objProp: ["created_at"] },
      { display: "block number", objProp: ["number"] },
      { display: "hash", objProp: ["hash"] },
    ],
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase.from("transaction").select("*");
      if (data) {
        setTransaction(data);
      }
      if (error) {
        console.error(error.message);
      }
    } catch (error:any) {
      console.error(error.message);
    }
  };

  const fetchBlock = async () => {
    try {
      const { data, error } = await supabase.from("block").select("*");
      if (data) {
        setBlock(data);
      }
      if (error) {
        console.error(error.message);
      }
    } catch (error:any) {
      console.error(error.message);
    }
  };

  createEffect(async () => {
    await fetchBlock();
  }, []);

  createEffect(async () => {
    await fetchTransactions();
  }, []);

  return (
    <div>
      <div class={styles["dashboard-wrapper"]}>
        <CardWrapper
          columns={txnTableProps}
          title="Transactions"
          display="small"
          trimmed={true}
          data={transaction()}
        ></CardWrapper>
        <CardWrapper
          columns={blocksTableProps}
          title="Blocks"
          display="small"
          trimmed={true}
          data={block()}
        ></CardWrapper>
      </div>
    </div>
  );
};

export default Dashboard;
