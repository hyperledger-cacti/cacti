import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import CardWrapper from "../../../../components/ui/CardWrapper";
import { Transaction } from "../../../../common/supabase-types";
import { Block } from "../../../../common/supabase-types";
import { supabase } from "../../../../common/supabase-client";

import styles from "./Dashboard.module.css";

function Dashboard() {
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<Transaction[]>([]);
  const [block, setBlock] = useState<Block[]>([]);

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
    } catch (error: any) {
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
    } catch (error: any) {
      console.error(error.message);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchBlock();
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <div className={styles["dashboard-wrapper"]}>
        <CardWrapper
          columns={txnTableProps}
          title="Transactions"
          display="small"
          trimmed={true}
          data={transaction}
        ></CardWrapper>
        <CardWrapper
          columns={blocksTableProps}
          title="Blocks"
          display="small"
          trimmed={true}
          data={block}
        ></CardWrapper>
      </div>
    </div>
  );
}

export default Dashboard;
