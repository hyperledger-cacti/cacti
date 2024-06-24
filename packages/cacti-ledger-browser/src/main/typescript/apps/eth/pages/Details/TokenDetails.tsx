import { STANDARDS } from "../../../../common/token-standards";
import styles from "./Details.module.css";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ethTokenDetails } from "../../queries";
import { TokenMetadata20 } from "../../../../common/supabase-types";

const TokenDetails = () => {
  const params = useParams();
  if (
    typeof params.standard === "undefined" ||
    typeof params.address === "undefined"
  ) {
    throw new Error(`Token details called with empty args ${params}`);
  }
  const { isError, data, error } = useQuery(
    ethTokenDetails(params.standard.toLowerCase(), params.address),
  );

  if (isError) {
    console.error("Token details fetch error:", error);
  }

  return (
    <div className={styles.details}>
      <div className={styles["details-card"]}>
        <h1>Token Details</h1>
        <p>
          <b>Adress:</b> {data?.address}{" "}
        </p>
        <p>
          <b>Created at: </b>
          {data?.created_at}
        </p>
        <p>
          <b>Name: </b>
          {data?.name}
        </p>
        <p>
          <b>Symbol: </b>
          {data?.symbol}
        </p>
        {params.standard === STANDARDS.erc20 && (
          <p>total_supply : {(data as TokenMetadata20).total_supply}</p>
        )}
      </div>
    </div>
  );
};

export default TokenDetails;
