import { supabase } from "../../../../common/supabase-client";
import { STANDARDS } from "../../../../common/token-standards";
import {
  TokenMetadata20,
  TokenMetadata721,
} from "../../../../common/supabase-types";
import styles from "./Details.module.css";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const TokenDetails = () => {
  const [tokenData, setTokenData] = useState<
    TokenMetadata20 | TokenMetadata721 | any
  >();

  const params = useParams();

  const fethcData = async () => {
    try {
      const { data } = await supabase
        .from(`token_metadata_${params.standard?.toLowerCase()}`)
        .select("*")
        .match({ address: params.address });
      if (data?.[0]) {
        setTokenData(data[0]);
      } else {
        throw new Error("Failed to load token details");
      }
    } catch (error: any) {
      console.error(error.message);
    }
  };

  useEffect(() => {
    fethcData();
  }, []);

  return (
    <div className={styles.details}>
      <div className={styles["details-card"]}>
        <h1>Token Details</h1>
        <p>
          <b>Adress:</b> {tokenData?.address}{" "}
        </p>
        <p>
          <b>Created at: </b>
          {tokenData?.created_at}
        </p>
        <p>
          <b>Name: </b>
          {tokenData?.name}
        </p>
        <p>
          <b>Symbol: </b>
          {tokenData?.symbol}
        </p>
        {params.standard === STANDARDS.erc20 && (
          <p>total_supply : {tokenData?.total_supply}</p>
        )}
      </div>
    </div>
  );
};

export default TokenDetails;
