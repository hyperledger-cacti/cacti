import { useNavigate } from "react-router-dom";
import CardWrapper from "../../../../components/ui/CardWrapper";

import styles from "./Blocks.module.css";
import { useQuery } from "@tanstack/react-query";
import { ethereumAllBlocksQuery } from "../../queries";

type ObjectKey = keyof typeof styles;

function Blocks() {
  const navigate = useNavigate();
  const { isError, data, error } = useQuery(ethereumAllBlocksQuery());

  if (isError) {
    console.error("Transactions fetch error:", error);
  }

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

  return (
    <div className={styles["blocks" as ObjectKey]}>
      <CardWrapper
        columns={blocksTableProps}
        data={data ?? []}
        title={"Blocks"}
        display={"All"}
        filters={["number", "hash"]}
        trimmed={false}
      ></CardWrapper>
    </div>
  );
}

export default Blocks;
