import { supabase } from "../../../../common/supabase-client";
import CardWrapper from "../../../../components/ui/CardWrapper";
import { Transaction } from "../../../../common/supabase-types";
import { Block } from "../../../../common/supabase-types";
import styles from "./DashFabric.module.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

function DashFabric() {
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<Transaction[]>([]);
  const [block, setBlock] = useState<Block[]>([]);

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
      const { data, error } = await supabase
        .from("fabric_transactions")
        .select("*");
      if (data) {
        setTransaction(data);
      }
      if (error) {
        console.error(error.message);
      }
    } catch (error: any) {
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
    } catch (error: any) {
      console.error(error.message);
    }
  };

  useEffect(() => {
    fetchBlock();
    fetchTransactions();
  }, []);

  return (
    <div>
      <div className={styles["dashboard-wrapper"]}>
        <CardWrapper
          columns={txnTableProps}
          title="Transactions"
          display="wide"
          trimmed={true}
          data={transaction}
        ></CardWrapper>
        <CardWrapper
          columns={blocksTableProps}
          title="Blocks"
          display="wide"
          trimmed={true}
          data={block}
        ></CardWrapper>
      </div>
    </div>
  );
}

export default DashFabric;
