import { supabase } from "../../../../common/supabase-client";
import CardWrapper from "../../../../components/ui/CardWrapper";
import { Block } from "../../../../common/supabase-types";
import styles from "./BlocksFabric.module.css";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

type ObjectKey = keyof typeof styles;

const BlocksFabric = () => {
  const navigate = useNavigate();
  const [block, setBlock] = useState<Block[]>([]);

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
  }, []);

  return (
    <div className={styles["blocks" as ObjectKey]}>
      <CardWrapper
        columns={blocksTableProps}
        data={block}
        title={"Blocks"}
        display={"All"}
        filters={["block_number", "data_hash"]}
        trimmed={false}
      ></CardWrapper>
    </div>
  );
};

export default BlocksFabric;
