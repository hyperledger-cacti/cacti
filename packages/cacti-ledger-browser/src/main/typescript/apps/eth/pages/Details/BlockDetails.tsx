import { supabase } from "../../../../common/supabase-client";
import { Block } from "../../../../common/supabase-types";

import styles from "./Details.module.css";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";

function BlockDetails() {
  const [details, setDetails] = useState<Block | any>();
  const params = useParams();

  const fethcData = async () => {
    try {
      const { data } = await supabase
        .from("block")
        .select("*")
        .match({ number: params.number });
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
    fethcData();
  }, []);

  return (
    <div>
      <div className={styles["details-card"]}>
        {details ? (
          <>
            <h1>Block Details</h1>
            <p>
              <b> Address:</b> {details.number}{" "}
            </p>
            <p>
              {" "}
              <b>Created at: </b>
              {details.created_at}
            </p>
            <p>
              <b>Hash: </b>
              {details.hash}
            </p>
            <p>
              <b>Number of transaction: </b>
              {details.number_of_tx}
            </p>
            <p>
              <b>Sync at: </b>
              {details.sync_at}
            </p>
          </>
        ) : (
          <div>Failed to load details</div>
        )}
      </div>
    </div>
  );
}

export default BlockDetails;
