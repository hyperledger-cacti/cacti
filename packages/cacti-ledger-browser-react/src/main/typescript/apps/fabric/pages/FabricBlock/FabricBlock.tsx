import styles from "./FabricBlock.module.css";

import { supabase } from "../../../../common/supabase-client";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const FabricBlock = () => {
  const [details, setDetails] = useState<any>({});
  const params = useParams();

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from("fabric_blocks")
        .select("*")
        .match({ id: params.id });
      if (data?.[0]) {
        setDetails(data[0]);
      } else {
        throw new Error("Failed to load block details");
      }
    } catch (error: any) {
      console.error(error.message);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div>
      <div className={styles["details-card"]}>
        {details ? (
          <>
            <h1>Block Details</h1>
            <p>
              <b> ID:</b> {details.id}{" "}
            </p>
            <p>
              {" "}
              <b>Block Number: </b>
              {details.block_number}
            </p>
            <p>
              <b>Hash: </b>
              {details.data_hash}
            </p>
            <p>
              <b>Tx Count: </b>
              {details.tx_count}
            </p>
            <p>
              <b>Created at: </b>
              {details.created_at}
            </p>
            <p>
              {" "}
              <b>Previous Blockhash: </b>
              {details.prev_blockhash}
            </p>
            <p>
              {" "}
              <b>Channel name: </b>
              {details.channel_id}
            </p>
          </>
        ) : (
          <div>Failed to load details</div>
        )}
      </div>
    </div>
  );
};
export default FabricBlock;
