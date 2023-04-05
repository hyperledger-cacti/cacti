// @ts-expect-error
import styles from "./Details.module.css";
import { createEffect, createSignal } from "solid-js";
import { useParams, useNavigate } from "@solidjs/router";
import { supabase } from "../../supabase-client";
import { STANDARDS } from "../../schema/token-standards";
import { TokenMetadata20, TokenMetadata721 } from "../../schema/supabase-types";
const TokenDetails = () => {
  const [tokenData, setTokenData] = createSignal<
    TokenMetadata20 | TokenMetadata721 | any
  >();

  const params = useParams();
  const navigate = useNavigate();

  createEffect(async () => {
    try {
      const { data, error } = await supabase
        .from(`token_metadata_${params.standard.toLowerCase()}`)
        .select("*")
        .match({ address: params.address });
      if (data?.[0]) {
        setTokenData(data[0]);
      } else {
        throw new Error("Failed to load token details");
      }
    } catch (error) {
      console.error(error.message);
    }
  }, []);

  return (
    <div class={styles.details}>
      <div class={styles["details-card"]}>
        <h1>Token Details</h1>
        <span>
          <b>Adress:</b> {tokenData()?.address}{" "}
        </span>
        <span>
          <b>Created at: </b>
          {tokenData()?.created_at}
        </span>
        <span>
          <b>Name: </b>
          {tokenData()?.name}
        </span>
        <span>
          <b>Symbol: </b>
          {tokenData()?.symbol}
        </span>
        {params.standard === STANDARDS.erc20 && (
          <span>total_supply : {tokenData()?.total_supply}</span>
        )}
      </div>
    </div>
  );
};

export default TokenDetails;
