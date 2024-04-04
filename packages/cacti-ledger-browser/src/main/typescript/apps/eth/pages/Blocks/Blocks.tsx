import { supabase } from "../../../../common/supabase-client";
import { useNavigate } from "react-router-dom";
import CardWrapper from "../../../../components/ui/CardWrapper";

import styles from "./Blocks.module.css";
import { useEffect, useState } from "react";
import { Block } from "web3";

type ObjectKey = keyof typeof styles;

function Blocks() {
  const navigate = useNavigate();
  const [block, setBlock] = useState<Block[]>([]);

  const blocksTableProps = {
    onClick: {
      action: (param: string) => navigate(`/eth/block-details/${param}`),
      prop: "number",
    },
    schema: [
      { display: "created at", objProp: ["created_at"] },
      { display: "block number", objProp: ["number"] },
      { display: "hash", objProp: ["hash"] },
    ],
  };

  const fetchBlock = async () => {
    try {
      const { data, error } = await supabase.from("block").select("*");
      if (data) {
        console.log(JSON.stringify(data));
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
  }, []);

  return (
    <div className={styles["blocks" as ObjectKey]}>
      <CardWrapper
        columns={blocksTableProps}
        data={block}
        title={"Blocks"}
        display={"All"}
        filters={["number", "hash"]}
        trimmed={false}
      ></CardWrapper>
    </div>
  );
}

export default Blocks;
