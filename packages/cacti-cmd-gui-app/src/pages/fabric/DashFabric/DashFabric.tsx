import { createSignal, createEffect, Show } from "solid-js";
import { useNavigate, useParams } from "@solidjs/router";
import { supabase } from "../../../supabase-client";
import CardWrapper from "../../../components/CardWrapper/CardWrapper";
import { Transaction } from "../../../schema/supabase-types";
import { Block } from "../../../schema/supabase-types";
// @ts-expect-error
import styles from "./DashFabric.module.css";

const DashFabric = () => {
  const navigate = useNavigate();
  const [transaction, setTransaction] = createSignal<Transaction[]>([]);
  const [block, setBlock] = createSignal<Block[]>([]);

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

  const blocksTableProps = {
    onClick: {
      action: (param: string) => {
        navigate(`/fabric/block-details/${param}`);
      },
      prop: "id",
    },
    schema: [
      { display: "created at", objProp: ["created_at"] },
      { display: "block number", objProp: ["block_number"] },
      { display: "channel name", objProp: ["channel_id"] },
      { display: "hash", objProp: ["data_hash"] },
      { display: "transactions count", objProp: ["tx_count"] },
    ],
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase.from("fabric_transactions").select("*");
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
      const { data, error } = await supabase.from("fabric_blocks").select("*");
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
    await fetchTransactions();
  }, []);

  return (
    <div>
      <div class={styles["dashboard-wrapper"]}>
        <CardWrapper
          columns={txnTableProps}
          title="Transactions"
          display="wide"
          trimmed={true}
          data={transaction()}
        ></CardWrapper>
        <CardWrapper
          columns={blocksTableProps}
          title="Blocks"
          display="wide"
          trimmed={true}
          data={block()}
        ></CardWrapper>
      </div>
    </div>
  );
}

export default DashFabric