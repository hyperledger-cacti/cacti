import { createSignal, createEffect } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { supabase } from "../../supabase-client";
// @ts-expect-error
import styles from "./Blocks.module.css";
import CardWrapper from "../../components/CardWrapper/CardWrapper";
import { Block } from "../../schema/supabase-types";

type ObjectKey = keyof typeof styles;

const Blocks = () => {
  const navigate = useNavigate();
  const [block, setBlock] = createSignal<Block[]>([]);

  const blocksTableProps = {
    onClick: {
      action: (param: string) => navigate(`/blockDetails/${param}`),
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
        setBlock(data);
      }
      if (error) {
        console.error(error.message);
      }
    } catch (error) {
      console.error(error.message);
    }
  };

  createEffect(async () => {
    await fetchBlock();
  }, []);

  return (
    <div class={styles["blocks" as ObjectKey]}>
      <CardWrapper
        columns={blocksTableProps}
        data={block()}
        title={"Blocks"}
        display={"All"}
        filters={["number", "hash"]}
        trimmed={false}
      ></CardWrapper>
    </div>
  );
};

export default Blocks;
