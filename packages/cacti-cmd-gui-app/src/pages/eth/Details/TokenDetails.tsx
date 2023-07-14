import { createEffect, createSignal } from "solid-js";
import { useParams } from "@solidjs/router";
import { supabase } from "../../../supabase-client";
import { STANDARDS } from "../../../schema/token-standards";
import { TokenMetadata20, TokenMetadata721 } from "../../../schema/supabase-types";
// @ts-expect-error
import styles from "./Details.module.css";

const TokenDetails = () => {
  const [tokenData, setTokenData] = createSignal<
    TokenMetadata20 | TokenMetadata721 | any
  >();

  const params = useParams();

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
    } catch (error:any) {
      console.error(error.message);
    }
  }, []);

  return (
    <div class={styles.details}>
      <div class={styles["details-card"]}>
        <h1>Token Details</h1>
        <p>
          <b>Adress:</b> {tokenData()?.address}{" "}
        </p>
        <p>
          <b>Created at: </b>
          {tokenData()?.created_at}
        </p>
        <p>
          <b>Name: </b>
          {tokenData()?.name}
        </p>
        <p>
          <b>Symbol: </b>
          {tokenData()?.symbol}
        </p>
        {params.standard === STANDARDS.erc20 && (
          <p>total_supply : {tokenData()?.total_supply}</p>
        )}
      </div>
    </div>
  );
};

export default TokenDetails;
