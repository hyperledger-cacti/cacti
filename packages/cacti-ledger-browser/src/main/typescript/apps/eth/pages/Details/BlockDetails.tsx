import styles from "./Details.module.css";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ethereumBlockByNumber } from "../../queries";

function BlockDetails() {
  const params = useParams();
  if (typeof params.number === "undefined") {
    throw new Error(`BlockDetails called with empty block number ${params}`);
  }
  const { isSuccess, isError, data, error } = useQuery({
    ...ethereumBlockByNumber(params.number),
    staleTime: Infinity,
  });

  if (isError) {
    console.error("Data fetch error:", error);
  }

  return (
    <div>
      <div className={styles["details-card"]}>
        {isSuccess ? (
          <>
            <h1>Block Details</h1>
            <p>
              <b> Address:</b> {data.number}{" "}
            </p>
            <p>
              {" "}
              <b>Created at: </b>
              {data.created_at}
            </p>
            <p>
              <b>Hash: </b>
              {data.hash}
            </p>
            <p>
              <b>Number of transaction: </b>
              {data.number_of_tx}
            </p>
            <p>
              <b>Sync at: </b>
              {data.sync_at}
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
